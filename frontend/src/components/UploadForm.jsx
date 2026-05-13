import { useRef, useCallback } from "react";

export default function UploadForm({
  file, onFile, jd, onJd,
  promptVersion, onPromptVersion,
  includeSemantic, onToggleSemantic,
  loading, error, onSubmit,
}) {
  const fileRef = useRef();

  const handleFileChange = useCallback((e) => {
    const f = e.target.files[0];
    if (f?.type === "application/pdf") {
      onFile(f);
    }
    // Reset input value so selecting the same file again still fires onChange
    e.target.value = "";
  }, [onFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") onFile(f);
  }, [onFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleZoneClick = useCallback(() => {
    // Blur any focused element first to avoid the double-trigger bug on Windows
    if (document.activeElement) document.activeElement.blur();
    fileRef.current?.click();
  }, []);

  return (
    <div className="panel-left">
      <div className="section-label">Resume PDF</div>

      <div
        className={`dropzone ${file ? "has-file" : ""}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleZoneClick}
      >
        {/* Input is NOT inside the clickable div's flow — prevents double-fire */}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <span className="drop-icon">{file ? "✓" : "↑"}</span>
        <div className="drop-title">{file ? file.name : "Drop PDF here"}</div>
        <div className="drop-sub">
          {file ? `${(file.size / 1024).toFixed(0)} KB` : "or click to browse"}
        </div>
      </div>

      <div className="field">
        <label className="field-label">Job description</label>
        <textarea
          placeholder="Paste the full job description here…"
          value={jd}
          onChange={e => onJd(e.target.value)}
        />
      </div>

      <div className="options-row">
        <div className="field" style={{ marginBottom: 0 }}>
          <label className="field-label">Prompt version</label>
          <select value={promptVersion} onChange={e => onPromptVersion(e.target.value)}>
            <option value="v1">v1 — baseline</option>
            <option value="v2">v2 — chain of thought</option>
            <option value="v3">v3 — few-shot</option>
          </select>
        </div>
      </div>

      <div className="toggle-row">
        <span className="toggle-label">Include semantic similarity</span>
        <div
          className={`toggle ${includeSemantic ? "on" : ""}`}
          onClick={onToggleSemantic}
        />
      </div>

      {error && <div className="error-box">{error}</div>}

      <button
        className="submit-btn"
        disabled={!file || !jd.trim() || loading}
        onClick={onSubmit}
      >
        {loading
          ? <><div className="spinner" /> Analysing…</>
          : "Analyse resume"
        }
      </button>
    </div>
  );
}