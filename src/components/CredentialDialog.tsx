import { useState } from "react";

interface Props {
  action: "push" | "pull";
  branch: string;
  onConfirm: (username: string, password: string) => void;
  onCancel: () => void;
}

export function CredentialDialog({ action, branch, onConfirm, onCancel }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    onConfirm(username.trim(), password);
  }

  return (
    <div className="modal-overlay">
      <form className="modal new-branch-dialog" onSubmit={submit}>
        <h2>
          Credenziali per {action === "push" ? "il push" : "il pull"} di {branch}
        </h2>
        <p className="hint">
          Il remote è HTTP/HTTPS e richiede autenticazione. Le credenziali vengono
          salvate (nel portachiavi di sistema quando disponibile) così non verranno
          richieste di nuovo per le prossime operazioni su questo repository.
        </p>
        <input
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.currentTarget.value)}
          placeholder="Username"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          placeholder="Password o token"
        />
        <div className="conflict-actions">
          <button type="submit">Conferma</button>
          <button type="button" className="secondary" onClick={onCancel}>
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
