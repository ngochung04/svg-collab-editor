import React, { useEffect, useRef, useState } from "react";
// @ts-ignore
// import SvgCanvas from "@svgedit/svgcanvas";
import SvgCanvas from "./svgcanvas";
import { useYjsSync } from "./hooks/useYjsSync";

const width = document.documentElement.clientWidth;
const height = document.documentElement.clientHeight;
const hiddenTextTagId = "text";

const config = {
  initFill: { color: "FFFFFF", opacity: 1 },
  initStroke: { color: "000000", opacity: 1, width: 1 },
  text: { stroke_width: 0, font_size: 24, font_family: "serif" },
  initOpacity: 1,
  imgPath: "/src/editor/images",
  dimensions: [width, height],
  baseUnit: "px",
  // height: "100%",
  // width: "100%",
};

const CustomPatternEditor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [syncData, setSyncData] = useYjsSync(
    "custom-pattern-editor",
    "room-1",
    ""
  );
  const [syncSelectData, setSyncSelectData] = useYjsSync(
    "select-editor",
    "room-1",
    { select: false, array: [] as any[] }
  );

  // hàm so sánh những thay đổi từ svgString cũ và mới
  const svgDiffChange = (oldSvg: string, newSvg: string) => {};

  // nhận và update data từ client khác
  useEffect(() => {
    if (canvasRef.current && syncData) {
      // Cập nhật canvas với dữ liệu từ Yjs
      canvasRef.current.setSvgString(syncData);
    }
  }, [syncData]);

  // gửi data cho client khác
  useEffect(() => {
    const editor = canvasRef.current;
    if (editor) {
      const newData = editor.getSvgString();
      if (newData === syncData) return;

      setSyncData(newData);
    }
  }, [canvasRef.current?.getSvgString()]);

  const selectRef = useRef<any>([]);

  useEffect(() => {
    
  }, [syncSelectData]);

  useEffect(() => {
    const editor = canvasRef.current;
    if (
      editor &&
      (!!editor.getSelectedElements().length ||
        !!editor.getIntersectionList().length)
    ) {
      const newSelector =
        editor.selectorManager.selectors.map((item) => {
          return {
            groupId: item.selectorGroup.id,
            rectId: item.selectorRect.id,
          };
        }) || [];

      if (newSelector === selectRef.current) return;
      setSyncSelectData({ select: true, array: newSelector });
    } else {
      // selectRef.current
      // setSyncSelectData({ select: false, array: selectRef.current });
    }
  }, [
    canvasRef.current?.getSelectedElements(),
    canvasRef.current?.getIntersectionList(),
    canvasRef.current?.getJustSelected(),
  ]);

  useEffect(() => {
    if (containerRef.current && !canvasRef.current) {
      // Khởi tạo SvgCanvas
      canvasRef.current = new SvgCanvas(containerRef.current, config);
      canvasRef.current.updateCanvas(width, height);

      // Gán input ẩn cho text tool
      if (inputRef.current) {
        canvasRef.current.textActions.setInputElem(inputRef.current);

        // Lắng nghe sự kiện nhập text
        const handler = (evt: Event) => {
          canvasRef.current.setTextContent(
            (evt.currentTarget as HTMLInputElement).value
          );
        };
        inputRef.current.addEventListener("keyup", handler);
        inputRef.current.addEventListener("input", handler);

        // Cleanup
        return () => {
          inputRef.current?.removeEventListener("keyup", handler);
          inputRef.current?.removeEventListener("input", handler);
        };
      }
    }
  }, []);

  // Hàm fill màu cho các phần tử được chọn
  const fill = (colour: string) => {
    if (!canvasRef.current) return;
    canvasRef.current.getSelectedElements().forEach((el: any) => {
      el.setAttribute("fill", colour);
    });
  };

  // Hàm xử lý import SVG từ file
  const handleImportSVG = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const svgString = event.target?.result as string;
      if (svgString && canvasRef.current?.setSvgString) {
        canvasRef.current.setSvgString(svgString);
      } else {
        alert("Không thể import SVG: SvgCanvas không hỗ trợ setSvgString");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="svg-editor-root"
      style={{ height: "100vh", width: "100vw", padding: 0 }}
    >
      <div className="svg-toolbar">
        <button
          title="Chọn"
          onClick={() => canvasRef.current?.setMode("select")}
        >
          🔲
        </button>
        <button
          title="Vẽ hình tròn"
          onClick={() => canvasRef.current?.setMode("circle")}
        >
          ⚪
        </button>
        <button
          title="Vẽ hình chữ nhật"
          onClick={() => canvasRef.current?.setMode("rect")}
        >
          ▭
        </button>
        <button
          title="Thêm chữ"
          onClick={() => canvasRef.current?.setMode("text")}
        >
          🅣
        </button>
        <button title="Tô màu đỏ" onClick={() => fill("#ff0000")}>
          🎨
        </button>
        <button
          title="Xóa đối tượng"
          onClick={() => canvasRef.current?.deleteSelectedElements()}
        >
          🗑️
        </button>
        <button
          title="Xóa tất cả"
          onClick={() => {
            canvasRef.current?.clear();
            canvasRef.current?.updateCanvas(width, height);
          }}
        >
          🧹
        </button>
        <button
          title="Lấy SVG"
          onClick={() => alert(canvasRef.current?.getSvgString())}
        >
          ⬇️
        </button>
        <label className="import-label" title="Import SVG">
          <input
            type="file"
            accept=".svg"
            style={{ display: "none" }}
            onChange={handleImportSVG}
          />
          <span
            role="img"
            aria-label="Import SVG"
            style={{ cursor: "pointer" }}
          >
            📂
          </span>
        </label>
      </div>
      <div
        className="svg-canvas-container"
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          minHeight: 0,
          minWidth: 0,
          padding: 0,
          margin: 0,
        }}
      >
        <div
          ref={containerRef}
          id="svgcanvas-containerx"
          style={{
            width: width,
            height: height,
            pointerEvents: "auto",
          }}
        ></div>
      </div>
      {/* Input ẩn cho text tool */}
      <input
        id={hiddenTextTagId}
        ref={inputRef}
        style={{ width: 0, height: 0, opacity: 0 }}
        autoComplete="off"
      />
    </div>
  );
};

export default CustomPatternEditor;
