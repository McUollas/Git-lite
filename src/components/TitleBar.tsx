import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getVersion } from "@tauri-apps/api/app";
import { IconMinimize, IconMaximize, IconClose } from "./Icons";
import appIcon from "../assets/app-icon.png";

const appWindow = getCurrentWindow();

interface Props {
  onCheckForUpdates: () => void;
  checkingUpdate: boolean;
}

export function TitleBar({ onCheckForUpdates, checkingUpdate }: Props) {
  const [version, setVersion] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getVersion().then(setVersion).catch(() => {});
  }, []);

  useEffect(() => {
    if (!showPopup) return;
    function onClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowPopup(false);
      }
    }
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [showPopup]);

  return (
    <div className="titlebar" data-tauri-drag-region>
      <span className="titlebar-spacer" data-tauri-drag-region>
        <img className="titlebar-icon" src={appIcon} alt="" />
      </span>
      <span className="titlebar-title-group">
        <span
          className="titlebar-title titlebar-title-clickable"
          onClick={() => setShowPopup((v) => !v)}
        >
          Git-Lite
        </span>
        {version && (
          <span className="titlebar-version" data-tauri-drag-region>
            v{version}
          </span>
        )}
        {showPopup && (
          <div className="titlebar-version-popup" ref={popupRef}>
            <div className="titlebar-version-popup-title">Git-Lite</div>
            <div className="titlebar-version-popup-version">
              Versione {version || "—"}
            </div>
            <button
              className="titlebar-version-popup-btn"
              disabled={checkingUpdate}
              onClick={() => {
                setShowPopup(false);
                onCheckForUpdates();
              }}
            >
              {checkingUpdate ? "Controllo..." : "Controlla aggiornamenti"}
            </button>
          </div>
        )}
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
