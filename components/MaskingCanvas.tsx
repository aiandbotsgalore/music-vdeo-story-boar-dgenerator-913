import React, { useRef, useEffect, useState } from 'react';

interface MaskingCanvasProps {
  baseImageSrc: string;
  onMaskReady: (maskDataUrl: string) => void;
}

const MaskingCanvas: React.FC<MaskingCanvasProps> = ({ baseImageSrc, onMaskReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(40);

  const resizeCanvases = () => {
    if (!containerRef.current || !imageCanvasRef.current || !drawingCanvasRef.current) return;
    const { width } = containerRef.current.getBoundingClientRect();
    const aspectRatio = 16 / 9;
    const height = width / aspectRatio;
    
    imageCanvasRef.current.width = drawingCanvasRef.current.width = width;
    imageCanvasRef.current.height = drawingCanvasRef.current.height = height;

    const img = new Image();
    img.onload = () => {
        const ctx = imageCanvasRef.current?.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
    };
    img.src = baseImageSrc;
  };

  useEffect(() => {
    window.addEventListener('resize', resizeCanvases);
    resizeCanvases();
    clearMask();
    return () => window.removeEventListener('resize', resizeCanvases);
  }, [baseImageSrc]);

  // Fix: Use a type guard to select the correct event source for coordinates.
  const getCoords = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const source = 'touches' in e ? e.touches[0] : e;
    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = drawingCanvasRef.current?.getContext('2d');
    ctx?.beginPath();

    // After drawing, generate the mask
    if (drawingCanvasRef.current) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = drawingCanvasRef.current.width;
        tempCanvas.height = drawingCanvasRef.current.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
            // Fill with black
            tempCtx.fillStyle = 'black';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            // Draw the user's white markings on top
            tempCtx.drawImage(drawingCanvasRef.current, 0, 0);
        }
        onMaskReady(tempCanvas.toDataURL('image/png'));
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCoords(e);
    const ctx = drawingCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  
  const clearMask = () => {
      const canvas = drawingCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          onMaskReady(createBlankMask());
      }
  };

  const createBlankMask = () => {
      const canvas = document.createElement('canvas');
      if (drawingCanvasRef.current) {
          canvas.width = drawingCanvasRef.current.width;
          canvas.height = drawingCanvasRef.current.height;
      }
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      return canvas.toDataURL('image/png');
  };

  return (
    <div className="w-full">
        <div ref={containerRef} className="relative w-full aspect-video cursor-crosshair">
            <canvas ref={imageCanvasRef} className="absolute top-0 left-0 rounded-lg" />
            <canvas
                ref={drawingCanvasRef}
                className="absolute top-0 left-0"
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
            />
        </div>
        <div className="flex items-center justify-between gap-4 mt-4 p-2 bg-gray-900 rounded-lg">
            <div className='flex items-center gap-2'>
                <label htmlFor="brushSize" className="text-sm font-medium text-gray-300">Brush Size:</label>
                <input
                    type="range"
                    id="brushSize"
                    min="10"
                    max="100"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-32 cursor-pointer"
                />
            </div>
            <button
                onClick={clearMask}
                className="bg-gray-700 text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
            >
                Clear Mask
            </button>
        </div>
    </div>
  );
};

export default MaskingCanvas;