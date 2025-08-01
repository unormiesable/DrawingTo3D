import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { buildGraph } from "./connectivity";
import { SimplifyModifier } from "three/examples/jsm/modifiers/SimplifyModifier.js";

function downloadFile(data, filename, type) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 0);
}

export async function generateAndDownloadGLB(
  allStrokes,
  maxThickness = 15.0,
  minThickness = 2.0,
  simplify = false,
  simplifyRatio = 0.75
) {
  if (!allStrokes || allStrokes.length === 0) {
    alert("Tidak ada gambar untuk dikonversi.");
    return;
  }

  const { points, adj } = buildGraph(allStrokes);
  if (points.length < 3) {
    alert("Tidak ditemukan bentuk tertutup yang valid.");
    return;
  }

  let largestClosedShapeIndices = [];
  const visited = new Set();
  for (let i = 0; i < points.length; i++) {
    if (visited.has(i)) continue;
    const componentPointIndices = [];
    const stack = [i];
    visited.add(i);
    while (stack.length > 0) {
      const nodeIndex = stack.pop();
      componentPointIndices.push(nodeIndex);
      adj[nodeIndex].forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      });
    }
    const isClosed = componentPointIndices.every(
      (pIndex) => adj[pIndex].size >= 2
    );
    if (
      isClosed &&
      componentPointIndices.length > largestClosedShapeIndices.length
    ) {
      largestClosedShapeIndices = componentPointIndices;
    }
  }

  if (largestClosedShapeIndices.length < 3) {
    alert("Tidak ditemukan bentuk tertutup yang valid.");
    return;
  }

  const orderedPoints = [];
  const shapeIndicesSet = new Set(largestClosedShapeIndices);
  const visitedForOrder = new Set();
  let currentIdx = largestClosedShapeIndices[0];
  while (orderedPoints.length < largestClosedShapeIndices.length) {
    orderedPoints.push(points[currentIdx]);
    visitedForOrder.add(currentIdx);
    let nextIdx = -1;
    for (const neighbor of adj[currentIdx]) {
      if (shapeIndicesSet.has(neighbor) && !visitedForOrder.has(neighbor)) {
        nextIdx = neighbor;
        break;
      }
    }
    if (nextIdx === -1) break;
    currentIdx = nextIdx;
  }

  if (orderedPoints.length < 3) {
    alert("Bentuk tertutup tidak dapat di-render.");
    return;
  }

  const shape = new THREE.Shape(
    orderedPoints.map((p) => new THREE.Vector2(p.x, -p.y))
  );
  const outlinePoints = shape.getPoints();
  const trianglesIndices = THREE.ShapeUtils.triangulateShape(outlinePoints, []);

  if (!trianglesIndices || trianglesIndices.length === 0) {
    alert("Gagal melakukan triangulasi pada bentuk.");
    return;
  }

  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const indices = [];
  const numOutlinePoints = outlinePoints.length;

  let maxDistance = 0;
  for (const p of outlinePoints) {
    const dist = Math.sqrt(p.x * p.x + p.y * p.y);
    if (dist > maxDistance) {
      maxDistance = dist;
    }
  }

  // THICCC
  const thicknessRange = maxThickness - minThickness;

  for (let i = 0; i < numOutlinePoints; i++) {
    const p = outlinePoints[i];
    const dist = Math.sqrt(p.x * p.x + p.y * p.y);

    const normalizedDistance = maxDistance === 0 ? 0 : dist / maxDistance;

    const currentThickness = minThickness + (thicknessRange * (1 - normalizedDistance));
    const currentHalfThickness = currentThickness / 2.0;

    positions.push(p.x, p.y, currentHalfThickness);
  }

  for (let i = 0; i < numOutlinePoints; i++) {
    const p = outlinePoints[i];
    const dist = Math.sqrt(p.x * p.x + p.y * p.y);
    const normalizedDistance = maxDistance === 0 ? 0 : dist / maxDistance;
    const currentThickness = minThickness + (thicknessRange * (1 - normalizedDistance));
    const currentHalfThickness = currentThickness / 2.0;

    positions.push(p.x, p.y, -currentHalfThickness);
  }

  trianglesIndices.forEach((tri) => {
    indices.push(tri[0], tri[1], tri[2]);
  });

  trianglesIndices.forEach((tri) => {
    indices.push(
      tri[0] + numOutlinePoints,
      tri[2] + numOutlinePoints,
      tri[1] + numOutlinePoints
    );
  });

  for (let i = 0; i < numOutlinePoints; i++) {
    const next_i = (i + 1) % numOutlinePoints;
    const top_i = i;
    const bottom_i = i + numOutlinePoints;
    const top_next_i = next_i;
    const bottom_next_i = next_i + numOutlinePoints;

    indices.push(top_i, bottom_i, top_next_i);
    indices.push(bottom_i, bottom_next_i, top_next_i);
  }

  geometry.setIndex(indices);
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );

  geometry.computeBoundingBox();
  const boundingBox = geometry.boundingBox;
  const center = new THREE.Vector3();
  boundingBox.getCenter(center);
  geometry.translate(-center.x, -center.y, -center.z);

  geometry.computeVertexNormals();

  if (simplify) {
    const modifier = new SimplifyModifier();
    const numFaces = geometry.index.count / 3;
    const numFacesToKeep = Math.floor(numFaces * (1 - simplifyRatio));
    geometry = modifier.modify(geometry, numFacesToKeep);
    geometry.computeVertexNormals();
  }

  const material = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    side: THREE.DoubleSide,
    metalness: 0.2,
    roughness: 0.5,
  });
  const mesh = new THREE.Mesh(geometry, material);

  const scaleFactor = 0.01;
  mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);

  new GLTFExporter().parse(
    mesh,
    (glb) => downloadFile(glb, "model-3d.glb", "application/octet-stream"),
    (error) => console.error("Gagal mengekspor GLB:", error),
    { binary: true }
  );
}