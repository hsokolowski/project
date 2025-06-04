import { Instance, ExperimentConfig, DecisionTree, SplitTest, Element } from '../../types';
import { IDecisionAlgorithm } from '../engine/interfaces/IDecisionAlgorithm';
import { TreeUtils } from '../utils/TreeUtils';

export class TSP implements IDecisionAlgorithm {
  async buildTree(instances: Instance[], config: ExperimentConfig): Promise<DecisionTree> {
    const buildNode = (
      currentInstances: Instance[],
      depth: number,
      availableAttributes: string[]
    ): Element => {
      const stats = TreeUtils.calculateStats(currentInstances);
      
      if (
        depth >= config.maxDepth ||
        currentInstances.length <= config.minInstancesPerLeaf ||
        stats.entropy <= config.entropyThreshold ||
        availableAttributes.length < 2
      ) {
        return TreeUtils.createLeafFromGroup(currentInstances);
      }

      let bestTest: SplitTest | null = null;
      let bestGain = -1;
      let bestSplits: Instance[][] = [];
      let alternativeSplits: SplitTest[] = [];

      // Compare each pair of attributes
      for (let i = 0; i < availableAttributes.length; i++) {
        const attr1 = availableAttributes[i];
        for (let j = i + 1; j < availableAttributes.length; j++) {
          const attr2 = availableAttributes[j];
          
          // Try both directions (attr1 < attr2 and attr2 < attr1)
          const tests: SplitTest[] = [
            {
              attribute: attr1,
              value: attr2,
              condition: '<',
              isValueAttribute: true,
              algorithm: 'TSP',
              entropy: stats.entropy
            },
            {
              attribute: attr2,
              value: attr1,
              condition: '<',
              isValueAttribute: true,
              algorithm: 'TSP',
              entropy: stats.entropy
            }
          ];

          for (const test of tests) {
            const splits = TreeUtils.splitInstances(currentInstances, test);
            const leftStats = TreeUtils.calculateStats(splits[0]);
            const rightStats = TreeUtils.calculateStats(splits[1]);
            
            const gain = stats.entropy - (
              (splits[0].length * leftStats.entropy + 
               splits[1].length * rightStats.entropy) / currentInstances.length
            );

            if (gain > bestGain && splits[0].length > 0 && splits[1].length > 0) {
              if (bestTest) {
                alternativeSplits.push(bestTest);
              }
              bestGain = gain;
              bestTest = test;
              bestSplits = splits;
            } else if (gain > bestGain * 0.8) {
              alternativeSplits.push({ ...test });
            }
          }
        }
      }

      if (!bestTest || bestGain <= 0) {
        return TreeUtils.createLeafFromGroup(currentInstances);
      }

      const remainingAttrs = availableAttributes.filter(a => 
        a !== bestTest!.attribute && a !== bestTest!.value
      );
      
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

    // Only use numeric attributes for TSP
    const attributes = instances[0] ? 
      Object.keys(instances[0].values).filter(attr => 
        !config.excludedAttributes.includes(attr) && 
        attr !== config.decisionAttribute &&
        instances.every(i => !isNaN(Number(i.values[attr])))
      ) : [];

    if (attributes.length < 2) {
      throw new Error('TSP requires at least 2 numeric attributes');
    }

    const root = buildNode(instances, 0, attributes);

    return {
      id: `tsp-${Date.now()}`,
      root,
      config
    };
  }
}