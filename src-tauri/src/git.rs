use serde::Serialize;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use tauri::State;

pub struct RepoState(pub Mutex<Option<PathBuf>>);

fn run_git(repo: &PathBuf, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(repo)
        .args(args)
        // Senza queste due righe, se git ha bisogno di credenziali (SSH/HTTPS) tenta un
        // prompt interattivo che nella GUI non ha un terminale a cui scrivere: il processo
        // resta bloccato all'infinito invece di fallire con un errore visibile.
        .env("GIT_TERMINAL_PROMPT", "0")
        // Con un locale non inglese (es. it_IT) git traduce messaggi come
        // %(upstream:track) ("[ahead 2]" diventa "[dopo 2]"), rompendo il
        // parsing lato Rust: forziamo l'output in inglese in modo stabile.
        .env("LC_ALL", "C")
        .stdin(Stdio::null())
        .output()
        .map_err(|e| format!("Impossibile eseguire git: {e}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
    let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
    if output.status.success() {
        Ok(stdout)
    } else if !stderr.trim().is_empty() {
        Err(stderr)
    } else {
        Err(stdout)
    }
}

fn current_repo(state: &State<RepoState>) -> Result<PathBuf, String> {
    state
        .0
        .lock()
        .unwrap()
        .clone()
        .ok_or_else(|| "Nessuna repository aperta".to_string())
}

#[derive(Serialize, Clone)]
pub struct FileStatus {
    path: String,
    index: String,
    worktree: String,
}

#[derive(Serialize)]
pub struct StatusResult {
    branch: String,
    files: Vec<FileStatus>,
}

fn is_conflicted(f: &FileStatus) -> bool {
    matches!(
        (f.index.as_str(), f.worktree.as_str()),
        ("U", _) | (_, "U") | ("A", "A") | ("D", "D")
    )
}

fn status_inner(repo: &PathBuf) -> Result<StatusResult, String> {
    let out = run_git(repo, &["status", "--porcelain=v1", "--branch"])?;
    let mut lines = out.lines();
    let branch_line = lines.next().unwrap_or("## unknown");
    let branch = branch_line
        .trim_start_matches("## ")
        .split("...")
        .next()
        .unwrap_or("unknown")
        .to_string();

    let mut files = Vec::new();
    for line in lines {
        if line.len() < 4 {
            continue;
        }
        let index = line[0..1].to_string();
        let worktree = line[1..2].to_string();
        let path = line[3..].to_string();
        files.push(FileStatus {
            path,
            index,
            worktree,
        });
    }
    Ok(StatusResult { branch, files })
}

#[tauri::command(async)]
pub fn open_repo(path: String, state: State<RepoState>) -> Result<String, String> {
    let p = PathBuf::from(&path);
    if !p.join(".git").exists() {
        return Err("La cartella selezionata non è una repository git (manca .git)".to_string());
    }
    *state.0.lock().unwrap() = Some(p);
    Ok(path)
}

#[tauri::command(async)]
pub fn get_status(state: State<RepoState>) -> Result<StatusResult, String> {
    let repo = current_repo(&state)?;
    status_inner(&repo)
}

#[tauri::command(async)]
pub fn get_conflicts(state: State<RepoState>) -> Result<Vec<String>, String> {
    let repo = current_repo(&state)?;
    let status = status_inner(&repo)?;
    Ok(status
        .files
        .into_iter()
        .filter(|f| is_conflicted(f))
        .map(|f| f.path)
        .collect())
}

#[tauri::command(async)]
pub fn stage_file(path: String, state: State<RepoState>) -> Result<(), String> {
    let repo = current_repo(&state)?;
    run_git(&repo, &["add", "--", &path])?;
    Ok(())
}

#[tauri::command(async)]
pub fn unstage_file(path: String, state: State<RepoState>) -> Result<(), String> {
    let repo = current_repo(&state)?;
    run_git(&repo, &["restore", "--staged", "--", &path])?;
    Ok(())
}

#[tauri::command(async)]
pub fn stage_all(state: State<RepoState>) -> Result<(), String> {
    let repo = current_repo(&state)?;
    run_git(&repo, &["add", "-A"])?;
    Ok(())
}

#[tauri::command(async)]
pub fn unstage_all(state: State<RepoState>) -> Result<(), String> {
    let repo = current_repo(&state)?;
    run_git(&repo, &["restore", "--staged", "."])?;
    Ok(())
}

#[tauri::command(async)]
pub fn commit(message: String, state: State<RepoState>) -> Result<(), String> {
    let repo = current_repo(&state)?;
    if message.trim().is_empty() {
        return Err("Il messaggio di commit non può essere vuoto".to_string());
    }
    run_git(&repo, &["commit", "-m", &message])?;
    Ok(())
}

#[derive(Serialize)]
pub struct Identity {
    name: String,
    email: String,
}

#[tauri::command(async)]
pub fn get_identity(state: State<RepoState>) -> Result<Identity, String> {
    let repo = current_repo(&state)?;
    let name = run_git(&repo, &["config", "user.name"])
        .unwrap_or_default()
        .trim()
        .to_string();
    let email = run_git(&repo, &["config", "user.email"])
        .unwrap_or_default()
        .trim()
        .to_string();
    Ok(Identity { name, email })
}

#[derive(Serialize)]
pub struct Branch {
    name: String,
    is_current: bool,
    is_remote: bool,
    ahead: u32,
    behind: u32,
}

// Estrae i conteggi da un valore %(upstream:track) tipo "[ahead 2, behind 4]",
// "[behind 4]", "[gone]" o "" (nessun upstream).
fn parse_track(track: &str) -> (u32, u32) {
    fn count_after(track: &str, marker: &str) -> u32 {
        track
            .find(marker)
            .and_then(|idx| {
                track[idx + marker.len()..]
                    .chars()
                    .take_while(|c| c.is_ascii_digit())
                    .collect::<String>()
                    .parse()
                    .ok()
            })
            .unwrap_or(0)
    }
    (count_after(track, "ahead "), count_after(track, "behind "))
}

#[tauri::command(async)]
pub fn get_branches(state: State<RepoState>) -> Result<Vec<Branch>, String> {
    let repo = current_repo(&state)?;
    let out = run_git(
        &repo,
        &[
            "branch",
            "-a",
            "--format=%(HEAD)|%(refname:short)|%(refname)|%(upstream:track)",
        ],
    )?;
    let mut branches = Vec::new();
    for line in out.lines() {
        let mut parts = line.splitn(4, '|');
        let head = parts.next().unwrap_or("");
        let name = parts.next().unwrap_or("").to_string();
        let full_refname = parts.next().unwrap_or("");
        let track = parts.next().unwrap_or("");
        // refs/remotes/<remote>/HEAD è il puntatore al branch di default del
        // remote, non un branch vero: git lo abbrevia in "<remote>" (senza
        // "/HEAD"), che altrimenti verrebbe scambiato per un branch locale.
        if name.is_empty() || full_refname.ends_with("/HEAD") {
            continue;
        }
        let (ahead, behind) = parse_track(track);
        branches.push(Branch {
            is_current: head.trim() == "*",
            is_remote: name.starts_with("origin/"),
            name,
            ahead,
            behind,
        });
    }
    Ok(branches)
}

#[tauri::command(async)]
pub fn checkout_branch(name: String, state: State<RepoState>) -> Result<(), String> {
    let repo = current_repo(&state)?;
    if let Some(local) = name.strip_prefix("origin/") {
        if run_git(&repo, &["checkout", local]).is_err() {
            run_git(&repo, &["checkout", "-t", "-b", local, &name])?;
        }
    } else {
        run_git(&repo, &["checkout", &name])?;
    }
    Ok(())
}

#[tauri::command(async)]
pub fn create_branch(name: String, state: State<RepoState>) -> Result<(), String> {
    let repo = current_repo(&state)?;
    run_git(&repo, &["checkout", "-b", &name])?;
    Ok(())
}

#[tauri::command(async)]
pub fn create_branch_from(
    name: String,
    start_point: String,
    state: State<RepoState>,
) -> Result<(), String> {
    let repo = current_repo(&state)?;
    run_git(&repo, &["checkout", "-b", &name, &start_point])?;
    Ok(())
}

#[tauri::command(async)]
pub fn push_branch(name: String, state: State<RepoState>) -> Result<String, String> {
    let repo = current_repo(&state)?;
    run_git(&repo, &["push", "origin", &name])
}

#[tauri::command(async)]
pub fn delete_branch(name: String, force: bool, state: State<RepoState>) -> Result<String, String> {
    let repo = current_repo(&state)?;
    let flag = if force { "-D" } else { "-d" };
    run_git(&repo, &["branch", flag, &name])
}

#[tauri::command(async)]
pub fn merge_branch(name: String, state: State<RepoState>) -> Result<String, String> {
    let repo = current_repo(&state)?;
    run_git(&repo, &["merge", "--no-edit", &name])
}

fn percent_encode(s: &str) -> String {
    let mut out = String::new();
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'.' | b'_' | b'~' => {
                out.push(b as char)
            }
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

// Inserisce le credenziali nell'URL (https://user:pass@host/...) così git le usa per UNA
// sola invocazione, senza toccare la configurazione salvata del remote "origin".
fn inject_credentials(url: &str, username: &str, password: &str) -> String {
    match url.find("://") {
        Some(idx) => {
            let (scheme, rest) = url.split_at(idx + 3);
            format!(
                "{scheme}{}:{}@{rest}",
                percent_encode(username),
                percent_encode(password)
            )
        }
        None => url.to_string(),
    }
}

fn remote_url_for_credentials(repo: &PathBuf) -> Result<String, String> {
    let url = run_git(repo, &["remote", "get-url", "origin"])?
        .trim()
        .to_string();
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(
            "Le credenziali si possono inserire solo per remote HTTP/HTTPS. Questo remote usa SSH: serve una chiave SSH configurata (es. con ssh-agent).".to_string(),
        );
    }
    Ok(url)
}

#[tauri::command(async)]
pub fn push_with_credentials(
    branch: String,
    username: String,
    password: String,
    state: State<RepoState>,
) -> Result<String, String> {
    let repo = current_repo(&state)?;
    let url = remote_url_for_credentials(&repo)?;
    let authed = inject_credentials(&url, &username, &password);
    run_git(&repo, &["push", &authed, &branch])
}

#[tauri::command(async)]
pub fn pull_with_credentials(
    branch: String,
    username: String,
    password: String,
    state: State<RepoState>,
) -> Result<String, String> {
    let repo = current_repo(&state)?;
    let url = remote_url_for_credentials(&repo)?;
    let authed = inject_credentials(&url, &username, &password);
    run_git(&repo, &["pull", &authed, &branch])
}

#[tauri::command(async)]
pub fn clone_repo(url: String, dest_dir: String) -> Result<String, String> {
    let dest = PathBuf::from(&dest_dir);
    run_git(&dest, &["clone", &url])?;
    let name = url
        .trim_end_matches('/')
        .trim_end_matches(".git")
        .rsplit('/')
        .next()
        .unwrap_or("repository")
        .to_string();
    dest.join(&name)
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Percorso di destinazione non valido".to_string())
}

#[tauri::command(async)]
pub fn pull_branch(name: String, state: State<RepoState>) -> Result<String, String> {
    let repo = current_repo(&state)?;
    let status = status_inner(&repo)?;
    if status.branch == name {
        run_git(&repo, &["pull"])
    } else {
        run_git(
            &repo,
            &["fetch", "origin", &format!("{name}:{name}")],
        )
    }
}

#[tauri::command(async)]
pub fn push(state: State<RepoState>) -> Result<String, String> {
    let repo = current_repo(&state)?;
    run_git(&repo, &["push"])
}

#[tauri::command(async)]
pub fn pull(state: State<RepoState>) -> Result<String, String> {
    let repo = current_repo(&state)?;
    run_git(&repo, &["pull"])
}

#[tauri::command(async)]
pub fn fetch_all(state: State<RepoState>) -> Result<String, String> {
    let repo = current_repo(&state)?;
    run_git(&repo, &["fetch", "--all"])
}

#[tauri::command(async)]
pub fn get_diff(path: String, staged: bool, state: State<RepoState>) -> Result<String, String> {
    let repo = current_repo(&state)?;
    if staged {
        run_git(&repo, &["diff", "--cached", "--", &path])
    } else {
        run_git(&repo, &["diff", "--", &path])
    }
}

#[derive(Serialize)]
pub struct CommitFile {
    path: String,
    status: String,
}

#[derive(Serialize)]
pub struct CommitDetail {
    hash: String,
    author: String,
    email: String,
    date: String,
    subject: String,
    files: Vec<CommitFile>,
    branches: Vec<String>,
}

#[tauri::command(async)]
pub fn get_commit(hash: String, state: State<RepoState>) -> Result<CommitDetail, String> {
    let repo = current_repo(&state)?;
    let header = run_git(
        &repo,
        &[
            "show",
            "-s",
            "--pretty=format:%an|%ae|%ad|%s",
            "--date=format:%d/%m/%Y %H:%M",
            &hash,
        ],
    )?;
    let mut parts = header.splitn(4, '|');
    let author = parts.next().unwrap_or("").to_string();
    let email = parts.next().unwrap_or("").to_string();
    let date = parts.next().unwrap_or("").to_string();
    let subject = parts.next().unwrap_or("").to_string();

    let name_status = run_git(&repo, &["show", "--name-status", "--pretty=format:", &hash])?;
    let files = name_status
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|l| {
            let mut p = l.splitn(2, '\t');
            let status = p.next().unwrap_or("").to_string();
            let path = p.next().unwrap_or("").to_string();
            CommitFile { path, status }
        })
        .collect();

    let branches_out = run_git(
        &repo,
        &[
            "branch",
            "--all",
            "--contains",
            &hash,
            "--format=%(refname:short)",
        ],
    )
    .unwrap_or_default();
    let branches = branches_out
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty() && !l.ends_with("/HEAD"))
        .collect();

    Ok(CommitDetail {
        hash,
        author,
        email,
        date,
        subject,
        files,
        branches,
    })
}

