import { useCallback, useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { api, Branch, Commit, CommitDetail, Edge, Identity, StatusResult } from "./api";
import { BranchList } from "./components/BranchList";
import { StatusPanel } from "./components/StatusPanel";
import { DiffViewer } from "./components/DiffViewer";
import { CommitGraph } from "./components/CommitGraph";
import { CommitDetailsPanel } from "./components/CommitDetailsPanel";
import { ConflictModal } from "./components/ConflictModal";
import { ContextMenu, ContextMenuItem } from "./components/ContextMenu";
import { NewBranchDialog } from "./components/NewBranchDialog";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { ReconcileDialog } from "./components/ReconcileDialog";
import { CloneDialog } from "./components/CloneDialog";
import { CredentialDialog } from "./components/CredentialDialog";
import { RepoTabs } from "./components/RepoTabs";
import { TitleBar } from "./components/TitleBar";
import { ResizeBorders } from "./components/ResizeBorders";
import { basename, errorMessage } from "./utils";
import { IconFetch, IconUpdate, IconPull, IconPush } from "./components/Icons";

const RECENT_KEY = "git-lite-recent-repos";
function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // localStorage non disponibile: i progetti recenti semplicemente non persistono
  }
}

// Animazione di "pressione" innescata al mousedown (non su :active CSS): il click
// spesso passa il bottone a disabled prima ancora che il browser disegni il frame
// con :active attivo, quindi senza questo trigger esplicito l'animazione non si vede mai.
function pressEffect(e: React.MouseEvent<HTMLButtonElement>) {
  const el = e.currentTarget;
  el.classList.remove("pressed");
  void el.offsetWidth; // forza il reflow per poter ripartire da capo su click ravvicinati
  el.classList.add("pressed");
}
function clearPressEffect(e: React.AnimationEvent<HTMLButtonElement>) {
  e.currentTarget.classList.remove("pressed");
}
import "./App.css";

