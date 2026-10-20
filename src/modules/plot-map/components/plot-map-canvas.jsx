"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { formatBDT, formatNumber } from "@/lib/format";
import { PLOT_STATUS } from "@/modules/project/constants";
import { bounds, clampPoint, clientToSvg, labelSize, rectPoints, toPointsAttr } from "../geometry";

const CLOSE_DISTANCE_PX = 10; // clicking this close to the first point closes a polygon

/**
 * Layout image with plot outlines (layout-pixel coordinates), zoom / pan / pinch.
 *
 * View mode: click a plot → onPlotClick(plot). Plots failing `isVisible` are dimmed.
 * Draw mode (`drawTool` = "rect" | "polygon"): draws an outline and calls onShapeDrawn(points).
 *
 * Ref: { zoomIn, zoomOut, fit, focusPlot(id) }
 */
const PlotMapCanvas = forwardRef(function PlotMapCanvas(
  {
    layout,
    plots,
    isVisible = () => true,
    selectedId,
    onPlotClick,
    drawTool,
    onShapeDrawn,
    showLabels = true,
    className,
  },
  ref,
) {
  const transform = useRef(null);
  const svg = useRef(null);
  const container = useRef(null);
  const [draft, setDraft] = useState(null); // rect: { start, end } | polygon: { points, cursor }
  const drawing = Boolean(drawTool);

  useImperativeHandle(ref, () => ({
    zoomIn: () => transform.current?.zoomIn(0.5),
    zoomOut: () => transform.current?.zoomOut(0.5),
    fit: () => transform.current?.fitToView({ mode: "contain" }),
    focusPlot: (id) => {
      const node = svg.current?.getElementById(`plot-${id}`);
      if (node) transform.current?.zoomToElement(node, 3, 400);
    },
  }));

  // Refit when the map area changes size (editor panel opens, sidebar collapses, phone rotates)
  useEffect(() => {
    const node = container.current;
    if (!node) return undefined;
    let last = node.getBoundingClientRect();
    let timer;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (Math.abs(width - last.width) < 2 && Math.abs(height - last.height) < 2) return;
      last = { width, height };
      clearTimeout(timer);
      timer = setTimeout(() => transform.current?.fitToView({ mode: "contain" }), 120);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  // A new tool or a different plot starts a fresh drawing
  useEffect(() => {
    setDraft(null);
  }, [drawTool, selectedId]);

  const toPoint = useCallback(
    (event) =>
      clampPoint(
        clientToSvg(svg.current, event.clientX, event.clientY),
        layout.width,
        layout.height,
      ),
    [layout.width, layout.height],
  );

  const finishPolygon = useCallback(
    (points) => {
      if (points.length >= 3) onShapeDrawn(points);
      setDraft(null);
    },
    [onShapeDrawn],
  );

  // Keyboard: Enter closes the polygon, Backspace removes the last point, Escape cancels
  useEffect(() => {
    if (!drawing) return undefined;
    const onKey = (event) => {
      if (event.target.closest?.("input, textarea, [contenteditable]")) return;
      if (event.key === "Escape") setDraft(null);
      if (drawTool === "polygon" && draft?.points) {
        if (event.key === "Enter") finishPolygon(draft.points);
        if (event.key === "Backspace") {
          event.preventDefault();
          setDraft((d) => (d.points.length > 1 ? { ...d, points: d.points.slice(0, -1) } : null));
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawing, drawTool, draft, finishPolygon]);

  const onPointerDown = (event) => {
    if (!drawing || event.button !== 0) return;
    const point = toPoint(event);
    if (drawTool === "rect") {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDraft({ start: point, end: point });
      return;
    }
    // polygon: close when clicking near the first point
    if (draft?.points?.length >= 3) {
      const [fx, fy] = draft.points[0];
      const scale = transform.current?.instance?.transformState?.scale ?? 1;
      const distance = Math.hypot(point[0] - fx, point[1] - fy) * scale;
      if (distance <= CLOSE_DISTANCE_PX) {
        finishPolygon(draft.points);
        return;
      }
    }
    setDraft((d) => ({ points: [...(d?.points ?? []), point], cursor: point }));
  };

  const onPointerMove = (event) => {
    if (!drawing || !draft) return;
    const point = toPoint(event);
    setDraft((d) => (drawTool === "rect" ? { ...d, end: point } : { ...d, cursor: point }));
  };

  const onPointerUp = () => {
    if (drawTool !== "rect" || !draft?.start) return;
    const points = rectPoints(draft.start, draft.end);
    const { width, height } = bounds(points);
    setDraft(null);
    if (width >= 3 && height >= 3) onShapeDrawn(points); // ignore accidental clicks
  };

  const preview =
    drawTool === "rect" && draft?.start
      ? rectPoints(draft.start, draft.end)
      : drawTool === "polygon" && draft?.points
        ? [...draft.points, draft.cursor]
        : null;

  return (
    <div ref={container} className={`${className ?? ""} relative touch-none select-none`}>
      <TransformWrapper
        ref={transform}
        fitOnInit="contain"
        minScale={0.1}
        maxScale={12}
        limitToBounds={false}
        doubleClick={{ disabled: true }}
        wheel={{ step: 0.12 }}
        panning={{ disabled: drawing, velocityDisabled: true }}
      >
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
          <svg
            ref={svg}
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            className={drawing ? "cursor-crosshair touch-none select-none" : "select-none"}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            role="img"
            aria-label="Plot map"
          >
            <image href={layout.url} width={layout.width} height={layout.height} />

            {plots.map((plot) => {
              if (!plot.mapShape) return null;
              const points = plot.mapShape.points;
              const visible = isVisible(plot);
              const selected = plot.id === selectedId;
              const { color, label } = PLOT_STATUS[plot.status];
              return (
                <g
                  key={plot.id}
                  className={drawing ? "pointer-events-none" : "cursor-pointer"}
                  onClick={() => !drawing && onPlotClick?.(plot)}
                >
                  <polygon
                    id={`plot-${plot.id}`}
                    points={toPointsAttr(points)}
                    fill={color}
                    fillOpacity={visible ? (selected ? 0.75 : 0.5) : 0.08}
                    stroke={selected ? "#111827" : color}
                    strokeOpacity={visible ? 1 : 0.25}
                    strokeWidth={selected ? 3 : 1.5}
                    vectorEffect="non-scaling-stroke"
                    className={visible && !drawing ? "hover:[fill-opacity:0.8]" : undefined}
                  >
                    <title>
                      {`${plot.code} · ${label} · ${formatNumber(plot.areaSqft)} sqft · ${formatBDT(plot.price)}`}
                    </title>
                  </polygon>
                  {showLabels && plot.mapLabel && visible && (
                    <text
                      x={plot.mapLabel.x}
                      y={plot.mapLabel.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={labelSize(points)}
                      fontWeight={600}
                      fill="#111827"
                      stroke="#ffffff"
                      strokeWidth={3}
                      paintOrder="stroke"
                      className="pointer-events-none"
                    >
                      {plot.plotNumber}
                    </text>
                  )}
                </g>
              );
            })}

            {preview && (
              <g className="pointer-events-none">
                <polygon
                  points={toPointsAttr(preview)}
                  fill="#2563eb"
                  fillOpacity={0.2}
                  stroke="#2563eb"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  vectorEffect="non-scaling-stroke"
                />
                {drawTool === "polygon" &&
                  draft.points.map(([x, y], i) => (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r={i === 0 ? 5 : 3.5}
                      fill={i === 0 ? "#ffffff" : "#2563eb"}
                      stroke="#2563eb"
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
              </g>
            )}
          </svg>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
});

export default PlotMapCanvas;