#[tauri::command(async)]
pub fn get_commit_file_diff(
    hash: String,
    path: String,
    state: State<RepoState>,
) -> Result<String, String> {
    let repo = current_repo(&state)?;
    // Per i commit di merge, "git show" mostra solo i file che hanno avuto
    // conflitti: gli altri file modificati risultano senza diff (output vuoto,
    // nessun errore). Confrontando esplicitamente col primo genitore si ottiene
    // sempre il diff "verso il ramo principale", anche per i file non in conflitto.
    match run_git(&repo, &["diff", &format!("{hash}^"), &hash, "--", &path]) {
        Ok(out) => Ok(out),
        // Nessun genitore (primo commit della repo): fallback al comportamento normale.
        Err(_) => run_git(&repo, &["show", &hash, "--", &path]),
    }
}

#[tauri::command(async)]
pub fn read_file(path: String, state: State<RepoState>) -> Result<String, String> {
    let repo = current_repo(&state)?;
    std::fs::read_to_string(repo.join(&path)).map_err(|e| e.to_string())
}

#[tauri::command(async)]
pub fn resolve_conflict(
    path: String,
    content: String,
    state: State<RepoState>,
) -> Result<(), String> {
    let repo = current_repo(&state)?;
    std::fs::write(repo.join(&path), content).map_err(|e| e.to_string())?;
    run_git(&repo, &["add", "--", &path])?;
    Ok(())
}

