interface BoardPlayerLabelProps {
  name: string;
  color: "white" | "black";
}

function ColorSquare({ color }: { color: "white" | "black" }) {
  return (
    <div
      className="w-3.5 h-3.5 rounded-sm border flex-shrink-0"
      style={{
        backgroundColor: color === "white" ? "#f0eee5" : "#1f1d1b",
        borderColor: color === "white" ? "#cdcbc4" : "#5a5754",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
      }}
      aria-hidden
    />
  );
}

/** Player name aligned to a board edge with a clear White/Black marker. */
export function BoardPlayerLabel({ name, color }: BoardPlayerLabelProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 min-w-0">
      <ColorSquare color={color} />
      <div className="min-w-0 leading-tight">
        <span className="block text-xs font-semibold text-chess-text truncate">
          {name}
        </span>
        <span className="block text-[10px] font-medium uppercase tracking-wide text-chess-muted">
          {color}
        </span>
      </div>
    </div>
  );
}

export function HeaderPlayerMatchup({
  whiteName,
  blackName,
}: {
  whiteName: string;
  blackName: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
      <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
        <ColorSquare color="white" />
        <span className="text-base sm:text-lg font-semibold truncate">{whiteName}</span>
      </span>
      <span className="text-sm text-chess-muted font-medium">vs</span>
      <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
        <ColorSquare color="black" />
        <span className="text-base sm:text-lg font-semibold truncate">{blackName}</span>
      </span>
    </div>
  );
}
