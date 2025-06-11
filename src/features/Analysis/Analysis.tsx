import React, { useState } from 'react';
import { Card } from '../../components/Card';
import { useTreeEngine } from '../../lib/engine/TreeEngineContext';
import { ROCChart } from './ROCChart';
import { Heatmap } from './Heatmap';
import { SHAPSummary } from './SHAPSummary';
import { ConfusionMatrix } from './ConfusionMatrix';

export const Analysis: React.FC = () => {
  const { evaluations, trees, omicsData, isLoading } = useTreeEngine();
  const [activeTab, setActiveTab] = useState<'confusion' | 'heatmap' | 'roc' | 'shap'>('confusion');
  
  const mainTree = trees['simple'] || trees[Object.keys(trees)[0]];
  const mainEvaluation = evaluations['simple'] || evaluations[Object.keys(evaluations)[0]];
  const mainData = omicsData['simple']?.training || omicsData[Object.keys(omicsData)[0]]?.training;
  const testEvaluation = mainEvaluation?.test;
  
  if (isLoading) {
    return (
      <Card title="Analysis">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading analysis...</p>
        </div>
      </Card>
    );
  }
  
  if (!mainEvaluation) {
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

  // For multi-tree fusion, show combined metrics
  const showCombinedMetrics = mainTree?.config.fusionType === 'multi-tree' && 
    Object.keys(evaluations).length > 1;
  
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
          <div className="space-y-8">
            {showCombinedMetrics ? (
              // Show individual matrices for each omics type
              Object.entries(evaluations).map(([type, evaluation]) => (
                <div key={type} className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {type === 'simple' ? 'Simple Dataset' : `${type} Data`}
                  </h3>
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <ConfusionMatrix result={evaluation} />
                  </div>
                  {evaluation.test && (
                    <div className="mt-6">
                      <h4 className="text-base font-medium text-gray-700 mb-4">Test Data Results</h4>
                      <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <ConfusionMatrix result={evaluation.test} />
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Training Data Evaluation</h3>
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <ConfusionMatrix result={mainEvaluation} />
                  </div>
                </div>
                
                {testEvaluation && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Test Data Evaluation</h3>
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <ConfusionMatrix result={testEvaluation} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        
        {activeTab === 'heatmap' && (
          <div>
            {mainData?.isGenomic ? (
              <Heatmap data={mainData} />
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Heatmap visualization is only available for genomic data</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'roc' && (
          <div className="space-y-6">
            {showCombinedMetrics ? (
              // Show ROC curves for each omics type
              Object.entries(evaluations).map(([type, evaluation]) => (
                evaluation.rocCurve && (
                  <div key={type}>
                    <h3 className="text-base font-medium mb-2">
                      {type === 'simple' ? 'Simple Dataset' : `${type} Data`} ROC Curve
                    </h3>
                    <ROCChart 
                      data={evaluation.rocCurve} 
                      auc={evaluation.metrics.macroAvgF1} 
                      isMultiClass={evaluation.confusionMatrix.classLabels.length > 2}
                    />
                    {evaluation.test?.rocCurve && (
                      <div className="mt-6">
                        <h4 className="text-base font-medium mb-2">Test Data ROC Curve</h4>
                        <ROCChart 
                          data={evaluation.test.rocCurve} 
                          auc={evaluation.test.metrics.macroAvgF1} 
                          isMultiClass={evaluation.test.confusionMatrix.classLabels.length > 2}
                        />
                      </div>
                    )}
                  </div>
                )
              ))
            ) : (
              <>
                {mainEvaluation.rocCurve && (
                  <div>
                    <h3 className="text-base font-medium mb-2">Training ROC Curve</h3>
                    <ROCChart 
                      data={mainEvaluation.rocCurve} 
                      auc={mainEvaluation.metrics.macroAvgF1} 
                      isMultiClass={mainEvaluation.confusionMatrix.classLabels.length > 2}
                    />
                  </div>
                )}
                
                {testEvaluation?.rocCurve && (
                  <div>
                    <h3 className="text-base font-medium mb-2">Test ROC Curve</h3>
                    <ROCChart 
                      data={testEvaluation.rocCurve} 
                      auc={testEvaluation.metrics.macroAvgF1}
                      isMultiClass={testEvaluation.confusionMatrix.classLabels.length > 2}
                    />
                  </div>
                )}
              </>
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