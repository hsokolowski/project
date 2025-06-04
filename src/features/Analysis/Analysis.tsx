import React, { useState } from 'react';
import { Card } from '../../components/Card';
import { useTreeEngine } from '../../lib/engine/TreeEngineContext';
import { ROCChart } from './ROCChart';
import { Heatmap } from './Heatmap';
import { SHAPSummary } from './SHAPSummary';
import { ConfusionMatrix } from './ConfusionMatrix';

export const Analysis: React.FC = () => {
  const { trainEvaluation, testEvaluation, trainTree, trainingData, isLoading } = useTreeEngine();
  const [activeTab, setActiveTab] = useState<'confusion' | 'heatmap' | 'roc' | 'shap'>('confusion');
  
  if (isLoading) {
    return (
      <Card title="Analysis">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading analysis...</p>
        </div>
      </Card>
    );
  }
  
  if (!trainEvaluation) {
    return (
      <Card title="Analysis">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-gray-500 mb-2">No analysis available</p>
          <p className="text-sm text-gray-400">
            Build a tree first to view analysis results
          </p>
        </div>
      </Card>
    );
  }
  
  return (
    <Card>
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {[
            { id: 'confusion', label: 'Confusion Matrix' },
            { id: 'heatmap', label: 'Gene Heatmap' },
            { id: 'roc', label: 'ROC Curve' },
            { id: 'shap', label: 'SHAP Summary' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      <div>
        {activeTab === 'confusion' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-medium mb-2">Training Data Evaluation</h3>
              <ConfusionMatrix result={trainEvaluation} />
            </div>
            
            {testEvaluation && (
              <div>
                <h3 className="text-base font-medium mb-2">Test Data Evaluation</h3>
                <ConfusionMatrix result={testEvaluation} />
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'heatmap' && (
          <div>
            {trainingData ? (
              <Heatmap data={trainingData} />
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">No data available for heatmap visualization</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'roc' && (
          <div className="space-y-6">
            {trainEvaluation && (
              <div>
                <h3 className="text-base font-medium mb-2">Training ROC Curve</h3>
                {trainEvaluation.rocCurve ? (
                  <ROCChart 
                    data={trainEvaluation.rocCurve} 
                    auc={trainEvaluation.metrics.macroAvgF1} 
                    isMultiClass={trainEvaluation.confusionMatrix.classLabels.length > 2}
                  />
                ) : (
                  <div className="bg-yellow-50 text-yellow-700 p-4 rounded-lg border border-yellow-200">
                    <p>ROC curve is not available for this model configuration.</p>
                    <p className="text-sm mt-1">
                      This could be due to:
                      <ul className="list-disc list-inside mt-1">
                        <li>Missing probability scores for predictions</li>
                        <li>Insufficient data points for reliable curve generation</li>
                        <li>Current model configuration not supporting probability outputs</li>
                      </ul>
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {testEvaluation && testEvaluation.rocCurve && (
              <div>
                <h3 className="text-base font-medium mb-2">Test ROC Curve</h3>
                <ROCChart 
                  data={testEvaluation.rocCurve} 
                  auc={testEvaluation.metrics.macroAvgF1}
                  isMultiClass={testEvaluation.confusionMatrix.classLabels.length > 2}
                />
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'shap' && (
          <div>
            <SHAPSummary />
          </div>
        )}
      </div>
    </Card>
  );
};