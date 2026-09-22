import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { api, Commit, Edge } from "../api";
import { SearchInput } from "./SearchInput";
import { IconLink } from "./Icons";
import { formatRelativeDate } from "../utils";

interface Props {
  commits: Commit[];
  edges: Edge[];
  selectedHash: string | null;
  onSelectCommit: (hash: string) => void;
  onContextMenu: (commit: Commit, x: number, y: number) => void;
  showAllBranches: boolean;
  onToggleAllBranches: () => void;
}

const ROW_H = 28;
const LANE_W = 14;
const GRAPH_PAD = 8;
// Oltre questa lane il testo smette di spostarsi a destra: evita che un
// singolo merge con tanti rami in parallelo allontani la descrizione dal
// pallino su TUTTE le righe, comprese quelle a lane singola più comuni.
const MAX_LANES_FOR_TEXT = 5;
// Spazio tra il bordo del pallino e l'inizio del testo, per le righe che
// devono spostarsi più a destra per lasciarlo visibile.
const DOT_CLEARANCE = 14;
const DEFAULT_META_WIDTH = 296;
const COLORS = [
  "#4f9dff",
  "#ff8a4f",
  "#4fd67a",
  "#e05fd6",
  "#e0c73f",
  "#5fe0d6",
  "#c75fe0",
  "#e05f5f",
];

function laneX(lane: number) {
  return GRAPH_PAD + lane * LANE_W;
}

function isMergeCommit(subject: string): boolean {
  return /^merge\b/i.test(subject);
}

const MAX_VISIBLE_REFS = 3;

function formatRefs(refs: string[]): string {
  const shown = refs.slice(0, MAX_VISIBLE_REFS).join(", ");
  return refs.length > MAX_VISIBLE_REFS ? `${shown}, …` : shown;
}

function CommitMeta({ c, metaWidth }: { c: Commit; metaWidth: number }) {
  return (
    <>
      {c.refs.length > 0 && (
        <span className="ref-badge" title={c.refs.join(", ")}>
          {formatRefs(c.refs)}
        </span>
      )}
      <span className="subject">{c.subject}</span>
      <span className="col-meta" style={{ width: metaWidth }}>
        <span className="col-author">{c.author}</span>
        <span className="col-date">{formatRelativeDate(c.date)}</span>
        <span className="col-hash">{c.hash.slice(0, 7)}</span>
      </span>
    </>
  );
}

function cleanRefs(refs: string[]): string[] {
  return refs.map((r) => r.replace(/^HEAD -> /, ""));
}

function SearchResultRow({
  c,
  selected,
  onClick,
  onContextMenu,
}: {
  c: Commit;
  selected: boolean;
  onClick: () => void;
  onContextMenu: (x: number, y: number) => void;
}) {
  const isHead = c.refs.some((r) => r.startsWith("HEAD"));
  const refs = cleanRefs(c.refs);
  return (
    <li
      className={
        "search-row" + (selected ? " selected" : "") + (isMergeCommit(c.subject) ? " merge" : "")
      }
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e.clientX, e.clientY);
      }}
    >
      <span className={"dot" + (isHead ? " head" : "")} />
      <span className="subject">{c.subject}</span>
      {refs.length > 0 && (
        <span className="refs">
          <IconLink />
          {refs.join(" & ")}
        </span>
      )}
      <span className="author">{c.author}</span>
      <span className="date">{formatRelativeDate(c.date)}</span>
    </li>
  );
}

