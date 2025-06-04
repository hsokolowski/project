import { Dataset, TreeNode, Test, DecisionTree, TreeConfig } from '../../types';

/**
 * Interface for decision tree algorithm implementations.
 * Standardizes the required methods for any algorithm used in the engine.
 */
export interface TreeAlgorithm {
  /**
   * Builds a full decision tree from the provided dataset and configuration.
   * @param dataset - The dataset to train on.
   * @param config - Tree construction parameters (depth, thresholds, etc.).
   * @returns A fully constructed decision tree.
   */
  buildTree(dataset: Dataset, config: TreeConfig): DecisionTree;

  /**
   * Creates a terminal leaf node using majority class distribution.
   * @param instances - Instances assigned to this node.
   * @param depth - Depth level of the node.
   * @returns A TreeNode with no children or test.
   */
  makeLeaf(instances: Dataset['instances'], depth: number): TreeNode;

  /**
   * Finds the best test and fallback alternatives for splitting the data.
   * @param instances - Instances to split.
   * @param attributes - Remaining candidate attributes.
   * @returns The best test, resulting splits, and up to 5 alternatives.
   */
  findBestSplit(instances: Dataset['instances'], attributes: string[]): {
    test: Test;
    splits: Dataset['instances'][];
    alternativeTests: Test[];
  } | null;

  /**
   * Builds a TreeNode recursively with test and children.
   * Falls back to a leaf if no good split is found.
   * @param instances - Instances at current node.
   * @param attributes - Attributes to consider for splits.
   * @param depth - Current depth in the tree.
   */
  buildNode(
    instances: Dataset['instances'],
    attributes: string[],
    depth: number
  ): TreeNode;

  /**
   * Applies a binary test to split instances into two branches.
   * @param instances - Full set of instances to split.
   * @param test - The test condition to apply.
   * @returns Two groups: left (match) and right (no match).
   */
  applyTest(
    instances: Dataset['instances'],
    test: Test
  ): { left: Dataset['instances']; right: Dataset['instances'] };

  /**
   * Converts an internal or leaf node into a final leaf.
   * Removes children and test from the node and replaces with class info.
   * @param node - The node to convert.
   * @param instances - Data instances at this node.
   * @returns A new TreeNode that is a leaf.
   */
  convertToLeaf(node: TreeNode, instances: Dataset['instances']): TreeNode;

  /**
   * Calculates entropy for a set of instances.
   * @param instances - Dataset instances.
   * @returns Entropy value.
   */
  calculateEntropy(instances: Dataset['instances']): number;
}