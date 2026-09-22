import { basename } from "../utils";
import { IconClone } from "./Icons";

interface Props {
  repos: string[];
  active: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
  onAdd: () => void;
  onClone: () => void;
}

export function RepoTabs({ repos, active, onSelect, onClose, onAdd, onClone }: Props) {
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
      <div className="repo-tab-add" onClick={onAdd} title="Apri repository">
        +
      </div>
      <div className="repo-tab-add" onClick={onClone} title="Clona repository">
        <IconClone />
      </div>
    </div>
  );
}
