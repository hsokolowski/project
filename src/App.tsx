import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ExperimentSetup } from './features/ExperimentSetup/ExperimentSetup';
import { TreeBuilder } from './features/TreeBuilder/TreeBuilder';
import { Analysis } from './features/Analysis/Analysis';
import { TreeComparison } from './features/TreeComparison/TreeComparison';
import { DataUpload } from './features/DataUpload/DataUpload';
import { TreeEngineProvider } from './lib/engine/TreeEngineContext';
import { Toaster } from 'react-hot-toast';

function App() {
  const [activeTab, setActiveTab] = useState<'setup' | 'builder' | 'analysis' | 'comparison'>('setup');
  
  return (
    <BrowserRouter>
      <TreeEngineProvider>
        <Layout 
          activeTab={activeTab}
          onTabChange={setActiveTab}
        >
          <div className={activeTab === 'setup' ? '' : 'hidden'}>
            <div className="flex flex-col gap-4">
              <DataUpload />
              <ExperimentSetup />
            </div>
          </div>
          <div className={activeTab === 'builder' ? '' : 'hidden'}>
            <TreeBuilder />
          </div>
          <div className={activeTab === 'analysis' ? '' : 'hidden'}>
            <Analysis />
          </div>
          <div className={activeTab === 'comparison' ? '' : 'hidden'}>
            <TreeComparison />
          </div>
        </Layout>
        <Toaster position="top-right" />
      </TreeEngineProvider>
    </BrowserRouter>
  );
}

export default App;