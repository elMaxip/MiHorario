/** Tres barras redondeadas en ámbar, como un horario visto de lejos. */
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
      <rect x="0" y="0" width="7" height="15" rx="1.5" style={{ fill: "var(--amber-300)" }} />
      <rect x="9.5" y="6" width="7" height="20" rx="1.5" style={{ fill: "var(--amber-400)" }} />
      <rect x="19" y="3" width="7" height="11" rx="1.5" style={{ fill: "var(--amber-700)" }} />
    </svg>
  );
}
