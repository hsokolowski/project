import { Dataset, Attribute, Instance, DataType } from '../../types';

const inferDataType = (values: string[]): DataType => {
  const nonEmpty = values.filter(v => v.trim() !== '');
  
  if (nonEmpty.every(v => !isNaN(Number(v.replace(',', '.'))))) {
    return 'continuous';
  }
  
  const lowerValues = nonEmpty.map(v => v.toLowerCase());
  if (lowerValues.every(v => ['0', '1', 'true', 'false'].includes(v))) {
    return 'binary';
  }
  
  return 'categorical';
};

export const parseCSV = (csvContent: string, fileName: string): Dataset => {
  const lines = csvContent.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }
  
  const header = lines[0].split(',').map(h => h.trim());
  const columns: Record<string, string[]> = {};
  header.forEach(attr => { columns[attr] = []; });
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== header.length) {
      console.warn(`Row ${i+1} has ${values.length} values, expected ${header.length}, skipping...`);
      continue;
    }
    
    values.forEach((v, idx) => {
      if (idx < header.length) {
        columns[header[idx]].push(v);
      }
    });
  }
  
  const attributes: Attribute[] = header.map(name => {
    const type = inferDataType(columns[name]);
    let possibleValues: string[] | undefined;
    
    if (type === 'categorical') {
      possibleValues = [...new Set(columns[name].filter(v => v.trim() !== ''))];
    } else if (type === 'continuous') {
      possibleValues = [...new Set(columns[name]
        .filter(v => v.trim() !== '')
        .map(v => Number(v.replace(',', '.')))
        .sort((a, b) => a - b)
      )].map(String);
    }
    
    return { name, type, possibleValues };
  });
  
  const instances: Instance[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== header.length) continue;
    
    const instance: Instance = {
      id: `${fileName}-${i}`,
      values: {}
    };
    
    values.forEach((v, idx) => {
      if (idx < header.length) {
        const attr = header[idx];
        const attrInfo = attributes.find(a => a.name === attr);
        
        if (attrInfo?.type === 'continuous' && v !== '') {
          instance.values[attr] = Number(v.replace(',', '.'));
        } else {
          instance.values[attr] = v;
        }
      }
    });
    
    instances.push(instance);
  }
  
  return {
    name: fileName,
    attributes,
    instances
  };
};