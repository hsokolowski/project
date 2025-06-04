import React, { useState } from 'react';
import { Attribute, ExperimentConfig, AlgorithmType } from '../../types';
import { InfoIcon } from 'lucide-react';
import { Select } from '../ui/Select';
import { PaginatedGrid } from '../ui/PaginatedGrid';

interface SetupFormProps {
  onSubmit: (config: ExperimentConfig) => void;
  isLoading: boolean;
  attributes: Attribute[];
  isDisabled: boolean;
}

export const SetupForm: React.FC<SetupFormProps> = ({
  onSubmit,
  isLoading,
  attributes,
  isDisabled
}) => {
  const [config, setConfig] = useState<ExperimentConfig>({
    algorithms: ['C4.5'],
    maxDepth: 10,
    minInstancesPerLeaf: 5,
    entropyThreshold: 0.1,
    handleMissing: 'ignore',
    decisionAttribute: '',
    excludedAttributes: []
  });

  const handleAlgorithmChange = (algorithm: AlgorithmType, checked: boolean) => {
    if (checked) {
      setConfig(prev => ({
        ...prev,
        algorithms: [...prev.algorithms, algorithm]
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        algorithms: prev.algorithms.filter(a => a !== algorithm)
      }));
    }
  };

  const handleAttributeFilterChange = (attrName: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      excludedAttributes: checked
        ? [...prev.excludedAttributes, attrName]
        : prev.excludedAttributes.filter(a => a !== attrName)
    }));
  };

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

  // Filter out the decision attribute from available attributes
  const availableAttributes = attributes.filter(attr => attr.name !== config.decisionAttribute);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Algorithms
          </label>
          <div className="space-y-2">
            {['C4.5', 'TSP', 'WTSP'].map((alg) => (
              <label key={alg} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.algorithms.includes(alg as AlgorithmType)}
                  onChange={(e) => handleAlgorithmChange(alg as AlgorithmType, e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                  disabled={isDisabled || isLoading}
                />
                <span>{alg}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Decision Attribute
          </label>
          <Select
            value={config.decisionAttribute}
            onChange={(value) => setConfig({ ...config, decisionAttribute: value })}
            options={attributes.map(attr => ({
              value: attr.name,
              label: attr.name
            }))}
            placeholder="Select decision attribute"
            searchable
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
            disabled={isDisabled || isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Min Instances Per Leaf
            {renderTooltip('Minimum number of instances required to form a leaf node')}
          </label>
          <input
            type="number"
            value={config.minInstancesPerLeaf}
            onChange={(e) => setConfig({ ...config, minInstancesPerLeaf: Number(e.target.value) })}
            min={1}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            disabled={isDisabled || isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
            disabled={isDisabled || isLoading}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Handle Missing Values
        </label>
        <select
          value={config.handleMissing}
          onChange={(e) => setConfig({ ...config, handleMissing: e.target.value as 'ignore' | 'replace' | 'probabilistic' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          disabled={isDisabled || isLoading}
        >
          <option value="ignore">Ignore</option>
          <option value="replace">Replace with Majority/Mean</option>
          <option value="probabilistic">Probabilistic Distribution</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Excluded Attributes
          {renderTooltip('Select attributes to exclude from the tree building process')}
        </label>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <PaginatedGrid
            items={availableAttributes}
            itemsPerPage={21}
            columns={3}
            searchable
            searchKey={(attr) => attr.name}
            renderItem={(attr) => (
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.excludedAttributes.includes(attr.name)}
                  onChange={(e) => handleAttributeFilterChange(attr.name, e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                  disabled={isDisabled || isLoading}
                />
                <span className="truncate" title={attr.name}>
                  {attr.name}
                </span>
              </label>
            )}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={
            isDisabled || 
            isLoading || 
            !config.decisionAttribute || 
            config.algorithms.length === 0
          }
        >
          {isLoading ? 'Building Trees...' : 'Build Trees'}
        </button>
      </div>
    </form>
  );
};