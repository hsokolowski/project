import React, { useState, useEffect, useMemo } from 'react';
import { Element, SplitTest, AlgorithmType, DecisionTree, OmicsType } from '../../types';
import { Edit2, RefreshCw, UnfoldVertical, Split, Table, X, Plus, Minus, BarChart3, Target, Shuffle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTreeEngine } from '../../lib/engine/TreeEngineContext';
import { Select } from '../ui/Select';
import { DataViewer } from './DataViewer';
import { LeafDataVisualization } from './LeafDataVisualization';
import { TreeUtils } from '../../lib/utils/TreeUtils';

interface NodeEditorProps {
  node: Element;
  tree: DecisionTree;
  omicsType: OmicsType | 'simple';
}

interface TestConfig {
  algorithm: AlgorithmType;
  attribute: string;
  condition: '<' | '>' | '==' | '<=' | '>=' | '!=';
  value: string | number;
  weight?: number;
  gain?: number;
  gainRatio?: number;
  leftSplit?: number[];
  rightSplit?: number[];
  similarity?: number;
  gainSimilarity?: number; // NEW: Similarity to Test 1
}

interface EnhancedAlternativeTest extends SplitTest {
  gain: number;
  gainRatio: number;
  leftSplit: number[];
  rightSplit: number[];
  similarity: number;
}

interface MultiTestMetrics {
  entropy: number;
  consistency: number;
}

