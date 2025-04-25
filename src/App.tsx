import React, { useRef } from "react";
import "./App.css";
import CanvasEditor from "./CanvasEditor.jsx";
import { useRemoteCursor } from "./hooks/useRemoteCursor";
import SvgEditor from "./CustomPatternEditor";

function App() {
  const containerRef = useRef(null);
  useRemoteCursor({
    isShowName: true,
  });

  return (
    <div
      className="app"
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* <CanvasEditor /> */}
      <SvgEditor />
    </div>
  );
}

export default App;
