import { scoreColor } from "../utils";

export function ScoreRing({ score }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <div className="score-ring">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="score-num" style={{ color }}>{score}</div>
    </div>
  );
}

export function DimBar({ label, value }) {
  return (
    <div className="dim-card">
      <div className="dim-label">{label}</div>
      <div className="dim-score" style={{ color: scoreColor(value) }}>{value}</div>
      <div className="dim-bar">
        <div className="dim-bar-fill" style={{ width: `${value}%`, background: scoreColor(value) }} />
      </div>
    </div>
  );
}
