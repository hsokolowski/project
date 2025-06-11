import React, { useState } from 'react';
import { Instance, Attribute } from '../../types';
import { Search, ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';

interface DataViewerProps {
  instances: Instance[];
  attributes: Attribute[];
  testAttribute?: string;
  testValue?: any;
  testCondition?: string;
  nodeId?: string;
}

export const DataViewer: React.FC<DataViewerProps> = ({
  instances,
  attributes,
  testAttribute,
  testValue,
  testCondition,
  nodeId
}) => {
  const [selectedAttributes, setSelectedAttributes] = useState<Set<string>>(
    new Set(attributes.slice(0, 5).map(attr => attr.name))
  );
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  // Filter instances based on search query
  const filteredInstances = instances.filter(instance => {
    if (!searchQuery) return true;
    return Object.entries(instance.values).some(([key, value]) => 
      String(value).toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Get visible attributes (selected or all if none selected)
  const visibleAttributes = attributes
    .filter(attr => selectedAttributes.has(attr.name))
    .sort((a, b) => {
      // Always put test attribute first if it exists
      if (a.name === testAttribute) return -1;
      if (b.name === testAttribute) return 1;
      return 0;
    });

  // Calculate if an instance matches the test condition
  const matchesTest = (instance: Instance) => {
    if (!testAttribute || !testValue || !testCondition) return null;
    
    const value = instance.values[testAttribute];
    const compareValue = testValue;
    
    switch (testCondition) {
      case '<': return Number(value) < Number(compareValue);
      case '>': return Number(value) > Number(compareValue);
      case '<=': return Number(value) <= Number(compareValue);
      case '>=': return Number(value) >= Number(compareValue);
      case '==': return value === compareValue;
      case '!=': return value !== compareValue;
      default: return null;
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredInstances.length / itemsPerPage);
  const paginatedInstances = filteredInstances.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search instances..."
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-md"
          />
        </div>
        
        <button
          onClick={() => setShowColumnSelector(!showColumnSelector)}
          className="ml-4 flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          <Settings2 size={16} />
          Columns
        </button>
      </div>

      {showColumnSelector && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium mb-2">Select Columns to Display</h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {attributes.map(attr => (
              <label key={attr.name} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedAttributes.has(attr.name)}
                  onChange={(e) => {
                    const newSelected = new Set(selectedAttributes);
                    if (e.target.checked) {
                      newSelected.add(attr.name);
                    } else {
                      newSelected.delete(attr.name);
                    }
                    setSelectedAttributes(newSelected);
                  }}
                  className="rounded text-blue-600"
                />
                <span className="text-sm truncate" title={attr.name}>
                  {attr.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {visibleAttributes.map(attr => (
                <th
                  key={attr.name}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap
                    ${attr.name === testAttribute ? 'bg-blue-50' : ''}`}
                >
                  {attr.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedInstances.map((instance, idx) => {
              const matches = matchesTest(instance);
              return (
                <tr 
                  key={instance.id}
                  className={
                    matches === true ? 'bg-green-50' :
                    matches === false ? 'bg-red-50' :
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }
                >
                  {visibleAttributes.map(attr => (
                    <td
                      key={attr.name}
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900
                        ${attr.name === testAttribute ? 'font-medium' : ''}`}
                    >
                      {instance.values[attr.name]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Showing {currentPage * itemsPerPage + 1} to {Math.min((currentPage + 1) * itemsPerPage, filteredInstances.length)} of {filteredInstances.length} instances
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
