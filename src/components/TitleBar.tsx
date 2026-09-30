import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getVersion } from "@tauri-apps/api/app";
import { platform } from "@tauri-apps/plugin-os";
import { IconMinimize, IconMaximize, IconClose } from "./Icons";
import appIcon from "../assets/app-icon.png";

const appWindow = getCurrentWindow();

interface Props {
  onCheckForUpdates: () => void;
  checkingUpdate: boolean;
}

function MacTrafficLights() {
  return (
    <div className="mac-traffic-lights">
      <button
        className="mac-traffic-light mac-traffic-close"
        onClick={() => appWindow.close()}
        aria-label="Chiudi"
      >
        <svg viewBox="0 0 8 8">
          <path d="M1.5,1.5 L6.5,6.5 M6.5,1.5 L1.5,6.5" />
        </svg>
      </button>
      <button
        className="mac-traffic-light mac-traffic-minimize"
        onClick={() => appWindow.minimize()}
        aria-label="Minimizza"
      >
        <svg viewBox="0 0 8 8">
          <path d="M1.2,4 L6.8,4" />
        </svg>
      </button>
      <button
        className="mac-traffic-light mac-traffic-maximize"
        onClick={() => appWindow.toggleMaximize()}
        aria-label="Massimizza"
      >
        <svg viewBox="0 0 8 8">
          <path d="M1.3,4 L4.5,1 M1.3,1 L1.3,3 M1.3,1 L3.3,1" />
          <path d="M6.7,4 L3.5,7 M6.7,7 L6.7,5 M6.7,7 L4.7,7" />
        </svg>
      </button>
    </div>
  );
}

export function TitleBar({ onCheckForUpdates, checkingUpdate }: Props) {
  const [version, setVersion] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  // Ogni sistema operativo ha una convenzione diversa per i pulsanti finestra:
  // niente lo impone lato Tauri (decorations è false ovunque, la barra è
  // interamente disegnata da noi), quindi va replicata a mano in base alla
  // piattaforma rilevata a runtime.
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    getVersion().then(setVersion).catch(() => {});
    try {
      setIsMac(platform() === "macos");
    } catch {
      // fuori dal runtime Tauri (es. anteprima browser): resta sullo stile di default
    }
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
    <div className={"titlebar" + (isMac ? " titlebar-mac" : "")} data-tauri-drag-region>
      <span className="titlebar-spacer" data-tauri-drag-region>
        {isMac ? <MacTrafficLights /> : <img className="titlebar-icon" src={appIcon} alt="" />}
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
        {!isMac && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
