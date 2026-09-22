import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";

interface Props {
  onConfirm: (url: string, destDir: string) => void;
  onCancel: () => void;
}

export function CloneDialog({ onConfirm, onCancel }: Props) {
  const [url, setUrl] = useState("");
  const [destDir, setDestDir] = useState("");

  async function pickDestDir() {
    const dir = await open({ directory: true, multiple: false });
    if (typeof dir === "string") setDestDir(dir);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !destDir) return;
    onConfirm(url.trim(), destDir);
  }

  return (
    <div className="modal-overlay">
      <form className="modal new-branch-dialog" onSubmit={submit}>
        <h2>Clona repository</h2>
        <input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.currentTarget.value)}
          placeholder="URL (https://... o git@...)"
        />
        <div className="clone-dest-row">
          <input value={destDir} readOnly placeholder="Cartella di destinazione..." />
          <button type="button" onClick={pickDestDir}>
            Scegli...
          </button>
        </div>
        <div className="conflict-actions">
          <button type="submit" disabled={!url.trim() || !destDir}>
            Clona
          </button>
          <button type="button" className="secondary" onClick={onCancel}>
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
