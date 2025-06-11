import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useMemo,
  useEffect
} from 'react';
import { toast } from 'react-hot-toast';
import {
  Dataset,
  ExperimentConfig,
  DecisionTree,
  SplitTest,
  Element,
  Instance,
  AlgorithmType,
  EvaluationResult,
  OmicsType,
  VotingStrategy
} from '../../types';
import { TreeEngine } from './TreeEngine';
import { IDecisionAlgorithm } from './interfaces/IDecisionAlgorithm';
import { C45 } from '../algorithms/C45';
import { TSP } from '../algorithms/TSP';
import { WTSP } from '../algorithms/WTSP';
import { TreeUtils } from '../utils/TreeUtils';

interface OmicsDataState {
  training: Dataset | null;
  test: Dataset | null;
}

interface TreeEngineContextType {
  engine: TreeEngine | null;
  omicsData: Partial<Record<OmicsType | 'simple', OmicsDataState>>;
  trees: Partial<Record<OmicsType | 'simple', DecisionTree & { test?: DecisionTree }>>;
  evaluations: Partial<Record<OmicsType | 'simple', EvaluationResult & { test?: EvaluationResult }>>;
  setOmicsData: (omicsType: OmicsType | 'simple', dataType: 'training' | 'test', data: Dataset) => void;
  buildTrees: (config: ExperimentConfig) => Promise<void>;
  applyDistribution: (nodeId: string, test: SplitTest, omicsType: OmicsType | 'simple') => Promise<void>;
  rebuildSubtree: (nodeId: string, algorithm: AlgorithmType, omicsType: OmicsType | 'simple', test?: SplitTest) => Promise<void>;
  makeLeaf: (nodeId: string, omicsType: OmicsType | 'simple') => void;
  unfoldLeafOnce: (nodeId: string, algorithm: AlgorithmType, omicsType: OmicsType | 'simple') => Promise<void>;
  unfoldLeafFully: (nodeId: string, algorithm: AlgorithmType, omicsType: OmicsType | 'simple') => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const TreeEngineContext = createContext<TreeEngineContextType | undefined>(undefined);

const algorithms: Record<string, IDecisionAlgorithm> = {
  'C4.5': new C45(),
  'TSP': new TSP(),
  'WTSP': new WTSP()
};

const combineOmicsPredictions = (
  predictions: Record<string, string>,
  weights: Record<string, number>,
  strategy: VotingStrategy
): string => {
  const weightedVotes: Record<string, number> = {};
  
  Object.entries(predictions).forEach(([type, prediction]) => {
    const weight = weights[type] || 1;
    weightedVotes[prediction] = (weightedVotes[prediction] || 0) + weight;
  });

  const sortedPredictions = Object.entries(weightedVotes)
    .sort(([, a], [, b]) => b - a);

  switch (strategy) {
    case 'unanimous':
      return Object.keys(weightedVotes).length === 1 ? 
        sortedPredictions[0][0] : 'Undecided';
    
    case 'weighted':
      return sortedPredictions[0][0];
    
    case 'majority':
    default:
      const totalVotes = Object.values(weightedVotes).reduce((a, b) => a + b, 0);
      return sortedPredictions[0][1] > totalVotes / 2 ? 
        sortedPredictions[0][0] : 'Undecided';
  }
};

export const TreeEngineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [engines, setEngines] = useState<Partial<Record<OmicsType | 'simple', TreeEngine>>>({});
  const [omicsData, setOmicsData] = useState<Partial<Record<OmicsType | 'simple', OmicsDataState>>>({});
  const [trees, setTrees] = useState<Partial<Record<OmicsType | 'simple', DecisionTree & { test?: DecisionTree }>>>({});
  const [evaluations, setEvaluations] = useState<Partial<Record<OmicsType | 'simple', EvaluationResult & { test?: EvaluationResult }>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateOmicsData = useCallback((
    omicsType: OmicsType | 'simple',
    dataType: 'training' | 'test',
    data: Dataset
  ) => {
    setOmicsData(prev => ({
      ...prev,
      [omicsType]: {
        ...prev[omicsType],
        [dataType]: data
      }
    }));
  }, []);

