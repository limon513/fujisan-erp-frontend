/** Geometry helpers for shapes in layout-image pixel space. */

export const toPointsAttr = (points) => points.map(([x, y]) => `${x},${y}`).join(" ");

export function bounds(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { minX, minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

/** Rectangle from two corner points → 4 polygon points (clockwise). */
export function rectPoints([x1, y1], [x2, y2]) {
  const [left, right] = [Math.min(x1, x2), Math.max(x1, x2)];
  const [top, bottom] = [Math.min(y1, y2), Math.max(y1, y2)];
  return [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
  ];
}

/** Clamp a point into the image. */
export const clampPoint = ([x, y], width, height) => [
  Math.min(Math.max(x, 0), width),
  Math.min(Math.max(y, 0), height),
];

/** Screen (client) coordinates → SVG user units, honouring CSS zoom/pan transforms. */
export function clientToSvg(svg, clientX, clientY) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const matrix = svg.getScreenCTM();
  if (!matrix) return [clientX, clientY];
  const { x, y } = point.matrixTransform(matrix.inverse());
  return [x, y];
}

/** Font size for a plot label that fits inside its shape. */
export const labelSize = (points) => {
  const { width, height } = bounds(points);
  return Math.max(6, Math.min(28, Math.min(width, height) * 0.32));
};
