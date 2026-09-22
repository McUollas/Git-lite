import { invoke } from "@tauri-apps/api/core";

export interface FileStatus {
  path: string;
  index: string;
  worktree: string;
}

export interface StatusResult {
  branch: string;
  files: FileStatus[];
}

export interface Branch {
  name: string;
  is_current: boolean;
  is_remote: boolean;
  ahead: number;
  behind: number;
}

export interface Commit {
  hash: string;
  parents: string[];
  refs: string[];
  subject: string;
  author: string;
  date: string;
  lane: number;
  color: number;
}

export interface Edge {
  from_row: number;
  from_lane: number;
  to_row: number;
  to_lane: number;
}

export interface LogGraph {
  commits: Commit[];
  edges: Edge[];
}

export interface CommitFile {
  path: string;
  status: string;
}

export interface CommitDetail {
  hash: string;
  author: string;
  email: string;
  date: string;
  subject: string;
  branches: string[];
  files: CommitFile[];
}

export interface Identity {
  name: string;
  email: string;
}

export const api = {
  openRepo: (path: string) => invoke<string>("open_repo", { path }),
  getStatus: () => invoke<StatusResult>("get_status"),
  getConflicts: () => invoke<string[]>("get_conflicts"),
  stageFile: (path: string) => invoke<void>("stage_file", { path }),
  unstageFile: (path: string) => invoke<void>("unstage_file", { path }),
  stageAll: () => invoke<void>("stage_all"),
  unstageAll: () => invoke<void>("unstage_all"),
  discardFile: (path: string) => invoke<void>("discard_file", { path }),
  commit: (message: string) => invoke<void>("commit", { message }),
  getIdentity: () => invoke<Identity>("get_identity"),
  getBranches: () => invoke<Branch[]>("get_branches"),
  checkoutBranch: (name: string) => invoke<void>("checkout_branch", { name }),
  createBranch: (name: string) => invoke<void>("create_branch", { name }),
  createBranchFrom: (name: string, startPoint: string) =>
    invoke<void>("create_branch_from", { name, startPoint }),
  push: (force = false) => invoke<string>("push", { force }),
  pull: (strategy?: "merge" | "rebase" | "ff-only") => invoke<string>("pull", { strategy }),
  fetchAll: () => invoke<string>("fetch_all"),
  setUpstream: (branch: string) => invoke<string>("set_upstream", { branch }),
  pushBranch: (name: string) => invoke<string>("push_branch", { name }),
  pullBranch: (name: string) => invoke<string>("pull_branch", { name }),
  deleteBranch: (name: string, force = false) =>
    invoke<string>("delete_branch", { name, force }),
  mergeBranch: (name: string) => invoke<string>("merge_branch", { name }),
  pushWithCredentials: (branch: string, username: string, password: string) =>
    invoke<string>("push_with_credentials", { branch, username, password }),
  pullWithCredentials: (branch: string, username: string, password: string) =>
    invoke<string>("pull_with_credentials", { branch, username, password }),
  cloneRepo: (url: string, destDir: string) =>
    invoke<string>("clone_repo", { url, destDir }),
  getDiff: (path: string, staged: boolean) =>
    invoke<string>("get_diff", { path, staged }),
  getLogGraph: (limit: number, allBranches: boolean) =>
    invoke<LogGraph>("get_log_graph", { limit, allBranches }),
  readFile: (path: string) => invoke<string>("read_file", { path }),
  resolveConflict: (path: string, content: string) =>
    invoke<void>("resolve_conflict", { path, content }),
  getCommit: (hash: string) => invoke<CommitDetail>("get_commit", { hash }),
  searchCommits: (query: string) => invoke<Commit[]>("search_commits", { query }),
  getCommitFileDiff: (hash: string, path: string) =>
    invoke<string>("get_commit_file_diff", { hash, path }),
};

export function statusLabel(f: FileStatus): string {
  if (f.index === "?" && f.worktree === "?") return "Nuovo";
  if (f.index === "U" || f.worktree === "U") return "Conflitto";
  if (f.worktree === "D" || f.index === "D") return "Eliminato";
  if (f.index === "A") return "Aggiunto";
  return "Modificato";
}