export function CommitGraph({
  commits,
  edges,
  selectedHash,
  onSelectCommit,
  onContextMenu,
  showAllBranches,
  onToggleAllBranches,
}: Props) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Commit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [metaWidth, setMetaWidth] = useState(DEFAULT_META_WIDTH);
  const resizingMeta = useRef(false);
  const metaDragStart = useRef({ x: 0, width: DEFAULT_META_WIDTH });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!resizingMeta.current) return;
      // La maniglia sta a sinistra del blocco meta: trascinare verso sinistra
      // lo allarga (più spazio ad autore/data/hash), verso destra lo restringe.
      const delta = e.clientX - metaDragStart.current.x;
      setMetaWidth(Math.min(420, Math.max(190, metaDragStart.current.width - delta)));
    }
    function onUp() {
      resizingMeta.current = false;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      api
        .searchCommits(q)
        .then((r) => setSearchResults(r))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const isSearching = query.trim() !== "";
  const maxLane = Math.max(0, ...commits.map((c) => c.lane));
  const svgWidth = GRAPH_PAD * 2 + LANE_W * (1 + maxLane);
  const textOffset =
    GRAPH_PAD * 2 + LANE_W * (1 + Math.min(maxLane, MAX_LANES_FOR_TEXT));
  const height = commits.length * ROW_H;

  const searchBar = (
    <div className="history-toolbar">
      <SearchInput
        className="commit-search"
        value={query}
        onChange={setQuery}
        placeholder="Cerca nei commit (messaggio, autore)..."
      />
      <label
        className="all-branches-toggle"
        title="Include anche i branch remoti: con molti branch il grafo può diventare complesso"
      >
        <input type="checkbox" checked={showAllBranches} onChange={onToggleAllBranches} />
        Tutti i branch
      </label>
    </div>
  );

  if (isSearching) {
    const results = searchResults ?? [];
    return (
      <div className="panel graph-panel">
        <h2>History</h2>
        {searchBar}
        <div className="graph-scroll">
          {searching ? (
            <div className="graph-empty">Ricerca in corso...</div>
          ) : results.length === 0 ? (
            <div className="graph-empty">
              Nessun commit trovato per "{query.trim()}".
            </div>
          ) : (
            <ul className="search-results">
              {results.map((c) => (
                <SearchResultRow
                  key={c.hash}
                  c={c}
                  selected={c.hash === selectedHash}
                  onClick={() => onSelectCommit(c.hash)}
                  onContextMenu={(x, y) => onContextMenu(c, x, y)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="panel graph-panel">
        <h2>History</h2>
        {searchBar}
        <div className="graph-empty">
          Nessun commit da mostrare. Se la repository ha già dei commit,
          controlla il messaggio di errore in alto: potrebbe essere un
          problema nel leggere la history da git.
        </div>
      </div>
    );
  }

  return (
    <div className="panel graph-panel">
      <h2>History</h2>
      {searchBar}
      <div className="graph-scroll">
        <div className="graph-header" style={{ paddingLeft: textOffset }}>
          <span className="col-subject">Messaggio</span>
          <div
            className="meta-resize-handle"
            onMouseDown={(e) => {
              e.preventDefault();
              metaDragStart.current = { x: e.clientX, width: metaWidth };
              resizingMeta.current = true;
            }}
          />
          <span className="col-meta" style={{ width: metaWidth }}>
            <span className="col-author">Autore</span>
            <span className="col-date">Data</span>
            <span className="col-hash">Hash</span>
          </span>
        </div>
        <div className="graph-body" style={{ height }}>
          <svg width={svgWidth} height={height} className="graph-svg">
            {edges.map((e, i) => {
              const x1 = laneX(e.from_lane);
              const y1 = e.from_row * ROW_H + ROW_H / 2;
              const x2 = laneX(e.to_lane);
              const y2 = e.to_row * ROW_H + ROW_H / 2;
              const color = COLORS[e.from_lane % COLORS.length];
              const mid = y1 + (y2 - y1) / 2;
              return (
                <path
                  key={i}
                  d={`M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`}
                  stroke={color}
                  strokeWidth={2}
                  fill="none"
                />
              );
            })}
            {commits.map((c, i) => (
              <circle
                key={c.hash}
                cx={laneX(c.lane)}
                cy={i * ROW_H + ROW_H / 2}
                r={5}
                fill={COLORS[c.lane % COLORS.length]}
              />
            ))}
          </svg>
          <div className="graph-rows" style={{ height }}>
            {commits.map((c) => {
              // Le righe normali restano vicine al grafo (textOffset); solo quelle il
              // cui pallino è oltre il "corridoio" tipico si spostano di più, quel
              // tanto che basta a lasciare il pallino visibile invece di nasconderlo.
              const rowOffset = Math.max(textOffset, laneX(c.lane) + DOT_CLEARANCE);
              return (
                <div
                  className={
                    "graph-row" + (c.hash === selectedHash ? " selected" : "")
                  }
                  key={c.hash}
                  style={
                    {
                      height: ROW_H,
                      marginLeft: rowOffset,
                      "--row-offset": `${rowOffset}px`,
                    } as CSSProperties
                  }
                  onClick={() => onSelectCommit(c.hash)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onContextMenu(c, e.clientX, e.clientY);
                  }}
                >
                  <CommitMeta c={c} metaWidth={metaWidth} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
