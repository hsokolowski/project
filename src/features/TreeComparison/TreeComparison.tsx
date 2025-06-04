import React, { useState } from 'react';
import { Card } from '../../components/Card';
import { TrainTree } from './TrainTree';
import { TestTree } from './TestTree';
import { useTreeEngine } from '../../lib/engine/TreeEngineContext';
import { TreeCanvas } from '../TreeBuilder/TreeCanvas';
import { FlowTree } from '../TreeBuilder/FlowTree';
import { Layout } from 'lucide-react';

export const TreeComparison: React.FC = () => {
  const { trainTree, testTree, trainEvaluation, testEvaluation, isLoading } = useTreeEngine();
  const [viewMode, setViewMode] = useState<'canvas' | 'flow'>('canvas');
  
  if (isLoading) {
    return (
      <Card title="Tree Comparison">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading trees...</p>
        </div>
      </Card>
    );
  }
  
  if (!trainTree) {
    return (
      <Card title="Tree Comparison">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-gray-500 mb-2">No trees available for comparison</p>
          <p className="text-sm text-gray-400">
            Build trees first to view comparison
          </p>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setViewMode(mode => mode === 'canvas' ? 'flow' : 'canvas')}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"
        >
          <Layout size={16} />
          Switch to {viewMode === 'canvas' ? 'Flow' : 'Canvas'} View
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card 
          title={
            <div className="flex items-center justify-between">
              <span>Training Tree</span>
              {trainEvaluation && (
                <span className="text-sm text-gray-500">
                  Accuracy: {(trainEvaluation.metrics.accuracy * 100).toFixed(2)}%
                </span>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            <TrainTree tree={trainTree} />
            <div className="h-[400px] overflow-auto bg-gray-50 rounded border border-gray-200">
              {viewMode === 'canvas' ? (
                <TreeCanvas tree={trainTree} />
              ) : (
                <div className="p-4">
                  <FlowTree node={trainTree.root} />
                </div>
              )}
            </div>
          </div>
        </Card>
        
        <Card 
          title={
            <div className="flex items-center justify-between">
              <span>Test Tree</span>
              {testEvaluation && (
                <span className="text-sm text-gray-500">
                  Accuracy: {(testEvaluation.metrics.accuracy * 100).toFixed(2)}%
                </span>
              )}
            </div>
          }
        >
          {testTree ? (
            <div className="space-y-4">
              <TestTree tree={testTree} />
              <div className="h-[400px] overflow-auto bg-gray-50 rounded border border-gray-200">
                {viewMode === 'canvas' ? (
                  <TreeCanvas tree={testTree} />
                ) : (
                  <div className="p-4">
                    <FlowTree node={testTree.root} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-gray-500 mb-2">No test tree available</p>
              <p className="text-sm text-gray-400">
                Upload test data and build trees to view test tree
              </p>
            </div>
          )}
        </Card>
      </div>
      
      {trainTree && testTree && (
        <Card title="Tree Comparison Summary">
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-500">Training Accuracy</div>
                <div className="text-xl font-semibold mt-1">
                  {trainEvaluation ? (trainEvaluation.metrics.accuracy * 100).toFixed(2) + '%' : 'N/A'}
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-500">Test Accuracy</div>
                <div className="text-xl font-semibold mt-1">
                  {testEvaluation ? (testEvaluation.metrics.accuracy * 100).toFixed(2) + '%' : 'N/A'}
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-500">Training F1 Score</div>
                <div className="text-xl font-semibold mt-1">
                  {trainEvaluation ? (trainEvaluation.metrics.macroAvgF1 * 100).toFixed(2) + '%' : 'N/A'}
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-500">Test F1 Score</div>
                <div className="text-xl font-semibold mt-1">
                  {testEvaluation ? (testEvaluation.metrics.macroAvgF1 * 100).toFixed(2) + '%' : 'N/A'}
                </div>
              </div>
            </div>
            
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Training Tree
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test Tree
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Difference
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trainEvaluation && testEvaluation && (
                  <>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Total Nodes
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {countNodes(trainTree.root)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {countNodes(testTree.root)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {countNodes(trainTree.root) === countNodes(testTree.root) ? (
                          <span className="text-green-500">Same</span>
                        ) : (
                          <span className="text-red-500">Different</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Accuracy
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(trainEvaluation.metrics.accuracy * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(testEvaluation.metrics.accuracy * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {((trainEvaluation.metrics.accuracy - testEvaluation.metrics.accuracy) * 100).toFixed(2)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Macro Avg Precision
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(trainEvaluation.metrics.macroAvgPrecision * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(testEvaluation.metrics.macroAvgPrecision * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {((trainEvaluation.metrics.macroAvgPrecision - testEvaluation.metrics.macroAvgPrecision) * 100).toFixed(2)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Macro Avg Recall
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(trainEvaluation.metrics.macroAvgRecall * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(testEvaluation.metrics.macroAvgRecall * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {((trainEvaluation.metrics.macroAvgRecall - testEvaluation.metrics.macroAvgRecall) * 100).toFixed(2)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Macro Avg F1 Score
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(trainEvaluation.metrics.macroAvgF1 * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(testEvaluation.metrics.macroAvgF1 * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {((trainEvaluation.metrics.macroAvgF1 - testEvaluation.metrics.macroAvgF1) * 100).toFixed(2)}%
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

function countNodes(node: any): number {
  if (!node) return 0;
  if (node.type === 'leaf') return 1;
  return 1 + node.children.reduce((sum: number, child: any) => sum + countNodes(child), 0);
}