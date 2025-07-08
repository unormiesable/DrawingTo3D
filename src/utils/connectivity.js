const subdivideLine = (p1, p2) => {
    const newPath = [p1];
    const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const numSegments = Math.max(1, Math.floor(distance / 5));

    for (let i = 1; i <= numSegments; i++) {
        const t = i / numSegments;
        const x = p1.x + t * (p2.x - p1.x);
        const y = p1.y + t * (p2.y - p1.y);
        newPath.push({ x, y });
    }
    
    if (numSegments > 0) {
        newPath.push(p2);
    }

    return newPath;
};

const buildGraph = (allStrokes) => {
    const points = [];
    const tolerance = 1;

    const findOrAddPoint = (p) => {
        const existingPointIndex = points.findIndex(
            (pt) => Math.hypot(pt.x - p.x, pt.y - p.y) < tolerance
        );
        if (existingPointIndex !== -1) {
            return existingPointIndex;
        }
        points.push(p);
        return points.length - 1;
    };

    allStrokes.forEach(stroke => stroke.path.forEach(point => findOrAddPoint(point)));

    const adj = Array.from({ length: points.length }, () => new Set());
    allStrokes.forEach(stroke => {
        for (let i = 0; i < stroke.path.length - 1; i++) {
            const uIndex = findOrAddPoint(stroke.path[i]);
            const vIndex = findOrAddPoint(stroke.path[i + 1]);
            if (uIndex !== vIndex) {
                adj[uIndex].add(vIndex);
                adj[vIndex].add(uIndex);
            }
        }
    });

    return { points, adj };
};

const isPointInsidePolygon = (point, polygonSegments) => {
    let intersections = 0;
    const px = point.x;
    const py = point.y;

    for (const segment of polygonSegments) {
        const p1 = segment.p1;
        const p2 = segment.p2;
        if ((p1.y > py && p2.y > py) || (p1.y < py && p2.y < py) || (Math.max(p1.x, p2.x) < px)) {
            continue;
        }
        if (((p1.y <= py && p2.y > py) || (p2.y <= py && p1.y > py))) {
            const vt = (py - p1.y) / (p2.y - p1.y);
            const xIntersection = p1.x + vt * (p2.x - p1.x);
            if (xIntersection > px) {
                intersections++;
            }
        }
    }
    return intersections % 2 === 1;
};

export const analyzeShapes = (allStrokes) => {
    if (allStrokes.length === 0) {
        console.log("Canvas Masih Kosong");
        return;
    }
    const { points, adj } = buildGraph(allStrokes);
    if (points.length < 2) {
        console.log("Tidak Cukup Titik.");
        return;
    }

    const visited = new Set();
    const allShapes = [];

    for (let i = 0; i < points.length; i++) {
        if (!visited.has(i)) {
            const componentNodes = new Set();
            const stack = [i];
            visited.add(i);

            while (stack.length > 0) {
                const nodeIndex = stack.pop();
                componentNodes.add(nodeIndex);
                adj[nodeIndex].forEach(neighbor => {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor);
                        stack.push(neighbor);
                    }
                });
            }

            if (componentNodes.size > 0) {
                let endpointCount = 0;
                componentNodes.forEach(nodeIndex => {
                    if (adj[nodeIndex].size === 1) {
                        endpointCount++;
                    }
                });
                
                const isClosed = endpointCount === 0;
                allShapes.push({ nodes: Array.from(componentNodes), isClosed, endpointsCount: endpointCount });
            }
        }
    }

    const closedShapes = allShapes.filter(s => s.isClosed);
    const openShapes = allShapes.filter(s => !s.isClosed);

    const closedShapePolygons = closedShapes.map(shape => {
        const segments = [];
        shape.nodes.forEach(u => {
            adj[u].forEach(v => {
                if (u < v) {
                    segments.push({ p1: points[u], p2: points[v] });
                }
            });
        });
        return segments;
    });

    const shapesToAnalyze = openShapes.filter(openShape => {
        if (openShape.nodes.length === 0) return false;
        const testPoint = points[openShape.nodes[0]];
        const isInside = closedShapePolygons.some(polygon => isPointInsidePolygon(testPoint, polygon));
        return !isInside;
    });

    shapesToAnalyze.push(...closedShapes);

    let finalClosedCount = 0;
    
    shapesToAnalyze.forEach((shape, index) => {
        if (shape.isClosed) {
            finalClosedCount++;
            console.log(`Bentuk ${index + 1} Tertutup.`);
        } else {
            console.log(`Bentuk ${index + 1} Terbuka.`);
        }
    });

    if (shapesToAnalyze.length === 0 && allStrokes.length > 0) {
        console.log("Tidak ada bentuk yang dapat dianalisis (kemungkinan semua bentuk terbuka berada di dalam bentuk tertutup).");
    } else {
        console.log(`\nTotal: ${finalClosedCount} bentuk tertutup dari ${shapesToAnalyze.length} bentuk yang dianalisis.`);
    }
};

