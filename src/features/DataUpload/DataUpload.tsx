import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { Card } from '../../components/Card';
import { useTreeEngine } from '../../lib/engine/TreeEngineContext';
import { parseCSV } from '../../lib/utils/csvParser';
import { mockSimpleTrainingData, mockSimpleTestData, mockBioTrainingData, mockBioTestData } from '../../lib/utils/mockData';
import { FileSpreadsheet, Dna, FlaskConical } from 'lucide-react';

export const DataUpload: React.FC = () => {
  const { setOmicsData, clearAllData, isLoading } = useTreeEngine();
  const [error, setError] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const handleFileUpload = async (fileType: 'training' | 'test', file: File) => {
    const key = `data-${fileType}`;
    setLoadingStates(prev => ({ ...prev, [key]: true }));
    setError(null);

    try {
      const content = await file.text();
      const dataset = parseCSV(content, file.name);
      setOmicsData('simple', fileType, dataset);
    } catch (err) {
      setError(`Error parsing ${fileType} file: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoadingStates(prev => ({ ...prev, [key]: false }));
    }
  };

  const loadSimpleDemoData = () => {
    clearAllData(); // Reset state first
    setOmicsData('simple', 'training', mockSimpleTrainingData);
    setOmicsData('simple', 'test', mockSimpleTestData);
  };

  const loadBioDemoData = () => {
    clearAllData(); // Reset state first
    setOmicsData('simple', 'training', mockBioTrainingData);
    setOmicsData('simple', 'test', mockBioTestData);
  };

  // NEW: Load only bio training data for cross-validation
  const loadBioTrainingOnly = () => {
    clearAllData(); // Reset state first
    setOmicsData('simple', 'training', mockBioTrainingData);
    // Intentionally NOT loading test data to trigger cross-validation
  };

  return (
    <Card title="Data Upload">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded border border-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Training Data</h4>
            <FileUpload 
              onFileUpload={(files) => handleFileUpload('training', files[0])} 
              isLoading={loadingStates['data-training']}
              accept=".csv"
              label="Upload Training CSV"
            />
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Test Data</h4>
            <FileUpload 
              onFileUpload={(files) => handleFileUpload('test', files[0])} 
              isLoading={loadingStates['data-test']}
              accept=".csv"
              label="Upload Test CSV"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={loadSimpleDemoData}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 inline-flex items-center gap-2"
          >
            <FileSpreadsheet size={16} />
            Load Simple Demo Data
          </button>
          <button
            onClick={loadBioDemoData}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <Dna size={16} />
            Load Bio Demo Data
          </button>
          <button
            onClick={loadBioTrainingOnly}
            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 inline-flex items-center gap-2"
          >
            <FlaskConical size={16} />
            Bio Training Only
          </button>
        </div>
      </div>
    </Card>
  );
};