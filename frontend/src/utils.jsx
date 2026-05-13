export const API = "";

export function scoreColor(s) {
  if (s >= 75) return "var(--green)";
  if (s >= 50) return "var(--amber)";
  return "var(--red)";
}

export function scoreLabel(s) {
  if (s >= 80) return "Strong Match";
  if (s >= 65) return "Good Match";
  if (s >= 50) return "Moderate Match";
  return "Weak Match";
}

export function importanceBadge(imp) {
  if (imp === "critical") return <span className="badge badge-red">{imp}</span>;
  if (imp === "important") return <span className="badge badge-amber">{imp}</span>;
  return <span className="badge badge-teal">{imp}</span>;
}

export function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