#[derive(Serialize)]
pub struct Commit {
    hash: String,
    parents: Vec<String>,
    refs: Vec<String>,
    subject: String,
    author: String,
    date: String,
    lane: usize,
    color: usize,
}

#[derive(Serialize)]
pub struct Edge {
    from_row: usize,
    from_lane: usize,
    to_row: usize,
    to_lane: usize,
}

#[derive(Serialize)]
pub struct LogGraph {
    commits: Vec<Commit>,
    edges: Vec<Edge>,
}

#[tauri::command(async)]
fn parse_commit_lines(out: &str) -> Vec<Commit> {
    out.lines()
        .map(|line| {
            let mut parts = line.splitn(6, '|');
            let hash = parts.next().unwrap_or("").to_string();
            let parents = parts
                .next()
                .unwrap_or("")
                .split_whitespace()
                .map(|s| s.to_string())
                .collect();
            let refs = parts
                .next()
                .unwrap_or("")
                .split(", ")
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string())
                .collect();
            let subject = parts.next().unwrap_or("").to_string();
            let author = parts.next().unwrap_or("").to_string();
            let date = parts.next().unwrap_or("").to_string();
            Commit {
                hash,
                parents,
                refs,
                subject,
                author,
                date,
                lane: 0,
                color: 0,
            }
        })
        .collect()
}

