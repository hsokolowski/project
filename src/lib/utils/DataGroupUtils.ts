import { DataGroup, Dataset, Instance, Attribute } from '../../types';

export class DataGroupUtils {
  static createGroup(
    name: string,
    type: string,
    attributes: string[],
    color?: string
  ): DataGroup {
    return {
      id: `group-${Math.random().toString(36).substring(2, 9)}`,
      name,
      type: type as any,
      attributes,
      color
    };
  }

  static detectGroups(dataset: Dataset): DataGroup[] {
    const groups: DataGroup[] = [];
    const attributeGroups = new Map<string, string[]>();

    // Group attributes by prefix pattern
    dataset.attributes.forEach(attr => {
      const prefix = this.getAttributePrefix(attr.name);
      if (!attributeGroups.has(prefix)) {
        attributeGroups.set(prefix, []);
      }
      attributeGroups.get(prefix)!.push(attr.name);
    });

    // Create groups from detected patterns
    const colors = [
      'bg-blue-100 border-blue-300',
      'bg-green-100 border-green-300',
      'bg-purple-100 border-purple-300',
      'bg-orange-100 border-orange-300',
      'bg-pink-100 border-pink-300'
    ];

    Array.from(attributeGroups.entries()).forEach(([prefix, attrs], index) => {
      groups.push(this.createGroup(
        prefix || 'Simple Dataset',
        prefix || 'simple',
        attrs,
        colors[index % colors.length]
      ));
    });

    return groups;
  }

  static splitDatasetByGroups(dataset: Dataset, groups: DataGroup[]): Record<string, Dataset> {
    const groupedDatasets: Record<string, Dataset> = {};

    groups.forEach(group => {
      const attributes = dataset.attributes.filter(attr => 
        group.attributes.includes(attr.name)
      );

      const instances = dataset.instances.map(instance => ({
        ...instance,
        values: Object.fromEntries(
          Object.entries(instance.values)
            .filter(([key]) => group.attributes.includes(key))
        )
      }));

      groupedDatasets[group.id] = {
        name: `${group.name}_${dataset.name}`,
        attributes,
        instances,
        groupId: group.id
      };
    });

    return groupedDatasets;
  }

  static combineDatasets(datasets: Dataset[]): Dataset {
    if (datasets.length === 0) throw new Error('No datasets to combine');

    const baseDataset = datasets[0];
    const combinedAttributes = datasets.reduce((attrs, dataset) => [
      ...attrs,
      ...dataset.attributes.map(attr => ({
        ...attr,
        name: dataset.groupId ? `${dataset.groupId}_${attr.name}` : attr.name,
        groupId: dataset.groupId
      }))
    ], [] as Attribute[]);

    const combinedInstances = baseDataset.instances.map((instance, idx) => {
      const combinedValues = datasets.reduce((values, dataset) => ({
        ...values,
        ...Object.entries(dataset.instances[idx].values).reduce((acc, [key, value]) => ({
          ...acc,
          [dataset.groupId ? `${dataset.groupId}_${key}` : key]: value
        }), {})
      }), {});

      return {
        ...instance,
        values: combinedValues
      };
    });

    return {
      name: 'combined_dataset',
      attributes: combinedAttributes,
      instances: combinedInstances
    };
  }

  private static getAttributePrefix(attributeName: string): string {
    // Check for common omics prefixes
    if (attributeName.startsWith('GENE')) return 'genomics';
    if (attributeName.startsWith('PROT')) return 'proteomics';
    if (attributeName.startsWith('MET')) return 'metabolomics';
    
    // Check for explicit prefixes
    const match = attributeName.match(/^([A-Z]+)_/);
    if (match) {
      const prefix = match[1].toLowerCase();
      if (['genomics', 'proteomics', 'metabolomics', 'transcriptomics'].includes(prefix)) {
        return prefix;
      }
    }
    
    return '';
  }
}