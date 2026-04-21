// client/src/components/common/StatusDot.jsx

const DOT = {
  Online: { color: "#22c55e", label: "Online" },
  Away: { color: "#f59e0b", label: "Away" },
  "On Leave": { color: "#7c6dfa", label: "On Leave" },
  Offline: { color: "#6b7280", label: "Offline" },
};

export default function StatusDot({
  status = "Offline",
  size = 10,
  style = {},
}) {
  // Fallback to Offline if status is undefined or mismatch
  const s = DOT[status] || DOT.Offline;

  return (
    <span
      title={s.label}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: s.color,
        // Uses var(--bg-1) if available, otherwise defaults to your dark theme color
        border: `2px solid var(--bg-1, #13131f)`,
        flexShrink: 0,
        transition: "background 0.3s ease",
        ...style,
      }}
    />
  );
}

// ── StatusBadge — pill variant for profile / sidebar footer ──────────────────
const BADGE = {
  Online: { bg: "rgba(34,197,94,0.15)", text: "#22c55e" },
  Away: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  "On Leave": { bg: "rgba(124,109,250,0.15)", text: "#7c6dfa" },
  Offline: { bg: "rgba(107,114,128,0.15)", text: "#9ca3af" },
};

export function StatusBadge({ status = "Offline" }) {
  const s = BADGE[status] || BADGE.Offline;
  const d = DOT[status] || DOT.Offline;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: "11px",
        fontWeight: 600,
        background: s.bg,
        color: s.text,
        border: `1px solid ${s.bg}`, // Subtle border for definition
        transition: "all 0.3s ease",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: d.color,
          boxShadow: `0 0 4px ${d.color}44`, // Glow effect
        }}
      />
      {status}
    </span>
  );
}
