import React, { ReactNode } from 'react';
import { DatabaseIcon, TreePine, LineChart, Layers } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  activeTab: 'setup' | 'builder' | 'analysis' | 'comparison';
  onTabChange: (tab: 'setup' | 'builder' | 'analysis' | 'comparison') => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  onTabChange 
}) => {
  const tabs = [
    { id: 'setup', label: 'Setup', icon: <DatabaseIcon size={18} /> },
    { id: 'builder', label: 'Tree Builder', icon: <TreePine size={18} /> },
    { id: 'analysis', label: 'Analysis', icon: <LineChart size={18} /> },
    { id: 'comparison', label: 'Comparison', icon: <Layers size={18} /> },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <TreePine className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">ITreev2</h1>
            </div>
            <nav className="flex space-x-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${activeTab === tab.id 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            ITreev2 - Bioinformatics Decision Tree Analysis Tool © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};