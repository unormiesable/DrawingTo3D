import { useEffect, useState, useCallback } from 'react';
import useDrawing from './hooks/useDrawing';
import { analyzeShapes, fixDrawing } from './utils/connectivity';

function App() {
  const [mode, setMode] = useState('drawing');
  const [brushSize, setBrushSize] = useState(2);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('#0000FF');

  const {
    canvasRef,
    setupCanvas,
    finishDrawing,
    draw,
    pathsRef,
    startDrawing,
    fill,
    erase,
  } = useDrawing(mode, brushSize, strokeColor);

  const redrawAllPaths = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    
    pathsRef.current.forEach(stroke => {
      if (stroke.path.length < 2) return;

      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.brushSize;

      context.beginPath();
      context.moveTo(stroke.path[0].x, stroke.path[0].y);
      for (let i = 1; i < stroke.path.length; i++) {
        context.lineTo(stroke.path[i].x, stroke.path[i].y);
      }
      context.stroke();
    });
  }, [canvasRef, pathsRef]);

  useEffect(() => {
    setupCanvas();
  }, [setupCanvas]);

  useEffect(() => {
    const handleMouseUp = () => {
      if (mode !== 'fill') {
        finishDrawing();
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [finishDrawing, mode]);

  const handleMouseDown = (event) => {
    if (mode === 'fill') {

      fill(event, fillColor);
    } else if (mode === 'erasing') {
      const somethingErased = erase(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
      if (somethingErased) {
        redrawAllPaths();
      }
    } else {
      startDrawing(event);
    }
  };

  const handleMouseMove = (event) => {
    if (mode === 'erasing' && event.buttons === 1) { 
      const somethingErased = erase(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
      if (somethingErased) {
        redrawAllPaths();
      }
    } else if (mode === 'drawing') {
      draw(event);
    }
  };
  
  const handleCheckClick = () => {
    analyzeShapes(pathsRef.current);
  };

  const handleFixClick = () => {
    const originalPaths = pathsRef.current;

    const fixedPaths = fixDrawing(originalPaths, brushSize, strokeColor);

    if (fixedPaths === originalPaths) {
      return;
    }

    pathsRef.current = fixedPaths;
    redrawAllPaths();
  };

  const cycleMode = () => {
    setMode(prev => {
      if (prev === 'drawing') return 'erasing';
      if (prev === 'erasing') return 'fill';
      return 'drawing';
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1>Gambar Ikan</h1>
      <canvas
        style={{ border: '2px solid black', borderRadius: '8px', cursor: mode === 'fill' ? 'crosshair' : 'default' }}
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => (mode === 'drawing' ? finishDrawing() : null)}
        width={window.innerWidth * 0.8}
        height={window.innerHeight * 0.7}
      />
      {/* <<< 6. Tambahkan UI untuk pemilih warna */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '80%', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <label htmlFor="strokeColor" style={{ marginRight: '1rem' }}>Warna Garis:</label>
            <input
              type="color"
              id="strokeColor"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
            />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <label htmlFor="fillColor" style={{ marginRight: '1rem' }}>Warna Isi:</label>
            <input
              type="color"
              id="fillColor"
              value={fillColor}
              onChange={(e) => setFillColor(e.target.value)}
            />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, marginLeft: '2rem' }}>
            <label htmlFor="brushSize" style={{ marginRight: '1rem' }}>Ukuran Kuas:</label>
            <input
              type="range"
              id="brushSize"
              min="1"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(e.target.value)}
              style={{ flexGrow: 1 }}
            />
            <span style={{ marginLeft: '1rem', width: '30px' }}>{brushSize}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', width: '80%', justifyContent: 'center' }}>
        <button
          style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: 'orange',
            width: '100%',
            border: 'none',
            color: 'white',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
          onClick={cycleMode}
        >
          MODE: {mode.toUpperCase()}
        </button>
        
        <button
          style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: 'grey',
            width: '100%',
            border: 'none',
            color: 'white',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
          onClick={handleCheckClick}
        >
          CHECK
        </button>

        <button
          style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: 'darkblue',
            width: '100%',
            border: 'none',
            color: 'white',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
          onClick={handleFixClick}
        >
          PERBAIKI
        </button>
      </div>
    </div>
  );
}

export default App;