import { Instance, ExperimentConfig, DecisionTree, SplitTest, Element } from '../../types';
import { IDecisionAlgorithm } from '../engine/interfaces/IDecisionAlgorithm';
import { TreeUtils } from '../utils/TreeUtils';

export class C45 implements IDecisionAlgorithm {
  async buildTree(instances: Instance[], config: ExperimentConfig): Promise<DecisionTree> {
    const buildNode = (
      currentInstances: Instance[],
      depth: number,
      availableAttributes: string[]
    ): Element => {
      const stats = TreeUtils.calculateStats(currentInstances);
      
      // Check stopping conditions
      if (
        depth >= config.maxDepth ||
        currentInstances.length <= config.minInstancesPerLeaf ||
        stats.entropy <= config.entropyThreshold ||
        availableAttributes.length === 0 ||
        Object.keys(stats.classDistribution).length <= 1
      ) {
        return TreeUtils.createLeafFromGroup(currentInstances);
      }

      // Find best split
      let bestTest: SplitTest | null = null;
      let bestGain = -1;
      let bestSplits: Instance[][] = [];
      let alternativeSplits: SplitTest[] = [];

      // Try each attribute as a potential split
      for (const attr of availableAttributes) {
        const values = currentInstances.map(i => i.values[attr]);
        
        // Skip if attribute has no values
        if (!values.length) continue;

        // Handle numeric attributes
        if (typeof values[0] === 'number') {
          // Sort unique values
          const sortedValues = [...new Set(values)].sort((a, b) => Number(a) - Number(b));
          
          // Try splits between consecutive values
          for (let i = 0; i < sortedValues.length - 1; i++) {
            const threshold = (Number(sortedValues[i]) + Number(sortedValues[i + 1])) / 2;
            
            const test: SplitTest = {
              attribute: attr,
              condition: '<=',
              value: threshold,
              algorithm: 'C4.5',
              entropy: stats.entropy,
              isValueAttribute: false
            };

            const splits = [
              currentInstances.filter(inst => Number(inst.values[attr]) <= threshold),
              currentInstances.filter(inst => Number(inst.values[attr]) > threshold)
            ];

            // Skip invalid splits
            if (splits[0].length === 0 || splits[1].length === 0) continue;

            // Calculate information gain
            const splitInfoGain = this.calculateInformationGain(currentInstances, splits);
            const splitIntrinsicValue = this.calculateIntrinsicValue(splits, currentInstances.length);
            const gainRatio = splitIntrinsicValue === 0 ? 0 : splitInfoGain / splitIntrinsicValue;

            if (gainRatio > bestGain) {
              if (bestTest) {
                alternativeSplits.push(bestTest);
              }
              bestGain = gainRatio;
              bestTest = test;
              bestSplits = splits;
            } else if (gainRatio > bestGain * 0.8) {
              alternativeSplits.push({ ...test });
            }
          }
        }
        // Handle categorical attributes
        else {
          const uniqueValues = [...new Set(values)];
          
          for (const value of uniqueValues) {
            const test: SplitTest = {
              attribute: attr,
              condition: '==',
              value: value,
              algorithm: 'C4.5',
              entropy: stats.entropy,
              isValueAttribute: false
            };

            const splits = [
              currentInstances.filter(inst => inst.values[attr] === value),
              currentInstances.filter(inst => inst.values[attr] !== value)
            ];

            // Skip invalid splits
            if (splits[0].length === 0 || splits[1].length === 0) continue;

            // Calculate information gain ratio
            const splitInfoGain = this.calculateInformationGain(currentInstances, splits);
            const splitIntrinsicValue = this.calculateIntrinsicValue(splits, currentInstances.length);
            const gainRatio = splitIntrinsicValue === 0 ? 0 : splitInfoGain / splitIntrinsicValue;

            if (gainRatio > bestGain) {
              if (bestTest) {
                alternativeSplits.push(bestTest);
              }
              bestGain = gainRatio;
              bestTest = test;
              bestSplits = splits;
            } else if (gainRatio > bestGain * 0.8) {
              alternativeSplits.push({ ...test });
            }
          }
        }
      }

      // If no good split found, create leaf
      if (!bestTest || bestGain <= 0) {
        return TreeUtils.createLeafFromGroup(currentInstances);
      }

      // Create node with best split
      const remainingAttrs = availableAttributes.filter(a => a !== bestTest!.attribute);
      
      return {
        id: 'node-' + Math.random().toString(36).substring(2, 9),
        type: 'node',
        test: bestTest,
        alternativeSplits: alternativeSplits.slice(0, 5),
        children: bestSplits.map(split => 
          buildNode(split, depth + 1, remainingAttrs)
        ),
        statistics: stats
      };
    };

    // Get available attributes
    const attributes = Object.keys(instances[0]?.values || {}).filter(attr => 
      !config.excludedAttributes.includes(attr) && 
      attr !== config.decisionAttribute
    );

    // Build the tree
    const root = buildNode(instances, 0, attributes);

    return {
      id: `c45-${Date.now()}`,
      root,
      config
    };
  }

  private calculateInformationGain(
    parentInstances: Instance[],
    childSplits: Instance[][]
  ): number {
    const parentStats = TreeUtils.calculateStats(parentInstances);
    const parentEntropy = parentStats.entropy;
    
    const childrenEntropy = childSplits.reduce((sum, split) => {
      const splitStats = TreeUtils.calculateStats(split);
      return sum + (split.length / parentInstances.length) * splitStats.entropy;
    }, 0);

    return parentEntropy - childrenEntropy;
  }

  private calculateIntrinsicValue(splits: Instance[][], totalInstances: number): number {
    return -splits.reduce((sum, split) => {
      const proportion = split.length / totalInstances;
      return sum + (proportion > 0 ? proportion * Math.log2(proportion) : 0);
    }, 0);
  }
}