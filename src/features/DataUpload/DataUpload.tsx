import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { Card } from '../../components/Card';
import { useTreeEngine } from '../../lib/engine/TreeEngineContext';
import { parseCSV } from '../../lib/utils/csvParser';
import { Dataset } from '../../types';
import { mockTrainingData, mockTestData, mockGenomicTrainingData, mockGenomicTestData } from '../../lib/utils/mockData';
import { Database, Dna } from 'lucide-react';

export const DataUpload: React.FC = () => {
  const { setTrainingData, setTestData, trainingData, testData } = useTreeEngine();
  const [loading, setLoading] = useState({ training: false, test: false });
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (
    fileType: 'training' | 'test', 
    file: File
  ) => {
    setLoading(prev => ({ ...prev, [fileType]: true }));
    setError(null);

    try {
      const content = await file.text();
      const dataset = parseCSV(content, file.name);
      
      if (fileType === 'training') {
        setTrainingData(dataset);
      } else {
        setTestData(dataset);
      }
    } catch (err) {
      setError(`Error parsing ${fileType} file: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(prev => ({ ...prev, [fileType]: false }));
    }
  };

  const loadMockData = (isGenomic: boolean) => {
    if (isGenomic) {
      setTrainingData(mockGenomicTrainingData);
      setTestData(mockGenomicTestData);
    } else {
      setTrainingData(mockTrainingData);
      setTestData(mockTestData);
    }
  };

  const renderDataSummary = (dataset: Dataset | null, type: string) => {
    if (!dataset) return <p className="text-gray-500 italic">No {type} data loaded</p>;
    
    return (
      <div className="space-y-1">
        <p className="font-medium">{dataset.name}</p>
        <p className="text-sm text-gray-600">
          {dataset.instances.length} instances, {dataset.attributes.length} attributes
        </p>
        <div className="text-xs text-gray-500 mt-1">
          Attributes: {dataset.attributes.map(a => a.name).slice(0, 5).join(', ')}
          {dataset.attributes.length > 5 ? ` and ${dataset.attributes.length - 5} more...` : ''}
        </div>
        {dataset.isGenomic && (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <Dna size={14} />
            <span>Genomic Dataset</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card title="Data Upload">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded border border-red-200 text-sm">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Training Data</h4>
            <FileUpload 
              onFileUpload={(file) => handleFileUpload('training', file)} 
              isLoading={loading.training}
              accept=".csv"
              label="Upload Training CSV"
            />
            <div className="mt-3 p-3 bg-gray-50 rounded">
              {renderDataSummary(trainingData, 'training')}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Test Data</h4>
            <FileUpload 
              onFileUpload={(file) => handleFileUpload('test', file)} 
              isLoading={loading.test}
              accept=".csv"
              label="Upload Test CSV"
            />
            <div className="mt-3 p-3 bg-gray-50 rounded">
              {renderDataSummary(testData, 'test')}
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => loadMockData(false)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors inline-flex items-center gap-2"
          >
            <Database size={16} />
            Load Demo Data
          </button>
          <button
            onClick={() => loadMockData(true)}
            className="px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors inline-flex items-center gap-2"
          >
            <Dna size={16} />
            Load Genomic Demo Data
          </button>
        </div>
      </div>
    </Card>
  );
};