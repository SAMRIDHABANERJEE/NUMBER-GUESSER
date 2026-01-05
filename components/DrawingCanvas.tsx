import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { CANVAS_SIZE, PEN_COLOR, PEN_WIDTH } from '../constants'; // CRITICAL: Explicitly import

export interface DrawingCanvasRef {
  clearCanvas: () => void;
  getImageData: () => string;
}

interface DrawingCanvasProps {}

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>((_props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = PEN_COLOR;
        ctx.lineWidth = PEN_WIDTH;
        return ctx;
      }
    }
    return null;
  }, []);

  // Initialize canvas on mount
  useEffect(() => {
    const ctx = getContext();
    if (ctx) {
      // Ensure canvas is clear on initial load
      clearCanvas();
    }
  }, [getContext]);

  const drawLine = useCallback((ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.closePath();
  }, []);

  const getCanvasRelativeCoordinates = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (event.nativeEvent instanceof TouchEvent) {
      clientX = event.nativeEvent.touches[0].clientX;
      clientY = event.nativeEvent.touches[0].clientY;
    } else {
      clientX = event.nativeEvent.clientX;
      clientY = event.nativeEvent.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const handleMouseDown = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getCanvasRelativeCoordinates(event);
    setIsDrawing(true);
    setLastPoint({ x, y });
  }, [getCanvasRelativeCoordinates]);

  const handleMouseMove = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCanvasRelativeCoordinates(event);
    const ctx = getContext();
    if (ctx && lastPoint) {
      drawLine(ctx, lastPoint.x, lastPoint.y, x, y);
      setLastPoint({ x, y });
    }
  }, [isDrawing, lastPoint, getContext, getCanvasRelativeCoordinates, drawLine]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    setLastPoint(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isDrawing) { // Only stop drawing if mouse leaves while drawing
      setIsDrawing(false);
      setLastPoint(null);
    }
  }, [isDrawing]);


  const clearCanvas = useCallback(() => {
    const ctx = getContext();
    if (ctx) {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      // Optional: fill with a background color if desired, e.g., for consistency with image format
      // ctx.fillStyle = '#000000'; // Black background
      // ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }
  }, [getContext]);

  const getImageData = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      return canvas.toDataURL('image/png'); // Returns data URL (base64)
    }
    return 'data:,'; // Empty data URL
  }, []);

  // Expose functions to parent component via ref
  useImperativeHandle(ref, () => ({
    clearCanvas,
    getImageData,
  }));

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="bg-gray-700 touch-none w-full h-full"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
      onTouchCancel={handleMouseUp}
    />
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';

export { DrawingCanvas };