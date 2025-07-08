import { useEffect, useState, useCallback } from "react";
import useDrawing from "./hooks/useDrawing";
import {
  analyzeShapes,
  fixDrawing,
  calculateCentroid,
  findCentroidsOfShapes,
  applyGlobalGradientFill,
  applyGradientFillToShapes,
  applyEdgeGradientFill,
} from "./utils/connectivity";
import { generateAndDownloadGLB } from "./utils/exportTo3D";

function App() {
  const [mode, setMode] = useState("drawing");
  const [brushSize, setBrushSize] = useState(10);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [fillColor, setFillColor] = useState("#0000FF");

  const [gradientThreshold, setGradientThreshold] = useState(1.0);
  const [gradientMin, setGradientMin] = useState(0.0);
  const [gradientMax, setGradientMax] = useState(1.0);

  const [cursorPosition, setCursorPosition] = useState({ x: -100, y: -100 });
  const [isCursorOverCanvas, setIsCursorOverCanvas] = useState(false);

  const {
    canvasRef,
    setupCanvas,
    finishDrawing,
    draw,
    paths,
    setPaths,
    startDrawing,
    fill,
    erase,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useDrawing(mode, brushSize, strokeColor);

  const redrawAllPaths = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.lineCap = "round";
    context.lineJoin = "round";

    paths.forEach((stroke) => {
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
  }, [canvasRef, paths]);

  useEffect(() => {
    redrawAllPaths();
  }, [paths, redrawAllPaths]);

  useEffect(() => {
    setupCanvas();
  }, [setupCanvas]);

  useEffect(() => {
    const handleMouseUp = () => {
      if (mode === "drawing") {
        finishDrawing();
      }
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [finishDrawing, mode]);

  const handleMouseDown = (event) => {
    if (mode === "fill") {
      fill(event, fillColor);
    } else if (mode === "erasing") {
      erase(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
    } else {
      startDrawing(event);
    }
  };

  const handleMouseMove = (event) => {
    setCursorPosition({
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
    });

    if (mode === "erasing" && event.buttons === 1) {
      erase(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
    } else if (mode === "drawing") {
      draw(event);
    }
  };

  const handleCheckClick = () => {
    analyzeShapes(paths);
  };

  const handleFixClick = () => {
    const fixedPaths = fixDrawing(paths, brushSize, strokeColor);
    if (fixedPaths !== paths) {
      setPaths(fixedPaths);
    }
  };

  const handleClearCanvas = () => {
    setPaths([]);
  };

  const handleClearFill = () => {
    redrawAllPaths();
  };

  const handleFindCenterClick = () => {
    redrawAllPaths();
    const centroid = calculateCentroid(paths);
    if (centroid) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      context.beginPath();
      context.fillStyle = "#FF0000";
      context.arc(centroid.x, centroid.y, 10, 0, 2 * Math.PI);
      context.fill();
      context.beginPath();
      context.strokeStyle = "#FFFFFF";
      context.lineWidth = 2;
      context.arc(centroid.x, centroid.y, 10, 0, 2 * Math.PI);
      context.stroke();
    } else {
      alert("Gambar terlebih dahulu untuk menentukan titik tengah.");
    }
  };

  const handleFindCenterOfShapesClick = () => {
    redrawAllPaths();
    const centroids = findCentroidsOfShapes(paths);
    if (centroids.length > 0) {
      const context = canvasRef.current.getContext("2d");
      centroids.forEach((centroid) => {
        context.beginPath();
        context.fillStyle = "#3498db";
        context.arc(centroid.x, centroid.y, 8, 0, 2 * Math.PI);
        context.fill();
        context.beginPath();
        context.strokeStyle = "#FFFFFF";
        context.lineWidth = 2;
        context.arc(centroid.x, centroid.y, 8, 0, 2 * Math.PI);
        context.stroke();
      });
    } else {
      alert("Tidak ada bentuk yang dapat dianalisis.");
    }
  };

  const handleApplyGlobalGradient = () => {
    if (paths.length > 0) {
      applyGlobalGradientFill(
        canvasRef.current,
        paths,
        gradientMin,
        gradientMax
      );
    } else {
      alert("Tidak ada gambar untuk diberi gradien.");
    }
  };

  const handleApplyShapeGradient = () => {
    if (paths.length > 0) {
      applyGradientFillToShapes(
        canvasRef.current,
        paths,
        gradientMin,
        gradientMax
      );
    } else {
      alert("Tidak ada gambar untuk diberi gradien.");
    }
  };

  const handleApplyEdgeGradient = () => {
    if (paths.length > 0) {
      applyEdgeGradientFill(
        canvasRef.current,
        paths,
        gradientThreshold,
        gradientMin,
        gradientMax
      );
    } else {
      alert("Tidak ada gambar untuk diberi gradien.");
    }
  };

  const handleConvertTo3D = () => {
    if (paths.length > 0) {
      generateAndDownloadGLB(paths);
    } else {
      alert("Gambar terlebih dahulu sebelum dikonversi ke 3D.");
    }
  };

  const buttonBaseStyle = {
    padding: "0.8rem 1rem",
    border: "none",
    color: "white",
    fontSize: "1rem",
    cursor: "pointer",
    flex: 1,
    margin: "0 0.25rem",
    borderRadius: "4px",
  };

  const disabledButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: "#95a5a6",
    cursor: "not-allowed",
  };

  const getFakeCursorStyle = () => {
    const size = mode === "erasing" ? 30 : brushSize;
    return {
      position: "absolute",
      display:
        isCursorOverCanvas && (mode === "drawing" || mode === "erasing")
          ? "block"
          : "none",
      width: `${size}px`,
      height: `${size}px`,
      border: "1px solid white",
      borderRadius: "50%",
      top: `${cursorPosition.y - size / 2}px`,
      left: `${cursorPosition.x - size / 2}px`,
      mixBlendMode: "difference",
      pointerEvents: "none",
      zIndex: 1000,
    };
  };

  const getCanvasCursor = () => {
    if (mode === "drawing" || mode === "erasing") return "none";
    if (mode === "fill") return "crosshair";
    return "default";
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h1>Gambar Ikan</h1>

      <div style={{ position: "relative" }}>
        <canvas
          style={{
            border: "2px solid black",
            borderRadius: "8px",
            cursor: getCanvasCursor(),
          }}
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsCursorOverCanvas(true)}
          onMouseLeave={() => {
            setIsCursorOverCanvas(false);
            if (mode === "drawing") finishDrawing();
          }}
          width={window.innerWidth * 0.8}
          height={window.innerHeight * 0.7}
        />
        <div style={getFakeCursorStyle()} />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "80%",
          marginTop: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <label htmlFor="strokeColor" style={{ marginRight: "1rem" }}>
            Warna Garis:
          </label>
          <input
            type="color"
            id="strokeColor"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            style={{ marginRight: "1rem" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <label htmlFor="fillColor" style={{ marginRight: "1rem" }}>
            Warna Isi:
          </label>
          <input
            type="color"
            id="fillColor"
            value={fillColor}
            onChange={(e) => setFillColor(e.target.value)}
            style={{ marginRight: "1rem" }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexGrow: 1,
            marginLeft: "2rem",
          }}
        >
          <label htmlFor="brushSize" style={{ marginRight: "1rem" }}>
            Ukuran Kuas:
          </label>
          <input
            type="range"
            id="brushSize"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(e.target.value)}
            style={{ flexGrow: 1 }}
          />
          <span style={{ marginLeft: "1rem", width: "30px" }}>{brushSize}</span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          width: "80%",
          justifyContent: "center",
          marginTop: "1rem",
        }}
      >
        <button
          style={
            canUndo
              ? { ...buttonBaseStyle, backgroundColor: "#f39c12" }
              : disabledButtonStyle
          }
          onClick={undo}
          disabled={!canUndo}
        >
          Undo
        </button>
        <button
          style={
            canRedo
              ? { ...buttonBaseStyle, backgroundColor: "#f1c40f" }
              : disabledButtonStyle
          }
          onClick={redo}
          disabled={!canRedo}
        >
          Redo
        </button>
      </div>

      <div
        style={{
          display: "flex",
          width: "80%",
          justifyContent: "center",
          marginTop: "1rem",
        }}
      >
        <button
          style={{
            ...buttonBaseStyle,
            backgroundColor: mode === "drawing" ? "#3498db" : "#555",
          }}
          onClick={() => setMode("drawing")}
        >
          Gambar (Draw)
        </button>
        <button
          style={{
            ...buttonBaseStyle,
            backgroundColor: mode === "erasing" ? "#e74c3c" : "#555",
          }}
          onClick={() => setMode("erasing")}
        >
          Hapus (Erase)
        </button>
        <button
          style={{
            ...buttonBaseStyle,
            backgroundColor: mode === "fill" ? "#2ecc71" : "#555",
          }}
          onClick={() => setMode("fill")}
        >
          Warnai (Fill)
        </button>
      </div>

      <div
        style={{
          display: "flex",
          width: "80%",
          justifyContent: "center",
          marginTop: "1rem",
        }}
      >
        <button
          style={{ ...buttonBaseStyle, backgroundColor: "#c0392b" }}
          onClick={handleClearCanvas}
        >
          Bersihkan Layar
        </button>
        <button
          style={{ ...buttonBaseStyle, backgroundColor: "#7f8c8d" }}
          onClick={handleClearFill}
        >
          Bersihkan Fill
        </button>
      </div>

      <p>DEBUGER MENU</p>

      <div
        style={{
          display: "flex",
          width: "80%",
          justifyContent: "center",
          marginTop: "0rem",
        }}
      >
        <button
          style={{
            ...buttonBaseStyle,
            backgroundColor: "lightgreen",
            color: "black",
          }}
          onClick={handleCheckClick}
        >
          Cek (Open/Close)
        </button>
        <button
          style={{
            ...buttonBaseStyle,
            backgroundColor: "lightblue",
            color: "black",
          }}
          onClick={handleFixClick}
        >
          Perbaiki (Open to Close)
        </button>
      </div>

      <div
        style={{
          display: "flex",
          width: "80%",
          justifyContent: "center",
          marginTop: "1rem",
        }}
      >
        <button
          style={{
            ...buttonBaseStyle,
            backgroundColor: "green",
            color: "white",
          }}
          onClick={handleFindCenterClick}
        >
          Tentukan Titik Tengah (Semua)
        </button>
        <button
          style={{
            ...buttonBaseStyle,
            backgroundColor: "#16a085",
            color: "white",
          }}
          onClick={handleFindCenterOfShapesClick}
        >
          Tentukan Titik Tengah (Per Bentuk)
        </button>
      </div>

      <div
        style={{
          display: "flex",
          width: "80%",
          justifyContent: "center",
          marginTop: "1rem",
        }}
      >
        <button
          style={{
            ...buttonBaseStyle,
            backgroundColor: "#2c3e50",
            color: "white",
          }}
          onClick={handleApplyGlobalGradient}
        >
          Gradient Fill (Dari Pusat Global)
        </button>
        <button
          style={{
            ...buttonBaseStyle,
            backgroundColor: "#8e44ad",
            color: "white",
          }}
          onClick={handleApplyShapeGradient}
        >
          Gradient Fill (Dari Pusat Bentuk)
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "80%",
          justifyContent: "center",
          alignItems: "center",
          marginTop: "1rem",
          padding: "1rem",
          border: "1px solid #ccc",
          borderRadius: "8px",
        }}
      >
        <button
          style={{
            ...buttonBaseStyle,
            backgroundColor: "#d35400",
            color: "white",
            width: "100%",
          }}
          onClick={handleApplyEdgeGradient}
        >
          Gradient Fill Dari Garis Tepi
        </button>
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            marginTop: "1rem",
          }}
        >
          <label htmlFor="threshold" style={{ marginRight: "1rem" }}>
            Threshold:
          </label>
          <input
            type="range"
            id="threshold"
            min="0.01"
            max="1.0"
            step="0.01"
            value={gradientThreshold}
            onChange={(e) => setGradientThreshold(parseFloat(e.target.value))}
            style={{ flexGrow: 1 }}
          />
          <span style={{ marginLeft: "1rem", width: "40px" }}>
            {gradientThreshold.toFixed(2)}
          </span>
        </div>

        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            marginTop: "0.5rem",
          }}
        >
          <label htmlFor="gradientMin" style={{ marginRight: "1rem" }}>
            Min:
          </label>
          <input
            type="range"
            id="gradientMin"
            min="0.0"
            max="1.0"
            step="0.01"
            value={gradientMin}
            onChange={(e) => setGradientMin(parseFloat(e.target.value))}
            style={{ flexGrow: 1 }}
          />
          <span style={{ marginLeft: "1rem", width: "40px" }}>
            {gradientMin.toFixed(2)}
          </span>
        </div>
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            marginTop: "0.5rem",
          }}
        >
          <label htmlFor="gradientMax" style={{ marginRight: "1rem" }}>
            Max:
          </label>
          <input
            type="range"
            id="gradientMax"
            min="0.0"
            max="1.0"
            step="0.01"
            value={gradientMax}
            onChange={(e) => setGradientMax(parseFloat(e.target.value))}
            style={{ flexGrow: 1 }}
          />
          <span style={{ marginLeft: "1rem", width: "40px" }}>
            {gradientMax.toFixed(2)}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          width: "80%",
          justifyContent: "center",
          marginTop: "1rem",
        }}
      >
        <button
          style={{
            ...buttonBaseStyle,
            backgroundColor: "#1abc9c",
            color: "white",
            fontWeight: "bold",
          }}
          onClick={handleConvertTo3D}
        >
          Convert To 3D Model
        </button>
      </div>
    </div>
  );
}

export default App;
