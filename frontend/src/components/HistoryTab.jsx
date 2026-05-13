import { useState, useCallback } from "react";
import { API, scoreColor, formatDate } from "../utils";
import { ReportBody } from "./ResultPanel";

/**
 * Detail drawer — fetches /analyse/history/{analysis_id} and renders
 * the full stored report inside a slide-in side panel.
 */
function HistoryDrawer({ analysisId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch on mount
  useState(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/analyse/history/${analysisId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setDetail(await res.json());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [analysisId]);

  return (
    <div className="drawer-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="drawer">
        <div className="drawer-header">
          <div>
            <div className="drawer-title">Run detail</div>
            {detail && (
              <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                {detail.analysis_id}
              </div>
            )}
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="drawer-body">
          {loading && (
            <div className="drawer-loading">
              <div className="spinner" style={{ margin: "0 auto 12px", borderTopColor: "var(--accent)" }} />
              Loading run…
            </div>
          )}

          {error && <div className="error-box">{error}</div>}

          {detail && !loading && (
            <>
              {/* Run metadata strip */}
              <div className="meta-bar" style={{ marginBottom: 20 }}>
                <div className="meta-chip">◷ {(detail.processing_time_ms / 1000).toFixed(1)}s</div>
                <div className="meta-chip">⊞ {detail.prompt_version}</div>
                <div className="meta-chip">◈ {detail.llm_model}</div>
                <div className="meta-chip">{formatDate(detail.created_at)}</div>
              </div>

              {/* Semantic strip if available */}
              {detail.semantic_score != null && (
                <div style={{
                  display: "flex", gap: 16, alignItems: "center",
                  background: "var(--bg3)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)", padding: "12px 16px", marginBottom: 16,
                }}>
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 24, color: scoreColor(detail.semantic_score) }}>
                      {detail.semantic_score}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>semantic</div>
                  </div>
                  <div style={{ flex: 1, fontSize: 12, color: "var(--muted)" }}>
                    <span className={`badge ${
                      detail.divergence_flag === "aligned" ? "badge-green"
                      : detail.divergence_flag === "high_divergence" ? "badge-red"
                      : "badge-amber"
                    }`} style={{ marginRight: 8 }}>
                      {detail.divergence_flag?.replace("_", " ")}
                    </span>
                    {detail.divergence_pts != null && `${detail.divergence_pts}pt gap`}
                    {detail.semantic_raw_cosine && ` · cosine ${detail.semantic_raw_cosine}`}
                  </div>
                </div>
              )}

              {/* Full report */}
              <ReportBody
                report={detail.report}
                semantic={null}
                meta={null}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * HistoryTab — lists all past runs. Clicking a row opens the detail drawer.
 */
export default function HistoryTab() {
  const [runs, setRuns] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/analyse/history?limit=50`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRuns(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  if (runs === null && !loading) {
    return (
      <div style={{ padding: 28 }}>
        <button className="submit-btn" style={{ maxWidth: 220 }} onClick={load}>
          Load history
        </button>
      </div>
    );
  }

  if (loading) return <div style={{ padding: 28, color: "var(--muted)" }}>Loading…</div>;
  if (error)   return <div className="error-box" style={{ margin: 28 }}>{error}</div>;
  if (!runs?.length) return <div style={{ padding: 28, color: "var(--muted)" }}>No runs yet.</div>;

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="section-label" style={{ marginBottom: 0 }}>{runs.length} runs</div>
        <button
          onClick={load}
          style={{
            background: "transparent", border: "1px solid var(--border2)",
            color: "var(--muted)", borderRadius: 6, padding: "4px 10px",
            fontSize: 12, cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      <div className="history-list">
        {runs.map(r => (
          <div
            key={r.analysis_id}
            className="history-item"
            onClick={() => setSelectedId(r.analysis_id)}
            title="Click to view full report"
          >
            <div className="history-score" style={{ color: scoreColor(r.overall_score) }}>
              {r.overall_score}
            </div>

            <div className="history-meta">
              <div className="history-id">{r.analysis_id.slice(0, 20)}…</div>
              <div className="history-date">{formatDate(r.created_at)}</div>
            </div>

            <div className="history-right">
              <div>{r.prompt_version} · {r.llm_model}</div>
              {r.semantic_score != null && (
                <div style={{ color: scoreColor(r.semantic_score) }}>
                  sem {r.semantic_score}
                  {r.divergence_flag && (
                    <span style={{ marginLeft: 6, fontSize: 10, color: "var(--muted)" }}>
                      {r.divergence_flag.replace("_", " ")}
                    </span>
                  )}
                </div>
              )}
              <div style={{ marginTop: 2 }}>{(r.processing_time_ms / 1000).toFixed(1)}s</div>
            </div>

            {/* View detail hint */}
            <div style={{ fontSize: 11, color: "var(--accent)", flexShrink: 0 }}>
              view →
            </div>
          </div>
        ))}
      </div>

      {/* Drawer portal */}
      {selectedId && (
        <HistoryDrawer
          analysisId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
