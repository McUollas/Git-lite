import type { CSSProperties } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

const EDGES: { dir: string; style: CSSProperties }[] = [
  { dir: "North", style: { top: 0, left: 8, right: 8, height: 4, cursor: "ns-resize" } },
  { dir: "South", style: { bottom: 0, left: 8, right: 8, height: 4, cursor: "ns-resize" } },
  { dir: "West", style: { top: 8, bottom: 8, left: 0, width: 4, cursor: "ew-resize" } },
  { dir: "East", style: { top: 8, bottom: 8, right: 0, width: 4, cursor: "ew-resize" } },
  { dir: "NorthWest", style: { top: 0, left: 0, width: 8, height: 8, cursor: "nwse-resize" } },
  { dir: "NorthEast", style: { top: 0, right: 0, width: 8, height: 8, cursor: "nesw-resize" } },
  { dir: "SouthWest", style: { bottom: 0, left: 0, width: 8, height: 8, cursor: "nesw-resize" } },
  { dir: "SouthEast", style: { bottom: 0, right: 0, width: 8, height: 8, cursor: "nwse-resize" } },
];

export function ResizeBorders() {
  return (
    <>
      {EDGES.map(({ dir, style }) => (
        <div
          key={dir}
          className="resize-border"
          style={style}
          onMouseDown={(e) => {
            e.preventDefault();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            appWindow.startResizeDragging(dir as any);
          }}
        />
      ))}
    </>
  );
}
