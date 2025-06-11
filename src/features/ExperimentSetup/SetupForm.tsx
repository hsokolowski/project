import React, { useState } from 'react';
import { Attribute, ExperimentConfig, AlgorithmType, OmicsType, VotingStrategy, DataGroup } from '../../types';
import { InfoIcon, Activity, Dna, TestTube2, Database, FileSpreadsheet } from 'lucide-react';
import { Select } from '../ui/Select';
import { PaginatedGrid } from '../ui/PaginatedGrid';

interface SetupFormProps {
  onSubmit: (config: ExperimentConfig) => void;
  isLoading: boolean;
  attributes: Array<{ name: string; dataset: any }>;
  isDisabled: boolean;
  groups: DataGroup[];
  selectedDecisionAttribute: string;
}

const OMICS_CONFIGS = {
  simple: { icon: FileSpreadsheet, label: 'Simple Dataset' },
  genomics: { icon: Dna, label: 'Genomics' },
  proteomics: { icon: Activity, label: 'Proteomics' },
  metabolomics: { icon: TestTube2, label: 'Metabolomics' },
  transcriptomics: { icon: Database, label: 'Transcriptomics' }
};

export const SetupForm: React.FC<SetupFormProps> = ({
  onSubmit,
  isLoading,
  attributes,
  isDisabled,
  groups,
  selectedDecisionAttribute
}) => {
  const [config, setConfig] = useState<ExperimentConfig>({
    algorithms: ['C4.5'],
    maxDepth: 10,
    minInstancesPerLeaf: 5,
    entropyThreshold: 0.1,
    handleMissing: 'ignore',
    decisionAttribute: selectedDecisionAttribute,
    excludedAttributes: [],
    fusionType: groups.length > 1 ? 'multi-tree' : 'multi-test',
    omicsConfig: {
      votingStrategy: 'majority',
      weights: Object.fromEntries(
        groups.map(group => [group.type, 1])
      ) as Record<string, number>
    }
  });

  // Update decision attribute when prop changes
  React.useEffect(() => {
    setConfig(prev => ({
      ...prev,
      decisionAttribute: selectedDecisionAttribute
    }));
  }, [selectedDecisionAttribute]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(config);
  };

  const renderTooltip = (text: string) => (
    <div className="group relative cursor-help">
      <InfoIcon className="h-4 w-4 text-gray-400 inline-block ml-1" />
      <div className="opacity-0 bg-black text-xs text-white p-2 rounded absolute z-10 -left-1/2 -top-10 w-48 pointer-events-none group-hover:opacity-100 transition-opacity">
        {text}
      </div>
    </div>
  );

  const renderFormSection = (
    title: string,
    description: string,
    children: React.ReactNode
  ) => (
    <div className={`rounded-lg border ${isDisabled ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'} p-4`}>
      <h3 className="text-sm font-medium text-gray-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <div className={isDisabled ? 'opacity-50' : ''}>
        {children}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {renderFormSection(
        "Algorithm Selection",
        "Choose one or more algorithms to build your decision trees",
        <div className="space-y-2">
          {['C4.5', 'TSP', 'WTSP'].map((alg) => (
            <label key={alg} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.algorithms.includes(alg as AlgorithmType)}
                onChange={(e) => {
                  const newAlgorithms = e.target.checked
                    ? [...config.algorithms, alg as AlgorithmType]
                    : config.algorithms.filter(a => a !== alg);
                  setConfig({ ...config, algorithms: newAlgorithms });
                }}
                className="rounded text-blue-600 focus:ring-blue-500"
                disabled={isDisabled}
              />
              <span>{alg}</span>
            </label>
          ))}
        </div>
      )}

      {groups.length > 1 && renderFormSection(
        "Fusion Strategy",
        "Choose how to combine predictions from multiple data sources",
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={config.fusionType === 'multi-tree'}
                onChange={() => setConfig(prev => ({ ...prev, fusionType: 'multi-tree' }))}
                className="text-blue-600 focus:ring-blue-500"
                disabled={isDisabled}
              />
              <span>Multi-tree Fusion (Build separate trees and combine predictions)</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={config.fusionType === 'multi-test'}
                onChange={() => setConfig(prev => ({ ...prev, fusionType: 'multi-test' }))}
                className="text-blue-600 focus:ring-blue-500"
                disabled={isDisabled}
              />
              <span>Multi-test Fusion (Single tree with tests from different sources)</span>
            </label>
          </div>

          {config.fusionType === 'multi-tree' && (
            <div className="space-y-3 border-t pt-3">
              <label className="block text-sm font-medium text-gray-700">
                Voting Strategy
              </label>
              <select
                value={config.omicsConfig?.votingStrategy}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  omicsConfig: {
                    ...prev.omicsConfig!,
                    votingStrategy: e.target.value as VotingStrategy
                  }
                }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                disabled={isDisabled}
              >
                <option value="majority">Majority Vote</option>
                <option value="unanimous">Unanimous Vote</option>
                <option value="weighted">Weighted Vote</option>
              </select>

              {config.omicsConfig?.votingStrategy === 'weighted' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Group Weights
                  </label>
                  {groups.map(group => {
                    const Icon = OMICS_CONFIGS[group.type].icon;
                    return (
                      <div key={group.id} className="flex items-center gap-4">
                        <div className="flex items-center gap-2 w-40">
                          <Icon size={16} className="text-blue-600" />
                          <span className="text-sm">{group.name}</span>
                        </div>
                        <input
                          type="number"
                          value={config.omicsConfig?.weights[group.type]}
                          onChange={(e) => {
                            const weights = {
                              ...config.omicsConfig!.weights,
                              [group.type]: Number(e.target.value)
                            };
                            setConfig(prev => ({
                              ...prev,
                              omicsConfig: {
                                ...prev.omicsConfig!,
                                weights
                              }
                            }));
                          }}
                          min={0}
                          max={10}
                          step={0.1}
                          className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          disabled={isDisabled}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {renderFormSection(
        "Tree Parameters",
        "Configure the decision tree building process",
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Depth
              {renderTooltip('Maximum depth of the decision tree')}
            </label>
            <input
              type="number"
              value={config.maxDepth}
              onChange={(e) => setConfig({ ...config, maxDepth: Number(e.target.value) })}
              min={1}
              max={50}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={isDisabled}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Instances Per Leaf
              {renderTooltip('Minimum number of instances required to form a leaf node')}
            </label>
            <input
              type="number"
              value={config.minInstancesPerLeaf}
              onChange={(e) => setConfig({ ...config, minInstancesPerLeaf: Number(e.target.value) })}
              min={1}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={isDisabled}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entropy Threshold
              {renderTooltip('Minimum entropy required to split a node')}
            </label>
            <input
              type="number"
              value={config.entropyThreshold}
              onChange={(e) => setConfig({ ...config, entropyThreshold: Number(e.target.value) })}
              min={0}
              max={1}
              step={0.01}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={isDisabled}
            />
          </div>
        </div>
      )}

      {renderFormSection(
        "Excluded Attributes",
        "Select attributes to exclude from the tree building process",
        <div>
          {groups.map(group => {
            const groupAttributes = attributes
              .filter(attr => group.attributes.includes(attr.name))
              .filter(attr => attr.name !== selectedDecisionAttribute);
            if (groupAttributes.length === 0) return null;

            return (
              <div key={group.id} className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  {group.name}
                </h4>
                <PaginatedGrid
                  items={groupAttributes}
                  itemsPerPage={21}
                  columns={3}
                  searchable
                  searchKey={(attr) => attr.name}
                  renderItem={(attr) => (
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={config.excludedAttributes.includes(attr.name)}
                        onChange={(e) => {
                          const newExcluded = e.target.checked
                            ? [...config.excludedAttributes, attr.name]
                            : config.excludedAttributes.filter(a => a !== attr.name);
                          setConfig({ ...config, excludedAttributes: newExcluded });
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                        disabled={isDisabled}
                      />
                      <span className="truncate" title={attr.name}>
                        {attr.name}
                      </span>
                    </label>
                  )}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={
            isDisabled || 
            isLoading || 
            !selectedDecisionAttribute || 
            config.algorithms.length === 0
          }
        >
          {isLoading ? 'Building Trees...' : 'Build Trees'}
        </button>
      </div>
    </form>
  );
};