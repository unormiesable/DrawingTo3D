import { useEffect, useState, useCallback } from 'react';
import useDrawing from './hooks/useDrawing';
import { analyzeShapes, fixDrawing } from './utils/connectivity';

function App() {
  const [mode, setMode] = useState('drawing');
  const [brushSize, setBrushSize] = useState(10);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('#0000FF');
  const [cursorStyle, setCursorStyle] = useState('default');

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
    if (mode === 'drawing') {
      const size = brushSize;
      const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${(size / 2) - 1}" stroke="black" stroke-width="1" fill="none"/></svg>`;
      const cursorUrl = `url('data:image/svg+xml;base64,${btoa(svg)}') ${size / 2} ${size / 2}, auto`;
      setCursorStyle(cursorUrl);
    } else if (mode === 'erasing') {
      const eraseSize = 30;
      const svg = `<svg width="${eraseSize}" height="${eraseSize}" xmlns="http://www.w3.org/2000/svg"><circle cx="${eraseSize / 2}" cy="${eraseSize / 2}" r="${(eraseSize / 2) - 1}" stroke="black" stroke-width="1" fill="none"/></svg>`;
      const cursorUrl = `url('data:image/svg+xml;base64,${btoa(svg)}') ${eraseSize / 2} ${eraseSize / 2}, auto`;
      setCursorStyle(cursorUrl);
    } else if (mode === 'fill') {
      setCursorStyle('crosshair');
    } else {
      setCursorStyle('default');
    }
  }, [mode, brushSize]);


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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1>Gambar Ikan</h1>
      <canvas
        style={{ border: '2px solid black', borderRadius: '8px', cursor: cursorStyle }}
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => (mode === 'drawing' ? finishDrawing() : null)}
        width={window.innerWidth * 0.8}
        height={window.innerHeight * 0.7}
      />
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
        <button
          style={{
            ...buttonBaseStyle,
            backgroundColor: mode === 'drawing' ? '#3498db' : '#555',
          }}
          onClick={() => setMode('drawing')}
        >
          Gambar (Draw)
        </button>

        <button
          style={{
            ...buttonBaseStyle,
            backgroundColor: mode === 'erasing' ? '#e74c3c' : '#555',
          }}
          onClick={() => setMode('erasing')}
        >
          Hapus (Erase)
        </button>

        <button
          style={{
            ...buttonBaseStyle,
            backgroundColor: mode === 'fill' ? '#2ecc71' : '#555',
          }}
          onClick={() => setMode('fill')}
        >
          Warnai (Fill)
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', width: '80%', justifyContent: 'center', marginTop: '1rem' }}>
        <button
          style={{
            ...buttonBaseStyle,
            backgroundColor: 'lightgreen',
            color: 'black',
            width: '100%',
            margin: '0.5rem 0'
          }}
          onClick={handleCheckClick}
        >
          Cek (Open/Close)
        </button>

        <button
          style={{
            ...buttonBaseStyle,
            backgroundColor: 'lightblue',
            color: 'black',
            width: '100%',
            margin: '0.5rem 0'
          }}
          onClick={handleFixClick}
        >
          Perbaiki (Open to Close)
        </button>
      </div>
    </div>
  );
}

export default App;