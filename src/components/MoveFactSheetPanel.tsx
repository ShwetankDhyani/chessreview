import type { MoveFactSheet } from "../utils/moveFactSheet";

interface MoveFactSheetPanelProps {
  sheet: MoveFactSheet;
  embedded?: boolean;
  /** Hide when the continuation viewer already shows the best move. */
  hideBestWas?: boolean;
  /** Hide when opening context is shown in the chapter box above. */
  hideOpening?: boolean;
}

const ROWS: Array<{
  key: keyof MoveFactSheet;
  label: string;
  mono?: boolean;
}> = [
  { key: "engineRank", label: "Engine rank" },
  { key: "bestWas", label: "Best was", mono: true },
  { key: "winChange", label: "Win chance" },
  { key: "opening", label: "Opening" },
];

export function MoveFactSheetPanel({
  sheet,
  embedded = false,
  hideBestWas = false,
  hideOpening = false,
}: MoveFactSheetPanelProps) {
  const visibleRows = ROWS.filter(({ key }) => {
    if (hideBestWas && key === "bestWas") return false;
    if (hideOpening && key === "opening") return false;
    const value = sheet[key];
    return value !== "—";
  });

  if (visibleRows.length === 0) return null;

  return (
    <div
      className={`text-xs ${
        embedded
          ? "border-l-2 pl-2.5 py-0.5"
          : "rounded-md border border-chess-border/50 p-2.5"
      }`}
      style={{
        borderColor: embedded ? `${sheet.classificationColor}55` : undefined,
      }}
    >
      <dl className="grid grid-cols-[minmax(5.5rem,auto)_1fr] gap-x-3 gap-y-2">
        {visibleRows.map(({ key, label, mono }) => (
          <Row
            key={key}
            label={label}
            value={sheet[key]}
            mono={mono}
          />
        ))}
      </dl>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="text-chess-muted font-medium pt-px">{label}</dt>
      <dd className={`text-chess-text break-words ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </>
  );
}
