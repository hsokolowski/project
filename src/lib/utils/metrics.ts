import { Instance, ConfusionMatrix, EvaluationMetrics, ROCPoint } from '../../types';

export const createConfusionMatrix = (
  actual: string[],
  predicted: string[]
): ConfusionMatrix => {
  if (actual.length !== predicted.length) {
    throw new Error('Actual and predicted arrays must have the same length');
  }
  
  const classLabels = [...new Set([...actual, ...predicted])].sort();
  const matrix: Record<string, Record<string, number>> = {};
  
  // Initialize matrix with zeros
  classLabels.forEach(actualClass => {
    matrix[actualClass] = {};
    classLabels.forEach(predictedClass => {
      matrix[actualClass][predictedClass] = 0;
    });
  });
  
  // Populate matrix
  for (let i = 0; i < actual.length; i++) {
    matrix[actual[i]][predicted[i]]++;
  }
  
  return { matrix, classLabels };
};

export const calculateMetrics = (
  confusionMatrix: ConfusionMatrix
): EvaluationMetrics => {
  const { matrix, classLabels } = confusionMatrix;
  
  // Calculate totals
  let totalInstances = 0;
  let correctPredictions = 0;
  
  classLabels.forEach(actualClass => {
    classLabels.forEach(predictedClass => {
      const count = matrix[actualClass][predictedClass];
      totalInstances += count;
      if (actualClass === predictedClass) {
        correctPredictions += count;
      }
    });
  });
  
  // Calculate class-specific metrics
  const precision: Record<string, number> = {};
  const recall: Record<string, number> = {};
  const f1Score: Record<string, number> = {};
  
  classLabels.forEach(cls => {
    // True positives
    const tp = matrix[cls][cls];
    
    // False positives (sum of column minus true positives)
    let fp = 0;
    classLabels.forEach(actual => {
      if (actual !== cls) {
        fp += matrix[actual][cls];
      }
    });
    
    // False negatives (sum of row minus true positives)
    let fn = 0;
    classLabels.forEach(predicted => {
      if (predicted !== cls) {
        fn += matrix[cls][predicted];
      }
    });
    
    // Calculate metrics
    precision[cls] = tp / (tp + fp) || 0;
    recall[cls] = tp / (tp + fn) || 0;
    f1Score[cls] = 2 * precision[cls] * recall[cls] / (precision[cls] + recall[cls]) || 0;
  });
  
  // Calculate macro averages
  const macroAvgPrecision = Object.values(precision).reduce((sum, val) => sum + val, 0) / classLabels.length;
  const macroAvgRecall = Object.values(recall).reduce((sum, val) => sum + val, 0) / classLabels.length;
  const macroAvgF1 = Object.values(f1Score).reduce((sum, val) => sum + val, 0) / classLabels.length;
  
  // Overall accuracy
  const accuracy = correctPredictions / totalInstances;
  
  return {
    accuracy,
    precision,
    recall,
    f1Score,
    macroAvgPrecision,
    macroAvgRecall,
    macroAvgF1
  };
};

export const generateROCCurve = (
  actual: string[],
  predicted: number[],
  positiveClass: string,
  thresholds: number[] = Array.from({ length: 100 }, (_, i) => i / 100)
): ROCPoint[] => {
  const points: ROCPoint[] = [];
  const totalPositives = actual.filter(a => a === positiveClass).length;
  const totalNegatives = actual.length - totalPositives;

  if (totalPositives === 0 || totalNegatives === 0) {
    throw new Error('ROC curve requires both positive and negative instances');
  }

  // Add starting point (0,0)
  points.push({ fpr: 0, tpr: 0, threshold: 1 });

  // Calculate points for each threshold
  thresholds.forEach(threshold => {
    let tp = 0;
    let fp = 0;

    for (let i = 0; i < actual.length; i++) {
      const prediction = predicted[i] >= threshold;
      const isPositive = actual[i] === positiveClass;

      if (prediction && isPositive) tp++;
      if (prediction && !isPositive) fp++;
    }

    points.push({
      tpr: tp / totalPositives,
      fpr: fp / totalNegatives,
      threshold
    });
  });

  // Add ending point (1,1)
  points.push({ fpr: 1, tpr: 1, threshold: 0 });

  return points;
};

export const generateMulticlassROC = (
  actual: string[],
  predictedProbs: Record<string, number[]>,
  classes: string[]
): Record<string, { points: ROCPoint[]; auc: number }> => {
  const curves: Record<string, { points: ROCPoint[]; auc: number }> = {};

  classes.forEach(cls => {
    try {
      const points = generateROCCurve(actual, predictedProbs[cls], cls);
      const auc = calculateAUC(points);
      curves[cls] = { points, auc };
    } catch (err) {
      console.warn(`Could not generate ROC curve for class ${cls}:`, err);
    }
  });

  return curves;
};

export const calculateAUC = (rocPoints: ROCPoint[]): number => {
  let auc = 0;
  for (let i = 1; i < rocPoints.length; i++) {
    // Trapezoidal rule for area
    const width = rocPoints[i].fpr - rocPoints[i-1].fpr;
    const height = (rocPoints[i].tpr + rocPoints[i-1].tpr) / 2;
    auc += width * height;
  }
  return auc;
};