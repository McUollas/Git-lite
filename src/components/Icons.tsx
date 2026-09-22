type IconProps = { size?: number };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconWorkspace({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...base}>
      <rect x="1.5" y="2.5" width="13" height="8" rx="1" />
      <path d="M5.5 13.5h5M8 10.5v3" />
    </svg>
  );
}

export function IconFileStatus({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...base}>
      <path d="M4 1.5h5.5L12.5 4.5V14.5h-8.5z" />
      <path d="M9 1.5v3h3" />
      <path d="M5.5 8.5h5M5.5 10.8h5M5.5 12.5h3" />
    </svg>
  );
}

export function IconHistory({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...base}>
      <circle cx="8" cy="8.5" r="6" />
      <path d="M8 5v3.5l2.3 1.3" />
      <path d="M4.5 1.8 2.3 3.6M11.5 1.8l2.2 1.8" />
    </svg>
  );
}

export function IconBranch({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...base}>
      <circle cx="4" cy="3" r="1.6" />
      <circle cx="4" cy="13" r="1.6" />
      <circle cx="12" cy="6.5" r="1.6" />
      <path d="M4 4.6V11.4" />
      <path d="M4 8c0-2 2-3.5 4.5-3.5H10" />
    </svg>
  );
}

export function IconRemote({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...base}>
      <path d="M4.5 12h7a2.5 2.5 0 0 0 .3-4.98A3.5 3.5 0 0 0 5 6.1 2.6 2.6 0 0 0 4.5 12Z" />
    </svg>
  );
}

export function IconFolder({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...base}>
      <path d="M2 4.5a1 1 0 0 1 1-1h3l1.3 1.7H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" />
    </svg>
  );
}

// Triangolino di espansione come SVG (non testo): i glifi unicode ▾/▸ non
// sono centrati in modo coerente da tutti i font, il che li fa sembrare
// leggermente sfalsati rispetto a icone e testo adiacenti anche quando il
// loro riquadro è perfettamente centrato via CSS.
export function IconChevron({ open, size = 10 }: IconProps & { open: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      stroke="none"
      style={{
        transform: open ? "rotate(90deg)" : "none",
        transition: "transform 0.1s",
      }}
    >
      <path d="M5 3l7 5-7 5z" />
    </svg>
  );
}

export function IconFetch({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...base}>
      <path d="M2.5 8a5.5 5.5 0 0 1 9.5-3.8" />
      <path d="M13.2 2.7v3.2h-3.2" />
      <path d="M13.5 8a5.5 5.5 0 0 1-9.5 3.8" />
      <path d="M2.8 13.3v-3.2h3.2" />
    </svg>
  );
}

export function IconUpdate({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...base}>
      <path d="M4 4.5 8 8.5l4-4" />
      <path d="M4 9 8 13l4-4" />
    </svg>
  );
}

export function IconPull({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...base}>
      <path d="M8 2v7.5" />
      <path d="M5 7 8 10 11 7" />
      <path d="M2.5 13h11" />
    </svg>
  );
}

export function IconPush({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...base}>
      <path d="M8 11.5V4" />
      <path d="M5 6 8 3l3 3" />
      <path d="M2.5 13h11" />
    </svg>
  );
}

export function IconMinimize({ size = 12 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" {...base}>
      <path d="M2.5 9.5h7" />
    </svg>
  );
}

export function IconMaximize({ size = 10 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" {...base}>
      <rect x="2" y="2" width="8" height="8" rx="0.5" />
    </svg>
  );
}

export function IconClose({ size = 12 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" {...base}>
      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
    </svg>
  );
}

export function IconClone({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...base}>
      <path d="M2 4.5a1 1 0 0 1 1-1h3l1.3 1.7H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" />
      <path d="M8 6.8v4M6 8.8h4" />
    </svg>
  );
}

export function IconLink({ size = 12 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...base}>
      <path d="M6.8 9.2 9.2 6.8" />
      <path d="M7.5 4.3 8.8 3a2.3 2.3 0 0 1 3.2 3.2l-1.3 1.3" />
      <path d="M8.5 11.7 7.2 13a2.3 2.3 0 0 1-3.2-3.2l1.3-1.3" />
    </svg>
  );
}
