export default function ComingSoon({ phase, desc }: { phase: string; desc: string }) {
  return (
    <div className="panel" style={{ padding: "0" }}>
      <div className="center-empty">
        <div style={{ fontSize: 15, color: "var(--accent)", marginBottom: 8 }}>
          {phase}
        </div>
        <div style={{ fontFamily: "var(--font-body)", maxWidth: "48ch", margin: "0 auto" }}>
          {desc}
        </div>
      </div>
    </div>
  );
}
