import { useState } from "react";

interface Props {
  fromRef: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function NewBranchDialog({ fromRef, onConfirm, onCancel }: Props) {
  const [name, setName] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim());
  }

  return (
    <div className="modal-overlay">
      <form className="modal new-branch-dialog" onSubmit={submit}>
        <h2>Nuovo branch da {fromRef}</h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Nome del nuovo branch..."
        />
        <div className="conflict-actions">
          <button type="submit">Crea</button>
          <button type="button" className="secondary" onClick={onCancel}>
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
