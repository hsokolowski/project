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
  EvaluationResult
} from '../../types';
import { TreeEngine } from './TreeEngine';
import { IDecisionAlgorithm } from './interfaces/IDecisionAlgorithm';
import { C45 } from '../algorithms/C45';
import { TSP } from '../algorithms/TSP';
import { WTSP } from '../algorithms/WTSP';
import { TreeUtils } from '../utils/TreeUtils';

interface TreeEngineContextType {
  engine: TreeEngine | null;
  trainingData: Dataset | null;
  testData: Dataset | null;
  trainTree: DecisionTree | null;
  testTree: DecisionTree | null;
  trainEvaluation: EvaluationResult | null;
  testEvaluation: EvaluationResult | null;
  setTrainingData: (data: Dataset) => void;
  setTestData: (data: Dataset) => void;
  buildTrees: (config: ExperimentConfig) => Promise<void>;
  applyDistribution: (nodeId: string, test: SplitTest) => Promise<void>;
  rebuildSubtree: (nodeId: string, algorithm: AlgorithmType, test?: SplitTest) => Promise<void>;
  makeLeaf: (nodeId: string) => void;
  unfoldLeafOnce: (nodeId: string, algorithm: AlgorithmType) => Promise<void>;
  unfoldLeafFully: (nodeId: string, algorithm: AlgorithmType) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const TreeEngineContext = createContext<TreeEngineContextType | undefined>(undefined);

const algorithms: Record<string, IDecisionAlgorithm> = {
  'C4.5': new C45(),
  'TSP': new TSP(),
  'WTSP': new WTSP()
};

export const TreeEngineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [engine, setEngine] = useState<TreeEngine | null>(null);
  const [trainingData, setTrainingData] = useState<Dataset | null>(null);
  const [testData, setTestData] = useState<Dataset | null>(null);
  const [trainTree, setTrainTree] = useState<DecisionTree | null>(null);
  const [testTree, setTestTree] = useState<DecisionTree | null>(null);
  const [trainEvaluation, setTrainEvaluation] = useState<EvaluationResult | null>(null);
  const [testEvaluation, setTestEvaluation] = useState<EvaluationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update evaluations whenever trees change
  useEffect(() => {
    const updateEvaluations = async () => {
      if (engine && trainTree && trainingData?.decisionAttribute) {
        const trainEval = await engine.evaluateTree(trainingData.instances);
        setTrainEvaluation(trainEval);

        if (testTree && testData) {
          const testEval = await engine.evaluateTree(testData.instances);
          setTestEvaluation(testEval);
        }
      }
    };

    updateEvaluations();
  }, [engine, trainTree, testTree, trainingData, testData]);

  const buildTestTree = useCallback(
    async (trainTree: DecisionTree, testInstances: Instance[]): Promise<DecisionTree> => {
      const cloneElement = (element: Element): Element => {
        if (element.type === 'leaf') {
          return {
            ...element,
            id: `test-${element.id}`,
            statistics: TreeUtils.calculateStats([]),
            classDistribution: {},
            predictedClass: 'Unknown'
          };
        }

        return {
          ...element,
          id: `test-${element.id}`,
          statistics: TreeUtils.calculateStats([]),
          children: element.children.map(cloneElement)
        };
      };

      const testRoot = cloneElement(trainTree.root);
      const testTreeStructure: DecisionTree = {
        ...trainTree,
        id: `test-${trainTree.id}`,
        root: testRoot
      };

      const updateNodeStats = (node: Element, instances: Instance[]) => {
        const stats = TreeUtils.calculateStats(instances);
        node.statistics = stats;

        if (node.type === 'leaf') {
          node.classDistribution = stats.classDistribution;
          node.predictedClass = Object.entries(stats.classDistribution)
            .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Unknown';
        } else {
          const splits = TreeUtils.splitInstances(instances, node.test);
          node.children.forEach((child, index) => {
            updateNodeStats(child, splits[index]);
          });
        }
      };

      updateNodeStats(testTreeStructure.root, testInstances);
      return testTreeStructure;
    },
    []
  );

