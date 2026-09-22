interface Props {
  path: string | null;
  diff: string;
}

interface DiffLine {
  oldNum: number | null;
  newNum: number | null;
  content: string;
  type: "add" | "del" | "context" | "hunk" | "meta";
}

const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

function parseDiff(diff: string): DiffLine[] {
  const lines = diff.split("\n");
  const result: DiffLine[] = [];
  let oldNum = 0;
  let newNum = 0;

  for (const line of lines) {
    const hunkMatch = HUNK_HEADER.exec(line);
    if (hunkMatch) {
      oldNum = parseInt(hunkMatch[1], 10);
      newNum = parseInt(hunkMatch[2], 10);
      result.push({ oldNum: null, newNum: null, content: line, type: "hunk" });
      continue;
    }
    if (
      line.startsWith("+++") ||
      line.startsWith("---") ||
      line.startsWith("diff ") ||
      line.startsWith("index ")
    ) {
      result.push({ oldNum: null, newNum: null, content: line, type: "meta" });
      continue;
    }
    if (line.startsWith("+")) {
      result.push({ oldNum: null, newNum, content: line.slice(1), type: "add" });
      newNum++;
      continue;
    }
    if (line.startsWith("-")) {
      result.push({ oldNum, newNum: null, content: line.slice(1), type: "del" });
      oldNum++;
      continue;
    }
    result.push({
      oldNum,
      newNum,
      content: line.startsWith(" ") ? line.slice(1) : line,
      type: "context",
    });
    oldNum++;
    newNum++;
  }
  return result;
}

export function DiffViewer({ path, diff }: Props) {
  if (!path || diff.trim() === "") {
    return (
      <div className="panel diff-panel">
        <h2>{path ?? "Diff"}</h2>
        <div className="diff-empty">
          {path ? "Nessuna differenza da mostrare." : "Seleziona un file per vedere le modifiche."}
        </div>
      </div>
    );
  }

  const lines = parseDiff(diff);
  return (
    <div className="panel diff-panel">
      <h2>{path}</h2>
      <div className="diff-scroll">
        {lines.map((l, i) => (
          <div key={i} className={"diff-row " + l.type}>
            <span className="diff-line-num">{l.oldNum ?? ""}</span>
            <span className="diff-line-num">{l.newNum ?? ""}</span>
            <span className="diff-content">{l.content || " "}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
