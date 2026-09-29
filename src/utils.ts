// Tauri rigetta gli errori dei comandi come Error JS: String(e) diventa
// "Error: <messaggio>". Qui estraiamo solo il messaggio originale di git.
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface GitErrorRule {
  pattern: RegExp;
  message: string;
}

// Le stringhe di errore di git sono pensate per un terminale, non per un banner
// utente: qui vengono riconosciute le più comuni e tradotte in un messaggio
// comprensibile. L'ordine conta: le regole più specifiche vanno prima di quelle
// più generiche che potrebbero anche fare match su di esse.
const GIT_ERROR_RULES: GitErrorRule[] = [
  {
    pattern:
      /terminal prompts disabled|could not read (Username|Password)|Authentication failed|fatal: Authentication|Permission denied \(publickey\)|403/i,
    message: "Autenticazione fallita: username, password o permessi non validi per questo repository.",
  },
  {
    pattern: /no tracking information for the current branch|has no upstream branch/i,
    message: "Il branch non è collegato a un branch remoto (nessun upstream impostato).",
  },
  {
    pattern: /need to specify how to reconcile divergent branches|divergent branches/i,
    message:
      "Il branch locale e quello remoto sono divergenti: serve scegliere come riconciliarli (merge, rebase o fast-forward).",
  },
  {
    pattern:
      /\[rejected\]|failed to push some refs|Updates were rejected because the tip of your current branch is behind/i,
    message:
      "Push rifiutato: il remote ha commit che non hai in locale. Aggiorna prima il branch (pull) oppure forza il push se sei sicuro di voler sovrascrivere.",
  },
  {
    pattern: /previous cherry-pick is now empty/i,
    message: "Il cherry-pick non ha prodotto modifiche: sono già presenti nel branch corrente.",
  },
  {
    pattern: /CONFLICT.*Merge conflict|Automatic merge failed/is,
    message: "Conflitto di merge: alcuni file richiedono una risoluzione manuale.",
  },
  {
    pattern: /Your local changes to the following files would be overwritten by (checkout|merge)/i,
    message:
      "Ci sono modifiche locali non salvate che verrebbero sovrascritte. Fai il commit o annulla le modifiche prima di continuare.",
  },
  {
    pattern: /Please commit your changes or stash them before you (merge|switch branches)/i,
    message: "Ci sono modifiche non committate: fai il commit o mettile da parte prima di continuare.",
  },
  {
    pattern: /not a git repository/i,
    message: "La cartella selezionata non è un repository git.",
  },
  {
    pattern: /Could not resolve host|Connection timed out|Connection refused|Could not read from remote repository/i,
    message: "Impossibile raggiungere il repository remoto: controlla la connessione di rete o l'indirizzo del remote.",
  },
  {
    pattern: /repository not found/i,
    message: "Repository remoto non trovato: controlla l'URL e i permessi di accesso.",
  },
  {
    pattern: /is not fully merged/i,
    message: "Il branch contiene commit non presenti su altri branch: eliminandolo andrebbero persi.",
  },
  {
    pattern: /did not match any file\(s\) known to git|pathspec .* did not match/i,
    message: "Riferimento non trovato: branch, file o commit inesistente.",
  },
  {
    pattern: /You are not currently on a branch/i,
    message: "Nessun branch attivo (HEAD scollegata): esegui il checkout di un branch prima di continuare.",
  },
  {
    pattern: /You have not concluded your (merge|cherry-pick)|You are in the middle of a rebase/i,
    message: "C'è un'operazione git già in corso (merge, cherry-pick o rebase) da concludere o annullare.",
  },
  {
    pattern: /Unable to create '.*\.lock': File exists/i,
    message:
      "Il repository risulta bloccato da un'altra operazione git in corso. Se nessun altro processo è attivo, rimuovi il file di lock e riprova.",
  },
  {
    pattern: /nothing to commit/i,
    message: "Non ci sono modifiche da salvare.",
  },
  {
    pattern: /SSL certificate problem/i,
    message: "Errore nel certificato SSL del server remoto.",
  },
  {
    pattern: /already exists/i,
    message: "Esiste già un elemento con questo nome.",
  },
];

// Traduce un messaggio di errore grezzo di git in un testo leggibile per
// l'utente. Se nessuna regola nota fa match, ripulisce comunque i prefissi
// tecnici (fatal:, error:, remote:, hint:...) invece di mostrare il messaggio
// di git così com'è.
export function humanizeGitError(raw: string): string {
  for (const rule of GIT_ERROR_RULES) {
    if (rule.pattern.test(raw)) return rule.message;
  }
  const cleaned = raw
    .split("\n")
    .map((line) => line.replace(/^\s*(fatal|error|remote|hint|warning):\s*/i, "").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
  return cleaned || raw.trim();
}

export function basename(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

export function formatRelativeDate(raw: string): string {
  const [datePart, timePart] = raw.split(" ");
  if (!datePart) return raw;
  const [d, m, y] = datePart.split("/").map(Number);
  if (!d || !m || !y) return raw;

  const commitDate = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (commitDate.getTime() === today.getTime()) return `Oggi ${timePart ?? ""}`.trim();
  if (commitDate.getTime() === yesterday.getTime()) return `Ieri ${timePart ?? ""}`.trim();
  return timePart ? `${datePart} ${timePart}` : datePart;
}
