import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface PaginatedGridProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  itemsPerPage?: number;
  columns?: number;
  searchable?: boolean;
  searchKey?: (item: T) => string;
}

export function PaginatedGrid<T>({
  items,
  renderItem,
  itemsPerPage: defaultItemsPerPage = 21,
  columns = 3,
  searchable = false,
  searchKey = (item: any) => item.toString()
}: PaginatedGridProps<T>) {
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter items based on search query
  const filteredItems = searchable
    ? items.filter(item => 
        searchKey(item).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;
  
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length);
  const currentItems = filteredItems.slice(startIndex, endIndex);
  
  // Calculate empty slots needed to maintain grid layout
  const emptySlots = itemsPerPage - currentItems.length;
  
  // Reset to first page when items per page changes or search query changes
  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(0);
  };

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(0);
            }}
            placeholder="Search attributes..."
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-md"
          />
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-4">
        {currentItems.map((item, index) => (
          <div key={index}>{renderItem(item)}</div>
        ))}
        {/* Add empty slots to maintain grid layout */}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <div key={`empty-${index}`} className="invisible" />
        ))}
      </div>
      
      <div className="flex items-center justify-between border-t border-gray-200 pt-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Showing {startIndex + 1}-{endIndex} of {filteredItems.length} items
          </span>
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            className="text-sm border rounded p-1"
          >
            <option value={21}>21 per page (7 rows)</option>
            <option value={30}>30 per page (10 rows)</option>
            <option value={60}>60 per page (20 rows)</option>
            <option value={90}>90 per page (30 rows)</option>
          </select>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`px-3 py-1 rounded text-sm ${
                  currentPage === i
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}