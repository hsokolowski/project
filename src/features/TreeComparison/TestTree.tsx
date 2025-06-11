import React from 'react';
import { DecisionTree, Element } from '../../types';

interface TestTreeProps {
  tree: DecisionTree;
}

export const TestTree: React.FC<TestTreeProps> = ({ tree }) => {
  // Simple tree statistics
  const countNodes = (root: Element): { total: number, internal: number, leaf: number } => {
    let internal = 0;
    let leaf = 0;
    
    const traverse = (node: Element): void => {
      if (node.type === 'leaf') {
        leaf++;
      } else {
        internal++;
        node.children.forEach(child => traverse(child));
      }
    };
    
    traverse(tree.root);
    return { total: internal + leaf, internal, leaf };
  };
  
  const nodeStats = countNodes(tree.root);
  
  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">Algorithms</div>
            <div className="text-lg font-medium">{tree.config.algorithms.join('+')}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Total Nodes</div>
            <div className="text-lg font-medium">{nodeStats.total}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Leaf Nodes</div>
            <div className="text-lg font-medium">{nodeStats.leaf}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Max Depth</div>
            <div className="text-lg font-medium">{tree.config.maxDepth}</div>
          </div>
        </div>
      </div>
    </div>
  );
};