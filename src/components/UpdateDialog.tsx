import { useState } from "react";
import type { Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { errorMessage } from "../utils";

interface Props {
  update: Update;
  onClose: () => void;
}

type Phase = "prompt" | "downloading" | "ready" | "error";

export function UpdateDialog({ update, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("prompt");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  async function install() {
    setPhase("downloading");
    let total = 0;
    let downloaded = 0;
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          setProgress(total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : 0);
        } else if (event.event === "Finished") {
          setProgress(100);
        }
      });
      setPhase("ready");
    } catch (e) {
      setError(errorMessage(e));
      setPhase("error");
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal new-branch-dialog update-dialog">
        {phase === "prompt" && (
          <>
            <h2>Nuova versione disponibile</h2>
            <p>
              È disponibile Git-Lite {update.version} (versione installata: {update.currentVersion}).
            </p>
            {update.body && <p className="update-notes">{update.body}</p>}
            <div className="conflict-actions">
              <button className="warning" onClick={install}>
                Scarica e installa
              </button>
              <button className="secondary" onClick={onClose}>
                Più tardi
              </button>
            </div>
          </>
        )}
        {phase === "downloading" && (
          <>
            <h2>Download in corso...</h2>
            <div className="update-progress-track">
              <div className="update-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="update-notes">{progress}%</p>
          </>
        )}
        {phase === "ready" && (
          <>
            <h2>Aggiornamento pronto</h2>
            <p>Riavvia Git-Lite per completare l'installazione.</p>
            <div className="conflict-actions">
              <button className="warning" onClick={() => relaunch()}>
                Riavvia ora
              </button>
              <button className="secondary" onClick={onClose}>
                Più tardi
              </button>
            </div>
          </>
        )}
        {phase === "error" && (
          <>
            <h2>Aggiornamento fallito</h2>
            <p className="update-notes">{error}</p>
            <div className="conflict-actions">
              <button className="secondary" onClick={onClose}>
                Chiudi
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
