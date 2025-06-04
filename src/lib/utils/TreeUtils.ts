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
}