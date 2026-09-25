import { basename } from "../utils";

interface Props {
  recentRepos: string[];
  onPick: () => void;
  onClone: () => void;
  onOpenRecent: (path: string) => void;
  onRemoveRecent: (path: string) => void;
  onCancel: () => void;
}

export function AddRepoDialog({
  recentRepos,
  onPick,
  onClone,
  onOpenRecent,
  onRemoveRecent,
  onCancel,
}: Props) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal new-branch-dialog add-repo-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Git-Lite</h2>
        <p className="hint">Apri o clona un repository per iniziare.</p>
        <div className="empty-state-actions">
          <button onClick={onPick}>Apri repository...</button>
          <button onClick={onClone}>Clona repository...</button>
        </div>
        {recentRepos.length > 0 && (
          <ul className="recent-repos">
            {recentRepos.map((path) => (
              <li key={path} onClick={() => onOpenRecent(path)} title={path}>
                <span>{basename(path)}</span>
                <span
                  className="recent-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveRecent(path);
                  }}
                >
                  ×
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="conflict-actions">
          <button className="secondary" onClick={onCancel}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
}
