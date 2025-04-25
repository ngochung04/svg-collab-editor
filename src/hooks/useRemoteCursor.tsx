// all in one, optimize render cursor bằng cách sử dụng transform3d (sử dụng GPU) thay vì top, left
import React, { CSSProperties, useEffect, useRef, useState } from "react";
import { getCollaborativeProvider } from "./useYjsSync";
import { createRoot } from "react-dom/client";
import * as Y from "yjs";

export type RemoteCursor = {
  clientId: number;
  x: number;
  y: number;
  relativePosition?: Y.RelativePosition | any;
  color: string;
  name: string;
};

// Mã màu pastel ngẫu nhiên
const COLORS = [
  "#F87171",
  "#FBBF24",
  "#34D399",
  "#60A5FA",
  "#A78BFA",
  "#F472B6",
  "#FCD34D",
];

// Tạo tên người dùng và màu đại diện
function getUser() {
  const storedUser = localStorage.getItem("user");
  let name, color;

  if (storedUser) {
    const user = JSON.parse(storedUser);
    name = user.name;
    color = user.color;
  } else {
    const adjectives = [
      "Cool",
      "Fast",
      "Smart",
      "Brave",
      "Tiny",
      "Happy",
      "Blue",
    ];
    const animals = ["Tiger", "Fox", "Bear", "Otter", "Cat", "Wolf", "Eagle"];

    name =
      adjectives[Math.floor(Math.random() * adjectives.length)] +
      animals[Math.floor(Math.random() * animals.length)] +
      Math.floor(Math.random() * 1000); // ví dụ: SmartFox812

    color = COLORS[Math.floor(Math.random() * COLORS.length)];

    localStorage.setItem("user", JSON.stringify({ name, color }));
  }

  return { name, color };
}

const { awareness, doc } = getCollaborativeProvider("remote-cursor");

interface Props {
  ref?: React.RefObject<HTMLElement>;
  isShowName?: boolean;
}

export function useRemoteCursor(props: Props = {}) {
  const { ref, isShowName } = props;
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const containerRef = useRef(document.createElement("div"));
  const rootRef = useRef<ReturnType<typeof createRoot> | null>(null);
  const isInitializedRef = useRef<boolean>(false);

  const textRef = useRef<Y.Text | null>(null);

  useEffect(() => {
    if (!textRef.current) {
      textRef.current = doc.getText("collaborative-content");
    }
  }, []);

  const updateMyCursor = (
    x: number,
    y: number,
    selection?: { start: number; end: number } // chỉ cần khi làm việc với nhập văn bản
  ) => {
    const cursorData: any = { x, y, lastActive: Date.now() };

    if (selection && textRef.current) {
      try {
        const relativePosition = Y.createRelativePositionFromTypeIndex(
          textRef.current,
          selection.start
        );

        const serializedPosition = Y.encodeRelativePosition(relativePosition);

        cursorData.relativePosition = serializedPosition;
        cursorData.selection = selection;
      } catch (error) {
        console.error("Lỗi khi tạo vị trí tương đối:", error);
      }
    }

    awareness.setLocalStateField("cursor", cursorData);
    awareness.setLocalStateField("user", getUser());
  };

  const updateCursors = () => {
    const states = Array.from(awareness.getStates().entries());
    const cursors: RemoteCursor[] = states
      .map(([clientId, state]: any) => {
        if (state.cursor && state.user?.name !== getUser()?.name) {
          const cursor: RemoteCursor = {
            clientId,
            x: state.cursor.x,
            y: state.cursor.y,
            name: state.user?.name,
            color: state.user?.color,
          };

          if (state.cursor.relativePosition && textRef.current) {
            try {
              const relPos = Y.decodeRelativePosition(
                state.cursor.relativePosition
              );

              cursor.relativePosition = relPos;

              const absPos = Y.createAbsolutePositionFromRelativePosition(
                relPos,
                doc
              );

              if (absPos) {
                // cursor.absoluteIndex = absPos.index;
              }
            } catch (error) {
              console.error("Lỗi khi giải mã vị trí tương đối:", error);
            }
          }

          return cursor;
        }
        return null;
      })
      .filter(Boolean) as RemoteCursor[];

    setRemoteCursors(cursors);
  };

  const handleUpdateCursor = (event) => {
    updateMyCursor(event.clientX, event.clientY);
  };

  useEffect(() => {
    containerRef.current.id = "cursor-container";

    const target = ref?.current || document.body;
    target.appendChild(containerRef.current);

    if (!isInitializedRef.current) {
      rootRef.current = createRoot(containerRef.current);
      isInitializedRef.current = true;
    }

    awareness.on("change", updateCursors);
    updateCursors();
    window.addEventListener("mousemove", handleUpdateCursor);

    return () => {
      awareness.off("change", updateCursors);
      window.removeEventListener("mousemove", handleUpdateCursor);

      if (containerRef.current.parentNode) {
        containerRef.current.parentNode.removeChild(containerRef.current);
      }
    };
  }, [ref]);

  useEffect(() => {
    if (!rootRef.current) return;

    rootRef.current.render(
      <>
        {remoteCursors.map((data) => (
          <CursorItem key={data.clientId} data={data} isShowName={isShowName} />
        ))}
      </>
    );
  }, [remoteCursors, isShowName]);

  return {
    remoteCursors,
    updateMyCursor,
  };
}

interface CursorItem {
  data: RemoteCursor;
  isShowName?: boolean;
}

const CursorItem = ({ data, isShowName }: CursorItem) => {
  const cursorStyle: CSSProperties = {
    zIndex: 9999,
    position: "fixed",
    top: 0,
    left: 0,
    transform: `translate3d(${data.x}px, ${data.y}px, 0px)`,
    willChange: "transform",
    backfaceVisibility: "hidden",
    pointerEvents: "none",
  };

  const svgStyle: CSSProperties = {
    width: "24px",
    height: "24px",
    pointerEvents: "none",
    filter: `drop-shadow(0 0 3px ${data.color})`,
  };

  const nameStyle: CSSProperties = {
    background: data.color,
    position: "absolute",
    padding: "0px 4px",
    borderRadius: "4px",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "bold",
  };

  return (
    <div style={cursorStyle}>
      <svg
        fill={data.color}
        viewBox="3 3 24 24"
        xmlns="http://www.w3.org/2000/svg"
        style={svgStyle}
      >
        <path d="M3.039 4.277l3.904 13.563c.185 .837 .92 1.516 1.831 1.642l.17 .016a2.2 2.2 0 0 0 1.982 -1.006l.045 -.078l1.4 -2.072l4.05 4.05a2.067 2.067 0 0 0 2.924 0l1.047 -1.047c.388 -.388 .606 -.913 .606 -1.461l-.008 -.182a2.067 2.067 0 0 0 -.598 -1.28l-4.047 -4.048l2.103 -1.412c.726 -.385 1.18 -1.278 1.053 -2.189a2.2 2.2 0 0 0 -1.701 -1.845l-13.524 -3.89a1 1 0 0 0 -1.236 1.24z"></path>
      </svg>
      {isShowName && <div style={nameStyle}>{data.name}</div>}
    </div>
  );
};