export default function App() {
  const [repos, setRepos] = useState<string[]>([]);
  const [activeRepo, setActiveRepo] = useState<string | null>(null);

  const [status, setStatus] = useState<StatusResult>({ branch: "", files: [] });
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [selected, setSelected] = useState<{ path: string; staged: boolean } | null>(null);
  const [diff, setDiff] = useState("");
  const [workspaceView, setWorkspaceView] = useState<"history" | "status">("history");
  // Di default il grafo mostra solo i branch locali + HEAD: con "tutti i
  // branch" attivo (spesso decine di remoti mai ripuliti) le corsie
  // aperte contemporaneamente esplodono e il grafo diventa illeggibile.
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [selectedCommitHash, setSelectedCommitHash] = useState<string | null>(null);
  // Distinto da selectedCommitHash: chiudere il pannello non deve far perdere
  // l'evidenziazione del commit nel grafo, solo nascondere il pannello stesso.
  const [commitDetailsOpen, setCommitDetailsOpen] = useState(false);
  const [commitDetail, setCommitDetail] = useState<CommitDetail | null>(null);
  const [commitFile, setCommitFile] = useState<string | null>(null);
  const [commitDiff, setCommitDiff] = useState("");
  const [message, setMessage] = useState<{
    text: string;
    kind: "success" | "error" | "loading";
  } | null>(null);
  const showError = (text: string) => setMessage({ text, kind: "error" });
  const showSuccess = (text: string) => setMessage({ text, kind: "success" });
  const showLoading = (text: string) => setMessage({ text, kind: "loading" });
  const [recentRepos, setRecentRepos] = useState<string[]>(loadRecent());
  const [showPushConfirm, setShowPushConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [branchWidth, setBranchWidth] = useState(200);
  const resizing = useRef(false);
  const [rightWidth, setRightWidth] = useState(420);
  const resizingRight = useRef(false);
  const rightDragStart = useRef({ x: 0, width: 420 });

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    branch: Branch;
  } | null>(null);
  const [newBranchFrom, setNewBranchFrom] = useState<string | null>(null);
  const [deleteBranchTarget, setDeleteBranchTarget] = useState<string | null>(null);
  const [forceDeleteBranchTarget, setForceDeleteBranchTarget] = useState<string | null>(null);
  const [upstreamPrompt, setUpstreamPrompt] = useState<{
    branch: string;
    kind: "pull" | "update";
  } | null>(null);
  const [divergedPrompt, setDivergedPrompt] = useState<{
    branch: string;
    kind: "pull" | "update";
  } | null>(null);
  const [forcePushTarget, setForcePushTarget] = useState<string | null>(null);
  const [discardTarget, setDiscardTarget] = useState<string | null>(null);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [credentialPrompt, setCredentialPrompt] = useState<{
    action: "push" | "pull";
    branch: string;
  } | null>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (resizing.current) {
        setBranchWidth(Math.min(480, Math.max(140, e.clientX)));
      }
      if (resizingRight.current) {
        // Il pannello è ancorato al bordo destro: trascinare la maniglia a
        // sinistra deve AUMENTARE la larghezza, quindi si sottrae il delta.
        const delta = e.clientX - rightDragStart.current.x;
        setRightWidth(Math.min(700, Math.max(280, rightDragStart.current.width - delta)));
      }
    }
    function onUp() {
      resizing.current = false;
      resizingRight.current = false;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    if (!message || message.kind === "loading") return;
    const timer = setTimeout(() => setMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [message]);

  const refresh = useCallback(async () => {
    if (!activeRepo) return;
    const errors: string[] = [];

    try {
      setStatus(await api.getStatus());
    } catch (e) {
      errors.push(errorMessage(e));
    }
    try {
      setBranches(await api.getBranches());
    } catch (e) {
      errors.push(errorMessage(e));
    }
    try {
      const log = await api.getLogGraph(300, showAllBranches);
      setCommits(log.commits);
      setEdges(log.edges);
    } catch (e) {
      errors.push(errorMessage(e));
      setCommits([]);
      setEdges([]);
    }
    try {
      setConflicts(await api.getConflicts());
    } catch (e) {
      errors.push(errorMessage(e));
    }

    if (errors.length > 0) {
      showError(errors.join("\n"));
    }
  }, [activeRepo, showAllBranches]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!activeRepo) {
      setIdentity(null);
      return;
    }
    api.getIdentity().then(setIdentity, () => setIdentity(null));
  }, [activeRepo]);

  // Rilegge lo stato periodicamente: se modifichi i file fuori dall'app
  // (IDE, terminale...) File Status si aggiorna da solo senza bisogno di
  // un'azione manuale. Salta il giro se è già in corso un'operazione, per
  // non sovrapporsi a un'azione dell'utente.
  const busyRef = useRef(busy);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);
  useEffect(() => {
    if (!activeRepo) return;
    const interval = setInterval(() => {
      if (!busyRef.current) refresh();
    }, 4000);
    return () => clearInterval(interval);
  }, [activeRepo, refresh]);

  useEffect(() => {
    if (!selected || !activeRepo) {
      setDiff("");
      return;
    }
    api.getDiff(selected.path, selected.staged).then(setDiff).catch((e) => setDiff(errorMessage(e)));
  }, [selected, activeRepo]);

  useEffect(() => {
    if (!selectedCommitHash || !activeRepo) {
      setCommitDetail(null);
      return;
    }
    setCommitDetail(null);
    api
      .getCommit(selectedCommitHash)
      .then(setCommitDetail)
      .catch((e) => showError(errorMessage(e)));
  }, [selectedCommitHash, activeRepo]);

  useEffect(() => {
    if (!selectedCommitHash || !commitFile) {
      setCommitDiff("");
      return;
    }
    api
      .getCommitFileDiff(selectedCommitHash, commitFile)
      .then(setCommitDiff)
      .catch((e) => setCommitDiff(errorMessage(e)));
  }, [selectedCommitHash, commitFile]);

  function selectCommit(hash: string) {
    setSelectedCommitHash(hash);
    setCommitFile(null);
    setCommitDetailsOpen(true);
  }

  function selectWorkspace(view: "history" | "status") {
    setWorkspaceView(view);
    if (view === "status") {
      setCommitDetailsOpen(false);
    }
  }

  async function switchToRepo(path: string) {
    // L'IPC verso Rust deve completarsi PRIMA di aggiornare activeRepo: se
    // aggiornassimo lo stato prima, l'effect di refresh() poteva scattare mentre
    // il backend aveva ancora la repo precedente come "corrente", restituendo
    // dati (branch/status) del repo sbagliato.
    setSelected(null);
    setSelectedCommitHash(null);
    setCommitDetailsOpen(false);
    setMessage(null);
    try {
      await api.openRepo(path);
      setActiveRepo(path);
      setRecentRepos((prev) => {
        const next = [path, ...prev.filter((p) => p !== path)].slice(0, 3);
        saveRecent(next);
        return next;
      });
    } catch (e) {
      showError(errorMessage(e));
    }
  }

  function removeRecent(path: string) {
    setRecentRepos((prev) => {
      const next = prev.filter((p) => p !== path);
      saveRecent(next);
      return next;
    });
  }

  async function pickRepo() {
    const dir = await open({ directory: true, multiple: false });
    if (typeof dir !== "string") return;
    setRepos((prev) => (prev.includes(dir) ? prev : [...prev, dir]));
    await switchToRepo(dir);
  }

  async function openRecent(path: string) {
    setRepos((prev) => (prev.includes(path) ? prev : [...prev, path]));
    await switchToRepo(path);
  }

  async function cloneRepo(url: string, destDir: string) {
    setBusy(true);
    try {
      const path = await api.cloneRepo(url, destDir);
      setRepos((prev) => (prev.includes(path) ? prev : [...prev, path]));
      await switchToRepo(path);
    } catch (e) {
      showError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function closeRepoTab(path: string) {
    const next = repos.filter((p) => p !== path);
    setRepos(next);
    if (path !== activeRepo) return;
    const fallback = next[0] ?? null;
    if (fallback) {
      switchToRepo(fallback);
    } else {
      setActiveRepo(null);
      setStatus({ branch: "", files: [] });
      setBranches([]);
      setCommits([]);
      setEdges([]);
      setConflicts([]);
      setSelectedCommitHash(null);
      setCommitDetailsOpen(false);
    }
  }

  async function withBusy(fn: () => Promise<void>, loadingLabel?: string, successLabel?: string) {
    setBusy(true);
    if (loadingLabel) showLoading(loadingLabel);
    try {
      await fn();
      await refresh();
      if (successLabel) showSuccess(successLabel);
    } catch (e) {
      showError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const doStage = (path: string) => withBusy(() => api.stageFile(path).then(() => {}));
  const doUnstage = (path: string) => withBusy(() => api.unstageFile(path).then(() => {}));
  const doStageAll = () => withBusy(() => api.stageAll());
  const doUnstageAll = () => withBusy(() => api.unstageAll());
  const doDiscardFile = (path: string) => withBusy(() => api.discardFile(path));
  const doCommit = (msg: string, pushAfter: boolean) =>
    withBusy(
      async () => {
        await api.commit(msg);
        setSelected(null);
        if (!pushAfter) return;
        try {
          await api.push();
        } catch (e) {
          const authMsg = errorMessage(e);
          if (isAuthError(authMsg)) {
            setCredentialPrompt({ action: "push", branch: status.branch });
          } else {
            throw e;
          }
        }
      },
      "Committing...",
      "Commit completato",
    );
  const doCheckout = (name: string) => withBusy(() => api.checkoutBranch(name));
  const doCreateBranchFrom = (name: string, startPoint: string) =>
    withBusy(() => api.createBranchFrom(name, startPoint));
  const doDeleteBranch = (name: string, force = false) =>
    withBusy(async () => {
      try {
        await api.deleteBranch(name, force);
      } catch (e) {
        const msg = errorMessage(e);
        if (!force && /not fully merged/i.test(msg)) {
          setForceDeleteBranchTarget(name);
          return;
        }
        throw e;
      }
    });

  function isAuthError(msg: string): boolean {
    return /terminal prompts disabled|could not read (Username|Password)|Authentication failed|403|fatal: Authentication|Permission denied \(publickey\)/i.test(
      msg,
    );
  }

  function isNoUpstreamError(msg: string): boolean {
    return /no tracking information for the current branch/i.test(msg);
  }

  function isDivergedError(msg: string): boolean {
    return /need to specify how to reconcile divergent branches/i.test(msg);
  }

  function isRejectedPushError(msg: string): boolean {
    return /\[rejected\]|failed to push some refs/i.test(msg);
  }

  function isPushNoUpstreamError(msg: string): boolean {
    return /has no upstream branch/i.test(msg);
  }

  async function runGitAction(
    fn: () => Promise<string>,
    onAuthFailure?: () => void,
    loadingLabel?: string,
    onNoUpstream?: () => void,
    onDiverged?: () => void,
    onRejected?: () => void,
    onPushNoUpstream?: () => void,
  ) {
    setBusy(true);
    if (loadingLabel) showLoading(loadingLabel);
    try {
      const out = await fn();
      showSuccess(out || "Operazione completata");
    } catch (e) {
      const msg = errorMessage(e);
      if (onAuthFailure && isAuthError(msg)) {
        onAuthFailure();
      } else if (onNoUpstream && isNoUpstreamError(msg)) {
        onNoUpstream();
      } else if (onDiverged && isDivergedError(msg)) {
        onDiverged();
      } else if (onPushNoUpstream && isPushNoUpstreamError(msg)) {
        onPushNoUpstream();
      } else if (onRejected && isRejectedPushError(msg)) {
        onRejected();
      } else {
        showError(msg);
      }
    } finally {
      setBusy(false);
      refresh();
    }
  }

  function doPushCurrent(setUpstream = false) {
    runGitAction(
      () => api.push(false, setUpstream),
      () => setCredentialPrompt({ action: "push", branch: status.branch }),
      "Pushing...",
      undefined,
      undefined,
      () => setForcePushTarget(status.branch),
      () => doPushCurrent(true),
    );
  }
  function confirmPush() {
    setShowPushConfirm(false);
    doPushCurrent();
  }
  const doPull = () =>
    runGitAction(
      () => api.pull(),
      () => setCredentialPrompt({ action: "pull", branch: status.branch }),
      "Pulling...",
      () => setUpstreamPrompt({ branch: status.branch, kind: "pull" }),
      () => setDivergedPrompt({ branch: status.branch, kind: "pull" }),
    );
  const doFetchAll = () => runGitAction(() => api.fetchAll(), undefined, "Fetching...");
  const doUpdate = () =>
    runGitAction(
      async () => {
        await api.fetchAll();
        return await api.pull();
      },
      () => setCredentialPrompt({ action: "pull", branch: status.branch }),
      "Updating...",
      () => setUpstreamPrompt({ branch: status.branch, kind: "update" }),
      () => setDivergedPrompt({ branch: status.branch, kind: "update" }),
    );
  const doPushBranch = (name: string) =>
    runGitAction(
      () => api.pushBranch(name),
      () => setCredentialPrompt({ action: "push", branch: name }),
      "Pushing...",
      undefined,
      undefined,
      () => setForcePushTarget(name),
    );
  const doPullBranch = (name: string) =>
    runGitAction(
      () => api.pullBranch(name),
      () => setCredentialPrompt({ action: "pull", branch: name }),
      "Pulling...",
    );
  const doMerge = (name: string) =>
    runGitAction(() => api.mergeBranch(name), undefined, "Merging...");
  const doUpdateBranch = (name: string) =>
    runGitAction(
      async () => {
        await api.fetchAll();
        return status.branch === name ? api.pull() : api.pullBranch(name);
      },
      () => setCredentialPrompt({ action: "pull", branch: name }),
      "Updating...",
    );

  function submitCredentials(username: string, password: string) {
    if (!credentialPrompt) return;
    const { action, branch } = credentialPrompt;
    setCredentialPrompt(null);
    runGitAction(() =>
      action === "push"
        ? api.pushWithCredentials(branch, username, password)
        : api.pullWithCredentials(branch, username, password),
    );
  }

  function openBranchContextMenu(branch: Branch, x: number, y: number) {
    setContextMenu({ x, y, branch });
  }

  function contextMenuItems(): ContextMenuItem[] {
    if (!contextMenu) return [];
    const b = contextMenu.branch;
    const mergeItem: ContextMenuItem = {
      label: `Merge "${b.name}" into "${status.branch}"`,
      disabled: b.name === status.branch,
      onSelect: () => doMerge(b.name),
    };
    if (b.is_remote) {
      return [
        { label: "Checkout", onSelect: () => doCheckout(b.name) },
        mergeItem,
        { label: "Fetch", onSelect: doFetchAll },
        { label: "Nuovo branch da qui", onSelect: () => setNewBranchFrom(b.name) },
      ];
    }
    return [
      { label: "Checkout", disabled: b.is_current, onSelect: () => doCheckout(b.name) },
      mergeItem,
      { label: "Update", onSelect: () => doUpdateBranch(b.name) },
      { label: "Pull", onSelect: () => doPullBranch(b.name) },
      { label: "Push", onSelect: () => doPushBranch(b.name) },
      { label: "Fetch", onSelect: doFetchAll },
      { label: "Nuovo branch da qui", onSelect: () => setNewBranchFrom(b.name) },
      {
        label: "Elimina branch",
        disabled: b.is_current,
        onSelect: () => setDeleteBranchTarget(b.name),
      },
    ];
  }

  if (repos.length === 0) {
    return (
      <div className="app">
        <TitleBar />
        <ResizeBorders />
        <div className="empty-state">
          <h1>Git-Lite</h1>
          <p>Apri o clona una repository per iniziare.</p>
          <div className="empty-state-actions">
            <button onClick={pickRepo}>Apri repository...</button>
            <button onClick={() => setShowCloneDialog(true)}>Clona repository...</button>
          </div>
          {recentRepos.length > 0 && (
            <ul className="recent-repos">
              {recentRepos.map((path) => (
                <li key={path} onClick={() => openRecent(path)} title={path}>
                  <span>{basename(path)}</span>
                  <span
                    className="recent-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecent(path);
                    }}
                  >
                    ×
                  </span>
                </li>
              ))}
            </ul>
          )}
          {message && <div className={"error " + message.kind}>{message.text}</div>}
          {showCloneDialog && (
            <CloneDialog
              onCancel={() => setShowCloneDialog(false)}
              onConfirm={(url, dest) => {
                setShowCloneDialog(false);
                cloneRepo(url, dest);
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <TitleBar />
      <ResizeBorders />
      <RepoTabs
        repos={repos}
        active={activeRepo}
        onSelect={switchToRepo}
        onClose={closeRepoTab}
        onAdd={pickRepo}
        onClone={() => setShowCloneDialog(true)}
      />
      <div className="topbar">
        <span className="repo-path" />
        <div className="toolbar-actions">
          <button
            className="toolbar-btn"
            onMouseDown={pressEffect}
            onAnimationEnd={clearPressEffect}
            onClick={doFetchAll}
            disabled={busy}
          >
            <IconFetch />
            Fetch
          </button>
          <button
            className="toolbar-btn"
            onMouseDown={pressEffect}
            onAnimationEnd={clearPressEffect}
            onClick={doUpdate}
            disabled={busy}
          >
            <IconUpdate />
            Update
          </button>
          <span className="toolbar-sep" />
          <button
            className="toolbar-btn"
            onMouseDown={pressEffect}
            onAnimationEnd={clearPressEffect}
            onClick={doPull}
            disabled={busy}
          >
            <IconPull />
            Pull
          </button>
          <button
            className="toolbar-btn"
            onMouseDown={pressEffect}
            onAnimationEnd={clearPressEffect}
            onClick={() => setShowPushConfirm(true)}
            disabled={busy}
          >
            <IconPush />
            Push
          </button>
        </div>
        <div className="topbar-right">
          {conflicts.length > 0 && (
            <button className="warning" onClick={() => setShowConflicts(true)}>
              Conflitti ({conflicts.length})
            </button>
          )}
        </div>
      </div>
      {message && (
        <div
          className={"message-bar " + message.kind}
          onClick={() => setMessage(null)}
        >
          {message.text}
        </div>
      )}
      <div className="columns">
        <BranchList
          branches={branches}
          width={branchWidth}
          onContextMenu={openBranchContextMenu}
          workspaceView={workspaceView}
          onSelectWorkspace={selectWorkspace}
        />
        <div
          className="resize-handle"
          onMouseDown={(e) => {
            e.preventDefault();
            resizing.current = true;
          }}
        />
        {workspaceView === "history" && commitDetailsOpen && selectedCommitHash && commitFile ? (
          <DiffViewer path={commitFile} diff={commitDiff} onClose={() => setCommitFile(null)} />
        ) : workspaceView === "history" ? (
          <CommitGraph
            commits={commits}
            edges={edges}
            selectedHash={selectedCommitHash}
            onSelectCommit={selectCommit}
            showAllBranches={showAllBranches}
            onToggleAllBranches={() => setShowAllBranches((v) => !v)}
          />
        ) : (
          <StatusPanel
            branch={status.branch}
            files={status.files}
            selected={selected}
            identity={identity}
            onSelect={(path, staged) => setSelected({ path, staged })}
            onStage={doStage}
            onUnstage={doUnstage}
            onStageAll={doStageAll}
            onUnstageAll={doUnstageAll}
            onDiscard={(path) => setDiscardTarget(path)}
            onCommit={doCommit}
            busy={busy}
          />
        )}
        {((workspaceView === "status" && selected) || (selectedCommitHash && commitDetailsOpen)) && (
          <>
            <div
              className="resize-handle"
              onMouseDown={(e) => {
                e.preventDefault();
                rightDragStart.current = { x: e.clientX, width: rightWidth };
                resizingRight.current = true;
              }}
            />
            <div className="right-column" style={{ width: rightWidth }}>
              {selectedCommitHash && commitDetailsOpen ? (
                <CommitDetailsPanel
                  detail={commitDetail}
                  selectedFile={commitFile}
                  onSelectFile={setCommitFile}
                  onClose={() => setCommitDetailsOpen(false)}
                />
              ) : (
                <DiffViewer
                  path={selected?.path ?? null}
                  diff={diff}
                  onClose={() => setSelected(null)}
                />
              )}
            </div>
          </>
        )}
      </div>
      {showConflicts && (
        <ConflictModal
          files={conflicts}
          onClose={() => setShowConflicts(false)}
          onResolved={() => {
            refresh();
          }}
        />
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
      {newBranchFrom && (
        <NewBranchDialog
          fromRef={newBranchFrom}
          onCancel={() => setNewBranchFrom(null)}
          onConfirm={(name) => {
            doCreateBranchFrom(name, newBranchFrom);
            setNewBranchFrom(null);
          }}
        />
      )}
      {deleteBranchTarget && (
        <ConfirmDialog
          title="Elimina branch"
          message={`Eliminare il branch locale "${deleteBranchTarget}"? Se ha commit non su altri branch, andranno persi.`}
          confirmLabel="Elimina"
          onCancel={() => setDeleteBranchTarget(null)}
          onConfirm={() => {
            doDeleteBranch(deleteBranchTarget);
            setDeleteBranchTarget(null);
          }}
        />
      )}
      {discardTarget && (
        <ConfirmDialog
          title="Annulla modifiche"
          message={`Annullare le modifiche a "${discardTarget}"? Se il file non è mai stato committato verrà eliminato dal disco. L'operazione non è reversibile.`}
          confirmLabel="Annulla modifiche"
          onCancel={() => setDiscardTarget(null)}
          onConfirm={() => {
            doDiscardFile(discardTarget);
            setDiscardTarget(null);
          }}
        />
      )}
      {forceDeleteBranchTarget && (
        <ConfirmDialog
          title="Branch non mergiato"
          message={`Il branch "${forceDeleteBranchTarget}" non è fully merged: contiene commit non presenti su altri branch. Forzare comunque la cancellazione? I commit non recuperabili andranno persi.`}
          confirmLabel="Forza eliminazione"
          onCancel={() => setForceDeleteBranchTarget(null)}
          onConfirm={() => {
            doDeleteBranch(forceDeleteBranchTarget, true);
            setForceDeleteBranchTarget(null);
          }}
        />
      )}
      {upstreamPrompt && (
        <ConfirmDialog
          title="Nessun branch remoto collegato"
          message={`Il branch "${upstreamPrompt.branch}" non ha un branch remoto associato. Vuoi impostarlo su "origin/${upstreamPrompt.branch}" e continuare?`}
          confirmLabel="Imposta e continua"
          onCancel={() => setUpstreamPrompt(null)}
          onConfirm={() => {
            const { branch, kind } = upstreamPrompt;
            setUpstreamPrompt(null);
            runGitAction(
              async () => {
                await api.setUpstream(branch);
                if (kind === "update") await api.fetchAll();
                return await api.pull();
              },
              undefined,
              kind === "update" ? "Updating..." : "Pulling...",
              undefined,
              () => setDivergedPrompt({ branch, kind }),
            );
          }}
        />
      )}
      {divergedPrompt && (
        <ReconcileDialog
          branch={divergedPrompt.branch}
          onCancel={() => setDivergedPrompt(null)}
          onChoose={(strategy) => {
            const { kind } = divergedPrompt;
            setDivergedPrompt(null);
            runGitAction(
              async () => {
                if (kind === "update") await api.fetchAll();
                return await api.pull(strategy);
              },
              undefined,
              kind === "update" ? "Updating..." : "Pulling...",
            );
          }}
        />
      )}
      {showPushConfirm && (
        <ConfirmDialog
          title="Push"
          message={`Inviare al remote i commit del branch "${status.branch}"?`}
          confirmLabel="Push"
          onCancel={() => setShowPushConfirm(false)}
          onConfirm={confirmPush}
        />
      )}
      {forcePushTarget && (
        <ConfirmDialog
          title="Push rifiutato: forzare?"
          message={`Il remote ha commit che il locale non ha (storie divergenti o slegate): un push normale del branch "${forcePushTarget}" viene rifiutato. Forzare il push sovrascrive la storia sul remote con quella locale, cancellando per sempre quello che c'era prima lì. Procedere solo se sei sicuro che il locale sia la versione da tenere.`}
          confirmLabel="Forza push"
          onCancel={() => setForcePushTarget(null)}
          onConfirm={() => {
            const branch = forcePushTarget;
            setForcePushTarget(null);
            runGitAction(
              () => (branch === status.branch ? api.push(true) : api.pushBranch(branch, true)),
              () => setCredentialPrompt({ action: "push", branch }),
              "Pushing (force)...",
            );
          }}
        />
      )}
      {showCloneDialog && (
        <CloneDialog
          onCancel={() => setShowCloneDialog(false)}
          onConfirm={(url, dest) => {
            setShowCloneDialog(false);
            cloneRepo(url, dest);
          }}
        />
      )}
      {credentialPrompt && (
        <CredentialDialog
          action={credentialPrompt.action}
          branch={credentialPrompt.branch}
          onCancel={() => setCredentialPrompt(null)}
          onConfirm={submitCredentials}
        />
      )}
    </div>
  );
}
