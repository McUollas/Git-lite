mod git;

use git::RepoState;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(RepoState(Mutex::new(None)))
        .setup(|app| {
            #[cfg(any(
                target_os = "linux",
                target_os = "dragonfly",
                target_os = "freebsd",
                target_os = "netbsd",
                target_os = "openbsd"
            ))]
            {
                use webkit2gtk::WebViewExt;
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.with_webview(|webview| {
                        webview.inner().connect_context_menu(|_, _, _, _| true);
                    });
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            git::open_repo,
            git::get_status,
            git::get_conflicts,
            git::stage_file,
            git::unstage_file,
            git::stage_all,
            git::unstage_all,
            git::commit,
            git::discard_file,
            git::get_identity,
            git::get_branches,
            git::checkout_branch,
            git::create_branch,
            git::create_branch_from,
            git::push,
            git::pull,
            git::fetch_all,
            git::set_upstream,
            git::push_branch,
            git::pull_branch,
            git::delete_branch,
            git::merge_branch,
            git::cherry_pick_commit,
            git::revert_commit,
            git::cherry_pick_skip,
            git::cherry_pick_commit_empty,
            git::cherry_pick_abort,
            git::clone_repo,
            git::push_with_credentials,
            git::pull_with_credentials,
            git::get_commit,
            git::get_commit_file_diff,
            git::search_commits,
            git::get_diff,
            git::read_file,
            git::resolve_conflict,
            git::get_log_graph,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
