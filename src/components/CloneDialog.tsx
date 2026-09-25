import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";

interface Props {
  onConfirm: (url: string, destDir: string, username?: string, password?: string) => void;
  onCancel: () => void;
}

export function CloneDialog({ onConfirm, onCancel }: Props) {
  const [url, setUrl] = useState("");
  const [destDir, setDestDir] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const isHttp = /^https?:\/\//i.test(url.trim());

  async function pickDestDir() {
    const dir = await open({ directory: true, multiple: false });
    if (typeof dir === "string") setDestDir(dir);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !destDir) return;
    onConfirm(
      url.trim(),
      destDir,
      isHttp ? username.trim() || undefined : undefined,
      isHttp ? password || undefined : undefined,
    );
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
        {isHttp && (
          <>
            <p className="hint">
              Repository privato? Inserisci le credenziali (username e password o
              token). Vengono salvate nel portachiavi di sistema, o comunque in modo
              da non doverle reinserire ad ogni operazione. Lascia vuoto per un
              repository pubblico.
            </p>
            <input
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
              placeholder="Username (opzionale)"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              placeholder="Password o token (opzionale)"
            />
          </>
        )}
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
