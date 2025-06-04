import { TreeEngine } from './TreeEngine';
import {
  DecisionTree,
  TreeConfig,
  Dataset,
  EvaluationResult,
  GeneAnnotation,
  TreeNode,
  Test
} from '../../types';

import { C45 } from '../algorithms/C45';
import { TSP } from '../algorithms/TSP';
import { WTSP } from '../algorithms/WTSP';
import { HybridAlgorithm } from '../algorithms/HybridAlgorithm';
import { TreeUtils } from '../utils/TreeUtils';
import {
  createConfusionMatrix,
  calculateMetrics,
  generateROCCurve,
  calculateAUC
} from '../utils/metrics';

export class LocalEngine implements TreeEngine {
  private currentTree: DecisionTree | null = null;
  private algorithm: C45 | TSP | WTSP | HybridAlgorithm | null = null;
  private currentDataset: Dataset | null = null;

  async buildTree(data: Dataset, config: TreeConfig): Promise<DecisionTree> {
    this.currentDataset = data;
    
    if (!data.decisionAttribute) {
      throw new Error('Decision attribute must be specified in the dataset');
    }

    // Create appropriate algorithm instance
    if (Array.isArray(config.algorithm)) {
      this.algorithm = new HybridAlgorithm(config);
    } else {
      switch (config.algorithm) {
        case 'C4.5':
          this.algorithm = new C45(config);
          break;
        case 'TSP':
          this.algorithm = new TSP(config);
          break;
        case 'WTSP':
          this.algorithm = new WTSP(config);
          break;
        default:
          throw new Error(`Unknown algorithm: ${config.algorithm}`);
      }
    }

    this.currentTree = this.algorithm.buildTree(data, config);
    return this.currentTree;
  }

  async evaluateTree(tree: DecisionTree, testData: Dataset): Promise<EvaluationResult> {
    const predictions: { actual: string; predicted: string }[] = [];

    for (const instance of testData.instances) {
      let node = tree.root;
      while (!node.leaf && node.test) {
        const goLeft = TreeUtils.evaluateTest(node.test, instance);
        const next = node.children[goLeft ? 'left' : 'right'];
        if (!next) break;
        node = next;
      }

      predictions.push({
        actual: instance.class ?? 'unknown',
        predicted: node.class ?? 'unknown'
      });
    }

    const confusionMatrix = createConfusionMatrix(predictions);
    const metrics = calculateMetrics(confusionMatrix);
    const rocCurve = confusionMatrix.classLabels.length === 2
      ? generateROCCurve(predictions, confusionMatrix.classLabels)
      : undefined;

    return {
      confusionMatrix,
      metrics,
      rocCurve
    };
  }

  async getGeneInfo(genes: string[]): Promise<GeneAnnotation[]> {
    return genes.map(gene => ({
      symbol: gene,
      name: `${gene} gene`,
      description: `Mock description for ${gene}`,
      externalLinks: [
        { database: 'NCBI', url: `https://www.ncbi.nlm.nih.gov/gene/?term=${gene}`, id: `NCBI-${gene}` },
        { database: 'Ensembl', url: `https://ensembl.org/Multi/Search/Results?q=${gene}`, id: `ENSEMBL-${gene}` },
        { database: 'UniProt', url: `https://www.uniprot.org/uniprotkb?query=${gene}`, id: `UNIPROT-${gene}` },
        { database: 'STRING', url: `https://string-db.org/cgi/network?identifier=${gene}`, id: `STRING-${gene}` }
      ]
    }));
  }

  async rebuildSubtree(
    tree: DecisionTree,
    nodeId: string,
    newTest: Test,
    instances: Dataset['instances']
  ): Promise<DecisionTree> {
    if (!this.algorithm) {
      throw new Error('Algorithm not initialized');
    }

    const node = TreeUtils.findNodeById(tree.root, nodeId);
    if (!node) throw new Error('Node not found');

    // Apply the new test to get the split
    const { left, right } = TreeUtils.splitInstances(instances, newTest);

    // Get remaining attributes for splitting
    const attributes = tree.attributes
      ?.filter(attr => attr.name !== tree.decisionAttribute)
      .map(attr => attr.name)
      .filter(name => name !== newTest.attribute) || [];

    // Build new subtrees
    const leftSubtree = this.algorithm.buildNode(left, attributes, node.depth + 1);
    const rightSubtree = this.algorithm.buildNode(right, attributes, node.depth + 1);

    // Update the node
    Object.assign(node, {
      test: newTest,
      children: {
        left: leftSubtree,
        right: rightSubtree
      },
      instances: instances.length,
      entropy: TreeUtils.calculateEntropy(instances),
      leaf: false,
      class: undefined,
      classConfidence: undefined,
      classDistribution: undefined
    });

    return { ...tree };
  }

  async applyTest(
    tree: DecisionTree,
    nodeId: string,
    newTest: Test,
    instances: Dataset['instances']
  ): Promise<DecisionTree> {
    if (!this.algorithm) {
      throw new Error('Algorithm not initialized');
    }

    const node = TreeUtils.findNodeById(tree.root, nodeId);
    if (!node) throw new Error('Node not found');

    // Apply the new test to get the split
    const { left, right } = TreeUtils.splitInstances(instances, newTest);

    // Create leaf nodes for the splits
    const leftLeaf = TreeUtils.createLeafNode(left, node.depth + 1);
    const rightLeaf = TreeUtils.createLeafNode(right, node.depth + 1);

    // Update the node
    Object.assign(node, {
      test: newTest,
      children: {
        left: leftLeaf,
        right: rightLeaf
      },
      instances: instances.length,
      entropy: TreeUtils.calculateEntropy(instances),
      leaf: false,
      class: undefined,
      classConfidence: undefined,
      classDistribution: undefined
    });

    return { ...tree };
  }

  makeLeaf(tree: DecisionTree, nodeId: string, instances: Dataset['instances']): DecisionTree {
    const node = TreeUtils.findNodeById(tree.root, nodeId);
    if (!node) throw new Error('Node not found');

    const updatedNode = TreeUtils.convertToLeaf(node, instances);
    Object.assign(node, updatedNode);

    return { ...tree };
  }
}