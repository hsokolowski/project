import { Dataset, TreeNode, Test, DecisionTree, TreeConfig, Algorithm } from '../../types';
import { TreeAlgorithm } from './TreeAlgorithm';
import { C45 } from './C45';
import { TSP } from './TSP';
import { WTSP } from './WTSP';

export class HybridAlgorithm implements TreeAlgorithm {
  private algorithms: TreeAlgorithm[];
  private config: TreeConfig;

  constructor(config: TreeConfig) {
    this.config = config;
    this.algorithms = (Array.isArray(config.algorithm) ? config.algorithm : [config.algorithm])
      .map(alg => {
        switch (alg) {
          case 'C4.5': return new C45(config);
          case 'TSP': return new TSP(config);
          case 'WTSP': return new WTSP(config);
          default: throw new Error(`Unsupported algorithm: ${alg}`);
        }
      });
  }

  calculateEntropy(instances: Dataset['instances']): number {
    return this.algorithms[0].calculateEntropy(instances);
  }

  findBestSplit(
    instances: Dataset['instances'],
    attributes: string[]
  ): { test: Test; splits: Dataset['instances'][]; alternativeTests: Test[] } | null {
    let bestSplit = null;
    let bestGain = -1;
    let allAlternatives: Test[] = [];

    // Try each algorithm and find the best split
    for (const algorithm of this.algorithms) {
      const split = algorithm.findBestSplit(instances, attributes);
      if (split && split.test.confidence > bestGain) {
        bestGain = split.test.confidence;
        bestSplit = split;
        allAlternatives = allAlternatives.concat(split.alternativeTests);
      }
    }

    if (!bestSplit) {
      return this.makeLeaf(instances, 0);
    }

    // Sort all alternatives by confidence and take top 5
    allAlternatives.sort((a, b) => b.confidence - a.confidence);
    bestSplit.alternativeTests = allAlternatives.slice(0, 5);

    return bestSplit;
  }

  makeLeaf(instances: Dataset['instances'], depth: number): TreeNode {
    const nodeId = `node-${Math.random().toString(36).substr(2, 9)}`;
    const entropy = this.calculateEntropy(instances);

    const classCounts: Record<string, number> = {};
    instances.forEach(i => {
      const label = i.class ?? 'unknown';
      classCounts[label] = (classCounts[label] || 0) + 1;
    });

    const total = instances.length;
    const sorted = Object.entries(classCounts).sort((a, b) => b[1] - a[1]);
    const majorityClass = sorted[0]?.[0] ?? 'Unknown';
    const confidence = sorted[0]?.[1] ? sorted[0][1] / total : 0;

    return {
      id: nodeId,
      leaf: true,
      class: majorityClass,
      classDistribution: classCounts,
      classConfidence: confidence,
      children: {},
      instances: total,
      entropy,
      depth
    };
  }

  convertToLeaf(node: TreeNode, instances: Dataset['instances']): TreeNode {
    const classCounts: Record<string, number> = {};
    instances.forEach(i => {
      const label = i.class ?? 'unknown';
      classCounts[label] = (classCounts[label] || 0) + 1;
    });
  
    const total = instances.length;
    const sorted = Object.entries(classCounts).sort((a, b) => b[1] - a[1]);
    const majorityClass = sorted[0]?.[0] ?? 'Unknown';
    const confidence = total > 0 ? (sorted[0]?.[1] ?? 0) / total : 0;
  
    return {
      id: node.id,
      leaf: true,
      class: majorityClass,
      classDistribution: classCounts,
      classConfidence: confidence,
      children: {},
      instances: total,
      entropy: this.calculateEntropy(instances),
      depth: node.depth,
      test: undefined,
      bestAlternativeTests: undefined,
      folded: false
    };
  }

  applyTest(
    instances: Dataset['instances'],
    test: Test
  ): { left: Dataset['instances']; right: Dataset['instances'] } {
    // Find the appropriate algorithm based on the test format
    const algorithm = test.attribute.includes('/') ? 
      this.algorithms.find(a => a instanceof WTSP) :
      test.value.toString().match(/^[0-9.]+$/) ?
        this.algorithms.find(a => a instanceof C45) :
        this.algorithms.find(a => a instanceof TSP);

    return (algorithm || this.algorithms[0]).applyTest(instances, test);
  }

  buildNode(
    instances: Dataset['instances'],
    attributes: string[],
    depth: number = 0
  ): TreeNode {
    if (
      depth >= this.config.maxDepth ||
      instances.length <= this.config.minInstancesPerLeaf ||
      attributes.length === 0
    ) {
      return this.makeLeaf(instances, depth);
    }

    const split = this.findBestSplit(instances, attributes);
    if (!split) {
      return this.makeLeaf(instances, depth);
    }

    const { test, splits, alternativeTests } = split;
    const remainingAttributes = attributes.filter(a => {
      if (test.attribute.includes('/')) {
        const [attr1, attr2] = test.attribute.split('/');
        return a !== attr1 && a !== attr2;
      }
      return a !== test.attribute;
    });

    const node: TreeNode = {
      id: `node-${Math.random().toString(36).substr(2, 9)}`,
      test,
      bestAlternativeTests: alternativeTests,
      children: {},
      leaf: false,
      instances: instances.length,
      entropy: this.calculateEntropy(instances),
      depth
    };

    node.children = {
      left: this.buildNode(splits[0], remainingAttributes, depth + 1),
      right: this.buildNode(splits[1], remainingAttributes, depth + 1)
    };

    return node;
  }

  buildTree(dataset: Dataset, config: TreeConfig): DecisionTree {
    this.config = config;
    const startTime = Date.now();

    const attributes = dataset.attributes
      .filter(attr => attr.name !== dataset.decisionAttribute)
      .map(attr => attr.name);

    const root = this.buildNode(dataset.instances, attributes);

    const algorithms = Array.isArray(config.algorithm) ? 
      config.algorithm.join('+') : 
      config.algorithm;

    return {
      id: `hybrid-${Date.now()}`,
      root,
      algorithm: algorithms,
      decisionAttribute: dataset.decisionAttribute || '',
      buildTime: Date.now() - startTime,
      maxDepth: config.maxDepth,
      attributes: dataset.attributes
    };
  }
}