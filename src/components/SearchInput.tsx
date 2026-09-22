interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder, className }: Props) {
  return (
    <div className={"search-input-wrap" + (className ? " " + className : "")}>
      <input
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          className="search-clear-btn"
          onClick={() => onChange("")}
          aria-label="Cancella ricerca"
        >
          ×
        </button>
      )}
    </div>
  );
}
