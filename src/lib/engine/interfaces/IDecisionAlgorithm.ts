import { DecisionTree, Instance, ExperimentConfig } from '../../../types';

export interface IDecisionAlgorithm {
  buildTree(instances: Instance[], config: ExperimentConfig): Promise<DecisionTree>;
}