export const NodeEditor: React.FC<NodeEditorProps> = ({ 
  node, 
  tree,
  omicsType
}) => {
  const {
    rebuildSubtree,
    applyDistribution,
    unfoldLeafOnce,
    unfoldLeafFully,
    omicsData,
    engine
  } = useTreeEngine();

  const [showDataViewer, setShowDataViewer] = useState(false);
  const [showLeafVisualization, setShowLeafVisualization] = useState(false);
  const availableAlgorithms: AlgorithmType[] = ['C4.5', 'TSP', 'WTSP'];

  // Multi-test configuration (only for nodes)
  const [multiTestSize, setMultiTestSize] = useState<1 | 3 | 5>(1);
  const [activeTestTab, setActiveTestTab] = useState(0);
  const [testType, setTestType] = useState<'selected' | 'mixed'>('selected');
  const [fusionType, setFusionType] = useState<'same-omic' | 'mixed-omics'>('same-omic');

  // Original edit form for backward compatibility
  const [editForm, setEditForm] = useState<{
    algorithm: AlgorithmType;
    attribute: string;
    condition: '<' | '>' | '==' | '<=' | '>=' | '!=';
    value: string | number;
    weight?: number;
    rebuildSubtree: boolean;
    continueWithAlgorithm: 'hybrid' | 'selected';
  }>({
    algorithm: node.type === 'node' ? node.test.algorithm : tree.config.algorithms[0],
    attribute: node.type === 'node' ? node.test.attribute : '',
    condition: node.type === 'node' ? node.test.condition : '<',
    value: node.type === 'node' ? node.test.value : '',
    weight: node.type === 'node' ? node.test.weight : 1,
    rebuildSubtree: false,
    continueWithAlgorithm: 'hybrid'
  });

  // Multi-test configurations (only for nodes)
  const [testConfigs, setTestConfigs] = useState<TestConfig[]>(() => 
    Array.from({ length: multiTestSize }, (_, i) => ({
      algorithm: node.type === 'node' && i === 0 ? node.test.algorithm : tree.config.algorithms[0],
      attribute: node.type === 'node' && i === 0 ? node.test.attribute : '',
      condition: node.type === 'node' && i === 0 ? node.test.condition : '<',
      value: node.type === 'node' && i === 0 ? node.test.value : '',
      weight: node.type === 'node' && i === 0 ? node.test.weight : 1,
    }))
  );

  const availableAttributes = useMemo(() => {
    const dataset = omicsData[omicsType]?.training;
    if (!dataset?.attributes) return [];
    
    return dataset.attributes
      .filter(attr => 
        !tree.config.excludedAttributes.includes(attr.name) && 
        attr.name !== tree.config.decisionAttribute
      )
      .map(attr => ({
        name: attr.name,
        type: attr.type,
        examples: attr.possibleValues?.slice(0, 3).join(', ') || 'No examples available'
      }));
  }, [omicsData, tree.config, omicsType]);

  // Get instances for this node
  const nodeInstances = useMemo(() => {
    return engine?.getInstancesForNode(node.id) || [];
  }, [engine, node.id]);

  // Calculate alternative tests with REAL metrics (only for nodes)
  const alternativeTests = useMemo((): EnhancedAlternativeTest[] => {
    if (node.type !== 'node' || !nodeInstances.length) return [];
    
    // Get reference split from current test
    const referenceSplit = TreeUtils.splitInstances(nodeInstances, node.test);
    
    return node.alternativeSplits.map((test) => {
      const evaluation = TreeUtils.evaluateAlternativeTest(
        nodeInstances,
        test,
        referenceSplit
      );
      
      return {
        ...test,
        gain: evaluation.gain,
        gainRatio: evaluation.gainRatio,
        leftSplit: evaluation.leftSplit,
        rightSplit: evaluation.rightSplit,
        similarity: evaluation.similarity
      };
    });
  }, [node, nodeInstances]);

  useEffect(() => {
    if (node.type === 'node') {
      setEditForm(prev => ({
        ...prev,
        attribute: node.test.attribute,
        condition: node.test.condition,
        value: node.test.value,
        weight: node.test.weight,
        algorithm: node.test.algorithm
      }));
    }
  }, [node]);

  // Update test configs when multiTestSize changes (only for nodes)
  useEffect(() => {
    if (node.type === 'node') {
      setTestConfigs(prev => {
        const newConfigs = Array.from({ length: multiTestSize }, (_, i) => {
          if (i < prev.length) {
            return prev[i];
          }
          return {
            algorithm: tree.config.algorithms[0],
            attribute: '',
            condition: '<' as const,
            value: '',
            weight: 1,
          };
        });
        return newConfigs;
      });
      setActiveTestTab(0);
    }
  }, [multiTestSize, tree.config.algorithms, node.type]);

  const updateTestConfig = (index: number, updates: Partial<TestConfig>) => {
    setTestConfigs(prev => prev.map((config, i) => 
      i === index ? { ...config, ...updates } : config
    ));
  };

  // Calculate real-time metrics for current test configuration
  const calculateTestMetrics = (config: TestConfig): Partial<TestConfig> => {
    if (!config.attribute || !config.value || !nodeInstances.length) {
      return {};
    }

    try {
      const test: SplitTest = {
        attribute: config.attribute,
        condition: config.condition,
        value: config.value,
        weight: config.weight,
        algorithm: config.algorithm,
        entropy: node.statistics.entropy,
        isValueAttribute: config.algorithm === 'TSP' || config.algorithm === 'WTSP'
      };

      const referenceSplit = node.type === 'node' ? 
        TreeUtils.splitInstances(nodeInstances, node.test) : undefined;

      const evaluation = TreeUtils.evaluateAlternativeTest(
        nodeInstances,
        test,
        referenceSplit
      );

      return {
        gain: evaluation.gain,
        gainRatio: evaluation.gainRatio,
        leftSplit: evaluation.leftSplit,
        rightSplit: evaluation.rightSplit,
        similarity: evaluation.similarity
      };
    } catch (error) {
      console.warn('Error calculating test metrics:', error);
      return {};
    }
  };

  // NEW: Calculate gain similarity between tests
  const calculateGainSimilarity = (testIndex: number): number => {
    if (testIndex === 0 || multiTestSize === 1) return 0; // No similarity for Test 1
    
    const test1 = testConfigs[0];
    const currentTest = testConfigs[testIndex];
    
    if (!test1.attribute || !currentTest.attribute || !nodeInstances.length) return 0;
    
    try {
      // Create SplitTest objects
      const splitTest1: SplitTest = {
        attribute: test1.attribute,
        condition: test1.condition,
        value: test1.value,
        weight: test1.weight,
        algorithm: test1.algorithm,
        entropy: node.statistics.entropy,
        isValueAttribute: test1.algorithm === 'TSP' || test1.algorithm === 'WTSP'
      };
      
      const splitTestCurrent: SplitTest = {
        attribute: currentTest.attribute,
        condition: currentTest.condition,
        value: currentTest.value,
        weight: currentTest.weight,
        algorithm: currentTest.algorithm,
        entropy: node.statistics.entropy,
        isValueAttribute: currentTest.algorithm === 'TSP' || currentTest.algorithm === 'WTSP'
      };
      
      // Get splits for both tests
      const split1 = TreeUtils.splitInstances(nodeInstances, splitTest1);
      const splitCurrent = TreeUtils.splitInstances(nodeInstances, splitTestCurrent);
      
      // Calculate how many instances are classified the same way
      let sameDecisions = 0;
      const totalInstances = nodeInstances.length;
      
      nodeInstances.forEach(instance => {
        const decision1 = TreeUtils.evaluate(instance, splitTest1);
        const decisionCurrent = TreeUtils.evaluate(instance, splitTestCurrent);
        if (decision1 === decisionCurrent) {
          sameDecisions++;
        }
      });
      
      return totalInstances > 0 ? (sameDecisions / totalInstances) * 100 : 0;
    } catch (error) {
      console.warn('Error calculating gain similarity:', error);
      return 0;
    }
  };

  // NEW: Calculate multi-test consistency metrics
  const calculateMultiTestMetrics = (): MultiTestMetrics => {
    if (multiTestSize === 1 || !nodeInstances.length) {
      return {
        entropy: node.statistics.entropy,
        consistency: 100
      };
    }
    
    try {
      // Calculate overall entropy for the multi-test (same as node entropy)
      const entropy = node.statistics.entropy;
      
      // Calculate consistency - how often all tests agree
      let consistentDecisions = 0;
      const totalInstances = nodeInstances.length;
      
      nodeInstances.forEach(instance => {
        const decisions: boolean[] = [];
        
        // Get decision from each test
        testConfigs.forEach(config => {
          if (config.attribute && config.value) {
            try {
              const splitTest: SplitTest = {
                attribute: config.attribute,
                condition: config.condition,
                value: config.value,
                weight: config.weight,
                algorithm: config.algorithm,
                entropy: node.statistics.entropy,
                isValueAttribute: config.algorithm === 'TSP' || config.algorithm === 'WTSP'
              };
              
              const decision = TreeUtils.evaluate(instance, splitTest);
              decisions.push(decision);
            } catch (error) {
              // Skip invalid tests
            }
          }
        });
        
        // Check if all decisions are the same
        if (decisions.length > 1) {
          const firstDecision = decisions[0];
          const allSame = decisions.every(d => d === firstDecision);
          if (allSame) {
            consistentDecisions++;
          }
        }
      });
      
      const consistency = totalInstances > 0 ? (consistentDecisions / totalInstances) * 100 : 100;
      
      return { entropy, consistency };
    } catch (error) {
      console.warn('Error calculating multi-test metrics:', error);
      return {
        entropy: node.statistics.entropy,
        consistency: 0
      };
    }
  };

  const handleEditSubmit = async () => {
    try {
      const newTest: SplitTest = {
        attribute: editForm.attribute,
        condition: editForm.condition,
        value: editForm.value,
        weight: editForm.weight,
        algorithm: editForm.algorithm,
        entropy: node.statistics.entropy,
        isValueAttribute: editForm.algorithm === 'TSP' || editForm.algorithm === 'WTSP'
      };

      if (editForm.rebuildSubtree) {
        await rebuildSubtree(
          node.id, 
          editForm.continueWithAlgorithm === 'hybrid' ? 'HYBRID' : editForm.algorithm,
          omicsType,
          newTest
        );
        toast.success('Subtree rebuilt successfully');
      } else {
        await applyDistribution(node.id, newTest, omicsType);
        toast.success('Node updated successfully');
      }
    } catch (err) {
      console.error('Failed to update node:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update node');
    }
  };

  const handleRebuildNode = async (rebuildSubtreeFlag: boolean = false) => {
    try {
      const currentTest = testConfigs[activeTestTab];
      
      const newTest: SplitTest = {
        attribute: currentTest.attribute,
        condition: currentTest.condition,
        value: currentTest.value,
        weight: currentTest.weight,
        algorithm: currentTest.algorithm,
        entropy: node.statistics.entropy,
        isValueAttribute: currentTest.algorithm === 'TSP' || currentTest.algorithm === 'WTSP'
      };

      if (rebuildSubtreeFlag) {
        await rebuildSubtree(
          node.id, 
          testType === 'mixed' ? 'HYBRID' : currentTest.algorithm,
          omicsType,
          newTest
        );
        toast.success('Subtree rebuilt successfully');
      } else {
        await applyDistribution(node.id, newTest, omicsType);
        toast.success('Node updated successfully');
      }
    } catch (err) {
      console.error('Failed to update node:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update node');
    }
  };

  const handleUnfold = async (type: 'once' | 'fully') => {
    try {
      if (type === 'once') {
        await unfoldLeafOnce(node.id, editForm.algorithm, omicsType);
        toast.success('Node unfolded once');
      } else {
        await unfoldLeafFully(node.id, editForm.algorithm, omicsType);
        toast.success('Node unfolded fully');
      }
    } catch (err) {
      console.error('Failed to unfold node:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to unfold node');
    }
  };

  const applyAlternativeTest = (altTest: EnhancedAlternativeTest) => {
    if (multiTestSize === 1) {
      // Use original editForm for single test
      setEditForm(prev => ({
        ...prev,
        attribute: altTest.attribute,
        condition: altTest.condition,
        value: altTest.value,
        weight: altTest.weight,
        algorithm: altTest.algorithm
      }));
    } else {
      // Use testConfigs for multi-test
      updateTestConfig(activeTestTab, {
        attribute: altTest.attribute,
        condition: altTest.condition,
        value: altTest.value,
        weight: altTest.weight,
        algorithm: altTest.algorithm,
        gain: altTest.gain,
        gainRatio: altTest.gainRatio,
        leftSplit: altTest.leftSplit,
        rightSplit: altTest.rightSplit,
        similarity: altTest.similarity
      });
    }
  };

  const getTestPreview = (config?: TestConfig) => {
    const testConfig = config || (multiTestSize === 1 ? editForm : testConfigs[activeTestTab]);
    if (!testConfig || !testConfig.attribute || !testConfig.value) return 'Select attributes to preview test';

    if (testConfig.algorithm === 'WTSP') {
      const weight = testConfig.weight || 1;
      return `${weight} × ${testConfig.attribute} ${testConfig.condition} ${testConfig.value}`;
    }

    if (testConfig.algorithm === 'TSP') {
      return `${testConfig.attribute} ${testConfig.condition} ${testConfig.value}`;
    }

    return `${testConfig.attribute} ${testConfig.condition} ${testConfig.value}`;
  };

  const renderTestInput = (config?: TestConfig, index?: number) => {
    const isMultiTest = multiTestSize > 1 && config && index !== undefined;
    const currentConfig = isMultiTest ? config : editForm;
    const updateConfig = isMultiTest 
      ? (updates: any) => {
          const metrics = calculateTestMetrics({ ...config!, ...updates });
          updateTestConfig(index!, { ...updates, ...metrics });
        }
      : (updates: any) => setEditForm(prev => ({ ...prev, ...updates }));

    if (currentConfig.algorithm === 'WTSP') {
      return (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Select two attributes to compare their weighted ratio:</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Numerator Attribute:</label>
              <Select
                value={currentConfig.attribute}
                onChange={value => updateConfig({ attribute: value })}
                options={availableAttributes.map(attr => ({
                  value: attr.name,
                  label: `${attr.name} (e.g. ${attr.examples})`
                }))}
                placeholder="First attribute"
                searchable
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Denominator Attribute:</label>
              <Select
                value={currentConfig.value as string}
                onChange={value => updateConfig({ value })}
                options={availableAttributes.map(attr => ({
                  value: attr.name,
                  label: `${attr.name} (e.g. ${attr.examples})`
                }))}
                placeholder="Second attribute"
                searchable
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-gray-500 mb-1">Weight multiplier for {currentConfig.attribute}:</label>
            <input
              type="number"
              value={currentConfig.weight || 1}
              onChange={e => updateConfig({ weight: Number(e.target.value) })}
              className="w-full text-sm border rounded p-2"
              step="0.1"
            />
          </div>

          <select
            value={currentConfig.condition}
            onChange={e => updateConfig({ condition: e.target.value as SplitTest['condition'] })}
            className="w-full text-sm border rounded p-2"
          >
            <option value="<">less than</option>
            <option value="<=">less or equal</option>
            <option value=">">greater than</option>
            <option value=">=">greater or equal</option>
            <option value="==">equals</option>
            <option value="!=">not equals</option>
          </select>
        </div>
      );
    }

    if (currentConfig.algorithm === 'TSP') {
      return (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Select two attributes to compare:</p>
          <Select
            value={currentConfig.attribute}
            onChange={value => updateConfig({ attribute: value })}
            options={availableAttributes.map(attr => ({
              value: attr.name,
              label: `${attr.name} (e.g. ${attr.examples})`
            }))}
            placeholder="First attribute"
            searchable
          />
          
          <Select
            value={currentConfig.value as string}
            onChange={value => updateConfig({ value })}
            options={availableAttributes.map(attr => ({
              value: attr.name,
              label: `${attr.name} (e.g. ${attr.examples})`
            }))}
            placeholder="Second attribute"
            searchable
          />

          <select
            value={currentConfig.condition}
            onChange={e => updateConfig({ condition: e.target.value as SplitTest['condition'] })}
            className="w-full text-sm border rounded p-2"
          >
            <option value="<">less than</option>
            <option value="<=">less or equal</option>
            <option value=">">greater than</option>
            <option value=">=">greater or equal</option>
            <option value="==">equals</option>
            <option value="!=">not equals</option>
          </select>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <Select
          value={currentConfig.attribute}
          onChange={value => updateConfig({ attribute: value })}
          options={availableAttributes.map(attr => ({
            value: attr.name,
            label: `${attr.name} (e.g. ${attr.examples})`
          }))}
          placeholder="Select attribute"
          searchable
        />

        <select
          value={currentConfig.condition}
          onChange={e => updateConfig({ condition: e.target.value as SplitTest['condition'] })}
          className="w-full text-sm border rounded p-2"
        >
          <option value="<">less than</option>
          <option value="<=">less or equal</option>
          <option value=">">greater than</option>
          <option value=">=">greater or equal</option>
          <option value="==">equals</option>
          <option value="!=">not equals</option>
        </select>

        <div>
          <input
            type="text"
            value={currentConfig.value}
            onChange={e => updateConfig({ value: e.target.value })}
            className="w-full text-sm border rounded p-2"
            placeholder={`Enter test value (e.g. ${
              availableAttributes.find(a => a.name === currentConfig.attribute)?.examples || 'value'
            })`}
          />
        </div>
      </div>
    );
  };

  // Get current test metrics for display
  const currentTestMetrics = useMemo(() => {
    if (multiTestSize === 1) {
      return calculateTestMetrics(editForm);
    } else {
      return calculateTestMetrics(testConfigs[activeTestTab]);
    }
  }, [editForm, testConfigs, activeTestTab, multiTestSize, nodeInstances]);

  // NEW: Get multi-test metrics
  const multiTestMetrics = useMemo(() => {
    return calculateMultiTestMetrics();
  }, [testConfigs, multiTestSize, nodeInstances]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Node ID</p>
            <p className="font-medium">{node.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Instances</p>
            <p className="font-medium">{node.statistics.totalInstances}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Entropy</p>
            <p className="font-medium">{node.statistics.entropy.toFixed(4)}</p>
          </div>
        </div>
        <button
          onClick={() => setShowDataViewer(!showDataViewer)}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
          title="Toggle data viewer"
        >
          {showDataViewer ? <X size={20} /> : <Table size={20} />}
        </button>
      </div>

      {showDataViewer && omicsData[omicsType]?.training && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <DataViewer
            instances={nodeInstances}
            attributes={omicsData[omicsType].training.attributes}
            testAttribute={node.type === 'node' ? node.test.attribute : undefined}
            testValue={node.type === 'node' ? node.test.value : undefined}
            testCondition={node.type === 'node' ? node.test.condition : undefined}
            nodeId={node.id}
          />
        </div>
      )}

      {/* Multi-test Configuration - ONLY FOR NODES */}
      {node.type === 'node' && (
        <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Multi-Test Configuration</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Size:</label>
                <select
                  value={multiTestSize}
                  onChange={e => setMultiTestSize(Number(e.target.value) as 1 | 3 | 5)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value={1}>1</option>
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                </select>
              </div>
            </div>
          </div>

          {multiTestSize > 1 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Types
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={testType === 'selected'}
                      onChange={() => setTestType('selected')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Selected Algorithm</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={testType === 'mixed'}
                      onChange={() => setTestType('mixed')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Mixed Algorithms</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Multi-Test Fusion Type
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={fusionType === 'same-omic'}
                      onChange={() => setFusionType('same-omic')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Same Omic</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={fusionType === 'mixed-omics'}
                      onChange={() => setFusionType('mixed-omics')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Mixed Omics</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alternative Tests - ONLY FOR NODES */}
      {node.type === 'node' && alternativeTests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Alternative Tests</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Attribute</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Condition</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Value</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Algorithm</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Gain</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Gain Ratio</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Left Split</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Right Split</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Similarity</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {alternativeTests.map((test, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{test.attribute}</td>
                    <td className="px-3 py-2">{test.condition}</td>
                    <td className="px-3 py-2">{test.value}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                        {test.algorithm}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        test.gain > 0.5 ? 'bg-green-100 text-green-800' :
                        test.gain > 0.2 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {test.gain.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        test.gainRatio > 0.3 ? 'bg-green-100 text-green-800' :
                        test.gainRatio > 0.1 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {test.gainRatio.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-gray-600 font-mono">
                        [{test.leftSplit.join(', ')}]
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-gray-600 font-mono">
                        [{test.rightSplit.join(', ')}]
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        test.similarity > 0.8 ? 'bg-green-100 text-green-800' :
                        test.similarity > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {test.similarity.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => applyAlternativeTest(test)}
                        className="p-1 hover:bg-gray-100 rounded-full"
                        title="Apply this test"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Algorithm
          </label>
          <Select
            value={multiTestSize === 1 ? editForm.algorithm : (testConfigs[activeTestTab]?.algorithm || 'C4.5')}
            onChange={value => {
              if (multiTestSize === 1) {
                setEditForm(prev => ({ ...prev, algorithm: value as AlgorithmType }));
              } else {
                updateTestConfig(activeTestTab, { algorithm: value as AlgorithmType });
              }
            }}
            options={availableAlgorithms.map(alg => ({
              value: alg,
              label: alg
            }))}
            placeholder="Select algorithm"
          />
        </div>

        {node.type === 'node' && (
          <>
            <div>
              <p className="text-sm text-gray-500 mb-2">Current Test</p>
              <div className="bg-blue-50 p-3 rounded border border-blue-100">
                <p className="font-mono text-sm">
                  {node.test.attribute} {node.test.condition} {node.test.value}
                  {node.test.weight && <span> (weight: {node.test.weight})</span>}
                </p>
              </div>
            </div>

            {/* Test Configuration Tabs - ONLY FOR NODES with multi-test */}
            {multiTestSize > 1 && (
              <div className="flex items-center justify-between">
                <h4 className="text-base font-medium">Test Configuration</h4>
                <div className="flex border rounded-lg">
                  {Array.from({ length: multiTestSize }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveTestTab(i)}
                      className={`px-3 py-1 text-sm ${
                        activeTestTab === i
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      } ${i === 0 ? 'rounded-l-lg' : ''} ${i === multiTestSize - 1 ? 'rounded-r-lg' : ''}`}
                    >
                      Test {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-2">Edit Test</p>
              {multiTestSize === 1 ? 
                renderTestInput() : 
                renderTestInput(testConfigs[activeTestTab], activeTestTab)
              }

              {multiTestSize === 1 && (
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editForm.rebuildSubtree}
                    onChange={e => setEditForm(prev => ({ ...prev, rebuildSubtree: e.target.checked }))}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm">Rebuild subtree</span>
                </label>
              )}

              {multiTestSize === 1 && editForm.rebuildSubtree && (
                <div className="space-y-2 border-t pt-2">
                  <p className="text-sm font-medium text-gray-700">Continue with:</p>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={editForm.continueWithAlgorithm === 'selected'}
                        onChange={() => setEditForm(prev => ({ ...prev, continueWithAlgorithm: 'selected' }))}
                        className="text-blue-600"
                      />
                      <span className="text-sm">Selected algorithm ({editForm.algorithm})</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={editForm.continueWithAlgorithm === 'hybrid'}
                        onChange={() => setEditForm(prev => ({ ...prev, continueWithAlgorithm: 'hybrid' }))}
                        className="text-blue-600"
                      />
                      <span className="text-sm">Hybrid approach (all algorithms)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* NEW: Gain Similarity Display - ONLY for multi-test and not Test 1 */}
              {multiTestSize > 1 && activeTestTab > 0 && (
                <div className="bg-orange-50 p-3 rounded border border-orange-100">
                  <p className="text-sm font-medium text-orange-800">
                    Gain Similarity vs Test 1: 
                    <span className="ml-2 font-mono">
                      {calculateGainSimilarity(activeTestTab).toFixed(1)}%
                    </span>
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Shows how many decisions match with Test 1
                  </p>
                </div>
              )}

              <div className="bg-blue-50 p-3 rounded border border-blue-100">
                <p className="text-sm font-medium">Test Preview:</p>
                <p className="text-sm font-mono mt-1">{getTestPreview()}</p>
                
                {/* Real-time metrics display */}
                {currentTestMetrics.gain !== undefined && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-600">Gain:</span>{" "}
                      <span className={`font-medium ${
                        currentTestMetrics.gain! > 0.5 ? 'text-green-600' :
                        currentTestMetrics.gain! > 0.2 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {currentTestMetrics.gain!.toFixed(3)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Gain Ratio:</span>{" "}
                      <span className={`font-medium ${
                        currentTestMetrics.gainRatio! > 0.3 ? 'text-green-600' :
                        currentTestMetrics.gainRatio! > 0.1 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {currentTestMetrics.gainRatio!.toFixed(3)}
                      </span>
                    </div>
                    {currentTestMetrics.leftSplit && (
                      <div>
                        <span className="text-gray-600">Left:</span>{" "}
                        <span className="font-mono">[{currentTestMetrics.leftSplit.join(', ')}]</span>
                      </div>
                    )}
                    {currentTestMetrics.rightSplit && (
                      <div>
                        <span className="text-gray-600">Right:</span>{" "}
                        <span className="font-mono">[{currentTestMetrics.rightSplit.join(', ')}]</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* NEW: Multi-Test Metrics - ONLY for multi-test */}
              {multiTestSize > 1 && (
                <div className="bg-purple-50 p-3 rounded border border-purple-100">
                  <p className="text-sm font-medium text-purple-800 mb-2">Multi-Test Metrics:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-purple-600">Multi-Test Entropy:</span>{" "}
                      <span className="font-medium font-mono">
                        {multiTestMetrics.entropy.toFixed(3)}
                      </span>
                    </div>
                    <div>
                      <span className="text-purple-600">Consistency:</span>{" "}
                      <span className={`font-medium font-mono ${
                        multiTestMetrics.consistency > 80 ? 'text-green-600' :
                        multiTestMetrics.consistency > 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {multiTestMetrics.consistency.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-purple-600 mt-1">
                    Consistency shows how often all tests agree on decisions
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    if (multiTestSize === 1) {
                      setEditForm({
                        algorithm: tree.config.algorithms[0],
                        attribute: node.type === 'node' ? node.test.attribute : '',
                        condition: node.type === 'node' ? node.test.condition : '<',
                        value: node.type === 'node' ? node.test.value : '',
                        weight: node.type === 'node' ? node.test.weight : undefined,
                        rebuildSubtree: false,
                        continueWithAlgorithm: 'hybrid'
                      });
                    } else {
                      setTestConfigs(prev => prev.map((config, i) => 
                        i === activeTestTab ? {
                          algorithm: tree.config.algorithms[0],
                          attribute: node.type === 'node' ? node.test.attribute : '',
                          condition: node.type === 'node' ? node.test.condition : '<',
                          value: node.type === 'node' ? node.test.value : '',
                          weight: node.type === 'node' ? node.test.weight : undefined,
                        } : config
                      ));
                    }
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                >
                  Reset
                </button>
                
                {multiTestSize === 1 ? (
                  <button
                    onClick={handleEditSubmit}
                    disabled={!editForm.attribute}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply Changes
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleRebuildNode(false)}
                      disabled={!testConfigs[activeTestTab]?.attribute}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Rebuild Node
                    </button>
                    <button
                      onClick={() => handleRebuildNode(true)}
                      disabled={!testConfigs[activeTestTab]?.attribute}
                      className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Rebuild Node & Subtree
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* LEAF FUNCTIONALITY - PRESERVED EXACTLY AS BEFORE + ADDED VISUALIZATION */}
        {node.type === 'leaf' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">Class Distribution</p>
              <div className="space-y-1">
                {Object.entries(node.classDistribution).map(([cls, count]) => {
                  const percentage = ((count / node.statistics.totalInstances) * 100).toFixed(1);
                  return (
                    <div key={cls} className="flex justify-between text-sm">
                      <span>{cls}</span>
                      <span>{percentage}% ({count} instances)</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {node.canExpand && (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleUnfold('once')}
                  className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 rounded inline-flex items-center"
                >
                  <UnfoldVertical className="mr-2" size={16} />
                  Unfold Once
                </button>
                <button
                  onClick={() => handleUnfold('fully')}
                  className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 rounded inline-flex items-center"
                >
                  <RefreshCw className="mr-2" size={16} />
                  Unfold Fully
                </button>
              </div>
            )}

            {/* LEAF DATA VISUALIZATION BUTTON */}
            <div className="border-t pt-4">
              <button
                onClick={() => setShowLeafVisualization(true)}
                className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <BarChart3 size={20} className="text-blue-600" />
                <span className="text-blue-700 font-medium">View Detailed Data Analysis</span>
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Explore distributions, heatmaps, and correlations for this leaf's data
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Leaf Data Visualization Modal - ONLY FOR LEAVES */}
      {showLeafVisualization && node.type === 'leaf' && omicsData[omicsType]?.training && (
        <LeafDataVisualization
          leaf={node}
          instances={nodeInstances}
          attributes={omicsData[omicsType].training.attributes}
          onClose={() => setShowLeafVisualization(false)}
        />
      )}
    </div>
  );
};