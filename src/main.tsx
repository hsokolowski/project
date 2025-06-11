import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { TreeEngineProvider } from './lib/engine/TreeEngineContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TreeEngineProvider>
      <App />
    </TreeEngineProvider>
  </StrictMode>
);