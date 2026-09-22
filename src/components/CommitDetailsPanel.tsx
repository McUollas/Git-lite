import { useEffect, useRef, useState } from "react";
import { CommitDetail, CommitFile } from "../api";
import { IconFolder } from "./Icons";

interface Props {
  detail: CommitDetail | null;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  onClose: () => void;
}

interface TreeNode {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  file?: CommitFile;
}

function buildTree(files: CommitFile[]): TreeNode {
  const root: TreeNode = { name: "", path: "", children: new Map() };
  for (const f of files) {
    const parts = f.path.split("/");
    let node = root;
    let acc = "";
    parts.forEach((part, i) => {
      acc = acc ? `${acc}/${part}` : part;
      const isFile = i === parts.length - 1;
      if (!node.children.has(part)) {
        node.children.set(part, {
          name: part,
          path: acc,
          children: new Map(),
          file: isFile ? f : undefined,
        });
      }
      node = node.children.get(part)!;
    });
  }
  return root;
}

function sortedEntries(node: TreeNode): TreeNode[] {
  return [...node.children.values()].sort((a, b) => {
    const aFolder = !a.file;
    const bFolder = !b.file;
    if (aFolder !== bFolder) return aFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function countFiles(node: TreeNode): number {
  if (node.file) return 1;
  let n = 0;
  for (const c of node.children.values()) n += countFiles(c);
  return n;
}

// Percorsi intermedi con un solo sottoelemento (anch'esso una cartella) vengono
// compressi in un'unica riga "a/b/c", come fa IntelliJ per i package Java — ma
// la cartella che contiene DIRETTAMENTE un file resta sempre una riga a sé,
// non viene mai assorbita nel percorso compresso della riga sopra.
function collapseChain(node: TreeNode): { label: string; target: TreeNode } {
  let label = node.name;
  let current = node;
  while (!current.file) {
    const kids = [...current.children.values()];
    if (kids.length !== 1 || kids[0].file) break;
    const onlyChild = kids[0];
    const holdsFileDirectly = [...onlyChild.children.values()].some((k) => k.file);
    if (holdsFileDirectly) break;
    current = onlyChild;
    label += "/" + current.name;
  }
  return { label, target: current };
}

function FileTree({
  node,
  depth,
  selectedFile,
  onSelectFile,
}: {
  node: TreeNode;
  depth: number;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}) {
  return (
    <>
      {sortedEntries(node).map((n) => {
        if (n.file) {
          return (
            <div
              key={n.path}
              className={"tree-file" + (n.path === selectedFile ? " selected" : "")}
              style={{ paddingLeft: depth * 16 + 8 }}
              onClick={() => onSelectFile(n.path)}
            >
              <span className="tree-icon-slot">
                <span className="tree-file-icon" />
              </span>
              <span className="file-path">{n.name}</span>
            </div>
          );
        }
        const { label, target } = collapseChain(n);
        const fileCount = countFiles(target);
        return (
          <div key={n.path}>
            <div className="tree-folder" style={{ paddingLeft: depth * 16 + 8 }}>
              <span className="tree-icon-slot">
                <IconFolder />
              </span>
              <span className="folder-name">{label}</span>
              <span className="folder-count">
                {fileCount} file{fileCount === 1 ? "" : "s"}
              </span>
            </div>
            <FileTree
              node={target}
              depth={depth + 1}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
            />
          </div>
        );
      })}
    </>
  );
}

export function CommitDetailsPanel({ detail, selectedFile, onSelectFile, onClose }: Props) {
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [infoHeight, setInfoHeight] = useState(160);
  const resizingInfo = useRef(false);
  const dragStart = useRef({ y: 0, height: 160 });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!resizingInfo.current) return;
      // La maniglia sta sopra il box: trascinare verso l'alto deve
      // AUMENTARE l'altezza del box, quindi si sottrae il delta.
      const delta = e.clientY - dragStart.current.y;
      setInfoHeight(Math.min(420, Math.max(70, dragStart.current.height - delta)));
    }
    function onUp() {
      resizingInfo.current = false;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div className="panel status-panel commit-details">
      <div className="commit-details-header">
        <h2>Dettaglio commit</h2>
        <button className="close-btn" onClick={onClose} aria-label="Chiudi" title="Chiudi">
          ×
        </button>
      </div>
      {!detail ? (
        <p className="hint">Caricamento...</p>
      ) : (
        <>
          <div className="status-group-header">
            <span>File modificati ({detail.files.length})</span>
          </div>
          <div className="file-tree">
            <FileTree
              node={buildTree(detail.files)}
              depth={0}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
            />
          </div>

          <div
            className="v-resize-handle"
            onMouseDown={(e) => {
              e.preventDefault();
              dragStart.current = { y: e.clientY, height: infoHeight };
              resizingInfo.current = true;
            }}
          />
          <div className="commit-info-box" style={{ height: infoHeight }}>
            <div className="commit-subject">{detail.subject}</div>
            <div className="commit-meta-line">
              {detail.hash.slice(0, 7)} {detail.author} &lt;{detail.email}&gt; on {detail.date}
            </div>
            {detail.branches.length > 0 && (
              <div className="commit-branches">
                <div className="commit-branches-label">
                  In {detail.branches.length} branch
                  {detail.branches.length === 1 ? "" : "es"}:
                </div>
                <ul className="commit-branches-list">
                  {(showAllBranches ? detail.branches : detail.branches.slice(0, 4)).map(
                    (name) => <li key={name}>{name}</li>,
                  )}
                </ul>
                {!showAllBranches && detail.branches.length > 4 && (
                  <span className="show-all-link" onClick={() => setShowAllBranches(true)}>
                    Mostra tutti
                  </span>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
