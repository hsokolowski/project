import React, { useEffect, useRef, useState } from 'react';
import { DecisionTree, Element, Node, Leaf, SplitTest } from '../../types';
import { ChevronDown, ChevronRight, RefreshCw, FlipHorizontal as LayoutHorizontal, FlipVertical as LayoutVertical, Split, Leaf as LeafIcon } from 'lucide-react';
import { useTreeEngine } from '../../lib/engine/TreeEngineContext';

interface TreeCanvasProps {
  tree: DecisionTree;
  onNodeSelect?: (node: Element) => void;
  onMakeLeaf?: (node: Element) => void;
}

export const TreeCanvas: React.FC<TreeCanvasProps> = ({ 
  tree,
  onNodeSelect,
  onMakeLeaf
}) => {
  const { unfoldLeafOnce, unfoldLeafFully } = useTreeEngine();
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<NodeCoordinates[]>([]);
  const [svgSize, setSvgSize] = useState({ width: 1000, height: 800 });
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [layout, setLayout] = useState<'horizontal' | 'vertical'>('horizontal');

  const getLeafColor = (node: Leaf): string => {
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

  const formatTestCondition = (test: SplitTest): string => {
    if (test.isValueAttribute) {
      return `${test.attribute} ${test.condition} ${test.value}${test.weight ? ` (w=${test.weight})` : ''}`;
    }
    return `${test.attribute} ${test.condition} ${test.value}`;
  };

  const layoutTree = () => {
    if (!tree.root) return;

    const nodeWidth = 200;
    const nodeHeight = 100;
    const horizontalSpacing = 40;
    const verticalSpacing = 60;

    const calculateNodePositions = (
      node: Element,
      level: number,
      startPos: number,
      positions: NodeCoordinates[]
    ): number => {
      if (node.folded || (node.type === 'node' && node.children.length === 0)) {
        const pos: NodeCoordinates = {
          x: layout === 'horizontal' ? startPos : level * (nodeWidth + horizontalSpacing),
          y: layout === 'horizontal' ? level * (nodeHeight + verticalSpacing) : startPos,
          width: nodeWidth,
          height: nodeHeight,
          node
        };
        positions.push(pos);
        return startPos + (layout === 'horizontal' ? nodeWidth + horizontalSpacing : nodeHeight + verticalSpacing);
      }

      if (node.type === 'node') {
        let childStartPos = startPos;
        let totalSize = 0;

        node.children.forEach(child => {
          const endPos = calculateNodePositions(child, level + 1, childStartPos, positions);
          const size = endPos - childStartPos - (layout === 'horizontal' ? horizontalSpacing : verticalSpacing);
          totalSize += size + (layout === 'horizontal' ? horizontalSpacing : verticalSpacing);
          childStartPos = endPos;
        });

        const pos: NodeCoordinates = {
          x: layout === 'horizontal' ? startPos + (totalSize - nodeWidth) / 2 : level * (nodeWidth + horizontalSpacing),
          y: layout === 'horizontal' ? level * (nodeHeight + verticalSpacing) : startPos + (totalSize - nodeHeight) / 2,
          width: nodeWidth,
          height: nodeHeight,
          node
        };
        positions.push(pos);
        return childStartPos;
      }

      const pos: NodeCoordinates = {
        x: layout === 'horizontal' ? startPos : level * (nodeWidth + horizontalSpacing),
        y: layout === 'horizontal' ? level * (nodeHeight + verticalSpacing) : startPos,
        width: nodeWidth,
        height: nodeHeight,
        node
      };
      positions.push(pos);
      return startPos + (layout === 'horizontal' ? nodeWidth + horizontalSpacing : nodeHeight + verticalSpacing);
    };

    const positions: NodeCoordinates[] = [];
    calculateNodePositions(tree.root, 0, 0, positions);
    setNodes(positions);

    const maxX = Math.max(...positions.map(p => p.x + p.width));
    const maxY = Math.max(...positions.map(p => p.y + p.height));
    setSvgSize({ width: maxX + 100, height: maxY + 100 });

    const root = positions.find(p => p.node.id === tree.root.id);
    if (root && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const offsetX = containerRect.width / 2 - (root.x + root.width / 2);
      const offsetY = 40;
      setTransform({ x: offsetX, y: offsetY, scale: 1 });
    }
  };

  useEffect(() => {
    layoutTree();
  }, [tree, layout]);

  const handleNodeClick = (node: Element) => {
    setSelectedNodeId(node.id);
    onNodeSelect?.(node);
  };

  const handleNodeToggle = (node: Element, e: React.MouseEvent) => {
    e.stopPropagation();
    node.folded = !node.folded;
    layoutTree();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setStartPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - startPoint.x;
      const dy = e.clientY - startPoint.y;
      setTransform(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy
      }));
      setStartPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(transform.scale + scaleAmount, 0.5), 2);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scaleFactor = newScale / transform.scale;
    const dx = mouseX - mouseX * scaleFactor;
    const dy = mouseY - mouseY * scaleFactor;

    setTransform({
      x: transform.x + dx,
      y: transform.y + dy,
      scale: newScale
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <div
        className="absolute transition-transform duration-75"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0'
        }}
      >
        <svg
          width={svgSize.width}
          height={svgSize.height}
          className="absolute top-0 left-0"
          style={{ pointerEvents: 'none', overflow: 'visible' }}
        >
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" fill="#6B7280" />
            </marker>
          </defs>
          {nodes.map((nodePos) => {
            if (nodePos.node.type === 'node' && !nodePos.node.folded) {
              return nodePos.node.children.map((child, index) => {
                const childPos = nodes.find(n => n.node.id === child.id);
                if (!childPos) return null;

                let path;
                let labelX;
                let labelY;

                if (layout === 'horizontal') {
                  const startX = nodePos.x + nodePos.width / 2;
                  const startY = nodePos.y + nodePos.height;
                  const endX = childPos.x + childPos.width / 2;
                  const endY = childPos.y;
                  const midY = (startY + endY) / 2;

                  path = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
                  labelX = (startX + endX) / 2;
                  labelY = midY - 10;
                } else {
                  const startX = nodePos.x + nodePos.width;
                  const startY = nodePos.y + nodePos.height / 2;
                  const endX = childPos.x;
                  const endY = childPos.y + childPos.height / 2;
                  const midX = (startX + endX) / 2;

                  path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
                  labelX = midX + 10;
                  labelY = (startY + endY) / 2;
                }

                return (
                  <g key={`${nodePos.node.id}-${child.id}`}>
                    <path
                      d={path}
                      stroke="#6B7280"
                      strokeWidth="2"
                      fill="none"
                      markerEnd="url(#arrow)"
                    />
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      fill="#4B5563"
                      fontSize="12"
                      fontFamily="sans-serif"
                      pointerEvents="none"
                    >
                      {index === 0 ? 'Yes' : 'No'}
                    </text>
                  </g>
                );
              });
            }
            return null;
          })}
        </svg>

        {nodes.map((nodePos) => (
          <div
            key={nodePos.node.id}
            className={`absolute rounded-lg shadow-md border transition-colors cursor-pointer
              ${selectedNodeId === nodePos.node.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}
              ${nodePos.node.type === 'leaf' ? getLeafColor(nodePos.node) : 'bg-white'}
            `}
            style={{
              left: nodePos.x,
              top: nodePos.y,
              width: nodePos.width,
              height: nodePos.height
            }}
            onClick={() => handleNodeClick(nodePos.node)}
          >
            <div className="p-2">
              {nodePos.node.type === 'node' ? (
                <div className="text-sm">
                  <div className="font-medium truncate flex items-center justify-between">
                    <span>{formatTestCondition(nodePos.node.test)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMakeLeaf?.(nodePos.node);
                      }}
                      className="p-1 hover:bg-gray-100 rounded-full"
                      title="Convert to leaf node"
                    >
                      <LeafIcon size={14} />
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Instances: {nodePos.node.statistics.totalInstances} | 
                    Entropy: {nodePos.node.statistics.entropy.toFixed(2)}
                  </div>
                </div>
              ) : (
                <div className="text-sm">
                  <div className="font-medium text-gray-700">
                    <span>
                      Class: {nodePos.node.predictedClass} (
                      {nodePos.node.statistics.totalInstances > 0 ? ((nodePos.node.classDistribution[nodePos.node.predictedClass] / 
                         nodePos.node.statistics.totalInstances) * 100).toFixed(1) : '0.0'}%)
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Instances: {nodePos.node.statistics.totalInstances}
                  </div>
                  {nodePos.node.classDistribution && (
                    <div className="mt-1 text-xs text-gray-500">
                      {Object.entries(nodePos.node.classDistribution).map(([label, count]) => {
                        const percent = ((count / nodePos.node.statistics.totalInstances) * 100).toFixed(1);
                        return <div key={label}>{label}: {percent}%</div>;
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {nodePos.node.type === 'node' && nodePos.node.children.length > 0 && (
              <button
                className="absolute bottom-1 right-1 p-1 rounded-full text-gray-500 hover:bg-gray-100"
                onClick={(e) => handleNodeToggle(nodePos.node, e)}
                title={nodePos.node.folded ? 'Expand' : 'Collapse'}
              >
                {nodePos.node.folded ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-md border border-gray-200 flex">
        <button
          className="p-2 hover:bg-gray-100 text-gray-700"
          onClick={() => setLayout(l => l === 'horizontal' ? 'vertical' : 'horizontal')}
          title={`Switch to ${layout === 'horizontal' ? 'vertical' : 'horizontal'} layout`}
        >
          {layout === 'horizontal' ? <LayoutVertical size={14} /> : <LayoutHorizontal size={14} />}
        </button>
        <button
          className="p-2 hover:bg-gray-100 text-gray-700"
          onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(prev.scale + 0.1, 2) }))}
          title="Zoom In"
        >
          +
        </button>
        <button
          className="p-2 hover:bg-gray-100 text-gray-700"
          onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(prev.scale - 0.1, 0.5) }))}
          title="Zoom Out"
        >
          –
        </button>
        <button
          className="p-2 hover:bg-gray-100 text-gray-700"
          onClick={() => layoutTree()}
          title="Reset View"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    </div>
  );
};