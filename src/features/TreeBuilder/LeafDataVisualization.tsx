import React, { useMemo, useState } from 'react';
import { Instance, Attribute, Leaf } from '../../types';
import { BarChart3, PieChart, Grid3X3, TrendingUp, Eye, EyeOff } from 'lucide-react';

interface LeafDataVisualizationProps {
  leaf: Leaf;
  instances: Instance[];
  attributes: Attribute[];
  onClose: () => void;
}

interface AttributeStats {
  name: string;
  type: 'continuous' | 'categorical' | 'binary';
  values: (string | number)[];
  distribution: Record<string, number>;
  mean?: number;
  median?: number;
  std?: number;
  min?: number;
  max?: number;
}

export const LeafDataVisualization: React.FC<LeafDataVisualizationProps> = ({
  leaf,
  instances,
  attributes,
  onClose
}) => {
  const [viewMode, setViewMode] = useState<'heatmap' | 'distributions' | 'correlations'>('distributions');
  const [selectedAttributes, setSelectedAttributes] = useState<Set<string>>(new Set());
  const [showOutliers, setShowOutliers] = useState(true);

  // Calculate statistics for each attribute
  const attributeStats = useMemo((): AttributeStats[] => {
    return attributes.map(attr => {
      const values = instances.map(inst => inst.values[attr.name]).filter(v => v !== undefined && v !== null);
      const distribution: Record<string, number> = {};
      
      // Count occurrences
      values.forEach(value => {
        const key = String(value);
        distribution[key] = (distribution[key] || 0) + 1;
      });

      const stats: AttributeStats = {
        name: attr.name,
        type: attr.type,
        values,
        distribution
      };

      // Calculate numerical statistics for continuous attributes
      if (attr.type === 'continuous' && values.every(v => !isNaN(Number(v)))) {
        const numValues = values.map(v => Number(v)).sort((a, b) => a - b);
        stats.mean = numValues.reduce((sum, val) => sum + val, 0) / numValues.length;
        stats.median = numValues[Math.floor(numValues.length / 2)];
        stats.min = numValues[0];
        stats.max = numValues[numValues.length - 1];
        
        // Calculate standard deviation
        const variance = numValues.reduce((sum, val) => sum + Math.pow(val - stats.mean!, 2), 0) / numValues.length;
        stats.std = Math.sqrt(variance);
      }

      return stats;
    });
  }, [attributes, instances]);

  // Get continuous attributes for heatmap
  const continuousAttributes = useMemo(() => {
    return attributeStats.filter(stat => stat.type === 'continuous');
  }, [attributeStats]);

  // Calculate correlation matrix for continuous attributes
  const correlationMatrix = useMemo(() => {
    if (continuousAttributes.length < 2) return null;

    const matrix: Record<string, Record<string, number>> = {};
    
    continuousAttributes.forEach(attr1 => {
      matrix[attr1.name] = {};
      continuousAttributes.forEach(attr2 => {
        if (attr1.name === attr2.name) {
          matrix[attr1.name][attr2.name] = 1;
          return;
        }

        const values1 = instances.map(inst => Number(inst.values[attr1.name])).filter(v => !isNaN(v));
        const values2 = instances.map(inst => Number(inst.values[attr2.name])).filter(v => !isNaN(v));
        
        if (values1.length !== values2.length) {
          matrix[attr1.name][attr2.name] = 0;
          return;
        }

        const mean1 = values1.reduce((sum, val) => sum + val, 0) / values1.length;
        const mean2 = values2.reduce((sum, val) => sum + val, 0) / values2.length;
        
        let numerator = 0;
        let sum1Sq = 0;
        let sum2Sq = 0;
        
        for (let i = 0; i < values1.length; i++) {
          const diff1 = values1[i] - mean1;
          const diff2 = values2[i] - mean2;
          numerator += diff1 * diff2;
          sum1Sq += diff1 * diff1;
          sum2Sq += diff2 * diff2;
        }
        
        const denominator = Math.sqrt(sum1Sq * sum2Sq);
        matrix[attr1.name][attr2.name] = denominator === 0 ? 0 : numerator / denominator;
      });
    });

    return matrix;
  }, [continuousAttributes, instances]);

  // Detect outliers using IQR method
  const detectOutliers = (stat: AttributeStats): number[] => {
    if (stat.type !== 'continuous') return [];
    
    const values = stat.values.map(v => Number(v)).sort((a, b) => a - b);
    const q1 = values[Math.floor(values.length * 0.25)];
    const q3 = values[Math.floor(values.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return values.filter(v => v < lowerBound || v > upperBound);
  };

  // Normalize values for heatmap (0-1 range)
  const normalizeValue = (value: number, min: number, max: number): number => {
    if (max === min) return 0.5;
    return (value - min) / (max - min);
  };

  // Get color for heatmap cell
  const getHeatmapColor = (value: number, isOutlier: boolean = false): string => {
    if (isOutlier && showOutliers) {
      return 'rgb(239, 68, 68)'; // Red for outliers
    }
    
    // Blue to red gradient
    const intensity = Math.max(0, Math.min(1, value));
    if (intensity < 0.5) {
      const blue = Math.floor(255 * (1 - intensity * 2));
      return `rgb(${blue}, ${blue}, 255)`;
    } else {
      const red = Math.floor(255 * ((intensity - 0.5) * 2));
      return `rgb(255, ${255 - red}, ${255 - red})`;
    }
  };

  // Get color for correlation
  const getCorrelationColor = (correlation: number): string => {
    const intensity = Math.abs(correlation);
    if (correlation > 0) {
      return `rgba(34, 197, 94, ${intensity})`; // Green for positive
    } else {
      return `rgba(239, 68, 68, ${intensity})`; // Red for negative
    }
  };

  const renderDistributionChart = (stat: AttributeStats) => {
    const maxCount = Math.max(...Object.values(stat.distribution));
    const outliers = detectOutliers(stat);
    
    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">{stat.name}</h4>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {stat.type}
          </span>
        </div>
        
        {stat.type === 'continuous' && stat.mean !== undefined && (
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
            <div>Mean: {stat.mean.toFixed(2)}</div>
            <div>Median: {stat.median?.toFixed(2)}</div>
            <div>Std: {stat.std?.toFixed(2)}</div>
            <div>Range: {stat.min?.toFixed(2)} - {stat.max?.toFixed(2)}</div>
            {outliers.length > 0 && (
              <div className="col-span-2 text-red-600">
                Outliers: {outliers.length}
              </div>
            )}
          </div>
        )}
        
        <div className="space-y-1">
          {Object.entries(stat.distribution)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10) // Show top 10 values
            .map(([value, count]) => {
              const percentage = (count / instances.length) * 100;
              const isOutlier = outliers.includes(Number(value));
              
              return (
                <div key={value} className="flex items-center gap-2">
                  <div className="w-16 text-xs text-gray-600 truncate" title={value}>
                    {value}
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        isOutlier && showOutliers ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <div className="w-12 text-xs text-gray-600 text-right">
                    {count} ({percentage.toFixed(1)}%)
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
  };

  const renderHeatmap = () => {
    if (continuousAttributes.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No continuous attributes available for heatmap visualization
        </div>
      );
    }

    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">Data Heatmap</h4>
          <button
            onClick={() => setShowOutliers(!showOutliers)}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            {showOutliers ? <Eye size={16} /> : <EyeOff size={16} />}
            {showOutliers ? 'Hide' : 'Show'} Outliers
          </button>
        </div>
        
        <div className="overflow-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="w-24 text-xs text-gray-500 text-left p-1">Instance</th>
                {continuousAttributes.slice(0, 20).map(attr => (
                  <th key={attr.name} className="text-xs text-gray-500 text-center p-1 min-w-[60px]">
                    <div className="transform -rotate-45 origin-left whitespace-nowrap">
                      {attr.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {instances.slice(0, 50).map((instance, idx) => (
                <tr key={instance.id}>
                  <td className="text-xs text-gray-600 p-1">
                    {idx + 1}
                  </td>
                  {continuousAttributes.slice(0, 20).map(attr => {
                    const value = Number(instance.values[attr.name]);
                    const normalizedValue = normalizeValue(value, attr.min!, attr.max!);
                    const outliers = detectOutliers(attr);
                    const isOutlier = outliers.includes(value);
                    
                    return (
                      <td
                        key={attr.name}
                        className="p-1 text-center text-xs"
                        style={{
                          backgroundColor: getHeatmapColor(normalizedValue, isOutlier),
                          color: normalizedValue > 0.5 ? 'white' : 'black'
                        }}
                        title={`${attr.name}: ${value.toFixed(2)}`}
                      >
                        {value.toFixed(1)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <div>Showing {Math.min(instances.length, 50)} instances × {Math.min(continuousAttributes.length, 20)} attributes</div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500"></div>
              <span>Low values</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500"></div>
              <span>High values</span>
            </div>
            {showOutliers && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600"></div>
                <span>Outliers</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCorrelationMatrix = () => {
    if (!correlationMatrix || continuousAttributes.length < 2) {
      return (
        <div className="text-center py-8 text-gray-500">
          Need at least 2 continuous attributes for correlation analysis
        </div>
      );
    }

    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-4">Attribute Correlations</h4>
        
        <div className="overflow-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="w-32 text-xs text-gray-500 text-left p-2"></th>
                {continuousAttributes.map(attr => (
                  <th key={attr.name} className="text-xs text-gray-500 text-center p-2 min-w-[80px]">
                    <div className="transform -rotate-45 origin-left whitespace-nowrap">
                      {attr.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {continuousAttributes.map(attr1 => (
                <tr key={attr1.name}>
                  <td className="text-xs text-gray-600 p-2 font-medium">
                    {attr1.name}
                  </td>
                  {continuousAttributes.map(attr2 => {
                    const correlation = correlationMatrix[attr1.name][attr2.name];
                    
                    return (
                      <td
                        key={attr2.name}
                        className="p-2 text-center text-xs font-medium"
                        style={{
                          backgroundColor: getCorrelationColor(correlation),
                          color: Math.abs(correlation) > 0.5 ? 'white' : 'black'
                        }}
                        title={`${attr1.name} vs ${attr2.name}: ${correlation.toFixed(3)}`}
                      >
                        {correlation.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <div>Correlation values range from -1 (negative) to +1 (positive)</div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500"></div>
              <span>Positive correlation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500"></div>
              <span>Negative correlation</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Leaf Data Analysis: {leaf.id}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {instances.length} instances • Class: {leaf.predictedClass} • 
              Confidence: {((leaf.classDistribution[leaf.predictedClass] / leaf.statistics.totalInstances) * 100).toFixed(1)}%
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
          >
            ×
          </button>
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center gap-4 p-4 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">View:</span>
          {[
            { id: 'distributions', label: 'Distributions', icon: <BarChart3 size={16} /> },
            { id: 'heatmap', label: 'Heatmap', icon: <Grid3X3 size={16} /> },
            { id: 'correlations', label: 'Correlations', icon: <TrendingUp size={16} /> }
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id as any)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                viewMode === mode.id
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {mode.icon}
              {mode.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {viewMode === 'distributions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {attributeStats.map(stat => renderDistributionChart(stat))}
            </div>
          )}
          
          {viewMode === 'heatmap' && renderHeatmap()}
          
          {viewMode === 'correlations' && renderCorrelationMatrix()}
        </div>

        {/* Footer with summary stats */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total Instances:</span>
              <span className="ml-2 font-medium">{instances.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Attributes:</span>
              <span className="ml-2 font-medium">{attributes.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Continuous:</span>
              <span className="ml-2 font-medium">{continuousAttributes.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Entropy:</span>
              <span className="ml-2 font-medium">{leaf.statistics.entropy.toFixed(3)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};