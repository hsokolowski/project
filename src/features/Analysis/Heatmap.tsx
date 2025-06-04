import React, { useEffect, useRef, useState } from 'react';
import { Dataset } from '../../types';
import { GeneInfoCard } from '../Lookup/GeneInfoCard';

interface HeatmapProps {
  data: Dataset;
}

export const Heatmap: React.FC<HeatmapProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedGene, setSelectedGene] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    gene: string;
    sample: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.isGenomic || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const geneAttributes = data.attributes.filter(attr => attr.isGeneExpression);
    const samples = data.instances;

    // Calculate dimensions based on container size
    const containerWidth = containerRef.current.clientWidth - 32; // Account for padding
    const maxCellSize = Math.min(
      Math.floor((containerWidth - 120) / samples.length), // 120px for labels
      12 // Maximum cell size
    );
    
    const cellSize = Math.max(6, maxCellSize); // Minimum 6px
    const labelWidth = 100;
    const labelHeight = 40;
    
    canvas.width = labelWidth + samples.length * cellSize;
    canvas.height = labelHeight + geneAttributes.length * cellSize;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw background grid
    ctx.strokeStyle = '#f3f4f6';
    for (let i = 0; i <= geneAttributes.length; i++) {
      ctx.beginPath();
      ctx.moveTo(labelWidth, labelHeight + i * cellSize);
      ctx.lineTo(canvas.width, labelHeight + i * cellSize);
      ctx.stroke();
    }
    for (let i = 0; i <= samples.length; i++) {
      ctx.beginPath();
      ctx.moveTo(labelWidth + i * cellSize, labelHeight);
      ctx.lineTo(labelWidth + i * cellSize, canvas.height);
      ctx.stroke();
    }

    // Draw heatmap cells
    geneAttributes.forEach((gene, i) => {
      samples.forEach((sample, j) => {
        const value = sample.values[gene.name] as number;
        
        // Calculate color based on value (-3 to 3 range)
        const normalizedValue = (value + 3) / 6; // Convert to 0-1 range
        let color;
        if (normalizedValue < 0.5) {
          // Blue to white gradient
          const intensity = Math.floor(normalizedValue * 2 * 255);
          color = `rgb(${intensity},${intensity},255)`;
        } else {
          // White to red gradient
          const intensity = Math.floor((1 - normalizedValue) * 2 * 255);
          color = `rgb(255,${intensity},${intensity})`;
        }

        ctx.fillStyle = color;
        ctx.fillRect(
          labelWidth + j * cellSize,
          labelHeight + i * cellSize,
          cellSize,
          cellSize
        );
      });

      // Draw gene labels
      ctx.fillStyle = '#374151';
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(
        gene.name,
        labelWidth - 4,
        labelHeight + i * cellSize + (cellSize * 0.7)
      );
    });

    // Draw sample labels
    ctx.save();
    ctx.translate(labelWidth + cellSize / 2, labelHeight-5); // przesuń na początek kolumn
    ctx.rotate(-Math.PI / 2); // obrót o -90 stopni (czyli pionowo)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle'; // wypośrodkuj względem wiersza
    ctx.font = '10px Inter, system-ui, sans-serif';
    
    samples.forEach((_, i) => {
      ctx.fillText(
        `Sample ${i + 1}`,
        0,                    // X (stała odległość od górnej krawędzi)
        i * cellSize           // Y (miejsce etykiety)
      );
    });
    
    ctx.restore();

  }, [data]);

  if (!data.isGenomic) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-gray-500 mb-2">Heatmap visualization is only available for genomic data</p>
        <p className="text-sm text-gray-400">
          Load genomic data to view expression patterns across samples
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div 
        ref={containerRef}
        className="bg-white p-4 rounded-lg border border-gray-200 overflow-auto relative"
      >
        <canvas
          ref={canvasRef}
          className="block"
          onClick={(e) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;

            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Calculate clicked gene
            const cellSize = Math.max(6, Math.min(
              Math.floor((containerRef.current!.clientWidth - 152) / data.instances.length),
              12
            ));
            const geneIndex = Math.floor((y - 40) / cellSize);
            const gene = data.attributes[geneIndex];
            if (gene && gene.isGeneExpression) {
              setSelectedGene(gene.name);
            }
          }}
          onMouseMove={(e) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;

            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const cellSize = Math.max(6, Math.min(
              Math.floor((containerRef.current!.clientWidth - 152) / data.instances.length),
              12
            ));
            const geneIndex = Math.floor((y - 40) / cellSize);
            const sampleIndex = Math.floor((x - 100) / cellSize);

            if (geneIndex >= 0 && sampleIndex >= 0 && geneIndex < data.attributes.length && sampleIndex < data.instances.length) {
              const gene = data.attributes[geneIndex];
              if (gene && gene.isGeneExpression) {
                setHoveredCell({
                  gene: gene.name,
                  sample: `Sample ${sampleIndex + 1}`,
                  value: data.instances[sampleIndex].values[gene.name] as number,
                  x: e.clientX,
                  y: e.clientY
                });
                return;
              }
            }
            setHoveredCell(null);
          }}
          onMouseLeave={() => setHoveredCell(null)}
        />

        {hoveredCell && (
          <div 
            className="absolute bg-white p-2 rounded shadow-lg border border-gray-200 text-sm z-10"
            style={{
              left: 0,
              top: hoveredCell.y + 10
            }}
          >
            <div><strong>Gene:</strong> {hoveredCell.gene}</div>
            <div><strong>Sample:</strong> {hoveredCell.sample}</div>
            <div><strong>Expression:</strong> {hoveredCell.value.toFixed(2)}</div>
          </div>
        )}
      </div>

      {selectedGene && (
        <GeneInfoCard geneSymbol={selectedGene} />
      )}

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="font-medium mb-2">Expression Legend</h4>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4" style={{ background: 'rgb(0,0,255)' }} />
            <span className="text-sm">Low (-3)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border border-gray-200" />
            <span className="text-sm">Normal (0)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4" style={{ background: 'rgb(255,0,0)' }} />
            <span className="text-sm">High (3)</span>
          </div>
        </div>
      </div>
    </div>
  );
};