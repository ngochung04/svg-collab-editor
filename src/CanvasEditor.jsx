import React, { useState } from "react";
import { Stage, Layer, Circle, Shape, Group } from "react-konva";
import { useYjsSync } from "./hooks/useYjsSync";

const THRESHOLD = 10;
const SAMPLE_POINTS = 20;

const CanvasEditor = () => {
  const [vertices, setVertices] = useYjsSync("data-sync", "vertices", [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
    { x: 300, y: 300 },
    { x: 100, y: 300 },
  ]);
  
  const [controlPoints, setControlPoints] = useState(
    new Array(vertices.length).fill(null)
  );
  const [selected, setSelected] = useState({
    vertexIndex: null,
    edgeIndex: null,
    controlPointIndex: null,
    isShapeSelected: false,
  });
  const [dragStartPos, setDragStartPos] = useState(null);

  const distanceToLine = (p, start, end) => {
    const A = p.x - start.x;
    const B = p.y - start.y;
    const C = end.x - start.x;
    const D = end.y - start.y;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    const param = lenSq !== 0 ? Math.max(0, Math.min(1, dot / lenSq)) : 0;
    const projX = start.x + param * C;
    const projY = start.y + param * D;
    return Math.hypot(p.x - projX, p.y - projY);
  };

  const getCurveSamples = (start, cp, end) => {
    return Array.from({ length: SAMPLE_POINTS + 1 }, (_, i) => {
      const t = i / SAMPLE_POINTS;
      return {
        x: (1 - t) ** 2 * start.x + 2 * (1 - t) * t * cp.x + t ** 2 * end.x,
        y: (1 - t) ** 2 * start.y + 2 * (1 - t) * t * cp.y + t ** 2 * end.y,
      };
    });
  };

  const isPointInsidePolygon = (point) => {
    return vertices.reduce((inside, curr, i, arr) => {
      const prev = arr[i - 1] || arr[arr.length - 1];
      const intersect =
        curr.y > point.y !== prev.y > point.y &&
        point.x <
          ((prev.x - curr.x) * (point.y - curr.y)) / (prev.y - curr.y) + curr.x;
      return intersect ? !inside : inside;
    }, false);
  };

  const handleStageClick = (e) => {
    if (e.target.getClassName() === "Circle") return;

    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    const clickPos = { x: pointerPos.x, y: pointerPos.y };

    if (!e.evt.shiftKey && isPointInsidePolygon(clickPos)) {
      setSelected({
        vertexIndex: null,
        edgeIndex: null,
        controlPointIndex: null,
        isShapeSelected: true,
      });
      return;
    }

    if (e.evt.shiftKey) {
      for (let i = 0; i < vertices.length; i++) {
        const curr = vertices[i];
        const next = vertices[(i + 1) % vertices.length];
        const minDist = controlPoints[i]
          ? Math.min(
              ...getCurveSamples(curr, controlPoints[i], next).map((pt) =>
                Math.hypot(clickPos.x - pt.x, clickPos.y - pt.y)
              )
            )
          : distanceToLine(clickPos, curr, next);

        if (minDist < THRESHOLD) {
          setSelected({
            vertexIndex: null,
            edgeIndex: i,
            controlPointIndex: i,
            isShapeSelected: false,
          });
          if (!controlPoints[i]) {
            const newControlPoints = [...controlPoints];
            newControlPoints[i] = { x: clickPos.x, y: clickPos.y };
            setControlPoints(newControlPoints);
          }
          return;
        }
      }
    }

    for (let i = 0; i < vertices.length; i++) {
      if (
        Math.hypot(clickPos.x - vertices[i].x, clickPos.y - vertices[i].y) <
        THRESHOLD
      ) {
        setSelected({
          vertexIndex: i,
          edgeIndex: null,
          controlPointIndex: null,
          isShapeSelected: false,
        });
        return;
      }
    }

    setSelected({
      vertexIndex: null,
      edgeIndex: null,
      controlPointIndex: null,
      isShapeSelected: false,
    });
  };

  const drawShape = (ctx) => {
    if (!vertices.length) return;

    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);

    vertices.forEach((v, i) => {
      const next = vertices[(i + 1) % vertices.length];
      controlPoints[i]
        ? ctx.quadraticCurveTo(
            controlPoints[i].x,
            controlPoints[i].y,
            next.x,
            next.y
          )
        : ctx.lineTo(next.x, next.y);
    });

    ctx.closePath();
    ctx.strokeStyle = selected.isShapeSelected ? "blue" : "black";
    ctx.lineWidth = selected.isShapeSelected ? 4 : 2;
    ctx.setLineDash(selected.isShapeSelected ? [10, 5] : []);
    if (selected.isShapeSelected) {
      ctx.fillStyle = "rgba(0, 0, 255, 0.1)";
      ctx.fill();
    }
    ctx.stroke();
  };

  const throttle = (func, limit) => {
    let lastFunc, lastRan;
    return function (...args) {
      const context = this;
      if (!lastRan) {
        func.apply(context, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(() => {
          if (Date.now() - lastRan >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  };

  const handleShapeDragMove = throttle((e) => {
    if (!selected.isShapeSelected || !dragStartPos) return;

    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    const dx = pointerPos.x - dragStartPos.x;
    const dy = pointerPos.y - dragStartPos.y;

    setVertices(vertices.map((v) => ({ x: v.x + dx, y: v.y + dy })));
    setControlPoints(
      controlPoints.map((cp) => (cp ? { x: cp.x + dx, y: cp.y + dy } : null))
    );

    e.target.position({ x: 0, y: 0 });
    setDragStartPos(pointerPos);
  }, 16);

  return (
    <>
      <button
        style={{ position: "absolute", top: 10, left: 10, zIndex: 1 }}
        onClick={() =>
          setVertices([
            { x: 100, y: 100 },
            { x: 300, y: 100 },
            { x: 300, y: 300 },
            { x: 100, y: 300 },
          ])
        }
      >
        Reset Vertex
      </button>
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleStageClick}
        style={{ background: "#f0f0f0" }}
      >
        <Layer>
          <Group
            draggable={selected.isShapeSelected}
            onDragMove={handleShapeDragMove}
          >
            <Shape
              sceneFunc={(ctx, shape) => {
                drawShape(ctx);
                ctx.fillStrokeShape(shape);
              }}
            />
          </Group>
          {vertices.map((v, i) => (
            <Circle
              key={`vertex-${i}`}
              x={v.x}
              y={v.y}
              radius={8}
              fill={selected.vertexIndex === i ? "red" : "white"}
              stroke="black"
              draggable
              onDragMove={(e) =>
                setVertices(
                  vertices.map((vert, idx) =>
                    idx === i ? e.target.position() : vert
                  )
                )
              }
            />
          ))}
          {controlPoints.map((cp, i) =>
            cp ? (
              <Circle
                key={`control-${i}`}
                x={cp.x}
                y={cp.y}
                radius={6}
                fill={selected.controlPointIndex === i ? "blue" : "lightblue"}
                stroke="black"
                draggable
                onDragMove={(e) =>
                  setControlPoints(
                    controlPoints.map((point, idx) =>
                      idx === i ? e.target.position() : point
                    )
                  )
                }
              />
            ) : null
          )}
        </Layer>
      </Stage>
    </>
  );
};

export default CanvasEditor;