  const buildTrees = useCallback(async (config: ExperimentConfig) => {
    setIsLoading(true);
    setError(null);

    try {
      const newEngines: Partial<Record<OmicsType | 'simple', TreeEngine>> = {};
      const newTrees: Partial<Record<OmicsType | 'simple', DecisionTree & { test?: DecisionTree }>> = {};
      const newEvaluations: Partial<Record<OmicsType | 'simple', EvaluationResult & { test?: EvaluationResult }>> = {};

      // Handle single dataset case
      if (Object.keys(omicsData).length === 1 || config.fusionType === 'multi-test') {
        const mainDataState = config.fusionType === 'multi-test' 
          ? Object.values(omicsData)[0]
          : omicsData[Object.keys(omicsData)[0]];

        if (!mainDataState?.training) throw new Error('No training data available');

        const mainData = mainDataState.training;
        const testData = mainDataState.test;

        const updatedData = {
          ...mainData,
          decisionAttribute: config.decisionAttribute,
          instances: mainData.instances.map(instance => ({
            ...instance,
            class: instance.values[config.decisionAttribute]
          }))
        };

        const mainAlgorithm = algorithms[config.algorithms[0]];
        const tree = await mainAlgorithm.buildTree(updatedData.instances, config);
        const engine = new TreeEngine(tree, updatedData.instances, algorithms);
        const evaluation = await engine.evaluateTree(updatedData.instances);

        newEngines['simple'] = engine;
        newTrees['simple'] = { ...tree };
        newEvaluations['simple'] = { ...evaluation };

        // Build test tree if test data exists
        if (testData) {
          const updatedTestData = {
            ...testData,
            decisionAttribute: config.decisionAttribute,
            instances: testData.instances.map(instance => ({
              ...instance,
              class: instance.values[config.decisionAttribute]
            }))
          };

          const testTree = await mainAlgorithm.buildTree(updatedTestData.instances, config);
          const testEvaluation = await engine.evaluateTree(updatedTestData.instances);

          newTrees['simple'] = {
            ...newTrees['simple']!,
            test: testTree
          };
          newEvaluations['simple'] = {
            ...newEvaluations['simple']!,
            test: testEvaluation
          };
        }
      } 
      // Handle multi-tree fusion
      else {
        for (const [type, dataState] of Object.entries(omicsData)) {
          if (!dataState?.training) continue;

          const updatedData = {
            ...dataState.training,
            decisionAttribute: config.decisionAttribute,
            instances: dataState.training.instances.map(instance => ({
              ...instance,
              class: instance.values[config.decisionAttribute]
            }))
          };

          const mainAlgorithm = algorithms[config.algorithms[0]];
          const tree = await mainAlgorithm.buildTree(updatedData.instances, config);
          const engine = new TreeEngine(tree, updatedData.instances, algorithms);
          const evaluation = await engine.evaluateTree(updatedData.instances);

          newEngines[type] = engine;
          newTrees[type] = { ...tree };
          newEvaluations[type] = { ...evaluation };

          // Build test tree if test data exists
          if (dataState.test) {
            const updatedTestData = {
              ...dataState.test,
              decisionAttribute: config.decisionAttribute,
              instances: dataState.test.instances.map(instance => ({
                ...instance,
                class: instance.values[config.decisionAttribute]
              }))
            };

            const testTree = await mainAlgorithm.buildTree(updatedTestData.instances, config);
            const testEvaluation = await engine.evaluateTree(updatedTestData.instances);

            newTrees[type] = {
              ...newTrees[type]!,
              test: testTree
            };
            newEvaluations[type] = {
              ...newEvaluations[type]!,
              test: testEvaluation
            };
          }
        }
      }

      setEngines(newEngines);
      setTrees(newTrees);
      setEvaluations(newEvaluations);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      toast.error('Failed to build trees');
    } finally {
      setIsLoading(false);
    }
  }, [omicsData]);

  const combineDatasets = (datasets: Dataset[]): Dataset => {
    if (datasets.length === 0) throw new Error('No datasets to combine');
    
    const baseDataset = datasets[0];
    const combinedAttributes = datasets.reduce((attrs, dataset) => [
      ...attrs,
      ...dataset.attributes.map(attr => ({
        ...attr,
        name: dataset.omicsType ? `${dataset.omicsType}_${attr.name}` : attr.name
      }))
    ], [] as Dataset['attributes']);

    const combinedInstances = baseDataset.instances.map((instance, idx) => {
      const combinedValues = datasets.reduce((values, dataset) => ({
        ...values,
        ...Object.entries(dataset.instances[idx].values).reduce((acc, [key, value]) => ({
          ...acc,
          [dataset.omicsType ? `${dataset.omicsType}_${key}` : key]: value
        }), {})
      }), {});

      return {
        ...instance,
        values: combinedValues
      };
    });

    return {
      name: 'combined_dataset',
      attributes: combinedAttributes,
      instances: combinedInstances
    };
  };