export const fixDrawing = (allStrokes, currentBrushSize, currentStrokeColor) => {
    if (allStrokes.length === 0) {
        return allStrokes;
    }

    const finalStrokes = [];
    allStrokes.forEach(s => finalStrokes.push(s));
    
    let fixApplied = false;

    const { points, adj } = buildGraph(allStrokes);
    if (points.length < 2) return allStrokes;

    const visited = new Set();
    const allComponents = [];

    for (let i = 0; i < points.length; i++) {
        if (visited.has(i)) continue;

        const componentNodes = new Set();
        const stack = [i];
        visited.add(i);
        while (stack.length > 0) {
            const node = stack.pop();
            componentNodes.add(node);
            adj[node].forEach(neighbor => {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    stack.push(neighbor);
                }
            });
        }

        const endpoints = [];
        componentNodes.forEach(nodeIndex => {
            if (adj[nodeIndex].size === 1) {
                endpoints.push(nodeIndex);
            }
        });

        allComponents.push({
            nodes: componentNodes,
            isClosed: endpoints.length === 0,
            endpoints: endpoints,
        });
    }

    const closedShapes = allComponents.filter(c => c.isClosed);
    const closedShapePolygons = closedShapes.map(shape => {
        const segments = [];
        shape.nodes.forEach(u => {
            adj[u].forEach(v => {
                if (u < v) segments.push({ p1: points[u], p2: points[v] });
            });
        });
        return segments;
    });

    allComponents.forEach(component => {
        let shouldFix = false;
        if (!component.isClosed && component.endpoints.length === 2) {
            const testPoint = points[component.endpoints[0]];
            const isInside = closedShapePolygons.some(polygon => isPointInsidePolygon(testPoint, polygon));
            if (!isInside) {
                shouldFix = true;
            }
        }
        
        if (shouldFix) {
            const [start, end] = component.endpoints;
            const newPath = subdivideLine(points[start], points[end]);
            
            finalStrokes.push({
                path: newPath,
                brushSize: currentBrushSize,
                color: currentStrokeColor
            });
            fixApplied = true;
        }
    });

    if (!fixApplied) {
        console.log("Tidak ada bentuk yang bisa diperbaiki.");
        return allStrokes;
    }

    console.log("Perbaikan diterapkan pada bentuk terbuka yang valid.");
    return finalStrokes;
    
};

export const calculateCentroid = (allStrokes) => {
    let totalX = 0;
    let totalY = 0;
    let pointCount = 0;
  
    if (!allStrokes || allStrokes.length === 0) {
      console.log("Tidak ada gambar untuk dianalisis.");
      return null;
    }
  
    allStrokes.forEach(stroke => {
      stroke.path.forEach(point => {
        totalX += point.x;
        totalY += point.y;
        pointCount++;
      });
    });
  
    if (pointCount === 0) {
      console.log("Gambar tidak memiliki titik.");
      return null;
    }
  
    return {
      x: totalX / pointCount,
      y: totalY / pointCount,
    };
  };