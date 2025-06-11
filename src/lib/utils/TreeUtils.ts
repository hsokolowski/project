import { SplitTest, NodeStatistics, Leaf, Element, Node, Instance } from '../../types';

export class TreeUtils {
  static evaluate(instance: Instance, test: SplitTest): boolean {
    const rawAttrVal = instance.values[test.attribute];
    const rawCompareVal = test.isValueAttribute
      ? instance.values[test.value as string]
      : test.value;

    const isNumericComparison =
      ['<', '>', '<=', '>='].includes(test.condition) ||
      (!isNaN(Number(rawAttrVal)) && !isNaN(Number(rawCompareVal)));

    const attrVal = isNumericComparison ? Number(rawAttrVal) : String(rawAttrVal);
    const compareVal = isNumericComparison ? Number(rawCompareVal) : String(rawCompareVal);

    switch (test.condition) {
      case '<': return attrVal < compareVal;
      case '>': return attrVal > compareVal;
      case '==': return attrVal === compareVal;
      case '!=': return attrVal !== compareVal;
      case '<=': return attrVal <= compareVal;
      case '>=': return attrVal >= compareVal;
      default: throw new Error(`Unsupported condition: ${test.condition}`);
    }
  }

  static splitInstances(instances: Instance[], test: SplitTest): Instance[][] {
    return [
      instances.filter(i => this.evaluate(i, test)),
      instances.filter(i => !this.evaluate(i, test))
    ];
  }

  static computeEntropy(distribution: Record<string, number>): number {
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    return -Object.values(distribution).reduce((sum, count) => {
      const p = count / total;
      return sum + (p > 0 ? p * Math.log2(p) : 0);
    }, 0);
  }

  static calculateStats(instances: Instance[]): NodeStatistics {
    const classDistribution: Record<string, number> = {};
    instances.forEach(i => {
      const label = i.class ?? 'Unknown';
      classDistribution[label] = (classDistribution[label] || 0) + 1;
    });

    const total = instances.length;

    return {
      totalInstances: instances.length,
      entropy: total > 0 ? this.computeEntropy(classDistribution) : 0,
      classDistribution
    };
  }

  static calculateInformationGain(
    parentInstances: Instance[],
    childSplits: Instance[][]
  ): number {
    const parentStats = this.calculateStats(parentInstances);
    const parentEntropy = parentStats.entropy;
    
    const childrenEntropy = childSplits.reduce((sum, split) => {
      const splitStats = this.calculateStats(split);
      return sum + (split.length / parentInstances.length) * splitStats.entropy;
    }, 0);

    return parentEntropy - childrenEntropy;
  }

  static calculateGainRatio(
    parentInstances: Instance[],
    childSplits: Instance[][]
  ): number {
    const informationGain = this.calculateInformationGain(parentInstances, childSplits);
    const intrinsicValue = this.calculateIntrinsicValue(childSplits, parentInstances.length);
    
    return intrinsicValue === 0 ? 0 : informationGain / intrinsicValue;
  }

  static calculateIntrinsicValue(splits: Instance[][], totalInstances: number): number {
    return -splits.reduce((sum, split) => {
      const proportion = split.length / totalInstances;
      return sum + (proportion > 0 ? proportion * Math.log2(proportion) : 0);
    }, 0);
  }

  static calculateSplitSimilarity(
    split1: Instance[][],
    split2: Instance[][]
  ): number {
    if (split1.length !== split2.length) return 0;

    let totalSimilarity = 0;
    for (let i = 0; i < split1.length; i++) {
      const stats1 = this.calculateStats(split1[i]);
      const stats2 = this.calculateStats(split2[i]);
      
      // Calculate similarity based on class distribution
      const classes = new Set([
        ...Object.keys(stats1.classDistribution),
        ...Object.keys(stats2.classDistribution)
      ]);
      
      let similarity = 0;
      let totalInstances = 0;
      
      classes.forEach(cls => {
        const count1 = stats1.classDistribution[cls] || 0;
        const count2 = stats2.classDistribution[cls] || 0;
        const minCount = Math.min(count1, count2);
        similarity += minCount;
        totalInstances += Math.max(count1, count2);
      });
      
      totalSimilarity += totalInstances > 0 ? similarity / totalInstances : 0;
    }
    
    return totalSimilarity / split1.length;
  }

  static evaluateAlternativeTest(
    instances: Instance[],
    test: SplitTest,
    referenceSplit?: Instance[][]
  ): {
    gain: number;
    gainRatio: number;
    leftSplit: number[];
    rightSplit: number[];
    similarity: number;
  } {
    const splits = this.splitInstances(instances, test);
    const gain = this.calculateInformationGain(instances, splits);
    const gainRatio = this.calculateGainRatio(instances, splits);
    
    // Calculate class distributions for each split
    const leftStats = this.calculateStats(splits[0]);
    const rightStats = this.calculateStats(splits[1]);
    
    const leftSplit = Object.values(leftStats.classDistribution);
    const rightSplit = Object.values(rightStats.classDistribution);
    
    // Calculate similarity to reference split if provided
    let similarity = 0;
    if (referenceSplit && referenceSplit.length === 2) {
      similarity = this.calculateSplitSimilarity(splits, referenceSplit);
    }
    
    return {
      gain,
      gainRatio,
      leftSplit,
      rightSplit,
      similarity
    };
  }

  static createLeafFromGroup(instances: Instance[]): Leaf {
    const stats = this.calculateStats(instances);
    const predicted = Object.entries(stats.classDistribution)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Unknown';

    return {
      id: 'leaf-' + Math.random().toString(36).substring(2, 9),
      type: 'leaf',
      predictedClass: predicted,
      classDistribution: stats.classDistribution,
      canExpand: stats.entropy > 0,
      statistics: stats
    };
  }

  static getPathToNode(current: Element, targetId: string, path: Node[] = []): Node[] {
    if (current.id === targetId) return path;
    if (current.type === 'node') {
      for (const child of current.children) {
        const result = this.getPathToNode(child, targetId, [...path, current]);
        if (result.length > 0) return result;
      }
    }
    return [];
  }

  static findNodeById(current: Element, nodeId: string): Element | null {
    if (current.id === nodeId) return current;
    if (current.type === 'node') {
      for (const child of current.children) {
        const result = this.findNodeById(child, nodeId);
        if (result) return result;
      }
    }
    return null;
  }

  static getOmicsType(attributeName: string): string {
    const parts = attributeName.split('_');
    return parts.length > 1 ? parts[0] : 'simple';
  }

  static combineInstances(instances: Instance[][]): Instance[] {
    if (instances.length === 0) return [];
    
    const baseInstances = instances[0];
    return baseInstances.map((base, idx) => ({
      ...base,
      values: instances.reduce((combined, group) => ({
        ...combined,
        ...group[idx].values
      }), {})
    }));
  }
}