#[tauri::command(async)]
pub fn search_commits(query: String, state: State<RepoState>) -> Result<Vec<Commit>, String> {
    let repo = current_repo(&state)?;
    let grep_arg = format!("--grep={query}");
    let out = run_git(
        &repo,
        &[
            "log",
            "--all",
            "--regexp-ignore-case",
            &grep_arg,
            "--max-count=200",
            "--pretty=format:%H|%P|%D|%s|%an|%ad",
            "--date=format:%d/%m/%Y %H:%M",
        ],
    )?;
    Ok(parse_commit_lines(&out))
}

#[tauri::command(async)]
pub fn get_log_graph(
    limit: usize,
    all_branches: bool,
    state: State<RepoState>,
) -> Result<LogGraph, String> {
    let repo = current_repo(&state)?;
    let max_count = format!("--max-count={limit}");
    // --topo-order tiene raggruppati i commit di una stessa linea di
    // sviluppo invece di intrecciarli per data: con molti branch (specie in
    // modalità "tutti i branch") è quello che tiene il numero di corsie
    // contemporaneamente aperte più basso, quindi il grafo più leggibile.
    let mut args: Vec<&str> = vec!["log"];
    if all_branches {
        // Solo branch locali + tag: "--all" includerebbe anche ogni
        // remote-tracking branch (refs/remotes/*), che nella pratica sono
        // quasi sempre gli stessi commit dei branch locali corrispondenti
        // (o branch ormai morti mai pruned lato remoto) e rendono il grafo
        // inutilmente affollato senza aggiungere informazione.
        args.push("--branches");
        args.push("--tags");
        args.push("HEAD"); // copre anche il caso di HEAD detached, non coperto da --branches
    } else {
        // Solo HEAD: senza "--branches" git mostrerebbe la storia di *tutti*
        // i branch locali, vanificando il filtro "solo il branch in checkout".
        args.push("HEAD");
    }
    args.push("--topo-order");
    args.push(&max_count);
    args.push("--pretty=format:%H|%P|%D|%s|%an|%ad");
    args.push("--date=format:%d/%m/%Y %H:%M");
    let out = run_git(&repo, &args)?;

    let mut commits = parse_commit_lines(&out);

    assign_lanes(&mut commits);

    let index_of: std::collections::HashMap<String, usize> = commits
        .iter()
        .enumerate()
        .map(|(i, c)| (c.hash.clone(), i))
        .collect();
    let mut edges = Vec::new();
    for (i, c) in commits.iter().enumerate() {
        for p in &c.parents {
            if let Some(&j) = index_of.get(p) {
                edges.push(Edge {
                    from_row: i,
                    from_lane: c.lane,
                    to_row: j,
                    to_lane: commits[j].lane,
                });
            }
        }
    }

    Ok(LogGraph { commits, edges })
}

