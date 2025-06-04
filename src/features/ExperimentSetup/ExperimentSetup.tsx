import React from 'react';
import { Card } from '../../components/Card';
import { SetupForm } from './SetupForm';
import { useTreeEngine } from '../../lib/engine/TreeEngineContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export const ExperimentSetup: React.FC = () => {
  const navigate = useNavigate();
  const { buildTrees, isLoading, error, trainingData } = useTreeEngine();

  const handleSubmit = async (config: ExperimentConfig) => {
    try {
      console.log(config)
      await buildTrees(config);
      toast.success('Trees built successfully');
      navigate('/builder');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to build trees');
    }
  };

  return (
    <Card title="Experiment Configuration">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded border border-red-200 text-sm">
            {error}
          </div>
        )}
        
        <SetupForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          attributes={trainingData?.attributes || []}
          isDisabled={!trainingData}
        />
      </div>
    </Card>
  );
};