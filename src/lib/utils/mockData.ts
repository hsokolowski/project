import { Dataset, Instance, Attribute } from '../../types';

// Simple dataset attributes
const simpleAttributes: Attribute[] = [
  { name: 'Age', type: 'continuous', possibleValues: ['18', '25', '30', '35', '40', '45', '50', '55', '60'] },
  { name: 'Weight', type: 'continuous', possibleValues: ['50', '60', '70', '80', '90', '100'] },
  { name: 'Height', type: 'continuous', possibleValues: ['150', '160', '170', '180', '190'] },
  { name: 'Blood Pressure', type: 'continuous', possibleValues: ['90', '100', '110', '120', '130', '140'] },
  { name: 'Eye Color', type: 'categorical', possibleValues: ['Blue', 'Brown', 'Green', 'Hazel'] },
  { name: 'Gender', type: 'categorical', possibleValues: ['M', 'F'] }
];

// Generate deterministic simple data
const simple_training: Instance[] = [
  { id: 'train-1', values: { Age: 25, Weight: 60, Height: 165, 'Blood Pressure': 110, 'Eye Color': 'Blue', Gender: 'F' } },
  { id: 'train-2', values: { Age: 25, Weight: 75, Height: 180, 'Blood Pressure': 120, 'Eye Color': 'Brown', Gender: 'M' } },
  { id: 'train-3', values: { Age: 35, Weight: 65, Height: 170, 'Blood Pressure': 115, 'Eye Color': 'Green', Gender: 'F' } },
  { id: 'train-4', values: { Age: 40, Weight: 85, Height: 185, 'Blood Pressure': 130, 'Eye Color': 'Brown', Gender: 'M' } },
  { id: 'train-5', values: { Age: 28, Weight: 58, Height: 160, 'Blood Pressure': 105, 'Eye Color': 'Blue', Gender: 'F' } },
  { id: 'train-6', values: { Age: 45, Weight: 90, Height: 175, 'Blood Pressure': 135, 'Eye Color': 'Hazel', Gender: 'M' } },
  { id: 'train-7', values: { Age: 25, Weight: 70, Height: 178, 'Blood Pressure': 118, 'Eye Color': 'Brown', Gender: 'M' } },
  { id: 'train-8', values: { Age: 25, Weight: 63, Height: 168, 'Blood Pressure': 112, 'Eye Color': 'Green', Gender: 'F' } },
  { id: 'train-9', values: { Age: 42, Weight: 80, Height: 182, 'Blood Pressure': 125, 'Eye Color': 'Brown', Gender: 'M' } },
  { id: 'train-10', values: { Age: 27, Weight: 55, Height: 162, 'Blood Pressure': 108, 'Eye Color': 'Blue', Gender: 'F' } },
  { id: 'train-11', values: { Age: 48, Weight: 88, Height: 177, 'Blood Pressure': 128, 'Eye Color': 'Hazel', Gender: 'M' } },
  { id: 'train-12', values: { Age: 33, Weight: 67, Height: 172, 'Blood Pressure': 116, 'Eye Color': 'Green', Gender: 'F' } },
  { id: 'train-13', values: { Age: 36, Weight: 78, Height: 176, 'Blood Pressure': 122, 'Eye Color': 'Brown', Gender: 'M' } },
  { id: 'train-14', values: { Age: 29, Weight: 61, Height: 167, 'Blood Pressure': 111, 'Eye Color': 'Blue', Gender: 'F' } },
  { id: 'train-15', values: { Age: 44, Weight: 83, Height: 181, 'Blood Pressure': 127, 'Eye Color': 'Hazel', Gender: 'M' } }
];

const simple_test: Instance[] = [
  { id: 'test-1', values: { Age: 26, Weight: 62, Height: 166, 'Blood Pressure': 109, 'Eye Color': 'Blue', Gender: 'F' } },
  { id: 'test-2', values: { Age: 33, Weight: 78, Height: 179, 'Blood Pressure': 121, 'Eye Color': 'Brown', Gender: 'M' } },
  { id: 'test-3', values: { Age: 36, Weight: 64, Height: 169, 'Blood Pressure': 114, 'Eye Color': 'Green', Gender: 'F' } },
  { id: 'test-4', values: { Age: 41, Weight: 82, Height: 183, 'Blood Pressure': 129, 'Eye Color': 'Brown', Gender: 'M' } },
  { id: 'test-5', values: { Age: 29, Weight: 57, Height: 161, 'Blood Pressure': 106, 'Eye Color': 'Blue', Gender: 'F' } },
  { id: 'test-6', values: { Age: 44, Weight: 87, Height: 174, 'Blood Pressure': 134, 'Eye Color': 'Hazel', Gender: 'M' } },
  { id: 'test-7', values: { Age: 31, Weight: 72, Height: 177, 'Blood Pressure': 119, 'Eye Color': 'Brown', Gender: 'M' } },
  { id: 'test-8', values: { Age: 37, Weight: 61, Height: 164, 'Blood Pressure': 113, 'Eye Color': 'Green', Gender: 'F' } },
  { id: 'test-9', values: { Age: 43, Weight: 83, Height: 180, 'Blood Pressure': 126, 'Eye Color': 'Brown', Gender: 'M' } },
  { id: 'test-10', values: { Age: 28, Weight: 59, Height: 163, 'Blood Pressure': 107, 'Eye Color': 'Blue', Gender: 'F' } }
];

