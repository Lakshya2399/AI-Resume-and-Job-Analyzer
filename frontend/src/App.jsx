import { useState } from "react";
import styles from "./styles";
import { API } from "./utils";
import LandingPage from "./components/LandingPage";
import UploadForm from "./components/UploadForm";
import ResultPanel from "./components/ResultPanel";
import HistoryTab from "./components/HistoryTab";

// Top-level views: landing | analyse | history
export default function App() {
  const [view, setView] = useState("landing");

  // Form state
  const [file, setFile] = useState(null);
  const [jd, setJd] = useState("");
  const [promptVersion, setPromptVersion] = useState("v3");
  const [includeSemantic, setIncludeSemantic] = useState(true);

  // Request state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!file || !jd.trim()) return;
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

  // Landing page handles its own full-screen layout
  if (view === "landing") {
    return (
      <LandingPage
        onAnalyse={() => setView("analyse")}
        onHistory={() => setView("history")}
      />
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app">

        <header className="header">
          <div className="logo-mark" style={{ cursor: "pointer" }} onClick={() => setView("landing")}>RA</div>
          <div className="header-title" style={{ cursor: "pointer" }} onClick={() => setView("landing")}>Resume Analyzer</div>
          <nav className="nav">
            <button
              className={`nav-btn ${view === "analyse" ? "active" : ""}`}
              onClick={() => setView("analyse")}
            >
              Analyse
            </button>
            <button
              className={`nav-btn ${view === "history" ? "active" : ""}`}
              onClick={() => setView("history")}
            >
              History
            </button>
            <button className="nav-btn" onClick={() => setView("landing")}>
              Home
            </button>
          </nav>
          <div className="header-sub">v0.4.0</div>
        </header>

        {view === "history" ? (
          <HistoryTab />
        ) : (
          <div className="main">
            <UploadForm
              file={file}                       onFile={setFile}
              jd={jd}                           onJd={setJd}
              promptVersion={promptVersion}     onPromptVersion={setPromptVersion}
              includeSemantic={includeSemantic} onToggleSemantic={() => setIncludeSemantic(v => !v)}
              loading={loading}                 error={error}
              onSubmit={handleSubmit}
            />
            <div className="panel-right">
              <ResultPanel result={result} />
            </div>
          </div>
        )}

      </div>
    </>
  );
}