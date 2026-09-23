import { useState } from "react";
import { Branch } from "../api";
import { IconWorkspace, IconBranch, IconFolder, IconChevron } from "./Icons";
import { SearchInput } from "./SearchInput";

interface Props {
  branches: Branch[];
  width: number;
  onContextMenu: (branch: Branch, x: number, y: number) => void;
  workspaceView: "history" | "status";
  onSelectWorkspace: (view: "history" | "status") => void;
}

interface BranchNode {
  name: string;
  path: string;
  children: Map<string, BranchNode>;
  branch?: Branch;
}

function buildBranchTree(list: Branch[]): BranchNode {
  const root: BranchNode = { name: "", path: "", children: new Map() };
  for (const b of list) {
    const parts = b.name.split("/");
    let node = root;
    let acc = "";
    parts.forEach((part, i) => {
      acc = acc ? `${acc}/${part}` : part;
      const isLeaf = i === parts.length - 1;
      if (!node.children.has(part)) {
        node.children.set(part, {
          name: part,
          path: acc,
          children: new Map(),
          branch: isLeaf ? b : undefined,
        });
      }
      node = node.children.get(part)!;
    });
  }
  return root;
}

const INDENT_BASE = 12;
const INDENT_STEP = 28;

function branchTrack(b: Branch) {
  if (!b.ahead && !b.behind) return null;
  return (
    <span className="branch-track">
      {b.ahead > 0 && (
        <span className="track-ahead">
          <span className="track-arrow">↑</span>
          {b.ahead}
        </span>
      )}
      {b.behind > 0 && (
        <span className="track-behind">
          <span className="track-arrow">↓</span>
          {b.behind}
        </span>
      )}
    </span>
  );
}

function sortedBranchEntries(node: BranchNode): BranchNode[] {
  return [...node.children.values()].sort((a, b) => {
    const aFolder = !a.branch;
    const bFolder = !b.branch;
    if (aFolder !== bFolder) return aFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

interface RemoteGroup {
  remote: string;
  branches: { branch: Branch; label: string }[];
}

function buildRemoteGroups(list: Branch[]): RemoteGroup[] {
  const groups = new Map<string, RemoteGroup>();
  for (const b of list) {
    const slash = b.name.indexOf("/");
    const remote = slash === -1 ? b.name : b.name.slice(0, slash);
    const label = slash === -1 ? b.name : b.name.slice(slash + 1);
    if (!groups.has(remote)) groups.set(remote, { remote, branches: [] });
    groups.get(remote)!.branches.push({ branch: b, label });
  }
  for (const g of groups.values()) {
    g.branches.sort((a, b) => a.label.localeCompare(b.label));
  }
  return [...groups.values()].sort((a, b) => a.remote.localeCompare(b.remote));
}

function BranchTree({
  node,
  depth,
  keyPrefix,
  closedGroups,
  onToggle,
  onContextMenu,
}: {
  node: BranchNode;
  depth: number;
  keyPrefix: string;
  closedGroups: Set<string>;
  onToggle: (key: string) => void;
  onContextMenu: (e: React.MouseEvent, branch: Branch) => void;
}) {
  return (
    <>
      {sortedBranchEntries(node).map((n) => {
        const key = keyPrefix + n.path;
        if (n.branch) {
          const b = n.branch;
          return (
            <li
              key={key}
              className={b.is_current ? "current" : ""}
              style={{ paddingLeft: INDENT_BASE + depth * INDENT_STEP }}
              onContextMenu={(e) => onContextMenu(e, b)}
            >
              <span className="branch-name">
                {b.is_current ? "● " : ""}
                {n.name}
              </span>
              {branchTrack(b)}
            </li>
          );
        }
        const isClosed = closedGroups.has(key);
        return (
          <div key={key}>
            <div
              className="branch-subgroup-label"
              style={{ paddingLeft: INDENT_BASE + depth * INDENT_STEP }}
              onClick={() => onToggle(key)}
            >
              <span className="chevron">
                <IconChevron open={!isClosed} />
              </span>
              <IconFolder size={12} />
              {n.name}
            </div>
            {!isClosed && (
              <BranchTree
                node={n}
                depth={depth + 1}
                keyPrefix={keyPrefix}
                closedGroups={closedGroups}
                onToggle={onToggle}
                onContextMenu={onContextMenu}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

export function BranchList({
  branches,
  width,
  onContextMenu,
  workspaceView,
  onSelectWorkspace,
}: Props) {
  const [filter, setFilter] = useState("");
  const [localsOpen, setLocalsOpen] = useState(true);
  const [remotesOpen, setRemotesOpen] = useState(true);
  const [closedGroups, setClosedGroups] = useState<Set<string>>(new Set());

  function toggleGroup(key: string) {
    setClosedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const searching = filter.trim() !== "";
  const matches = (name: string) =>
    !searching || name.toLowerCase().includes(filter.toLowerCase());

  const locals = branches.filter((b) => !b.is_remote && matches(b.name));
  const remotes = branches.filter((b) => b.is_remote && matches(b.name));

  function handleContextMenu(e: React.MouseEvent, branch: Branch) {
    e.preventDefault();
    onContextMenu(branch, e.clientX, e.clientY);
  }

  return (
    <div className="panel branch-panel" style={{ width }}>
      <h2 className="branch-title workspace-title">
        <IconWorkspace />
        Workspace
      </h2>
      <ul className="workspace-list">
        <li
          className={workspaceView === "status" ? "active" : ""}
          onClick={() => onSelectWorkspace("status")}
        >
          File Status
        </li>
        <li
          className={workspaceView === "history" ? "active" : ""}
          onClick={() => onSelectWorkspace("history")}
        >
          History
        </li>
      </ul>

      <h2 className="branch-title">
        <IconBranch />
        Branches
      </h2>
      <SearchInput
        className="branch-search"
        value={filter}
        onChange={setFilter}
        placeholder="Cerca branch..."
      />

      <div className="branch-group-label" onClick={() => setLocalsOpen((v) => !v)}>
        <span className="chevron">
          <IconChevron open={localsOpen} />
        </span>
        Locali
      </div>
      {localsOpen && (
        <ul className="branch-list">
          <BranchTree
            node={buildBranchTree(locals)}
            depth={0}
            keyPrefix="local:"
            closedGroups={closedGroups}
            onToggle={toggleGroup}
            onContextMenu={handleContextMenu}
          />
        </ul>
      )}

      <div className="branch-group-label" onClick={() => setRemotesOpen((v) => !v)}>
        <span className="chevron">
          <IconChevron open={remotesOpen} />
        </span>
        Remoti
      </div>
      {remotesOpen &&
        buildRemoteGroups(remotes).map((g) => {
          const key = "remote:" + g.remote;
          const isClosed = closedGroups.has(key);
          return (
            <div key={key}>
              <div
                className="branch-subgroup-label"
                style={{ paddingLeft: INDENT_BASE }}
                onClick={() => toggleGroup(key)}
              >
                <span className="chevron">
                  <IconChevron open={!isClosed} />
                </span>
                <IconFolder size={12} />
                {g.remote}
              </div>
              {!isClosed && (
                <ul className="branch-list nested">
                  {g.branches.map(({ branch: b, label }) => (
                    <li
                      key={b.name}
                      className={b.is_current ? "current" : ""}
                      style={{ paddingLeft: INDENT_BASE + INDENT_STEP }}
                      onContextMenu={(e) => handleContextMenu(e, b)}
                    >
                      <span className="branch-name">
                        {b.is_current ? "● " : ""}
                        {label}
                      </span>
                      {branchTrack(b)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
    </div>
  );
}
