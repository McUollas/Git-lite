interface Props {
  branch: string;
  onChoose: (strategy: "merge" | "rebase" | "ff-only") => void;
  onCancel: () => void;
}

export function ReconcileDialog({ branch, onChoose, onCancel }: Props) {
  return (
    <div className="modal-overlay">
      <div className="modal new-branch-dialog">
        <h2>Branch divergenti</h2>
        <p className="hint">
          Il branch locale "{branch}" e quello remoto hanno commit diversi (ognuno ha
          commit che l'altro non ha): git deve sapere come riconciliarli prima di
          proseguire.
        </p>
        <div className="reconcile-actions">
          <button onClick={() => onChoose("merge")}>Merge (consigliato)</button>
          <button onClick={() => onChoose("rebase")}>
            Rebase — riapplica i tuoi commit sopra quelli remoti
          </button>
          <button onClick={() => onChoose("ff-only")}>
            Solo fast-forward — fallisce se non è possibile senza merge/rebase
          </button>
          <button className="secondary" onClick={onCancel}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
}
