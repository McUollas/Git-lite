import { useEffect, useState } from "react";
import { api } from "../api";
import { errorMessage } from "../utils";

interface Props {
  files: string[];
  onClose: () => void;
  onResolved: () => void;
}

export function ConflictModal({ files, onClose, onResolved }: Props) {
  const [current, setCurrent] = useState(files[0] ?? "");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!current) return;
    api
      .readFile(current)
      .then(setContent)
      .catch((e) => setError(errorMessage(e)));
  }, [current]);

  async function markResolved() {
    try {
      await api.resolveConflict(current, content);
      onResolved();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal conflict-modal">
        <h2>Risoluzione conflitti</h2>
        <div className="conflict-body">
          <ul className="conflict-file-list">
            {files.map((f) => (
              <li
                key={f}
                className={f === current ? "selected" : ""}
                onClick={() => setCurrent(f)}
              >
                {f}
              </li>
            ))}
          </ul>
          <div className="conflict-editor">
            <p className="hint">
              Modifica il file rimuovendo i marker{" "}
              <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code>,{" "}
              <code>=======</code> e <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code>,
              lasciando solo il contenuto corretto.
            </p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.currentTarget.value)}
              spellCheck={false}
            />
            {error && <div className="error">{error}</div>}
            <div className="conflict-actions">
              <button onClick={markResolved}>Segna come risolto</button>
              <button onClick={onClose} className="secondary">
                Chiudi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
