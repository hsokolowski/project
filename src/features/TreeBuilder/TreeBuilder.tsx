import React, { useState } from 'react';
import { Card } from '../../components/Card';
import { TreeCanvas } from './TreeCanvas';
import { FlowTree } from './FlowTree';
import { useTreeEngine } from '../../lib/engine/TreeEngineContext';
import { Element } from '../../types';
import { NodeEditor } from './NodeEditor';
import { DataViewer } from './DataViewer';
import { Layout } from 'lucide-react';

export const TreeBuilder: React.FC = () => {
  const { trees, isLoading, makeLeaf, omicsData } = useTreeEngine();
  const [selectedNode, setSelectedNode] = useState<Element | null>(null);
  const [viewMode, setViewMode] = useState<'canvas' | 'flow'>('canvas');
  
  const mainTree = trees['simple'] || trees[Object.keys(trees)[0]];
  const mainType = mainTree?.omicsType || 'simple';
  
  if (isLoading) {
    return (
      <Card title="Tree Builder">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Building tree...</p>
        </div>
      </Card>
    );
  }
  
  if (!mainTree) {
    return (
      <Card title="Tree Builder">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-gray-500 mb-2">No tree available</p>
          <p className="text-sm text-gray-400">
            Upload data and configure the experiment to build a tree
          </p>
        </div>
      </Card>
    );
  }

  const handleMakeLeaf = async (node: Element) => {
    try {
      await makeLeaf(node.id, mainType);
      setSelectedNode(null);
    } catch (err) {
      console.error('Failed to convert node to leaf:', err);
    }
  };

  return (
    <div className="space-y-4">
      <Card 
        title={`Decision Tree ${mainTree?.config?.algorithms ? `(${mainTree.config.algorithms.join('+')})` : ''}`}
        footer={
          <button
            onClick={() => setViewMode(mode => mode === 'canvas' ? 'flow' : 'canvas')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            <Layout size={16} />
            Switch to {viewMode === 'canvas' ? 'Flow' : 'Canvas'} View
          </button>
        }
      >
        <div className="h-[600px] overflow-auto bg-gray-50 rounded border border-gray-200">
          {viewMode === 'canvas' ? (
            <TreeCanvas
              tree={mainTree}
              onNodeSelect={setSelectedNode}
              onMakeLeaf={handleMakeLeaf}
            />
          ) : (
            <div className="p-4">
              <FlowTree 
                node={mainTree.root} 
                onNodeSelect={setSelectedNode}
                onMakeLeaf={handleMakeLeaf}
              />
            </div>
          )}
        </div>
      </Card>

      {selectedNode && (
        <Card title="Node Editor">
          <NodeEditor 
            node={selectedNode} 
            tree={mainTree}
            omicsType={mainType}
          />
        </Card>
      )}
    </div>
  );
};