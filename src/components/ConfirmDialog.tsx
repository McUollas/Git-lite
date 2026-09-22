interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Conferma",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="modal-overlay">
      <div className="modal new-branch-dialog">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="conflict-actions">
          <button className="warning" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button className="secondary" onClick={onCancel}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
}
