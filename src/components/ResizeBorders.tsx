import type { CSSProperties } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

// Bordi più larghi dei classici 4px: su compositor Wayland con scaling
// frazionario (comune su Hyprland, es. 1.25x/1.5x) un'area troppo sottile
// arrotonda a pochissimi pixel reali e diventa quasi impossibile da agganciare
// col mouse.
const EDGE = 6;
const CORNER = 12;

const EDGES: { dir: string; style: CSSProperties }[] = [
  { dir: "North", style: { top: 0, left: CORNER, right: CORNER, height: EDGE, cursor: "ns-resize" } },
  { dir: "South", style: { bottom: 0, left: CORNER, right: CORNER, height: EDGE, cursor: "ns-resize" } },
  { dir: "West", style: { top: CORNER, bottom: CORNER, left: 0, width: EDGE, cursor: "ew-resize" } },
  { dir: "East", style: { top: CORNER, bottom: CORNER, right: 0, width: EDGE, cursor: "ew-resize" } },
  { dir: "NorthWest", style: { top: 0, left: 0, width: CORNER, height: CORNER, cursor: "nwse-resize" } },
  { dir: "NorthEast", style: { top: 0, right: 0, width: CORNER, height: CORNER, cursor: "nesw-resize" } },
  { dir: "SouthWest", style: { bottom: 0, left: 0, width: CORNER, height: CORNER, cursor: "nesw-resize" } },
  { dir: "SouthEast", style: { bottom: 0, right: 0, width: CORNER, height: CORNER, cursor: "nwse-resize" } },
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
            // Solo tasto sinistro: su Hyprland il tasto destro + SUPER è già
            // la scorciatoia nativa del compositor per ridimensionare, non
            // deve competere con quella gestita qui.
            if (e.button !== 0) return;
            e.preventDefault();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            appWindow.startResizeDragging(dir as any);
          }}
        />
      ))}
    </>
  );
}
