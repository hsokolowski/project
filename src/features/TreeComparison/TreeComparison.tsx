import React, { useState } from 'react';
import { Card } from '../../components/Card';
import { TrainTree } from './TrainTree';
import { TestTree } from './TestTree';
import { useTreeEngine } from '../../lib/engine/TreeEngineContext';
import { TreeCanvas } from '../TreeBuilder/TreeCanvas';
import { FlowTree } from '../TreeBuilder/FlowTree';
import { Layout, Download, Code } from 'lucide-react';

export const TreeComparison: React.FC = () => {
  const { trees, evaluations, isLoading } = useTreeEngine();
  const [viewMode, setViewMode] = useState<'canvas' | 'flow'>('canvas');
  const [showStructure, setShowStructure] = useState<boolean>(false);
  
  const mainTree = trees['simple'] || trees[Object.keys(trees)[0]];
  const mainEvaluation = evaluations['simple'] || evaluations[Object.keys(evaluations)[0]];
  const testTree = mainTree?.test;
  const testEvaluation = mainEvaluation?.test;
  
  if (isLoading) {
    return (
      <Card title="Tree Comparison">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading trees...</p>
        </div>
      </Card>
    );
  }
  
  if (!mainTree) {
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

  const downloadTreeStructure = (tree: any, filename: string) => {
    const dataStr = JSON.stringify(tree, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${filename}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
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
              {mainEvaluation && (
                <span className="text-sm text-gray-500">
                  Accuracy: {(mainEvaluation.metrics.accuracy * 100).toFixed(2)}%
                </span>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            <TrainTree tree={mainTree} />
            <div className="h-[400px] overflow-auto bg-gray-50 rounded border border-gray-200">
              {viewMode === 'canvas' ? (
                <TreeCanvas tree={mainTree} />
              ) : (
                <div className="p-4">
                  <FlowTree node={mainTree.root} />
                </div>
              )}
            </div>
            
            {/* Tree Structure Preview - moved below visualization */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setShowStructure(!showStructure)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  <Code size={16} />
                  {showStructure ? 'Hide' : 'Show'} Tree Structure
                </button>
                <button
                  onClick={() => downloadTreeStructure(mainTree, 'training-tree-structure')}
                  className="flex items-center gap-2 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                >
                  <Download size={14} />
                  Download JSON
                </button>
              </div>
              
              {showStructure && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm">
                  <pre className="text-xs overflow-x-auto h-40 bg-white p-2 rounded border border-gray-200">
                    {JSON.stringify(mainTree.root, null, 2)}
                  </pre>
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
              
              {/* Tree Structure Preview - moved below visualization */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setShowStructure(!showStructure)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    <Code size={16} />
                    {showStructure ? 'Hide' : 'Show'} Tree Structure
                  </button>
                  <button
                    onClick={() => downloadTreeStructure(testTree, 'test-tree-structure')}
                    className="flex items-center gap-2 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    <Download size={14} />
                    Download JSON
                  </button>
                </div>
                
                {showStructure && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm">
                    <pre className="text-xs overflow-x-auto h-40 bg-white p-2 rounded border border-gray-200">
                      {JSON.stringify(testTree.root, null, 2)}
                    </pre>
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
      
      {mainTree && testTree && (
        <Card title="Tree Comparison Summary">
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-500">Training Accuracy</div>
                <div className="text-xl font-semibold mt-1">
                  {mainEvaluation ? (mainEvaluation.metrics.accuracy * 100).toFixed(2) + '%' : 'N/A'}
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
                  {mainEvaluation ? (mainEvaluation.metrics.macroAvgF1 * 100).toFixed(2) + '%' : 'N/A'}
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
                {mainEvaluation && testEvaluation && (
                  <>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Total Nodes
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {countNodes(mainTree.root)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {countNodes(testTree.root)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {countNodes(mainTree.root) === countNodes(testTree.root) ? (
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
                        {(mainEvaluation.metrics.accuracy * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(testEvaluation.metrics.accuracy * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {((mainEvaluation.metrics.accuracy - testEvaluation.metrics.accuracy) * 100).toFixed(2)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Macro Avg Precision
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(mainEvaluation.metrics.macroAvgPrecision * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(testEvaluation.metrics.macroAvgPrecision * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {((mainEvaluation.metrics.macroAvgPrecision - testEvaluation.metrics.macroAvgPrecision) * 100).toFixed(2)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Macro Avg Recall
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(mainEvaluation.metrics.macroAvgRecall * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(testEvaluation.metrics.macroAvgRecall * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {((mainEvaluation.metrics.macroAvgRecall - testEvaluation.metrics.macroAvgRecall) * 100).toFixed(2)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Macro Avg F1 Score
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(mainEvaluation.metrics.macroAvgF1 * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(testEvaluation.metrics.macroAvgF1 * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {((mainEvaluation.metrics.macroAvgF1 - testEvaluation.metrics.macroAvgF1) * 100).toFixed(2)}%
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