// BIO dataset attributes
const bioAttributes: Attribute[] = [
  // Genomic attributes (100 genes)
  ...Array.from({ length: 100 }, (_, i) => ({
    name: `GENE${(i + 1).toString().padStart(3, '0')}`,
    type: 'continuous',
    isGeneExpression: true
  })),
  // Proteomic attributes (50 proteins)
  ...Array.from({ length: 50 }, (_, i) => ({
    name: `PROT${(i + 1).toString().padStart(3, '0')}`,
    type: 'continuous',
    isProteinLevel: true
  })),
  // Metabolomic attributes (30 metabolites)
  ...Array.from({ length: 30 }, (_, i) => ({
    name: `MET${(i + 1).toString().padStart(3, '0')}`,
    type: 'continuous',
    isMetabolite: true
  })),
  // Class attribute
  { name: 'class', type: 'categorical', possibleValues: ['Healthy', 'At Risk'] }
];

// Generate deterministic BIO data
const generateBioInstance = (id: number, isTest: boolean = false): Instance => {
  const values: Record<string, number | string> = {};
  
  // Generate gene expression values using sine waves
  for (let i = 0; i < 100; i++) {
    const baseValue = Math.sin(id * 0.5 + i * 0.1);
    values[`GENE${(i + 1).toString().padStart(3, '0')}`] = Number(baseValue.toFixed(3));
  }
  
  // Generate protein levels using cosine waves
  for (let i = 0; i < 50; i++) {
    const baseValue = Math.cos(id * 0.5 + i * 0.2);
    values[`PROT${(i + 1).toString().padStart(3, '0')}`] = Number((2.5 + baseValue).toFixed(3));
  }
  
  // Generate metabolite levels using combined waves
  for (let i = 0; i < 30; i++) {
    const baseValue = Math.sin(id * 0.5 + i * 0.3) * Math.cos(id * 0.3 + i * 0.2);
    values[`MET${(i + 1).toString().padStart(3, '0')}`] = Number((5 + baseValue * 2).toFixed(3));
  }
  
  // Deterministic class assignment based on patterns
  const geneSum = Object.entries(values)
    .filter(([key]) => key.startsWith('GENE'))
    .reduce((sum, [, value]) => sum + (value as number), 0);
  
  const protSum = Object.entries(values)
    .filter(([key]) => key.startsWith('PROT'))
    .reduce((sum, [, value]) => sum + (value as number), 0);
  
  const metSum = Object.entries(values)
    .filter(([key]) => key.startsWith('MET'))
    .reduce((sum, [, value]) => sum + (value as number), 0);
  
  values['class'] = (geneSum + protSum + metSum) > 0 ? 'At Risk' : 'Healthy';
  
  return {
    id: `bio-${isTest ? 'test' : 'train'}-${id}`,
    values
  };
};

// Generate BIO training and test datasets
const bio_training: Instance[] = Array.from({ length: 50 }, (_, i) => generateBioInstance(i));
const bio_test: Instance[] = Array.from({ length: 20 }, (_, i) => generateBioInstance(i, true));

// Export datasets
export const mockSimpleTrainingData: Dataset = {
  name: 'simple-training',
  attributes: simpleAttributes,
  instances: simple_training
};

export const mockSimpleTestData: Dataset = {
  name: 'simple-test',
  attributes: simpleAttributes,
  instances: simple_test
};

export const mockBioTrainingData: Dataset = {
  name: 'bio-training',
  attributes: bioAttributes,
  instances: bio_training,
  isGenomic: true,
  isProteomic: true,
  isMetabolomic: true
};

export const mockBioTestData: Dataset = {
  name: 'bio-test',
  attributes: bioAttributes,
  instances: bio_test,
  isGenomic: true,
  isProteomic: true,
  isMetabolomic: true
};