import { basename } from "../utils";

interface Props {
  repos: string[];
  active: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
  onAdd: () => void;
}

export function RepoTabs({ repos, active, onSelect, onClose, onAdd }: Props) {
  return (
    <div className="repo-tabs">
      {repos.map((path) => (
        <div
          key={path}
          className={"repo-tab" + (path === active ? " active" : "")}
          onClick={() => onSelect(path)}
          title={path}
        >
          <span>{basename(path)}</span>
          <span
            className="close-tab"
            onClick={(e) => {
              e.stopPropagation();
              onClose(path);
            }}
          >
            ×
          </span>
        </div>
      ))}
      <div className="repo-tab-add" onClick={onAdd} title="Apri o clona repository">
        +
      </div>
    </div>
  );
}
