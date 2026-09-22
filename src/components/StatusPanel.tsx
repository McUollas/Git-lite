import { useState } from "react";
import { FileStatus, Identity, statusLabel } from "../api";

interface Props {
  branch: string;
  files: FileStatus[];
  selected: { path: string; staged: boolean } | null;
  identity: Identity | null;
  onSelect: (path: string, staged: boolean) => void;
  onStage: (path: string) => void;
  onUnstage: (path: string) => void;
  onStageAll: () => void;
  onUnstageAll: () => void;
  onDiscard: (path: string) => void;
  onCommit: (message: string, pushAfter: boolean) => void;
  busy: boolean;
}

export function StatusPanel({
  branch,
  files,
  selected,
  identity,
  onSelect,
  onStage,
  onUnstage,
  onStageAll,
  onUnstageAll,
  onDiscard,
  onCommit,
  busy,
}: Props) {
  const [message, setMessage] = useState("");
  const [pushAfter, setPushAfter] = useState(false);
  const staged = files.filter((f) => f.index !== " " && f.index !== "?");
  const unstaged = files.filter((f) => f.index === " " || f.index === "?");

  function isSelected(path: string, isStaged: boolean) {
    return selected?.path === path && selected?.staged === isStaged;
  }

  function submitCommit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    onCommit(message.trim(), pushAfter);
    setMessage("");
  }

  return (
    <div className="panel status-panel">
      <h2>{branch || "…"}</h2>

      <div className="status-box">
        <div className="status-box-header">
          <span>In stage ({staged.length})</span>
          <button onClick={onUnstageAll} disabled={staged.length === 0}>
            Unstage all
          </button>
        </div>
        <ul className="file-list">
          {staged.map((f) => (
            <li
              key={f.path}
              className={isSelected(f.path, true) ? "selected" : ""}
              onClick={() => onSelect(f.path, true)}
            >
              <span className="tag">{statusLabel(f)}</span>
              <span className="file-path">{f.path}</span>
              <button
                className="stage-btn discard-btn"
                title="Annulla modifiche"
                onClick={(e) => {
                  e.stopPropagation();
                  onDiscard(f.path);
                }}
              >
                ↺
              </button>
              <button
                className="stage-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnstage(f.path);
                }}
              >
                −
              </button>
            </li>
          ))}
          {staged.length === 0 && <li className="file-list-empty">Nessun file in stage</li>}
        </ul>
      </div>

      <div className="status-box">
        <div className="status-box-header">
          <span>Modifiche non in stage ({unstaged.length})</span>
          <button onClick={onStageAll} disabled={unstaged.length === 0}>
            Stage all
          </button>
        </div>
        <ul className="file-list">
          {unstaged.map((f) => (
            <li
              key={f.path}
              className={isSelected(f.path, false) ? "selected" : ""}
              onClick={() => onSelect(f.path, false)}
            >
              <span className="tag">{statusLabel(f)}</span>
              <span className="file-path">{f.path}</span>
              <button
                className="stage-btn discard-btn"
                title="Annulla modifiche"
                onClick={(e) => {
                  e.stopPropagation();
                  onDiscard(f.path);
                }}
              >
                ↺
              </button>
              <button
                className="stage-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onStage(f.path);
                }}
              >
                +
              </button>
            </li>
          ))}
          {unstaged.length === 0 && <li className="file-list-empty">Nessuna modifica</li>}
        </ul>
      </div>

      <form className="commit-box" onSubmit={submitCommit}>
        {identity?.name && (
          <div className="commit-identity">
            {identity.name}
            {identity.email && <span> &lt;{identity.email}&gt;</span>}
          </div>
        )}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
          placeholder="Messaggio di commit..."
          rows={3}
        />
        <label className="commit-push-check">
          <input
            type="checkbox"
            checked={pushAfter}
            onChange={(e) => setPushAfter(e.currentTarget.checked)}
          />
          Push le modifiche subito dopo il commit{branch ? ` su origin/${branch}` : ""}
        </label>
        <button type="submit" className="commit-submit-btn" disabled={busy || staged.length === 0}>
          Commit ({staged.length})
        </button>
      </form>
    </div>
  );
}
