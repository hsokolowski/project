import React from 'react';
import { EvaluationResult } from '../../types';

interface ConfusionMatrixProps {
  result: EvaluationResult;
}

export const ConfusionMatrix: React.FC<ConfusionMatrixProps> = ({ result }) => {
  const { confusionMatrix, metrics } = result;
  const { matrix, classLabels } = confusionMatrix;
  
  // Calculate row and column totals
  const rowTotals: Record<string, number> = {};
  const colTotals: Record<string, number> = {};
  
  classLabels.forEach(actualClass => {
    rowTotals[actualClass] = classLabels.reduce(
      (sum, predictedClass) => sum + (matrix[actualClass][predictedClass] || 0), 
      0
    );
  });
  
  classLabels.forEach(predictedClass => {
    colTotals[predictedClass] = classLabels.reduce(
      (sum, actualClass) => sum + (matrix[actualClass][predictedClass] || 0), 
      0
    );
  });
  
  // Calculate total instances
  const totalInstances = Object.values(rowTotals).reduce((sum, count) => sum + count, 0);
  
  // Function to calculate cell colors based on intensity
  const getCellColor = (actualClass: string, predictedClass: string): string => {
    const value = matrix[actualClass][predictedClass] || 0;
    const max = rowTotals[actualClass];
    const intensity = max > 0 ? value / max : 0;
    
    if (actualClass === predictedClass) {
      // Correct predictions - green scale
      return `rgba(16, 185, 129, ${0.1 + intensity * 0.8})`;
    } else {
      // Incorrect predictions - red scale
      return `rgba(239, 68, 68, ${0.1 + intensity * 0.8})`;
    }
  };

  // Function to format percentage
  const formatPercentage = (value: number): string => {
    return (value * 100).toFixed(1) + '%';
  };
  
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actual / Predicted
              </th>
              {classLabels.map(label => (
                <th 
                  key={label} 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {label}
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recall
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {classLabels.map(actualClass => (
              <tr key={actualClass}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {actualClass}
                </td>
                {classLabels.map(predictedClass => (
                  <td 
                    key={predictedClass} 
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    style={{
                      backgroundColor: getCellColor(actualClass, predictedClass)
                    }}
                  >
                    <div className="text-center">
                      <div>{matrix[actualClass][predictedClass] || 0}</div>
                      <div className="text-xs text-gray-500">
                        {formatPercentage((matrix[actualClass][predictedClass] || 0) / rowTotals[actualClass])}
                      </div>
                    </div>
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {rowTotals[actualClass]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatPercentage(metrics.recall[actualClass])}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Total
              </td>
              {classLabels.map(predictedClass => (
                <td 
                  key={predictedClass} 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium"
                >
                  {colTotals[predictedClass]}
                </td>
              ))}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                {totalInstances}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                {formatPercentage(metrics.macroAvgRecall)}
              </td>
            </tr>
            <tr className="bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Precision
              </td>
              {classLabels.map(predictedClass => (
                <td 
                  key={predictedClass} 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                >
                  {formatPercentage(metrics.precision[predictedClass])}
                </td>
              ))}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                -
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                {formatPercentage(metrics.macroAvgPrecision)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Accuracy</div>
          <div className="text-2xl font-semibold mt-1">{formatPercentage(metrics.accuracy)}</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Macro Avg Precision</div>
          <div className="text-2xl font-semibold mt-1">{formatPercentage(metrics.macroAvgPrecision)}</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Macro Avg Recall</div>
          <div className="text-2xl font-semibold mt-1">{formatPercentage(metrics.macroAvgRecall)}</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Macro Avg F1</div>
          <div className="text-2xl font-semibold mt-1">{formatPercentage(metrics.macroAvgF1)}</div>
        </div>
      </div>
      
      <details className="bg-white rounded-lg border border-gray-200">
        <summary className="px-4 py-2 cursor-pointer font-medium text-sm">
          Class-Specific Metrics
        </summary>
        <div className="border-t border-gray-200 px-4 py-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precision
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recall
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    F1 Score
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classLabels.map(cls => (
                  <tr key={cls}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {cls}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPercentage(metrics.precision[cls])}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPercentage(metrics.recall[cls])}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPercentage(metrics.f1Score[cls])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </div>
  );
};