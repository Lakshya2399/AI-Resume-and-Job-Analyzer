import { scoreColor, scoreLabel, importanceBadge } from "../utils";
import { ScoreRing, DimBar } from "./ScoreRing";

export default function ResultPanel({ result }) {
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
  return <ReportBody report={report} semantic={semantic} meta={{ analysis_id, prompt_version, llm_model, processing_time_ms }} />;
}

/**
 * ReportBody is exported separately so it can be reused inside
 * the history detail drawer without needing a full AnalysisResponse shape.
 */
export function ReportBody({ report, semantic, meta }) {
  return (
    <div>
      {meta && (
        <div className="meta-bar">
          <div className="meta-chip">◷ {(meta.processing_time_ms / 1000).toFixed(1)}s</div>
          <div className="meta-chip">⊞ {meta.prompt_version}</div>
          <div className="meta-chip">◈ {meta.llm_model}</div>
          {meta.analysis_id && (
            <div className="meta-chip" style={{ fontSize: 10 }}>{meta.analysis_id.slice(0, 8)}</div>
          )}
        </div>
      )}

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
        <DimBar label="Skills"      value={report.skills_score} />
        <DimBar label="Experience"  value={report.experience_score} />
        <DimBar label="Keywords"    value={report.keywords_score} />
      </div>

      {semantic && (
        <div className="result-section">
          <div className="result-section-title">
            Semantic similarity
            <span className={`badge ${
              semantic.divergence_flag === "aligned"
                ? "badge-green"
                : semantic.divergence_flag === "high_divergence"
                ? "badge-red"
                : "badge-amber"
            }`}>
              {semantic.divergence_flag?.replace("_", " ")}
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
          {report.matched_keywords?.map((k, i) => (
            <span key={i} className="kw kw-match">{k}</span>
          ))}
        </div>
        <div className="section-label" style={{ marginBottom: 8 }}>missing</div>
        <div className="kw-list">
          {report.missing_keywords?.map((k, i) => (
            <span key={i} className="kw kw-miss">{k}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
