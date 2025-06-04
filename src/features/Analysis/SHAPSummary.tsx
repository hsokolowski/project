import React from 'react';

export const SHAPSummary: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <p className="text-gray-500 mb-2">SHAP Feature Importance Summary</p>
      <p className="text-sm text-gray-400">
        This feature will be implemented in a future update.
      </p>
      <p className="text-sm text-gray-400 mt-2">
        SHAP values will help explain the importance of each feature in the model predictions.
      </p>
    </div>
  );
};