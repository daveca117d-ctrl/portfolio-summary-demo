export default function Wordmark({
  size = 20,
  dark = false,
  className = "",
}: {
  size?: number;
  dark?: boolean;
  className?: string;
}) {
  const color = dark ? "var(--ink)" : "var(--paper-ink)";
  return (
    <div className={className} style={{ lineHeight: 1 }}>
      <div
        style={{
          fontFamily: "var(--font-condensed)",
          fontSize: size,
          fontWeight: 700,
          letterSpacing: "0.02em",
          color,
        }}
      >
        MORGAN
      </div>
      <div
        className="caption"
        style={{ fontSize: size * 0.34, color: dark ? "var(--ink-50)" : "var(--paper-ink-70)", letterSpacing: "0.2em" }}
      >
        REAL ESTATE
      </div>
    </div>
  );
}
