import { ReactNode } from 'react';

// Base types
export type AlgorithmType = 'C4.5' | 'TSP' | 'WTSP' | string;

export interface SplitTest {
  attribute: string;
  weight?: number;
  condition: '<' | '>' | '==' | '<=' | '>=' | '!=';
  value: any;
  isValueAttribute?: boolean;
  algorithm: AlgorithmType;
  entropy: number;
}

export interface NodeStatistics {
  totalInstances: number;
  entropy: number;
  classDistribution: Record<string, number>;
}

export interface BaseElement {
  id: string;
  parentId?: string;
  statistics: NodeStatistics;
  folded?: boolean;
}

export interface Leaf extends BaseElement {
  type: 'leaf';
  predictedClass: string;
  classDistribution: Record<string, number>;
  canExpand: boolean;
}

export interface Node extends BaseElement {
  type: 'node';
  test: SplitTest;
  children: Element[];
  alternativeSplits: SplitTest[];
}

export type Element = Node | Leaf;

export interface DecisionTree {
  id: string;
  root: Element;
  config: ExperimentConfig;
}

export interface ExperimentConfig {
  algorithms: AlgorithmType[];
  maxDepth: number;
  minInstancesPerLeaf: number;
  entropyThreshold: number;
  handleMissing: 'ignore' | 'replace' | 'probabilistic';
  decisionAttribute: string;
  excludedAttributes: string[];
}

export interface EvaluationMetrics {
  accuracy: number;
  precision: Record<string, number>;
  recall: Record<string, number>;
  f1Score: Record<string, number>;
  macroAvgPrecision: number;
  macroAvgRecall: number;
  macroAvgF1: number;
}

export interface ConfusionMatrix {
  matrix: Record<string, Record<string, number>>;
  classLabels: string[];
}

export interface ROCPoint {
  fpr: number;
  tpr: number;
  threshold: number;
}

export interface EvaluationResult {
  confusionMatrix: ConfusionMatrix;
  metrics: EvaluationMetrics;
  rocCurve?: ROCPoint[];
}

// Data types
export type DataType = 'continuous' | 'categorical' | 'binary';

export interface Attribute {
  name: string;
  type: DataType;
  possibleValues?: string[];
  isGeneExpression?: boolean;
}

export interface Instance {
  id: string;
  values: Record<string, any>;
  class?: string;
}

export interface Dataset {
  name: string;
  attributes: Attribute[];
  instances: Instance[];
  decisionAttribute?: string;
  isGenomic?: boolean;
}

export interface GeneAnnotation {
  symbol: string;
  name: string;
  description: string;
  externalLinks: Array<{
    database: string;
    url: string;
    id: string;
  }>;
}