import { DecisionTree, TreeConfig, Dataset, EvaluationResult, GeneAnnotation, TreeNode, Test, Instance, Element } from '../../types';
import { TreeUtils } from '../utils/TreeUtils';
import { IDecisionAlgorithm } from './interfaces/IDecisionAlgorithm';
import { createConfusionMatrix, calculateMetrics, generateROCCurve } from '../utils/metrics';

export class TreeEngine {
  constructor(
    private currentTree: DecisionTree,
    private dataset: Instance[],
    private algorithms: Record<string, IDecisionAlgorithm>
  ) {}

  findNodeById(current: Element, nodeId: string): Element | null {
    return TreeUtils.findNodeById(current, nodeId);
  }

  getInstancesForNode(nodeId: string): Instance[] {
    return this.dataset.filter(instance =>
      this.reachesNode(this.currentTree.root, instance, nodeId)
    );
  }

  private reachesNode(current: Element, instance: Instance, targetId: string): boolean {
    if (current.id === targetId) return true;

    if (current.type === 'node') {
      const match = TreeUtils.evaluate(instance, current.test);
      const next = match ? current.children[0] : current.children[1];
      return next ? this.reachesNode(next, instance, targetId) : false;
    }

    return false;
  }

  async evaluateTree(instances: Instance[]): Promise<EvaluationResult> {
    const predictions: { actual: string; predicted: string }[] = [];

    for (const instance of instances) {
      if (!instance.class) continue;

      let currentNode = this.currentTree.root;
      
      while (currentNode.type === 'node') {
        const match = TreeUtils.evaluate(instance, currentNode.test);
        const nextNode = match ? currentNode.children[0] : currentNode.children[1];
        if (!nextNode) break;
        currentNode = nextNode;
      }

      if (currentNode.type === 'leaf') {
        predictions.push({
          actual: instance.class,
          predicted: currentNode.predictedClass
        });
      }
    }

    const confusionMatrix = createConfusionMatrix(
      predictions.map(p => p.actual),
      predictions.map(p => p.predicted)
    );

    const metrics = calculateMetrics(confusionMatrix);

    const rocCurve = confusionMatrix.classLabels.length === 2 
      ? generateROCCurve(
          predictions.map(p => p.actual),
          predictions.map(p => p.predicted === confusionMatrix.classLabels[1] ? 1 : 0),
          confusionMatrix.classLabels[1]
        )
      : undefined;

    return {
      confusionMatrix,
      metrics,
      rocCurve
    };
  }

  async applyDistributionChange(nodeId: string, newTest: Test): Promise<DecisionTree> {
    const node = this.findNodeById(this.currentTree.root, nodeId);
    if (!node || node.type !== 'node') throw new Error('Invalid node');
    const instances = this.getInstancesForNode(nodeId);
    const groups = TreeUtils.splitInstances(instances, newTest);

    node.test = newTest;

    node.children.forEach((child, i) => {
      const childInstances = groups[i] ?? [];
      this.recursivelyUpdateStatistics(child, childInstances);
    });

    return this.currentTree;
  }

  private recursivelyUpdateStatistics(element: Element, instances: Instance[]): void {
    const stats = TreeUtils.calculateStats(instances);
    element.statistics = stats;

    if (element.type === 'leaf') {
      element.statistics = stats;
      element.canExpand = stats.entropy > 0;
      element.classDistribution = stats.classDistribution;
      element.predictedClass = Object.entries(stats.classDistribution)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Unknown';
      return;
    }

    const splitGroups = TreeUtils.splitInstances(instances, element.test);
    element.children.forEach((child, idx) => {
      const childInstances = splitGroups[idx] ?? [];
      this.recursivelyUpdateStatistics(child, childInstances);
    });
  }

  async rebuildSubtree(nodeId: string, algorithm: string, customTest?: Test): Promise<DecisionTree> {
    const node = this.findNodeById(this.currentTree.root, nodeId);
    if (!node || node.type !== 'node') throw new Error('Invalid node');

    const instances = this.getInstancesForNode(nodeId);
    const testToUse = customTest ?? node.test;
    const splitGroups = TreeUtils.splitInstances(instances, testToUse);

    node.test = testToUse;
    node.children = await Promise.all(
      splitGroups.map(async group =>
        this.algorithms[algorithm].buildTree(group, this.currentTree.config).then(tree => tree.root)
      )
    );

    return this.currentTree;
  }
}