import { useRef, useCallback } from 'react';

const useDrawing = (mode, brushSize, strokeColor) => { 
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const pathsRef = useRef([]);
  const currentPathRef = useRef([]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = 2;
    context.strokeStyle = '#000000';
  }, [canvasRef]);

  const erase = useCallback((x, y) => {
    const eraseRadius = 15;
    let somethingWasErased = false;
    const newStrokes = [];

    pathsRef.current.forEach(stroke => {
      let currentSegment = [];
      for (const point of stroke.path) {
        const distance = Math.hypot(point.x - x, point.y - y);
        if (distance > eraseRadius) {
          currentSegment.push(point);
        } else {
          somethingWasErased = true;
          if (currentSegment.length > 1) {
            newStrokes.push({
              path: currentSegment,
              brushSize: stroke.brushSize,
              color: stroke.color
            });
          }
          currentSegment = [];
        }
      }
      if (currentSegment.length > 1) {
        newStrokes.push({
          path: currentSegment,
          brushSize: stroke.brushSize,
          color: stroke.color
        });
      }
    });

    if (somethingWasErased) {
      pathsRef.current = newStrokes;
      return true;
    }
    return false;
  }, [pathsRef]);

  const fill = useCallback(({ nativeEvent }, fillColor) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    const { offsetX, offsetY } = nativeEvent;

    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    
    const fillRgb = hexToRgb(fillColor);
    if (!fillRgb) return;

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const startPos = (Math.round(offsetY) * canvas.width + Math.round(offsetX)) * 4;

    const startColor = { r: data[startPos], g: data[startPos + 1], b: data[startPos + 2] };

    if (startColor.r === fillRgb.r && startColor.g === fillRgb.g && startColor.b === fillRgb.b) {
      return;
    }

    const pixelStack = [[offsetX, offsetY]];

    while (pixelStack.length) {
      let [x, y] = pixelStack.pop();
      x = Math.round(x);
      y = Math.round(y);

      const currentPos = (y * canvas.width + x) * 4;

      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;

      if (data[currentPos] !== startColor.r || data[currentPos + 1] !== startColor.g || data[currentPos + 2] !== startColor.b) continue;

      data[currentPos] = fillRgb.r;
      data[currentPos + 1] = fillRgb.g;
      data[currentPos + 2] = fillRgb.b;
      data[currentPos + 3] = 255;

      pixelStack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    context.putImageData(imageData, 0, 0);
  }, [canvasRef]);

  const finishDrawing = useCallback(() => {
    if (!isDrawing.current) return;

    if (mode === 'drawing' && currentPathRef.current.length > 1) {
      pathsRef.current.push({ 
        path: currentPathRef.current,
        brushSize: brushSize,
        color: strokeColor 
      });
    }
    currentPathRef.current = [];
    isDrawing.current = false;
    const context = canvasRef.current?.getContext('2d');
    context?.closePath();
  }, [mode, brushSize, strokeColor, pathsRef, canvasRef]);

  const startDrawing = useCallback(({ nativeEvent }) => {
    isDrawing.current = true;
    const { offsetX, offsetY } = nativeEvent;
    const context = canvasRef.current.getContext('2d');

    if (mode === 'drawing') {
      context.strokeStyle = strokeColor;
      context.lineWidth = brushSize; 
      currentPathRef.current = [{ x: offsetX, y: offsetY }];
      context.beginPath();
      context.moveTo(offsetX, offsetY);
    }
  }, [mode, brushSize, strokeColor, canvasRef]); 

  const draw = useCallback(({ nativeEvent }) => {
    if (!isDrawing.current) return;

    const { offsetX, offsetY } = nativeEvent;
    const context = canvasRef.current.getContext('2d');
    currentPathRef.current.push({ x: offsetX, y: offsetY });
    context.lineTo(offsetX, offsetY);
    context.stroke();
    
  }, [canvasRef]);

  return {
    canvasRef,
    setupCanvas,
    startDrawing,
    finishDrawing,
    draw,
    pathsRef,
    fill,
    erase,
  };
};

export default useDrawing;