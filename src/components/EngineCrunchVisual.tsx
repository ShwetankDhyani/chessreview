/** Matrix-style number stream for engine / analysis UI */
export function EngineCrunchVisual({
  size = "md",
  active = true,
}: {
  size?: "sm" | "md";
  active?: boolean;
}) {
  const cols = size === "sm" ? 5 : 7;
  const digits = "0123456789ABCDEF+-#.";

  return (
    <div
      className={`engine-crunch ${size === "sm" ? "engine-crunch--sm" : ""} ${
        active ? "engine-crunch--active" : ""
      }`}
      aria-hidden
    >
      <div className="engine-crunch-glow" />
      <div className="engine-crunch-plate">
        {Array.from({ length: cols }, (_, i) => (
          <div
            key={i}
            className="engine-crunch-col"
            style={{ animationDelay: `${i * 0.12}s` }}
          >
            <span>{digits}</span>
            <span>{digits}</span>
          </div>
        ))}
      </div>
      <div className="engine-crunch-scan" />
    </div>
  );
}
