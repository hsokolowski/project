import React, { useState } from 'react';
import { Card } from '../../components/Card';
import { SetupForm } from './SetupForm';
import { GroupConfig } from './GroupConfig';
import { useTreeEngine } from '../../lib/engine/TreeEngineContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { OmicsType, DataGroup, Dataset, ExperimentConfig } from '../../types';
import { Upload, Database, TreePine, Settings, Target, Layers, BarChart3 } from 'lucide-react';

export const ExperimentSetup: React.FC = () => {
  const navigate = useNavigate();
  const { buildTrees, isLoading, error, omicsData } = useTreeEngine();
  const [groups, setGroups] = useState<DataGroup[]>([]);
  const [selectedDecisionAttribute, setSelectedDecisionAttribute] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'setup' | 'missing' | 'crossval' | 'parameters'>('setup');

  // Get all available attributes across all loaded datasets
  const allAttributes = React.useMemo(() => {
    const attributes: Array<{ name: string; dataset: Dataset }> = [];
    Object.entries(omicsData).forEach(([type, data]) => {
      if (data?.training) {
        data.training.attributes.forEach(attr => {
          if (!attributes.find(a => a.name === attr.name)) {
            attributes.push({ name: attr.name, dataset: data.training! });
          }
        });
      }
    });
    return attributes;
  }, [omicsData]);

  // Preview data from the first available dataset
  const previewData = React.useMemo(() => {
    const firstDataset = Object.values(omicsData)[0]?.training;
    if (!firstDataset) return null;

    const headers = firstDataset.attributes.map(attr => attr.name);
    const rows = firstDataset.instances.slice(0, 5).map(instance => 
      headers.map(header => instance.values[header]?.toString() || '')
    );

    return { headers, rows };
  }, [omicsData]);

  // Auto-select last attribute as decision attribute
  React.useEffect(() => {
    if (allAttributes.length > 0 && !selectedDecisionAttribute) {
      const lastAttribute = allAttributes[allAttributes.length - 1];
      setSelectedDecisionAttribute(lastAttribute.name);
    }
  }, [allAttributes, selectedDecisionAttribute]);

  // Check if we have test data
  const hasTestData = React.useMemo(() => {
    return Object.values(omicsData).some(data => data?.test);
  }, [omicsData]);

  const handleSubmit = async (config: ExperimentConfig) => {
    if (Object.keys(omicsData).length === 0) {
      toast.error('Please upload at least one dataset');
      return;
    }

    if (groups.length === 0) {
      toast.error('Please create at least one data group');
      return;
    }

    if (!selectedDecisionAttribute) {
      toast.error('Please select a decision attribute');
      return;
    }

    try {
      await buildTrees({
        ...config,
        decisionAttribute: selectedDecisionAttribute,
        fusionType: groups.length > 1 ? config.fusionType : 'multi-test'
      });
      toast.success('Trees built successfully');
      navigate('/builder');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to build trees');
    }
  };

  const tabs = [
    { id: 'setup', label: 'Setup & Groups', icon: <Database size={18} />, disabled: Object.keys(omicsData).length === 0 },
    { id: 'missing', label: 'Missing Values', icon: <Settings size={18} />, disabled: Object.keys(omicsData).length === 0 },
    { id: 'crossval', label: 'Cross-Validation', icon: <BarChart3 size={18} />, disabled: Object.keys(omicsData).length === 0 || hasTestData },
    { id: 'parameters', label: 'Tree Parameters', icon: <TreePine size={18} />, disabled: Object.keys(omicsData).length === 0 }
  ] as const;

  const canProceedToNext = (currentTab: string): boolean => {
    switch (currentTab) {
      case 'setup': return Object.keys(omicsData).length > 0 && !!selectedDecisionAttribute && groups.length > 0;
      case 'missing': return true;
      case 'crossval': return true;
      case 'parameters': return true;
      default: return false;
    }
  };

  const getNextTab = (currentTab: string): string | null => {
    const currentIndex = tabs.findIndex(tab => tab.id === currentTab);
    if (currentIndex === -1 || currentIndex === tabs.length - 1) return null;
    
    // Skip cross-validation if we have test data
    const nextTab = tabs[currentIndex + 1];
    if (nextTab.id === 'crossval' && hasTestData) {
      return tabs[currentIndex + 2]?.id || null;
    }
    
    return nextTab.id;
  };

  const getPrevTab = (currentTab: string): string | null => {
    const currentIndex = tabs.findIndex(tab => tab.id === currentTab);
    if (currentIndex <= 0) return null;
    
    // Skip cross-validation if we have test data
    const prevTab = tabs[currentIndex - 1];
    if (prevTab.id === 'crossval' && hasTestData) {
      return tabs[currentIndex - 2]?.id || null;
    }
    
    return prevTab.id;
  };

  return (
    <div className="space-y-6">
      {Object.keys(omicsData).length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-blue-500" />
            <p className="text-blue-700">
              Upload data first to enable configuration
            </p>
          </div>
          <p className="text-sm text-blue-600 mt-2 ml-8">
            The experiment configuration will be available after you upload your data files.
          </p>
        </div>
      )}

      <Card>
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                  ${activeTab === tab.id 
                    ? 'border-blue-500 text-blue-600' 
                    : tab.disabled
                      ? 'border-transparent text-gray-300 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 cursor-pointer'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Setup Tab - Combined Data Preview, Decision Class, and Data Groups */}
          {activeTab === 'setup' && (
            <div className="space-y-8">
              {/* Data Preview Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Data Preview</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Preview of your uploaded data. The decision attribute will be highlighted in yellow.
                  </p>
                </div>

                {previewData ? (
                  <div className="space-y-4">
                    {/* Tabela z overflow */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {previewData.headers.map((header, index) => (
                              <th
                                key={header}
                                className={`
                                  px-3 py-2 text-left text-xs font-medium text-gray-500
                                  ${groups.find(g => 
                                    g.range && 
                                    index >= g.range.start && 
                                    index <= g.range.end
                                  )?.color || ''}
                                  ${header === selectedDecisionAttribute ? 'bg-yellow-100 border-yellow-300' : ''}
                                `}
                              >
                                {header}
                                {header === selectedDecisionAttribute && (
                                  <span className="ml-1 text-xs text-yellow-600">(Decision)</span>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {previewData.rows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {row.map((cell, cellIndex) => (
                                <td
                                  key={cellIndex}
                                  className={`
                                    px-3 py-2 text-sm text-gray-900 whitespace-nowrap
                                    ${groups.find(g => 
                                      g.range && 
                                      cellIndex >= g.range.start && 
                                      cellIndex <= g.range.end
                                    )?.color || ''}
                                    ${previewData.headers[cellIndex] === selectedDecisionAttribute ? 'bg-yellow-50' : ''}
                                  `}
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                
                    {/* Statystyki pod tabelą */}
                    <div className="mt-3 text-xs text-gray-600 flex flex-wrap gap-x-8 gap-y-2">
                      <div>
                        <span className="font-medium">Total attributes:</span>{" "}
                        {previewData.headers.length}
                      </div>
                      <div>
                        <span className="font-medium">Instances (rows):</span>{" "}
                        {Object.values(omicsData)[0]?.training?.instances.length || 0}
                      </div>
                      <div>
                        <span className="font-medium">Decision attr:</span>{" "}
                        {selectedDecisionAttribute || "None"}
                      </div>
                      <div>
                        <span className="font-medium">Grouped attributes:</span>{" "}
                        {groups.reduce((acc, group) => acc + group.attributes.length, 0)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No data available for preview
                  </div>
                )}
              </div>

              {/* Decision Class Section */}
              <div className="space-y-4 border-t pt-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Decision Class Selection</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Select the attribute that represents the target class for prediction.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Decision Attribute
                  </label>
                  <select
                    value={selectedDecisionAttribute}
                    onChange={(e) => setSelectedDecisionAttribute(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={Object.keys(omicsData).length === 0}
                  >
                    <option value="">Select decision attribute</option>
                    {allAttributes.map(attr => (
                      <option key={attr.name} value={attr.name}>
                        {attr.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDecisionAttribute && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      ✓ Selected decision attribute: <strong>{selectedDecisionAttribute}</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Data Groups Section */}
              <div className="space-y-4 border-t pt-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Data Groups & Excluded Attributes</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Organize your attributes into groups and exclude any attributes you don't want to use.
                  </p>
                </div>

                <GroupConfig
                  groups={groups}
                  onGroupsUpdate={setGroups}
                  availableAttributes={allAttributes.filter(attr => attr.name !== selectedDecisionAttribute)}
                  selectedDecisionAttribute={selectedDecisionAttribute}
                />
              </div>
            </div>
          )}

          {/* Missing Values Tab */}
          {activeTab === 'missing' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Missing Values</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Choose how to handle missing values in the data.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Missing Value Strategy
                </label>
                <select
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={Object.keys(omicsData).length === 0}
                >
                  <option value="ignore">Ignore</option>
                  <option value="replace">Replace with Majority/Mean</option>
                  <option value="probabilistic">Probabilistic Distribution</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Missing Value Strategies</h4>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li><strong>Ignore:</strong> Skip instances with missing values</li>
                  <li><strong>Replace:</strong> Use majority class for categorical, mean for numerical</li>
                  <li><strong>Probabilistic:</strong> Use probability distribution based on other attributes</li>
                </ul>
              </div>
            </div>
          )}

          {/* Cross-Validation Tab */}
          {activeTab === 'crossval' && !hasTestData && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Cross-Validation</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Configure cross-validation settings for model evaluation since no test data is available.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  No test data detected. Cross-validation will be used for model evaluation.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Folds
                  </label>
                  <select
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    disabled={Object.keys(omicsData).length === 0}
                    defaultValue="5"
                  >
                    <option value="3">3-Fold</option>
                    <option value="5">5-Fold</option>
                    <option value="10">10-Fold</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stratification
                  </label>
                  <select
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    disabled={Object.keys(omicsData).length === 0}
                    defaultValue="stratified"
                  >
                    <option value="stratified">Stratified (Recommended)</option>
                    <option value="random">Random</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="rounded text-blue-600 focus:ring-blue-500"
                    disabled={Object.keys(omicsData).length === 0}
                    defaultChecked
                  />
                  <span className="text-sm text-gray-700">
                    Use same folds for all algorithms (for fair comparison)
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Tree Parameters Tab */}
          {activeTab === 'parameters' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Tree Parameters & Configuration</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Configure the decision tree algorithms and parameters.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded border border-red-200 text-sm">
                  {error}
                </div>
              )}
              
              <SetupForm
                onSubmit={handleSubmit}
                isLoading={isLoading}
                attributes={allAttributes.filter(attr => attr.name !== selectedDecisionAttribute)}
                isDisabled={Object.keys(omicsData).length === 0}
                groups={groups}
                selectedDecisionAttribute={selectedDecisionAttribute}
              />
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-between">
          <button
            onClick={() => {
              const prevTab = getPrevTab(activeTab);
              if (prevTab) setActiveTab(prevTab as any);
            }}
            disabled={!getPrevTab(activeTab)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex space-x-2">
            {activeTab !== 'parameters' ? (
              <button
                onClick={() => {
                  const nextTab = getNextTab(activeTab);
                  if (nextTab) setActiveTab(nextTab as any);
                }}
                disabled={!canProceedToNext(activeTab) || !getNextTab(activeTab)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => {
                  // This will be handled by the SetupForm component
                }}
                disabled={!canProceedToNext(activeTab)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Build Trees
              </button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};