  const applyDistribution = useCallback(async (
    nodeId: string,
    test: SplitTest,
    omicsType: OmicsType | 'simple'
  ) => {
    const engine = engines[omicsType];
    const tree = trees[omicsType];
    if (!engine || !tree) return;

    try {
      const updated = await engine.applyDistributionChange(nodeId, test);
      setTrees(prev => ({
        ...prev,
        [omicsType]: { ...updated }
      }));

      const evaluation = await engine.evaluateTree(omicsData[omicsType]?.training?.instances || []);
      setEvaluations(prev => ({
        ...prev,
        [omicsType]: evaluation
      }));
    } catch (err) {
      toast.error('Failed to apply distribution');
    }
  }, [engines, trees, omicsData]);

  const rebuildSubtree = useCallback(async (
    nodeId: string,
    algorithm: AlgorithmType,
    omicsType: OmicsType | 'simple',
    test?: SplitTest
  ) => {
    const engine = engines[omicsType];
    const tree = trees[omicsType];
    if (!engine || !tree) return;

    try {
      const updated = await engine.rebuildSubtree(nodeId, algorithm, test);
      setTrees(prev => ({
        ...prev,
        [omicsType]: { ...updated }
      }));

      const evaluation = await engine.evaluateTree(omicsData[omicsType]?.training?.instances || []);
      setEvaluations(prev => ({
        ...prev,
        [omicsType]: evaluation
      }));
    } catch (err) {
      toast.error('Failed to rebuild subtree');
    }
  }, [engines, trees, omicsData]);

  const makeLeaf = useCallback((nodeId: string, omicsType: OmicsType | 'simple') => {
    const engine = engines[omicsType];
    const tree = trees[omicsType];
    if (!engine || !tree) return;

    const node = engine.findNodeById(tree.root, nodeId);
    if (!node) return;

    const instances = engine.getInstancesForNode(nodeId);
    const leaf = TreeUtils.createLeafFromGroup(instances);
    
    Object.assign(node, leaf);
    setTrees(prev => ({
      ...prev,
      [omicsType]: { ...tree }
    }));
  }, [engines, trees]);

  const unfoldLeafOnce = useCallback(async (
    nodeId: string,
    algorithm: AlgorithmType,
    omicsType: OmicsType | 'simple'
  ) => {
    const engine = engines[omicsType];
    const tree = trees[omicsType];
    if (!engine || !tree) return;

    const node = engine.findNodeById(tree.root, nodeId);
    if (!node || node.type !== 'leaf') return;

    const instances = engine.getInstancesForNode(nodeId);
    const newTree = await algorithms[algorithm].buildTree(instances, {
      ...tree.config,
      maxDepth: 1,
      algorithms: [algorithm]
    });

    Object.assign(node, { ...newTree.root, id: node.id });
    setTrees(prev => ({
      ...prev,
      [omicsType]: { ...tree }
    }));
  }, [engines, trees]);

  const unfoldLeafFully = useCallback(async (
    nodeId: string,
    algorithm: AlgorithmType,
    omicsType: OmicsType | 'simple'
  ) => {
    const engine = engines[omicsType];
    const tree = trees[omicsType];
    if (!engine || !tree) return;

    const node = engine.findNodeById(tree.root, nodeId);
    if (!node || node.type !== 'leaf') return;

    const instances = engine.getInstancesForNode(nodeId);
    const newTree = await algorithms[algorithm].buildTree(instances, {
      ...tree.config,
      algorithms: [algorithm]
    });

    Object.assign(node, { ...newTree.root, id: node.id });
    setTrees(prev => ({
      ...prev,
      [omicsType]: { ...tree }
    }));
  }, [engines, trees]);

  const value = useMemo(
    () => ({
      engine: engines[Object.keys(engines)[0]] || null,
      omicsData,
      trees,
      evaluations,
      setOmicsData: updateOmicsData,
      buildTrees,
      applyDistribution,
      rebuildSubtree,
      makeLeaf,
      unfoldLeafOnce,
      unfoldLeafFully,
      isLoading,
      error,
    }),
    [
      engines,
      omicsData,
      trees,
      evaluations,
      updateOmicsData,
      buildTrees,
      applyDistribution,
      rebuildSubtree,
      makeLeaf,
      unfoldLeafOnce,
      unfoldLeafFully,
      isLoading,
      error,
    ]
  );

  return <TreeEngineContext.Provider value={value}>{children}</TreeEngineContext.Provider>;
};

export const useTreeEngine = (): TreeEngineContextType => {
  const context = useContext(TreeEngineContext);
  if (!context) {
    throw new Error('useTreeEngine must be used within a TreeEngineProvider');
  }
  return context;
};