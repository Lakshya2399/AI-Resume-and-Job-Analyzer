import { useState } from "react";
import styles from "./styles";
import { API } from "./utils";
import UploadForm from "./components/UploadForm";
import ResultPanel from "./components/ResultPanel";
import HistoryTab from "./components/HistoryTab";

export default function App() {
  const [tab, setTab] = useState("analyse");

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

  return (
    <>
      <style>{styles}</style>
      <div className="app">

        <header className="header">
          <div className="logo-mark">RA</div>
          <div className="header-title">Resume Analyzer</div>
          <nav className="nav">
            <button
              className={`nav-btn ${tab === "analyse" ? "active" : ""}`}
              onClick={() => setTab("analyse")}
            >
              Analyse
            </button>
            <button
              className={`nav-btn ${tab === "history" ? "active" : ""}`}
              onClick={() => setTab("history")}
            >
              History
            </button>
          </nav>
          <div className="header-sub">v0.4.0</div>
        </header>

        {tab === "history" ? (
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
