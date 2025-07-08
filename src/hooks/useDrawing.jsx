import { useRef, useCallback, useState, useEffect } from "react";

const useDrawing = (mode, brushSize, strokeColor) => {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  const historyRef = useRef([[]]);
  const historyIndexRef = useRef(0);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [paths, setPaths] = useState([]);
  const currentPathRef = useRef([]);

  const saveState = useCallback((newPaths) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(newPaths);
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setPaths(newPaths);
  }, []);

  useEffect(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, [paths]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.lineCap = "round";
    context.lineJoin = "round";
  }, []);

  const erase = useCallback(
    (x, y) => {
      const eraseRadius = 15;
      let somethingWasErased = false;
      const currentPaths = historyRef.current[historyIndexRef.current];
      const newStrokes = [];

      currentPaths.forEach((stroke) => {
        let currentSegment = [];
        for (const point of stroke.path) {
          const distance = Math.hypot(point.x - x, point.y - y);
          if (distance > eraseRadius) {
            currentSegment.push(point);
          } else {
            somethingWasErased = true;
            if (currentSegment.length > 1) {
              newStrokes.push({ ...stroke, path: currentSegment });
            }
            currentSegment = [];
          }
        }
        if (currentSegment.length > 1) {
          newStrokes.push({ ...stroke, path: currentSegment });
        }
      });

      if (somethingWasErased) {
        saveState(newStrokes);
        return true;
      }
      return false;
    },
    [saveState]
  );

  const fill = useCallback(
    ({ nativeEvent }, fillColor) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      const { offsetX, offsetY } = nativeEvent;

      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
            }
          : null;
      };

      const fillRgb = hexToRgb(fillColor);
      if (!fillRgb) return;

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const startPos =
        (Math.round(offsetY) * canvas.width + Math.round(offsetX)) * 4;

      const startColor = {
        r: data[startPos],
        g: data[startPos + 1],
        b: data[startPos + 2],
      };

      if (
        startColor.r === fillRgb.r &&
        startColor.g === fillRgb.g &&
        startColor.b === fillRgb.b
      ) {
        return;
      }

      const pixelStack = [[offsetX, offsetY]];

      while (pixelStack.length) {
        let [x, y] = pixelStack.pop();
        x = Math.round(x);
        y = Math.round(y);

        const currentPos = (y * canvas.width + x) * 4;
        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
        if (
          data[currentPos] !== startColor.r ||
          data[currentPos + 1] !== startColor.g ||
          data[currentPos + 2] !== startColor.b
        )
          continue;

        data[currentPos] = fillRgb.r;
        data[currentPos + 1] = fillRgb.g;
        data[currentPos + 2] = fillRgb.b;
        data[currentPos + 3] = 255;

        pixelStack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }

      context.putImageData(imageData, 0, 0);
    },
    [canvasRef]
  );

  const finishDrawing = useCallback(() => {
    if (!isDrawing.current || currentPathRef.current.length < 2) {
      currentPathRef.current = [];
      isDrawing.current = false;
      return;
    }

    const currentPaths = historyRef.current[historyIndexRef.current];
    const newPath = {
      path: currentPathRef.current,
      brushSize: brushSize,
      color: strokeColor,
    };
    saveState([...currentPaths, newPath]);

    currentPathRef.current = [];
    isDrawing.current = false;
    canvasRef.current?.getContext("2d")?.closePath();
  }, [brushSize, strokeColor, saveState]);

  const startDrawing = useCallback(
    ({ nativeEvent }) => {
      isDrawing.current = true;
      const { offsetX, offsetY } = nativeEvent;
      const context = canvasRef.current.getContext("2d");

      if (mode === "drawing") {
        context.strokeStyle = strokeColor;
        context.lineWidth = brushSize;
        currentPathRef.current = [{ x: offsetX, y: offsetY }];
        context.beginPath();
        context.moveTo(offsetX, offsetY);
      }
    },
    [mode, brushSize, strokeColor, canvasRef]
  );

  const draw = useCallback(
    ({ nativeEvent }) => {
      if (!isDrawing.current || mode !== "drawing") return;
      const { offsetX, offsetY } = nativeEvent;
      const context = canvasRef.current.getContext("2d");
      currentPathRef.current.push({ x: offsetX, y: offsetY });
      context.lineTo(offsetX, offsetY);
      context.stroke();
    },
    [mode, canvasRef]
  );

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const newPaths = historyRef.current[historyIndexRef.current];
      setPaths(newPaths);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const newPaths = historyRef.current[historyIndexRef.current];
      setPaths(newPaths);
    }
  }, []);

  return {
    canvasRef,
    setupCanvas,
    startDrawing,
    finishDrawing,
    draw,
    paths,
    setPaths: saveState,
    fill,
    erase,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};

export default useDrawing;
