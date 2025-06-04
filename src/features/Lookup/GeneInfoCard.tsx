import React, { useState } from 'react';
import { GeneAnnotation } from '../../types';
import { Card } from '../../components/Card';
import { useTreeEngine } from '../../lib/engine/TreeEngineContext';
import { ExternalLink } from 'lucide-react';

interface GeneInfoCardProps {
  geneSymbol: string;
}

export const GeneInfoCard: React.FC<GeneInfoCardProps> = ({ geneSymbol }) => {
  const { engine } = useTreeEngine();
  const [geneInfo, setGeneInfo] = useState<GeneAnnotation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchGeneInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const info = await engine.getGeneInfo([geneSymbol]);
      if (info.length > 0) {
        setGeneInfo(info[0]);
      } else {
        setError("No information found for this gene");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch gene information");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card title={`Gene Information: ${geneSymbol}`}>
      {!geneInfo && !loading && !error && (
        <div className="flex justify-center">
          <button
            onClick={fetchGeneInfo}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Load Gene Information
          </button>
        </div>
      )}
      
      {loading && (
        <div className="text-center py-4">
          <p className="text-gray-500">Loading gene information...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded border border-red-200 text-sm">
          {error}
        </div>
      )}
      
      {geneInfo && (
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-lg">{geneInfo.symbol}</h3>
            <p className="text-gray-700">{geneInfo.name}</p>
          </div>
          
          <div>
            <h4 className="font-medium text-sm text-gray-600 mb-1">Description</h4>
            <p className="text-sm">{geneInfo.description}</p>
          </div>
          
          <div>
            <h4 className="font-medium text-sm text-gray-600 mb-2">External Databases</h4>
            <div className="grid grid-cols-2 gap-2">
              {geneInfo.externalLinks.map(link => (
                <a
                  key={link.database}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <span>{link.database}</span>
                  <ExternalLink size={12} />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};