  const buildTrees = useCallback(
    async (config: ExperimentConfig) => {
      if (!trainingData) {
        setError('Training data is required');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Update training data with the selected decision attribute
        const updatedTrainingData = {
          ...trainingData,
          decisionAttribute: config.decisionAttribute,
          instances: trainingData.instances.map(instance => ({
            ...instance,
            class: instance.values[config.decisionAttribute]
          }))
        };

        // Update test data if it exists
        const updatedTestData = testData ? {
          ...testData,
          decisionAttribute: config.decisionAttribute,
          instances: testData.instances.map(instance => ({
            ...instance,
            class: instance.values[config.decisionAttribute]
          }))
        } : null;

        const mainAlgorithm = algorithms[config.algorithms[0]];
        const newTrainTree = await mainAlgorithm.buildTree(updatedTrainingData.instances, config);
        const newEngine = new TreeEngine(newTrainTree, updatedTrainingData.instances, algorithms);
        
        setEngine(newEngine);
        setTrainTree(newTrainTree);
        setTrainingData(updatedTrainingData);

        if (updatedTestData) {
          const newTestTree = await buildTestTree(newTrainTree, updatedTestData.instances);
          setTestTree(newTestTree);
          setTestData(updatedTestData);
        }

        // Calculate initial evaluations
        const trainEval = await newEngine.evaluateTree(updatedTrainingData.instances);
        setTrainEvaluation(trainEval);

        if (updatedTestData) {
          const testEval = await newEngine.evaluateTree(updatedTestData.instances);
          setTestEvaluation(testEval);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        toast.error('Failed to build tree');
      } finally {
        setIsLoading(false);
      }
    },
    [trainingData, testData, buildTestTree]
  );

  const applyDistribution = useCallback(
    async (nodeId: string, test: SplitTest) => {
      if (!engine || !trainTree) return;
      try {
        const updated = await engine.applyDistributionChange(nodeId, test);
        setTrainTree({ ...updated });

        if (testTree && testData) {
          const newTestTree = await buildTestTree(updated, testData.instances);
          setTestTree(newTestTree);
        }
      } catch (err) {
        toast.error('Failed to apply distribution');
      }
    },
    [engine, trainTree, testTree, testData, buildTestTree]
  );

  const rebuildSubtree = useCallback(
    async (nodeId: string, algorithm: AlgorithmType, test?: SplitTest) => {
      if (!engine || !trainTree) return;
      try {
        const updated = await engine.rebuildSubtree(nodeId, algorithm, test);
        setTrainTree({ ...updated });

        if (testTree && testData) {
          const newTestTree = await buildTestTree(updated, testData.instances);
          setTestTree(newTestTree);
        }
      } catch (err) {
        toast.error('Failed to rebuild subtree');
      }
    },
    [engine, trainTree, testTree, testData, buildTestTree]
  );

  const makeLeaf = useCallback(
    (nodeId: string) => {
      if (!engine || !trainTree) return;
      const node = engine.findNodeById(trainTree.root, nodeId);
      if (!node) return;

      const instances = engine.getInstancesForNode(nodeId);
      const leaf = TreeUtils.createLeafFromGroup(instances);
      
      Object.assign(node, leaf);
      setTrainTree({ ...trainTree });

      if (testTree && testData) {
        const testNode = engine.findNodeById(testTree.root, `test-${nodeId}`);
        if (testNode) {
          const testInstances = engine.getInstancesForNode(`test-${nodeId}`);
          const testLeaf = TreeUtils.createLeafFromGroup(testInstances);
          Object.assign(testNode, testLeaf);
          setTestTree({ ...testTree });
        }
      }
    },
    [engine, trainTree, testTree, testData]
  );

  const unfoldLeafOnce = useCallback(
    async (nodeId: string, algorithm: AlgorithmType) => {
      if (!engine || !trainTree) return;
      const node = engine.findNodeById(trainTree.root, nodeId);
      if (!node || node.type !== 'leaf') return;

      const instances = engine.getInstancesForNode(nodeId);
      const newTree = await algorithms[algorithm].buildTree(instances, {
        ...trainTree.config,
        maxDepth: 1,
        algorithms: [algorithm]
      });

      Object.assign(node, {...newTree.root, id: node.id });
      setTrainTree({ ...trainTree });

      if (testTree && testData) {
        const testNode = engine.findNodeById(testTree.root, `test-${nodeId}`);
        if (testNode) {
          const testInstances = engine.getInstancesForNode(`test-${nodeId}`);
          const newTestTree = await buildTestTree(newTree, testInstances);
          Object.assign(testNode, {...newTestTree.root, id: `test-${nodeId}` });
          setTestTree({ ...testTree });
        }
      }
    },
    [engine, trainTree, testTree, testData, buildTestTree]
  );

  const unfoldLeafFully = useCallback(
    async (nodeId: string, algorithm: AlgorithmType) => {
      if (!engine || !trainTree) return;
      const node = engine.findNodeById(trainTree.root, nodeId);
      if (!node || node.type !== 'leaf') return;

      const instances = engine.getInstancesForNode(nodeId);
      const newTree = await algorithms[algorithm].buildTree(instances, {
        ...trainTree.config,
        algorithms: [algorithm]
      });

      Object.assign(node, {...newTree.root, id: node.id });
      setTrainTree({ ...trainTree });

      if (testTree && testData) {
        const testNode = engine.findNodeById(testTree.root, `test-${nodeId}`);
        if (testNode) {
          const testInstances = engine.getInstancesForNode(`test-${nodeId}`);
          const newTestTree = await buildTestTree(newTree, testInstances);
          Object.assign(testNode, {...newTestTree.root, id: `test-${nodeId}` });
          setTestTree({ ...testTree });
        }
      }
    },
    [engine, trainTree, testTree, testData, buildTestTree]
  );

  const value = useMemo(
    () => ({
      engine,
      trainingData,
      testData,
      trainTree,
      testTree,
      trainEvaluation,
      testEvaluation,
      setTrainingData,
      setTestData,
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
      engine,
      trainingData,
      testData,
      trainTree,
      testTree,
      trainEvaluation,
      testEvaluation,
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