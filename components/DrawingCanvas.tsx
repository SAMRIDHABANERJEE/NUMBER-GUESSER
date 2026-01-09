import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { CANVAS_SIZE, PEN_COLOR, PEN_WIDTH } from '../constants';

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

  const clearCanvas = useCallback(() => {
    const ctx = getContext();
    const canvas = canvasRef.current;
    if (ctx && canvas) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [getContext]);

  // Initialize canvas on mount
  useEffect(() => {
    clearCanvas();
  }, [clearCanvas]);

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
    if ('touches' in event.nativeEvent) {
      clientX = event.nativeEvent.touches[0].clientX;
      clientY = event.nativeEvent.touches[0].clientY;
    } else {
      clientX = (event as React.MouseEvent).clientX;
      clientY = (event as React.MouseEvent).clientY;
    }

    // Scale coordinates based on canvas internal size vs display size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const handleStart = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in event.nativeEvent) {
      // Prevent scrolling while drawing on touch devices
      if (event.cancelable) event.preventDefault();
    }
    const { x, y } = getCanvasRelativeCoordinates(event);
    setIsDrawing(true);
    setLastPoint({ x, y });

    // Draw a single dot in case the user just clicks/taps
    const ctx = getContext();
    if (ctx) {
      drawLine(ctx, x, y, x, y);
    }
  }, [getCanvasRelativeCoordinates, getContext, drawLine]);

  const handleMove = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    if ('touches' in event.nativeEvent) {
      if (event.cancelable) event.preventDefault();
    }
    const { x, y } = getCanvasRelativeCoordinates(event);
    const ctx = getContext();
    if (ctx && lastPoint) {
      drawLine(ctx, lastPoint.x, lastPoint.y, x, y);
      setLastPoint({ x, y });
    }
  }, [isDrawing, lastPoint, getContext, getCanvasRelativeCoordinates, drawLine]);

  const handleEnd = useCallback(() => {
    setIsDrawing(false);
    setLastPoint(null);
  }, []);

  const getImageData = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      return canvas.toDataURL('image/png');
    }
    return 'data:,';
  }, []);

  useImperativeHandle(ref, () => ({
    clearCanvas,
    getImageData,
  }));

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="w-full h-full touch-none"
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
    />
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';

export { DrawingCanvas };