// Assigns each commit to a graph "lane": a lane holds the hash it's waiting to see next
// (its most recent unrendered child's first parent). Reused once freed, like gitk/git-graph.
fn assign_lanes(commits: &mut [Commit]) {
    let mut active: Vec<Option<String>> = Vec::new();

    for commit in commits.iter_mut() {
        let lane = active
            .iter()
            .position(|h| h.as_deref() == Some(commit.hash.as_str()))
            .unwrap_or_else(|| {
                active
                    .iter()
                    .position(|h| h.is_none())
                    .unwrap_or_else(|| {
                        active.push(None);
                        active.len() - 1
                    })
            });

        commit.lane = lane;
        commit.color = lane % 8;

        // Se un'ALTRA corsia sta già aspettando lo stesso antenato (due
        // linee di storia che stanno per riconvergere), non farne aspettare
        // due copie: quella corsia verrebbe abbandonata per sempre non
        // appena l'antenato viene effettivamente processato nell'altra,
        // restando "occupata" per il resto del grafo (mai più liberata/
        // riusata). Libera invece questa corsia.
        let next_parent = commit.parents.first().cloned();
        let already_tracked_elsewhere = next_parent.as_ref().is_some_and(|h| {
            active
                .iter()
                .enumerate()
                .any(|(i, tracked)| i != lane && tracked.as_deref() == Some(h.as_str()))
        });
        active[lane] = if already_tracked_elsewhere {
            None
        } else {
            next_parent
        };

        for extra_parent in commit.parents.iter().skip(1) {
            if active
                .iter()
                .any(|h| h.as_deref() == Some(extra_parent.as_str()))
            {
                continue;
            }
            match active.iter().position(|h| h.is_none()) {
                Some(free) => active[free] = Some(extra_parent.clone()),
                None => active.push(Some(extra_parent.clone())),
            }
        }
    }
}
