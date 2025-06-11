export type DataType = 'continuous' | 'categorical' | 'binary';
export type AlgorithmType = 'C4.5' | 'TSP' | 'WTSP';
export type OmicsType = 'genomics' | 'proteomics' | 'metabolomics' | 'transcriptomics';
export type VotingStrategy = 'majority' | 'unanimous' | 'weighted';

export interface Attribute {
  name: string;
  type: DataType;
  possibleValues?: string[];
  isGeneExpression?: boolean;
  isProteinLevel?: boolean;
  isMetabolite?: boolean;
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
  omicsType?: OmicsType;
  isGenomic?: boolean;
  isProteomic?: boolean;
  isMetabolomic?: boolean;
  groupId?: string;
}

export interface DataGroup {
  id: string;
  name: string;
  type: OmicsType | 'simple';
  attributes: string[];
  color?: string;
}

export interface SplitTest {
  attribute: string;
  condition: '<' | '>' | '==' | '<=' | '>=' | '!=';
  value: string | number;
  algorithm: AlgorithmType;
  entropy: number;
  isValueAttribute: boolean;
  weight?: number;
}

export interface NodeStatistics {
  totalInstances: number;
  entropy: number;
  classDistribution: Record<string, number>;
}

export interface Element {
  id: string;
  type: 'node' | 'leaf';
  statistics: NodeStatistics;
}

export interface Node extends Element {
  type: 'node';
  test: SplitTest;
  children: Element[];
  alternativeSplits: SplitTest[];
  folded?: boolean;
}

export interface Leaf extends Element {
  type: 'leaf';
  predictedClass: string;
  classDistribution: Record<string, number>;
  canExpand: boolean;
}

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
  fusionType: 'multi-tree' | 'multi-test';
  omicsConfig?: {
    votingStrategy: VotingStrategy;
    weights: Record<string, number>;
  };
}

export interface ConfusionMatrix {
  matrix: Record<string, Record<string, number>>;
  classLabels: string[];
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

export interface ROCPoint {
  tpr: number;
  fpr: number;
  threshold: number;
}

export interface EvaluationResult {
  confusionMatrix: ConfusionMatrix;
  metrics: EvaluationMetrics;
  rocCurve?: ROCPoint[];
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