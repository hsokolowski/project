import React, { useState, useEffect, useMemo } from 'react';
import { Element, SplitTest, AlgorithmType, DecisionTree } from '../../types';
import { Edit2, RefreshCw, UnfoldVertical, Split, Table, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTreeEngine } from '../../lib/engine/TreeEngineContext';
import { Select } from '../ui/Select';
import { DataViewer } from './DataViewer';

interface NodeEditorProps {
  node: Element;
  tree: DecisionTree;
}

export const NodeEditor: React.FC<NodeEditorProps> = ({ node, tree }) => {
  const {
    rebuildSubtree,
    applyDistribution,
    unfoldLeafOnce,
    unfoldLeafFully,
    trainingData
  } = useTreeEngine();

  const [showDataViewer, setShowDataViewer] = useState(false);
  const availableAlgorithms: AlgorithmType[] = ['C4.5', 'TSP', 'WTSP'];

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

  const availableAttributes = useMemo(() => {
    if (!trainingData?.attributes) return [];
    
    return trainingData.attributes
      .filter(attr => 
        !tree.config.excludedAttributes.includes(attr.name) && 
        attr.name !== tree.config.decisionAttribute
      )
      .map(attr => ({
        name: attr.name,
        type: attr.type,
        examples: attr.possibleValues?.slice(0, 3).join(', ') || 'No examples available'
      }));
  }, [trainingData, tree.config]);

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
          newTest
        );
        toast.success('Subtree rebuilt successfully');
      } else {
        await applyDistribution(node.id, newTest);
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
        await unfoldLeafOnce(node.id, editForm.algorithm);
        toast.success('Node unfolded once');
      } else {
        await unfoldLeafFully(node.id, editForm.algorithm);
        toast.success('Node unfolded fully');
      }
    } catch (err) {
      console.error('Failed to unfold node:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to unfold node');
    }
  };

  const getTestPreview = () => {
    if (!editForm.attribute || !editForm.value) return 'Select attributes to preview test';

    if (editForm.algorithm === 'WTSP') {
      const weight = editForm.weight || 1;
      return `${weight} × ${editForm.attribute} ${editForm.condition} ${editForm.value}`;
    }

    if (editForm.algorithm === 'TSP') {
      return `${editForm.attribute} ${editForm.condition} ${editForm.value}`;
    }

    return `${editForm.attribute} ${editForm.condition} ${editForm.value}`;
  };

  const renderTestInput = () => {
    if (editForm.algorithm === 'WTSP') {
      return (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Select two attributes to compare their weighted ratio:</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Numerator Attribute:</label>
              <Select
                value={editForm.attribute}
                onChange={value => setEditForm(prev => ({ ...prev, attribute: value }))}
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
                value={editForm.value as string}
                onChange={value => setEditForm(prev => ({ ...prev, value }))}
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
            <label className="block text-xs text-gray-500 mb-1">Weight multiplier for {editForm.attribute}:</label>
            <input
              type="number"
              value={editForm.weight || 1}
              onChange={e => setEditForm(prev => ({ ...prev, weight: Number(e.target.value) }))}
              className="w-full text-sm border rounded p-2"
              step="0.1"
            />
          </div>

          <select
            value={editForm.condition}
            onChange={e => setEditForm(prev => ({ ...prev, condition: e.target.value as SplitTest['condition'] }))}
            className="w-full text-sm border rounded p-2"
          >
            <option value="<">less than</option>
            <option value="<=">less or equal</option>
            <option value=">">greater than</option>
            <option value=">=">greater or equal</option>
            <option value="==">equals</option>
            <option value="!=">not equals</option>
          </select>

          <div className="bg-blue-50 p-3 rounded border border-blue-100">
            <p className="text-sm font-medium">Test Preview:</p>
            <p className="text-sm font-mono mt-1">{getTestPreview()}</p>
          </div>
        </div>
      );
    }

    if (editForm.algorithm === 'TSP') {
      return (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Select two attributes to compare:</p>
          <Select
            value={editForm.attribute}
            onChange={value => setEditForm(prev => ({ ...prev, attribute: value }))}
            options={availableAttributes.map(attr => ({
              value: attr.name,
              label: `${attr.name} (e.g. ${attr.examples})`
            }))}
            placeholder="First attribute"
            searchable
          />
          
          <Select
            value={editForm.value as string}
            onChange={value => setEditForm(prev => ({ ...prev, value }))}
            options={availableAttributes.map(attr => ({
              value: attr.name,
              label: `${attr.name} (e.g. ${attr.examples})`
            }))}
            placeholder="Second attribute"
            searchable
          />

          <select
            value={editForm.condition}
            onChange={e => setEditForm(prev => ({ ...prev, condition: e.target.value as SplitTest['condition'] }))}
            className="w-full text-sm border rounded p-2"
          >
            <option value="<">less than</option>
            <option value="<=">less or equal</option>
            <option value=">">greater than</option>
            <option value=">=">greater or equal</option>
            <option value="==">equals</option>
            <option value="!=">not equals</option>
          </select>

          <div className="bg-blue-50 p-3 rounded border border-blue-100">
            <p className="text-sm font-medium">Test Preview:</p>
            <p className="text-sm font-mono mt-1">{getTestPreview()}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <Select
          value={editForm.attribute}
          onChange={value => setEditForm(prev => ({ ...prev, attribute: value }))}
          options={availableAttributes.map(attr => ({
            value: attr.name,
            label: `${attr.name} (e.g. ${attr.examples})`
          }))}
          placeholder="Select attribute"
          searchable
        />

        <select
          value={editForm.condition}
          onChange={e => setEditForm(prev => ({ ...prev, condition: e.target.value as SplitTest['condition'] }))}
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
            value={editForm.value}
            onChange={e => setEditForm(prev => ({ ...prev, value: e.target.value }))}
            className="w-full text-sm border rounded p-2"
            placeholder={`Enter test value (e.g. ${
              availableAttributes.find(a => a.name === editForm.attribute)?.examples || 'value'
            })`}
          />
        </div>

        <div className="bg-blue-50 p-3 rounded border border-blue-100">
          <p className="text-sm font-medium">Test Preview:</p>
          <p className="text-sm font-mono mt-1">{getTestPreview()}</p>
        </div>
      </div>
    );
  };

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

      {showDataViewer && trainingData && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <DataViewer
            instances={trainingData.instances}
            attributes={trainingData.attributes}
            testAttribute={node.type === 'node' ? node.test.attribute : undefined}
            testValue={node.type === 'node' ? node.test.value : undefined}
            testCondition={node.type === 'node' ? node.test.condition : undefined}
          />
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Algorithm
          </label>
          <Select
            value={editForm.algorithm}
            onChange={value => setEditForm(prev => ({ ...prev, algorithm: value as AlgorithmType }))}
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

            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-2">Edit Test</p>
              {renderTestInput()}

              {editForm.rebuildSubtree && (
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

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editForm.rebuildSubtree}
                  onChange={e => setEditForm(prev => ({ ...prev, rebuildSubtree: e.target.checked }))}
                  className="rounded text-blue-600"
                />
                <span className="text-sm">Rebuild subtree</span>
              </label>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setEditForm({
                    algorithm: tree.config.algorithms[0],
                    attribute: node.type === 'node' ? node.test.attribute : '',
                    condition: node.type === 'node' ? node.test.condition : '<',
                    value: node.type === 'node' ? node.test.value : '',
                    weight: node.type === 'node' ? node.test.weight : undefined,
                    rebuildSubtree: false,
                    continueWithAlgorithm: 'hybrid'
                  })}
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                >
                  Reset
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={!editForm.attribute}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Changes
                </button>
              </div>
            </div>
          </>
        )}

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
          </div>
        )}

        {node.type === 'node' && node.alternativeSplits.length > 0 && (
          <div>
            <p className="text-sm text-gray-500 mb-2">Alternative Tests</p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Attribute</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Condition</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Value</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Algorithm</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {node.alternativeSplits.map((test, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{test.attribute}</td>
                      <td className="px-3 py-2">{test.condition}</td>
                      <td className="px-3 py-2">{test.value}</td>
                      <td className="px-3 py-2">{test.algorithm}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() =>
                            setEditForm(prev => ({
                              ...prev,
                              attribute: test.attribute,
                              condition: test.condition,
                              value: test.value,
                              weight: test.weight,
                              algorithm: test.algorithm
                            }))
                          }
                          className="p-1 hover:bg-gray-100 rounded-full"
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
      </div>
    </div>
  );
};