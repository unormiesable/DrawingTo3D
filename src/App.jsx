import { useEffect, useState, useCallback } from 'react';
import useDrawing from './hooks/useDrawing';
import { analyzeShapes, fixDrawing } from './utils/connectivity';

function App() {
  const [mode, setMode] = useState('drawing');
  const [brushSize, setBrushSize] = useState(10);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('#0000FF');

  const [cursorPosition, setCursorPosition] = useState({ x: -100, y: -100 });
  const [isCursorOverCanvas, setIsCursorOverCanvas] = useState(false);


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
    setCursorPosition({ x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY });

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

  const handleClearCanvas = () => {
    pathsRef.current = [];
    redrawAllPaths();
  };

  const handleClearFill = () => {
    redrawAllPaths();
  };

  const buttonBaseStyle = {
    padding: '0.8rem 1rem',
    border: 'none',
    color: 'white',
    fontSize: '1rem',
    cursor: 'pointer',
    flex: 1,
    margin: '0 0.25rem',
    borderRadius: '4px'
  };

  const getFakeCursorStyle = () => {
    const size = mode === 'erasing' ? 30 : brushSize;
    return {
      position: 'absolute',
      display: isCursorOverCanvas && (mode === 'drawing' || mode === 'erasing') ? 'block' : 'none',
      width: `${size}px`,
      height: `${size}px`,
      border: '1px solid white',
      borderRadius: '50%',
      top: `${cursorPosition.y - (size / 2)}px`,
      left: `${cursorPosition.x - (size / 2)}px`,
      mixBlendMode: 'difference',
      pointerEvents: 'none',
      zIndex: 1000,
    };
  };

  const getCanvasCursor = () => {
    if (mode === 'drawing' || mode === 'erasing') return 'none';
    if (mode === 'fill') return 'crosshair';
    return 'default';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1>Gambar Ikan</h1>
      
      <div style={{ position: 'relative' }}>
        <canvas
          style={{ 
            border: '2px solid black', 
            borderRadius: '8px', 
            cursor: getCanvasCursor()
          }}
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsCursorOverCanvas(true)}
          onMouseLeave={() => {
            setIsCursorOverCanvas(false);
            if (mode === 'drawing') finishDrawing();
          }}
          width={window.innerWidth * 0.8}
          height={window.innerHeight * 0.7}
        />
        
        <div style={getFakeCursorStyle()} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', width: '80%', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <label htmlFor="strokeColor" style={{ marginRight: '1rem' }}>Warna Garis:</label>
            <input
              type="color"
              id="strokeColor"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              style={{ marginRight: '1rem' }}
            />
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
            <label htmlFor="fillColor" style={{ marginRight: '1rem' }}>Warna Isi:</label>
            <input
              type="color"
              id="fillColor"
              value={fillColor}
              onChange={(e) => setFillColor(e.target.value)}
              style={{ marginRight: '1rem' }}
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

      <div style={{ display: 'flex', width: '80%', justifyContent: 'center', marginTop: '1rem' }}>
        <button style={{ ...buttonBaseStyle, backgroundColor: mode === 'drawing' ? '#3498db' : '#555' }} onClick={() => setMode('drawing')}>
          Gambar (Draw)
        </button>
        <button style={{ ...buttonBaseStyle, backgroundColor: mode === 'erasing' ? '#e74c3c' : '#555' }} onClick={() => setMode('erasing')}>
          Hapus (Erase)
        </button>
        <button style={{ ...buttonBaseStyle, backgroundColor: mode === 'fill' ? '#2ecc71' : '#555' }} onClick={() => setMode('fill')}>
          Warnai (Fill)
        </button>
      </div>

      <div style={{ display: 'flex', width: '80%', justifyContent: 'center', marginTop: '1rem' }}>
        <button style={{ ...buttonBaseStyle, backgroundColor: '#c0392b' }} onClick={handleClearCanvas}>
          Bersihkan Layar
        </button>
        <button style={{ ...buttonBaseStyle, backgroundColor: '#7f8c8d' }} onClick={handleClearFill}>
          Bersihkan Fill
        </button>
      </div>

      <div style={{ display: 'flex', width: '80%', justifyContent: 'center', marginTop: '1rem' }}>
        <button style={{ ...buttonBaseStyle, backgroundColor: 'lightgreen', color: 'black' }} onClick={handleCheckClick}>
          Cek (Open/Close)
        </button>
        <button style={{ ...buttonBaseStyle, backgroundColor: 'lightblue', color: 'black' }} onClick={handleFixClick}>
          Perbaiki (Open to Close)
        </button>
      </div>
    </div>
  );
}

export default App;