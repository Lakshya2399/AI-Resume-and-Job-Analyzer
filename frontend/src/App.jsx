import { useState, useCallback, useRef } from "react";

const API = "";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0c0c0f;
    --bg2: #131318;
    --bg3: #1a1a22;
    --border: rgba(255,255,255,0.07);
    --border2: rgba(255,255,255,0.12);
    --text: #f0f0f5;
    --muted: rgba(240,240,245,0.45);
    --accent: #7c6dfa;
    --accent2: #a78bfa;
    --green: #34d399;
    --amber: #fbbf24;
    --red: #f87171;
    --teal: #22d3ee;
    --radius: 14px;
    --radius-sm: 8px;
  }

  html, body, #root { height: 100%; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  .app {
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto 1fr;
  }

  /* Header */
  .header {
    padding: 20px 32px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 16px;
    background: var(--bg);
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(12px);
  }

  .logo-mark {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, var(--accent), var(--teal));
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 16px;
    color: white;
    flex-shrink: 0;
  }

  .header-title {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 17px;
    letter-spacing: -0.02em;
  }

  .header-sub {
    font-size: 12px;
    color: var(--muted);
    margin-left: auto;
    font-family: 'DM Mono', monospace;
  }

  /* Nav tabs */
  .nav {
    display: flex;
    gap: 4px;
    margin-left: 24px;
  }

  .nav-btn {
    padding: 6px 14px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--muted);
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    cursor: pointer;
    transition: all .15s;
  }

  .nav-btn:hover { color: var(--text); background: var(--bg3); }
  .nav-btn.active { color: var(--text); background: var(--bg3); border: 1px solid var(--border2); }

  /* Main layout */
  .main {
    display: grid;
    grid-template-columns: 420px 1fr;
    min-height: calc(100vh - 65px);
  }

  /* Left panel — input form */
  .panel-left {
    border-right: 1px solid var(--border);
    padding: 28px;
    overflow-y: auto;
    background: var(--bg);
  }

  /* Right panel — results */
  .panel-right {
    padding: 28px;
    overflow-y: auto;
    background: var(--bg2);
  }

  .section-label {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 10px;
  }

  /* Drop zone */
  .dropzone {
    border: 1.5px dashed var(--border2);
    border-radius: var(--radius);
    padding: 32px 20px;
    text-align: center;
    cursor: pointer;
    transition: all .2s;
    background: var(--bg3);
    margin-bottom: 16px;
    position: relative;
  }

  .dropzone:hover, .dropzone.drag-over {
    border-color: var(--accent);
    background: rgba(124,109,250,0.06);
  }

  .dropzone.has-file {
    border-color: var(--green);
    border-style: solid;
    background: rgba(52,211,153,0.05);
  }

  .dropzone input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; }

  .drop-icon {
    font-size: 28px;
    margin-bottom: 8px;
    display: block;
  }

  .drop-title {
    font-family: 'Syne', sans-serif;
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 4px;
  }

  .drop-sub { font-size: 12px; color: var(--muted); }

  /* Textarea */
  .field { margin-bottom: 16px; }
  .field-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    margin-bottom: 6px;
    display: block;
  }

  textarea, select {
    width: 100%;
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    padding: 10px 12px;
    resize: vertical;
    outline: none;
    transition: border .15s;
  }

  textarea:focus, select:focus { border-color: var(--border2); }
  textarea { min-height: 160px; line-height: 1.5; }
  select { height: 36px; cursor: pointer; }

  /* Options row */
  .options-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 20px;
  }

  /* Toggle */
  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    margin-bottom: 20px;
  }

  .toggle-label { font-size: 13px; color: var(--muted); }

  .toggle {
    width: 36px; height: 20px;
    background: var(--bg);
    border-radius: 10px;
    border: 1px solid var(--border2);
    cursor: pointer;
    position: relative;
    transition: background .2s;
    flex-shrink: 0;
  }

  .toggle.on { background: var(--accent); border-color: var(--accent); }

  .toggle::after {
    content: '';
    position: absolute;
    width: 14px; height: 14px;
    background: white;
    border-radius: 50%;
    top: 2px; left: 2px;
    transition: transform .2s;
  }

  .toggle.on::after { transform: translateX(16px); }

  /* Submit button */
  .submit-btn {
    width: 100%;
    padding: 13px;
    background: var(--accent);
    border: none;
    border-radius: var(--radius-sm);
    color: white;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    letter-spacing: .01em;
    transition: all .15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .submit-btn:hover:not(:disabled) { background: var(--accent2); transform: translateY(-1px); }
  .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  /* Spinner */
  .spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    color: var(--muted);
    gap: 12px;
    padding: 48px;
  }

  .empty-icon {
    font-size: 48px;
    opacity: 0.3;
  }

  .empty-title {
    font-family: 'Syne', sans-serif;
    font-weight: 600;
    font-size: 16px;
    color: var(--text);
    opacity: 0.4;
  }

  /* Score circle */
  .score-hero {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 24px;
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 16px;
  }

  .score-ring {
    position: relative;
    width: 100px; height: 100px;
    flex-shrink: 0;
  }

  .score-ring svg { transform: rotate(-90deg); }

  .score-num {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 26px;
  }

  .score-meta { flex: 1; }

  .score-label {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 18px;
    margin-bottom: 6px;
  }

  .score-reasoning {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.5;
  }

  /* Dimension bars */
  .dims {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
    margin-bottom: 16px;
  }

  .dim-card {
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 12px;
  }

  .dim-label { font-size: 11px; color: var(--muted); margin-bottom: 6px; }
  .dim-score {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 20px;
  }

  .dim-bar {
    height: 3px;
    background: var(--border);
    border-radius: 2px;
    margin-top: 6px;
    overflow: hidden;
  }

  .dim-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width .6s ease;
  }

  /* Section blocks */
  .result-section {
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px;
    margin-bottom: 12px;
  }

  .result-section-title {
    font-family: 'Syne', sans-serif;
    font-weight: 600;
    font-size: 13px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .badge {
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 20px;
    font-family: 'DM Mono', monospace;
    font-weight: 500;
  }

  .badge-accent { background: rgba(124,109,250,0.15); color: var(--accent2); }
  .badge-green { background: rgba(52,211,153,0.12); color: var(--green); }
  .badge-amber { background: rgba(251,191,36,0.12); color: var(--amber); }
  .badge-red { background: rgba(248,113,113,0.12); color: var(--red); }
  .badge-teal { background: rgba(34,211,238,0.12); color: var(--teal); }

  /* Skill gap items */
  .gap-item {
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .gap-item:last-child { border-bottom: none; padding-bottom: 0; }
  .gap-item:first-child { padding-top: 0; }

  .gap-header { display: flex; align-items: center; gap: 8px; }
  .gap-skill { font-weight: 500; font-size: 13px; }
  .gap-suggestion { font-size: 12px; color: var(--muted); }

  /* Bullet improvement */
  .bullet-item {
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
  }

  .bullet-item:last-child { border-bottom: none; }

  .bullet-orig {
    font-size: 12px;
    color: var(--muted);
    padding: 6px 10px;
    border-left: 2px solid var(--red);
    background: rgba(248,113,113,0.05);
    border-radius: 0 4px 4px 0;
    margin-bottom: 6px;
    font-family: 'DM Mono', monospace;
  }

  .bullet-improved {
    font-size: 12px;
    color: var(--text);
    padding: 6px 10px;
    border-left: 2px solid var(--green);
    background: rgba(52,211,153,0.05);
    border-radius: 0 4px 4px 0;
    margin-bottom: 6px;
    font-family: 'DM Mono', monospace;
  }

  .bullet-reason { font-size: 11px; color: var(--muted); font-style: italic; }

  /* Keywords */
  .kw-list { display: flex; flex-wrap: wrap; gap: 6px; }
  .kw { 
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-family: 'DM Mono', monospace;
  }

  .kw-match { background: rgba(52,211,153,0.1); color: var(--green); border: 1px solid rgba(52,211,153,0.2); }
  .kw-miss { background: rgba(248,113,113,0.08); color: var(--red); border: 1px solid rgba(248,113,113,0.15); }

  /* Semantic section */
  .semantic-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .semantic-score-block {
    text-align: center;
    flex-shrink: 0;
  }

  .semantic-num {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 32px;
    line-height: 1;
  }

  .semantic-label { font-size: 11px; color: var(--muted); margin-top: 2px; }

  .divergence-block { flex: 1; }
  .divergence-flag-label {
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 4px;
  }

  .divergence-note { font-size: 12px; color: var(--muted); line-height: 1.5; }

  /* History tab */
  .history-list { display: flex; flex-direction: column; gap: 8px; }

  .history-item {
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    cursor: pointer;
    transition: border-color .15s;
  }

  .history-item:hover { border-color: var(--border2); }

  .history-score {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 22px;
    min-width: 44px;
    text-align: center;
  }

  .history-meta { flex: 1; }
  .history-id { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); }
  .history-date { font-size: 12px; color: var(--muted); margin-top: 2px; }

  .history-right { text-align: right; font-size: 12px; color: var(--muted); }

  /* Strengths */
  .strength-item {
    display: flex; align-items: flex-start; gap: 8px;
    font-size: 13px; padding: 4px 0;
    color: var(--text);
  }

  .strength-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--green);
    margin-top: 6px; flex-shrink: 0;
  }

  /* Meta bar */
  .meta-bar {
    display: flex; gap: 16px; flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .meta-chip {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    color: var(--muted);
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 4px 10px;
    display: flex; align-items: center; gap: 6px;
  }

  .error-box {
    background: rgba(248,113,113,0.08);
    border: 1px solid rgba(248,113,113,0.2);
    border-radius: var(--radius-sm);
    padding: 14px 16px;
    font-size: 13px;
    color: var(--red);
    margin-bottom: 16px;
  }
`;

function scoreColor(s) {
  if (s >= 75) return "var(--green)";
  if (s >= 50) return "var(--amber)";
  return "var(--red)";
}

function scoreLabel(s) {
  if (s >= 80) return "Strong Match";
  if (s >= 65) return "Good Match";
  if (s >= 50) return "Moderate Match";
  return "Weak Match";
}

function importanceBadge(imp) {
  if (imp === "critical") return <span className="badge badge-red">{imp}</span>;
  if (imp === "important") return <span className="badge badge-amber">{imp}</span>;
  return <span className="badge badge-teal">{imp}</span>;
}

function ScoreRing({ score }) {
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

function DimBar({ label, value }) {
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

function ResultPanel({ result }) {
  if (!result) {
    return (
      <div className="empty-state">
        <div className="empty-icon">◎</div>
        <div className="empty-title">No analysis yet</div>
        <div>Upload a resume and paste a job description to get started</div>
      </div>
    );
  }

  const { report, semantic, analysis_id, prompt_version, llm_model, processing_time_ms } = result;

  return (
    <div>
      <div className="meta-bar">
        <div className="meta-chip">◷ {(processing_time_ms / 1000).toFixed(1)}s</div>
        <div className="meta-chip">⊞ {prompt_version}</div>
        <div className="meta-chip">◈ {llm_model}</div>
        <div className="meta-chip" style={{ fontSize: 10 }}>{analysis_id.slice(0, 8)}</div>
      </div>

      <div className="score-hero">
        <ScoreRing score={report.overall_score} />
        <div className="score-meta">
          <div className="score-label" style={{ color: scoreColor(report.overall_score) }}>
            {scoreLabel(report.overall_score)}
          </div>
          <div className="score-reasoning">{report.score_reasoning}</div>
        </div>
      </div>

      <div className="dims">
        <DimBar label="Skills" value={report.skills_score} />
        <DimBar label="Experience" value={report.experience_score} />
        <DimBar label="Keywords" value={report.keywords_score} />
      </div>

      {semantic && (
        <div className="result-section">
          <div className="result-section-title">
            Semantic similarity
            <span className={`badge ${semantic.divergence_flag === "aligned" ? "badge-green" : semantic.divergence_flag === "high_divergence" ? "badge-red" : "badge-amber"}`}>
              {semantic.divergence_flag.replace("_", " ")}
            </span>
          </div>
          <div className="semantic-row">
            <div className="semantic-score-block">
              <div className="semantic-num" style={{ color: scoreColor(semantic.semantic_score) }}>
                {semantic.semantic_score}
              </div>
              <div className="semantic-label">FAISS score</div>
            </div>
            <div className="divergence-block">
              <div className="divergence-flag-label">{semantic.interpretation}</div>
              <div className="divergence-note">{semantic.divergence_note}</div>
            </div>
          </div>
        </div>
      )}

      {report.strengths?.length > 0 && (
        <div className="result-section">
          <div className="result-section-title">Strengths</div>
          {report.strengths.map((s, i) => (
            <div key={i} className="strength-item">
              <div className="strength-dot" />
              {s}
            </div>
          ))}
        </div>
      )}

      {report.skill_gaps?.length > 0 && (
        <div className="result-section">
          <div className="result-section-title">
            Skill gaps
            <span className="badge badge-red">{report.skill_gaps.length}</span>
          </div>
          {report.skill_gaps.map((g, i) => (
            <div key={i} className="gap-item">
              <div className="gap-header">
                <span className="gap-skill">{g.skill}</span>
                {importanceBadge(g.importance)}
              </div>
              <div className="gap-suggestion">{g.suggestion}</div>
            </div>
          ))}
        </div>
      )}

      {report.bullet_improvements?.length > 0 && (
        <div className="result-section">
          <div className="result-section-title">
            Bullet rewrites
            <span className="badge badge-accent">{report.bullet_improvements.length}</span>
          </div>
          {report.bullet_improvements.map((b, i) => (
            <div key={i} className="bullet-item">
              <div className="bullet-orig">{b.original}</div>
              <div className="bullet-improved">{b.improved}</div>
              <div className="bullet-reason">{b.reason}</div>
            </div>
          ))}
        </div>
      )}

      <div className="result-section">
        <div className="result-section-title">Keywords</div>
        <div className="section-label" style={{ marginBottom: 8 }}>matched</div>
        <div className="kw-list" style={{ marginBottom: 12 }}>
          {report.matched_keywords?.map((k, i) => <span key={i} className="kw kw-match">{k}</span>)}
        </div>
        <div className="section-label" style={{ marginBottom: 8 }}>missing</div>
        <div className="kw-list">
          {report.missing_keywords?.map((k, i) => <span key={i} className="kw kw-miss">{k}</span>)}
        </div>
      </div>
    </div>
  );
}

function HistoryTab() {
  const [runs, setRuns] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        <button className="submit-btn" style={{ maxWidth: 220 }} onClick={load}>Load history</button>
      </div>
    );
  }

  if (loading) return <div style={{ padding: 28, color: "var(--muted)" }}>Loading…</div>;
  if (error) return <div className="error-box" style={{ margin: 28 }}>{error}</div>;
  if (!runs?.length) return <div style={{ padding: 28, color: "var(--muted)" }}>No runs yet.</div>;

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="section-label" style={{ marginBottom: 0 }}>{runs.length} runs</div>
        <button onClick={load} style={{ background: "transparent", border: "1px solid var(--border2)", color: "var(--muted)", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>Refresh</button>
      </div>
      <div className="history-list">
        {runs.map(r => (
          <div key={r.analysis_id} className="history-item">
            <div className="history-score" style={{ color: scoreColor(r.overall_score) }}>
              {r.overall_score}
            </div>
            <div className="history-meta">
              <div className="history-id">{r.analysis_id.slice(0, 16)}…</div>
              <div className="history-date">{new Date(r.created_at).toLocaleString()}</div>
            </div>
            <div className="history-right">
              <div>{r.prompt_version} · {r.llm_model}</div>
              {r.semantic_score != null && (
                <div style={{ color: scoreColor(r.semantic_score) }}>sem {r.semantic_score}</div>
              )}
              <div style={{ marginTop: 2 }}>{(r.processing_time_ms / 1000).toFixed(1)}s</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("analyse");
  const [file, setFile] = useState(null);
  const [jd, setJd] = useState("");
  const [promptVersion, setPromptVersion] = useState("v3");
  const [includeSemantic, setIncludeSemantic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const handleFile = (f) => {
    if (f?.type === "application/pdf") setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const submit = async () => {
    if (!jd.trim() || (!file)) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const form = new FormData();
      form.append("resume_pdf", file);
      form.append("job_description", jd);
      form.append("prompt_version", promptVersion);
      form.append("include_semantic", includeSemantic);

      const res = await fetch(`${API}/analyse/upload`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <header className="header">
          <div className="logo-mark">RA</div>
          <div className="header-title">Resume Analyzer</div>
          <nav className="nav">
            <button className={`nav-btn ${tab === "analyse" ? "active" : ""}`} onClick={() => setTab("analyse")}>Analyse</button>
            <button className={`nav-btn ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>History</button>
          </nav>
          <div className="header-sub">v0.4.0</div>
        </header>

        {tab === "history" ? (
          <HistoryTab />
        ) : (
          <div className="main">
            <div className="panel-left">
              <div className="section-label">Resume PDF</div>
              <div
                className={`dropzone ${dragOver ? "drag-over" : ""} ${file ? "has-file" : ""}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".pdf" onChange={e => handleFile(e.target.files[0])} />
                <span className="drop-icon">{file ? "✓" : "↑"}</span>
                <div className="drop-title">{file ? file.name : "Drop PDF here"}</div>
                <div className="drop-sub">{file ? `${(file.size / 1024).toFixed(0)} KB` : "or click to browse"}</div>
              </div>

              <div className="field">
                <label className="field-label">Job description</label>
                <textarea
                  placeholder="Paste the full job description here…"
                  value={jd}
                  onChange={e => setJd(e.target.value)}
                />
              </div>

              <div className="options-row">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="field-label">Prompt version</label>
                  <select value={promptVersion} onChange={e => setPromptVersion(e.target.value)}>
                    <option value="v1">v1 — baseline</option>
                    <option value="v2">v2 — chain of thought</option>
                    <option value="v3">v3 — few-shot</option>
                  </select>
                </div>
              </div>

              <div className="toggle-row">
                <span className="toggle-label">Include semantic similarity</span>
                <div className={`toggle ${includeSemantic ? "on" : ""}`} onClick={() => setIncludeSemantic(v => !v)} />
              </div>

              {error && <div className="error-box">{error}</div>}

              <button className="submit-btn" disabled={!file || !jd.trim() || loading} onClick={submit}>
                {loading ? <><div className="spinner" /> Analysing…</> : "Analyse resume"}
              </button>
            </div>

            <div className="panel-right">
              <ResultPanel result={result} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
