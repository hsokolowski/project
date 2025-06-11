import React, { useState } from 'react';
import { Element } from '../../types';
import { useTreeEngine } from '../../lib/engine/TreeEngineContext';
import { UnfoldHorizontal, Maximize2, Table, X, Leaf as LeafIcon } from 'lucide-react';
import { DataViewer } from './DataViewer';

interface FlowTreeProps {
  node: Element;
  depth?: number;
  onNodeSelect?: (node: Element) => void;
  onMakeLeaf?: (node: Element) => void;
}

export const FlowTree: React.FC<FlowTreeProps> = ({ 
  node, 
  depth = 0,
  onNodeSelect,
  onMakeLeaf
}) => {
  const { unfoldLeafOnce, unfoldLeafFully, omicsData, engine } = useTreeEngine();
  const [showData, setShowData] = useState(false);

  const handleUnfoldOnce = async () => {
    if (node.type === 'leaf') {
      await unfoldLeafOnce(node.id, 'C4.5');
    }
  };

  const handleUnfoldFully = async () => {
    if (node.type === 'leaf') {
      await unfoldLeafFully(node.id, 'C4.5');
    }
  };

  const handleClick = () => {
    onNodeSelect?.(node);
  };

  const getLeafColor = () => {
    if (node.type !== 'leaf') return '';
    
    const total = node.statistics.totalInstances;
    if (total === 0 || node.predictedClass === 'Unknown') {
      return 'bg-red-50';
    }
    const correct = node.classDistribution[node.predictedClass] || 0;
    const confidence = correct / total;
    
    if (confidence < 0.5) return 'bg-orange-50';
    if (confidence < 0.75) return 'bg-yellow-50';
    if (confidence < 1) return 'bg-green-50';
    return 'bg-emerald-50';
  };

  const renderNodeContent = () => {
    if (node.type === 'leaf') {
      const confidence = (node.classDistribution[node.predictedClass] / node.statistics.totalInstances) * 100;
      
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">
                Class: {node.predictedClass}
              </span>
              <span className="text-sm text-gray-500">
                ({isNaN(confidence) ? '0.0' : confidence.toFixed(1)}%)
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Instances: {node.statistics.totalInstances}
          </div>
          {node.canExpand && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleUnfoldOnce}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
              >
                <UnfoldHorizontal size={14} />
                Unfold Once
              </button>
              <button
                onClick={handleUnfoldFully}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
              >
                <Maximize2 size={14} />
                Unfold All
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="font-medium">
            {node.test.attribute} {node.test.condition} {node.test.value}
            {node.test.weight && <span className="text-gray-500"> (w={node.test.weight})</span>}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMakeLeaf?.(node);
              }}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-full"
              title="Convert to leaf node"
            >
              <LeafIcon size={16} />
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Instances: {node.statistics.totalInstances} | Entropy: {node.statistics.entropy.toFixed(3)}
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      <div className="flex items-start">
        {depth > 0 && (
          <div className="w-8 flex-shrink-0">
            <div className="h-full border-l-2 border-gray-200" />
          </div>
        )}
        <div className="flex-grow">
          <div 
            className={`bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer ${getLeafColor()}`}
            onClick={handleClick}
          >
            <div className="p-3">
              {renderNodeContent()}
            </div>
          </div>
          
          {node.type === 'node' && node.children.length > 0 && (
            <div className="mt-4 space-y-4">
              {node.children.map((child, index) => (
                <div key={child.id} className="relative">
                  <div className="absolute -top-4 left-4 text-xs text-gray-500">
                    {index === 0 ? 'Yes' : 'No'}
                  </div>
                  <FlowTree 
                    node={child} 
                    depth={depth + 1} 
                    onNodeSelect={onNodeSelect}
                    onMakeLeaf={onMakeLeaf}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};