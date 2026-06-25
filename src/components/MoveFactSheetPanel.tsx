import type { MoveFactSheet } from "../utils/moveFactSheet";

interface MoveFactSheetPanelProps {
  sheet: MoveFactSheet;
  embedded?: boolean;
}

const ROWS: Array<{
  key: keyof MoveFactSheet;
  label: string;
  mono?: boolean;
}> = [
  { key: "classification", label: "Move type" },
  { key: "played", label: "Played", mono: true },
  { key: "engineRank", label: "Engine rank" },
  { key: "bestWas", label: "Best was", mono: true },
  { key: "evalChange", label: "Eval change", mono: true },
  { key: "winChange", label: "Win chance" },
  { key: "opening", label: "Opening" },
];

export function MoveFactSheetPanel({
  sheet,
  embedded = false,
}: MoveFactSheetPanelProps) {
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
        {ROWS.map(({ key, label, mono }) => {
          const value = sheet[key];
          const isClassification = key === "classification";
          return (
            <Row
              key={key}
              label={label}
              value={value}
              mono={mono}
              valueColor={
                isClassification ? sheet.classificationColor : undefined
              }
              valueClass={
                isClassification ? "font-semibold" : undefined
              }
            />
          );
        })}
      </dl>
      <p className="mt-2 text-[10px] text-chess-muted leading-snug">
        Eval is from your perspective as{" "}
        {sheet.played ? "the player who moved" : "this side"}.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  valueColor,
  valueClass = "",
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueColor?: string;
  valueClass?: string;
}) {
  return (
    <>
      <dt className="text-chess-muted font-medium pt-px">{label}</dt>
      <dd
        className={`text-chess-text break-words ${mono ? "font-mono" : ""} ${valueClass}`}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </dd>
    </>
  );
}
