import { getCurrentWindow } from "@tauri-apps/api/window";
import { IconMinimize, IconMaximize, IconClose } from "./Icons";
import appIcon from "../assets/app-icon.png";

const appWindow = getCurrentWindow();

export function TitleBar() {
  return (
    <div className="titlebar" data-tauri-drag-region>
      <span className="titlebar-spacer" data-tauri-drag-region>
        <img className="titlebar-icon" src={appIcon} alt="" />
      </span>
      <span className="titlebar-title" data-tauri-drag-region>
        Git-Lite
      </span>
      <div className="titlebar-controls">
        <button
          className="titlebar-btn"
          onClick={() => appWindow.minimize()}
          aria-label="Minimizza"
        >
          <IconMinimize />
        </button>
        <button
          className="titlebar-btn"
          onClick={() => appWindow.toggleMaximize()}
          aria-label="Massimizza"
        >
          <IconMaximize />
        </button>
        <button
          className="titlebar-btn titlebar-close"
          onClick={() => appWindow.close()}
          aria-label="Chiudi"
        >
          <IconClose />
        </button>
      </div>
    </div>
  );
}
