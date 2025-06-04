import React, { useEffect, useRef } from 'react';
import { ROCPoint } from '../../types';

interface ROCChartProps {
  data: ROCPoint[];
  auc?: number;
  className?: string;
  label?: string;
  isMultiClass?: boolean;
}

export const ROCChart: React.FC<ROCChartProps> = ({ 
  data, 
  auc, 
  className = '',
  label = '',
  isMultiClass = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current || !data.length) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set dimensions
    const padding = 40;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;
    
    // Draw grid
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    
    // Draw grid lines
    for (let i = 0; i <= 10; i++) {
      const pos = i / 10;
      
      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(padding, padding + pos * height);
      ctx.lineTo(padding + width, padding + pos * height);
      ctx.stroke();
      
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(padding + pos * width, padding);
      ctx.lineTo(padding + pos * width, padding + height);
      ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#4B5563';
    ctx.lineWidth = 2;
    
    // X axis
    ctx.beginPath();
    ctx.moveTo(padding, padding + height);
    ctx.lineTo(padding + width, padding + height);
    ctx.stroke();
    
    // Y axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + height);
    ctx.stroke();
    
    // Draw axis labels
    ctx.fillStyle = '#4B5563';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    
    // X axis labels
    for (let i = 0; i <= 10; i++) {
      const pos = i / 10;
      ctx.fillText(
        (pos).toFixed(1), 
        padding + pos * width, 
        padding + height + 20
      );
    }
    
    // Y axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 10; i++) {
      const pos = i / 10;
      ctx.fillText(
        (1 - pos).toFixed(1), 
        padding - 10, 
        padding + pos * height + 4
      );
    }
    
    // Add axis titles
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('False Positive Rate', padding + width / 2, padding + height + 35);
    
    ctx.save();
    ctx.translate(padding - 25, padding + height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('True Positive Rate', 0, 0);
    ctx.restore();
    
    // Draw diagonal line (random classifier)
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding + height);
    ctx.lineTo(padding + width, padding);
    ctx.stroke();
    
    // Draw ROC curve
    ctx.strokeStyle = isMultiClass ? '#3B82F6' : '#10B981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((point, i) => {
      const x = padding + point.fpr * width;
      const y = padding + (1 - point.tpr) * height;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = isMultiClass ? '#3B82F6' : '#10B981';
    data.forEach(point => {
      const x = padding + point.fpr * width;
      const y = padding + (1 - point.tpr) * height;
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw AUC text
    if (auc !== undefined) {
      ctx.fillStyle = '#1F2937';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${label ? `${label} ` : ''}AUC: ${auc.toFixed(3)}`, padding + 10, padding + 20);
    }
  }, [data, auc, label, isMultiClass]);
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <canvas 
          ref={canvasRef} 
          width="600" 
          height="400" 
          className="mx-auto"
        ></canvas>
      </div>
      
      {auc !== undefined && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">
            {isMultiClass ? 'Macro-averaged AUC' : 'Area Under Curve (AUC)'}
          </div>
          <div className="text-2xl font-semibold mt-1">{auc.toFixed(3)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {isMultiClass 
              ? 'Average of individual class AUC scores'
              : 'AUC values range from 0.5 (random classifier) to 1.0 (perfect classifier)'}
          </div>
        </div>
      )}
    </div>
  );
};