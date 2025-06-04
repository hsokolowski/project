import { Dataset, Instance, Attribute } from '../../types';

// Simple demographic attributes
const attributes: Attribute[] = [
  { 
    name: 'Age', 
    type: 'continuous', 
    possibleValues: ['18', '25', '30', '35', '40', '45', '50', '55', '60'] 
  },
  { 
    name: 'Weight', 
    type: 'continuous', 
    possibleValues: ['50', '60', '70', '80', '90', '100'] 
  },
  { 
    name: 'Height', 
    type: 'continuous', 
    possibleValues: ['150', '160', '170', '180', '190'] 
  },
  { 
    name: 'Blood Pressure', 
    type: 'continuous', 
    possibleValues: ['90', '100', '110', '120', '130', '140'] 
  },
  { 
    name: 'Eye Color', 
    type: 'categorical', 
    possibleValues: ['Blue', 'Brown', 'Green', 'Hazel'] 
  },
  { 
    name: 'Gender', 
    type: 'categorical', 
    possibleValues: ['M', 'F'] 
  }
];

// Genomic attributes (100 genes for demonstration)
const genomicAttributes: Attribute[] = Array.from({ length: 100 }, (_, i) => ({
  name: `GENE${(i + 1).toString().padStart(3, '0')}`,
  type: 'continuous',
  possibleValues: undefined,
  isGeneExpression: true
}));

// Disease status attribute for genomic data
const diseaseAttribute: Attribute = {
  name: 'Disease_Status',
  type: 'categorical',
  possibleValues: ['Healthy', 'Stage_1', 'Stage_2', 'Stage_3']
};

// Training instances
const trainingInstances: Instance[] = [
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

// Test instances
const testInstances: Instance[] = [
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

// Generate genomic mock data
const generateGenomicData = (numSamples: number): Instance[] => {
  return Array.from({ length: numSamples }, (_, i) => {
    const values: Record<string, number | string> = {};
    
    // Generate random gene expression values
    genomicAttributes.forEach(attr => {
      // Generate expression values between -3 and 3 (log2 fold change)
      values[attr.name] = (Math.random() * 6) - 3;
    });
    
    // Add disease status
    const rand = Math.random();
    values['Disease_Status'] = 
      rand < 0.25 ? 'Healthy' :
       'Stage_1';
      //rand < 0.5 ? 'Stage_1' :
     // rand < 0.75 ? 'Stage_2' : 'Stage_3';
    
    return {
      id: `genomic-${i + 1}`,
      values
    };
  });
};

// Generate genomic datasets
const genomicTrainingInstances = generateGenomicData(100);
const genomicTestInstances = generateGenomicData(30);

// Generate datasets with fixed instances
const generateDataset = (name: string, instances: Instance[], datasetAttributes: Attribute[]): Dataset => {
  return {
    name,
    attributes: datasetAttributes,
    instances: instances.map((instance, index) => ({
      ...instance,
      id: `${name}-${index + 1}`
    })),
    isGenomic: datasetAttributes.some(attr => 'isGeneExpression' in attr)
  };
};

// Export mock datasets
export const mockTrainingData = generateDataset('training', trainingInstances, attributes);
export const mockTestData = generateDataset('test', testInstances, attributes);

// Export genomic mock datasets
export const mockGenomicTrainingData = generateDataset(
  'genomic-training',
  genomicTrainingInstances,
  [...genomicAttributes, diseaseAttribute]
);
export const mockGenomicTestData = generateDataset(
  'genomic-test',
  genomicTestInstances,
  [...genomicAttributes, diseaseAttribute]
);

// Export a single mock instance for testing
export const mockInstance = trainingInstances[0];