interface Props {
  onSkip: () => void;
  onCommitEmpty: () => void;
  onAbort: () => void;
}

export function EmptyCherryPickDialog({ onSkip, onCommitEmpty, onAbort }: Props) {
  return (
    <div className="modal-overlay">
      <div className="modal new-branch-dialog">
        <h2>Cherry-pick vuoto</h2>
        <p className="hint">
          Le modifiche di questo commit sono già presenti nel branch corrente: non c'è
          nulla da applicare. Come vuoi procedere?
        </p>
        <div className="reconcile-actions">
          <button onClick={onSkip}>Salta il commit (consigliato)</button>
          <button onClick={onCommitEmpty}>Crea comunque un commit vuoto</button>
          <button className="secondary" onClick={onAbort}>
            Annulla il cherry-pick
          </button>
        </div>
      </div>
    </div>
  );
}
