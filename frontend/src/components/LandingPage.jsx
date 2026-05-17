import { useEffect, useRef, useState } from "react";

const EVAL_DATA = [
  { prompt: "v1 baseline",         mae: 10.83, within10: 72.2, tierAcc: 77.8, f1: 0.756, pearson: 0.929, repair: 11.1, latency: 12.58 },
  { prompt: "v2 chain-of-thought", mae: 10.35, within10: 70.0, tierAcc: 85.0, f1: 0.839, pearson: 0.806, repair: 45.0, latency: 11.67 },
  { prompt: "v3 few-shot ✓",       mae: 8.16,  within10: 78.9, tierAcc: 73.7, f1: 0.658, pearson: 0.916, repair: 26.3, latency: 10.09 },
];

const STACK = [
  { icon: "⬡", label: "LangChain",          sub: "LLM orchestration" },
  { icon: "◈", label: "FastAPI",             sub: "REST backend" },
  { icon: "◉", label: "FAISS",               sub: "Semantic similarity" },
  { icon: "⬡", label: "sentence-transformers", sub: "MiniLM-L6-v2" },
  { icon: "◈", label: "MLflow",              sub: "Experiment tracking" },
  { icon: "◉", label: "React + Vite",        sub: "Frontend" },
  { icon: "⬡", label: "SQLite",              sub: "Run history" },
  { icon: "◈", label: "Docker",              sub: "Containerised" },
];

export default function LandingPage({ onAnalyse, onHistory }) {
  const aboutRef = useRef(null);
  const [visible, setVisible] = useState({});
  const [activeMetric, setActiveMetric] = useState(2);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) setVisible(v => ({ ...v, [e.target.dataset.id]: true }));
      }),
      { threshold: 0.12 }
    );
    document.querySelectorAll("[data-id]").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const scrollToAbout = () => aboutRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div style={{ background: "#080810", minHeight: "100vh", color: "#e8e8f0", fontFamily: "'DM Sans', sans-serif", overflowX: "hidden" }}>

      {/* ── Grid background ── */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `linear-gradient(rgba(120,100,255,0.04) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(120,100,255,0.04) 1px, transparent 1px)`,
        backgroundSize: "48px 48px",
      }} />

      {/* ── Glow orbs ── */}
      <div style={{ position: "fixed", top: "-200px", left: "-200px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(100,80,240,0.12) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-200px", right: "-100px", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(20,200,160,0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* ── Nav ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", padding: "0 48px", height: "60px", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(16px)", background: "rgba(8,8,16,0.7)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "linear-gradient(135deg, #7c6dfa, #22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontFamily: "monospace", fontWeight: "700", color: "white" }}>RA</div>
          <span style={{ fontSize: "14px", fontWeight: "500", letterSpacing: "0.02em", color: "#e8e8f0" }}>RESUME_ANALYZER</span>
          <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", background: "rgba(124,109,250,0.15)", color: "#a78bfa", border: "1px solid rgba(124,109,250,0.3)", marginLeft: "4px", fontFamily: "monospace" }}>v0.4.0</span>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {[["About", scrollToAbout], ["Analyse", onAnalyse], ["History", onHistory]].map(([label, fn]) => (
            <button key={label} onClick={fn} style={{ background: "transparent", border: "none", color: "rgba(232,232,240,0.6)", fontSize: "13px", padding: "6px 14px", cursor: "pointer", borderRadius: "6px", transition: "all .15s" }}
              onMouseEnter={e => { e.target.style.color = "#e8e8f0"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={e => { e.target.style.color = "rgba(232,232,240,0.6)"; e.target.style.background = "transparent"; }}>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", alignItems: "center", padding: "60px 48px 0" }}>
        <div style={{ maxWidth: "640px" }}>
          <div data-id="hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "4px 12px", border: "1px solid rgba(124,109,250,0.35)", borderRadius: "20px", fontSize: "11px", color: "#a78bfa", fontFamily: "monospace", marginBottom: "32px", opacity: visible["hero-badge"] ? 1 : 0, transform: visible["hero-badge"] ? "translateY(0)" : "translateY(10px)", transition: "all .5s ease" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", display: "inline-block", animation: "pulse 2s infinite" }} />
            LLM ENGINE ACTIVE · 78.9% EVALUATION ACCURACY
          </div>

          <h1 data-id="hero-h1" style={{ fontSize: "clamp(40px, 6vw, 72px)", fontFamily: "'Syne', sans-serif", fontWeight: "800", lineHeight: "1.06", letterSpacing: "-0.03em", margin: "0 0 24px", opacity: visible["hero-h1"] ? 1 : 0, transform: visible["hero-h1"] ? "translateY(0)" : "translateY(20px)", transition: "all .6s ease .1s" }}>
            Score your resume.<br />
            <span style={{ background: "linear-gradient(90deg, #7c6dfa, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Close the gap.</span>
          </h1>

          <p data-id="hero-p" style={{ fontSize: "17px", color: "rgba(232,232,240,0.6)", lineHeight: "1.7", maxWidth: "480px", margin: "0 0 40px", opacity: visible["hero-p"] ? 1 : 0, transform: visible["hero-p"] ? "translateY(0)" : "translateY(16px)", transition: "all .6s ease .2s" }}>
            Upload your resume and a job description. Get a structured match score, skill gaps, rewritten bullets, and semantic similarity — powered by a local LLM with zero data sent to third parties.
          </p>

          <div data-id="hero-btns" style={{ display: "flex", gap: "12px", flexWrap: "wrap", opacity: visible["hero-btns"] ? 1 : 0, transform: visible["hero-btns"] ? "translateY(0)" : "translateY(16px)", transition: "all .6s ease .3s" }}>
            <button onClick={onAnalyse} style={{ padding: "13px 28px", background: "linear-gradient(135deg, #7c6dfa, #5b52d9)", border: "none", borderRadius: "8px", color: "white", fontSize: "14px", fontFamily: "'Syne', sans-serif", fontWeight: "700", cursor: "pointer", letterSpacing: "0.02em", transition: "all .2s" }}
              onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 30px rgba(124,109,250,0.35)"; }}
              onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "none"; }}>
              START ANALYSIS
            </button>
            <button onClick={scrollToAbout} style={{ padding: "13px 28px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "rgba(232,232,240,0.8)", fontSize: "14px", fontFamily: "'Syne', sans-serif", fontWeight: "600", cursor: "pointer", letterSpacing: "0.02em", transition: "all .2s" }}
              onMouseEnter={e => { e.target.style.borderColor = "rgba(255,255,255,0.35)"; e.target.style.color = "#e8e8f0"; }}
              onMouseLeave={e => { e.target.style.borderColor = "rgba(255,255,255,0.15)"; e.target.style.color = "rgba(232,232,240,0.8)"; }}>
              HOW IT WORKS
            </button>
            <button onClick={onHistory} style={{ padding: "13px 28px", background: "transparent", border: "1px solid rgba(34,211,238,0.25)", borderRadius: "8px", color: "#22d3ee", fontSize: "14px", fontFamily: "'Syne', sans-serif", fontWeight: "600", cursor: "pointer", letterSpacing: "0.02em", transition: "all .2s" }}
              onMouseEnter={e => { e.target.style.borderColor = "rgba(34,211,238,0.5)"; e.target.style.background = "rgba(34,211,238,0.06)"; }}
              onMouseLeave={e => { e.target.style.borderColor = "rgba(34,211,238,0.25)"; e.target.style.background = "transparent"; }}>
              VIEW HISTORY
            </button>
          </div>
        </div>

        {/* Hero card mockup */}
        <div data-id="hero-card" style={{ position: "absolute", right: "48px", top: "50%", transform: visible["hero-card"] ? "translateY(-50%) translateX(0)" : "translateY(-50%) translateX(40px)", opacity: visible["hero-card"] ? 1 : 0, transition: "all .8s ease .4s", width: "320px", background: "rgba(20,20,32,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px", backdropFilter: "blur(12px)", display: "window && window.innerWidth > 900 ? 'block' : 'none'" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "11px", fontFamily: "monospace", color: "rgba(232,232,240,0.5)" }}>SCANNING_DOC_001</span>
            <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#34d399" }}>78.9% ACCURACY</span>
          </div>
          <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", marginBottom: "20px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: "79%", background: "linear-gradient(90deg, #7c6dfa, #22d3ee)", borderRadius: "2px", animation: "scanBar 2.5s ease-in-out infinite" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontFamily: "monospace", color: "rgba(232,232,240,0.4)", marginBottom: "16px" }}>
            <span>NATURAL LANGUAGE PROCESSING</span><span>CALIBRATING...</span>
          </div>
          {[["OVERALL SCORE", "74", "#a78bfa"], ["SEMANTIC", "61", "#22d3ee"], ["SKILL GAPS", "4", "#fbbf24"]].map(([label, val, color]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", fontFamily: "monospace", color: "rgba(232,232,240,0.5)" }}>{label}</span>
              <span style={{ fontSize: "16px", fontFamily: "'Syne', sans-serif", fontWeight: "700", color }}>{val}</span>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "4px" }}>
            {["PYTHON", "FASTAPI", "DOCKER"].map(t => (
              <div key={t} style={{ padding: "8px", textAlign: "center", background: "rgba(124,109,250,0.08)", borderRadius: "6px", border: "1px solid rgba(124,109,250,0.15)", fontSize: "9px", fontFamily: "monospace", color: "#a78bfa" }}>{t}</div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div onClick={scrollToAbout} style={{ position: "absolute", bottom: "40px", left: "50%", transform: "translateX(-50%)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", color: "rgba(232,232,240,0.3)", fontSize: "11px", fontFamily: "monospace", animation: "bounce 2s infinite" }}>
          <span>SCROLL</span>
          <span style={{ fontSize: "18px" }}>↓</span>
        </div>
      </section>

      {/* ── Pipeline section ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "100px 48px" }}>
        <div data-id="pipeline-title" style={{ textAlign: "center", marginBottom: "60px", opacity: visible["pipeline-title"] ? 1 : 0, transform: visible["pipeline-title"] ? "translateY(0)" : "translateY(20px)", transition: "all .6s ease" }}>
          <p style={{ fontSize: "11px", fontFamily: "monospace", color: "#7c6dfa", letterSpacing: "0.15em", marginBottom: "12px" }}>HOW IT WORKS</p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontFamily: "'Syne', sans-serif", fontWeight: "800", letterSpacing: "-0.03em", margin: 0 }}>Two signals. One verdict.</h2>
        </div>

        <div data-id="pipeline-flow" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0", flexWrap: "wrap", maxWidth: "900px", margin: "0 auto", opacity: visible["pipeline-flow"] ? 1 : 0, transition: "all .7s ease .1s" }}>
          {[
            { icon: "↑", label: "PDF Upload", sub: "pypdf extraction", color: "#7c6dfa" },
            { icon: "→", label: "", sub: "", arrow: true },
            { icon: "⟐", label: "LLM Scorer", sub: "LangChain + Mistral", color: "#a78bfa" },
            { icon: "⫶", label: "", sub: "", split: true },
            { icon: "◈", label: "FAISS Semantic", sub: "MiniLM embeddings", color: "#22d3ee" },
            { icon: "→", label: "", sub: "", arrow: true },
            { icon: "⊕", label: "Divergence Check", sub: "score alignment", color: "#34d399" },
            { icon: "→", label: "", sub: "", arrow: true },
            { icon: "✓", label: "Full Report", sub: "gaps + rewrites", color: "#fbbf24" },
          ].map((item, i) => {
            if (item.arrow) return <div key={i} style={{ fontSize: "20px", color: "rgba(232,232,240,0.2)", padding: "0 8px" }}>→</div>;
            if (item.split) return <div key={i} style={{ fontSize: "12px", color: "rgba(232,232,240,0.2)", padding: "0 8px" }}>⊕</div>;
            return (
              <div key={i} style={{ textAlign: "center", padding: "20px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", minWidth: "120px" }}>
                <div style={{ fontSize: "20px", color: item.color, marginBottom: "8px" }}>{item.icon}</div>
                <div style={{ fontSize: "12px", fontWeight: "500", color: "#e8e8f0", marginBottom: "4px" }}>{item.label}</div>
                <div style={{ fontSize: "10px", fontFamily: "monospace", color: "rgba(232,232,240,0.4)" }}>{item.sub}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── About / Eval section ── */}
      <section ref={aboutRef} style={{ position: "relative", zIndex: 1, padding: "100px 48px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div data-id="about-title" style={{ marginBottom: "60px", opacity: visible["about-title"] ? 1 : 0, transform: visible["about-title"] ? "translateY(0)" : "translateY(20px)", transition: "all .6s ease" }}>
          <p style={{ fontSize: "11px", fontFamily: "monospace", color: "#7c6dfa", letterSpacing: "0.15em", marginBottom: "12px" }}>EVALUATION RESULTS</p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontFamily: "'Syne', sans-serif", fontWeight: "800", letterSpacing: "-0.03em", margin: "0 0 16px" }}>Measured. Not estimated.</h2>
          <p style={{ fontSize: "16px", color: "rgba(232,232,240,0.55)", maxWidth: "520px", lineHeight: "1.6", margin: 0 }}>Scored against a 20-pair human-labelled ground truth dataset across strong, moderate, and weak resume-JD matches.</p>
        </div>

        {/* Prompt selector */}
        <div data-id="eval-tabs" style={{ display: "flex", gap: "8px", marginBottom: "32px", opacity: visible["eval-tabs"] ? 1 : 0, transition: "all .6s ease .1s" }}>
          {EVAL_DATA.map((d, i) => (
            <button key={i} onClick={() => setActiveMetric(i)}
              style={{ padding: "8px 18px", borderRadius: "8px", border: `1px solid ${activeMetric === i ? "rgba(124,109,250,0.5)" : "rgba(255,255,255,0.08)"}`, background: activeMetric === i ? "rgba(124,109,250,0.12)" : "transparent", color: activeMetric === i ? "#a78bfa" : "rgba(232,232,240,0.5)", fontSize: "12px", fontFamily: "monospace", cursor: "pointer", transition: "all .2s" }}>
              {d.prompt.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Metric cards */}
        <div data-id="eval-cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "40px", opacity: visible["eval-cards"] ? 1 : 0, transition: "all .6s ease .2s" }}>
          {[
            { label: "MAE", value: EVAL_DATA[activeMetric].mae, suffix: "pts", note: "lower = better", good: v => v < 10, invert: true },
            { label: "Within-10 accuracy", value: EVAL_DATA[activeMetric].within10 + "%", note: "vs human label", good: v => parseFloat(v) > 75 },
            { label: "Tier accuracy", value: EVAL_DATA[activeMetric].tierAcc + "%", note: "strong/mod/weak", good: v => parseFloat(v) > 80 },
            { label: "Macro F1", value: EVAL_DATA[activeMetric].f1, note: "tier classification", good: v => v > 0.75 },
            { label: "Pearson r", value: EVAL_DATA[activeMetric].pearson, note: "linear correlation", good: v => v > 0.85 },
            { label: "Avg latency", value: EVAL_DATA[activeMetric].latency + "s", note: "per analysis", good: v => parseFloat(v) < 12, invert: true },
          ].map((m, i) => {
            const isGood = m.good(m.value);
            return (
              <div key={i} style={{ padding: "20px", background: "rgba(255,255,255,0.02)", border: `1px solid ${isGood ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)"}`, borderRadius: "12px", position: "relative", overflow: "hidden" }}>
                {isGood && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, #34d399, transparent)" }} />}
                <div style={{ fontSize: "10px", fontFamily: "monospace", color: "rgba(232,232,240,0.4)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{m.label}</div>
                <div style={{ fontSize: "26px", fontFamily: "'Syne', sans-serif", fontWeight: "800", color: isGood ? "#34d399" : "#e8e8f0", marginBottom: "4px" }}>{m.value}</div>
                <div style={{ fontSize: "10px", color: "rgba(232,232,240,0.35)", fontFamily: "monospace" }}>{m.note}</div>
              </div>
            );
          })}
        </div>

        {/* Best prompt callout */}
        <div data-id="eval-callout" style={{ padding: "20px 24px", background: "rgba(124,109,250,0.06)", border: "1px solid rgba(124,109,250,0.2)", borderRadius: "12px", display: "flex", alignItems: "flex-start", gap: "16px", maxWidth: "600px", opacity: visible["eval-callout"] ? 1 : 0, transition: "all .6s ease .3s" }}>
          <span style={{ fontSize: "24px", flexShrink: 0, marginTop: "2px" }}>◎</span>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "500", color: "#a78bfa", marginBottom: "6px" }}>v3 few-shot selected as default</div>
            <div style={{ fontSize: "13px", color: "rgba(232,232,240,0.55)", lineHeight: "1.6" }}>
              Lowest MAE (8.16), highest within-10 accuracy (78.9%), and fastest latency (10.09s). A 24.7% MAE improvement over the baseline prompt. v2 achieves better tier F1 (0.839) and is available via the prompt selector in the analysis view.
            </div>
          </div>
        </div>
      </section>

      {/* ── Tech stack ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "100px 48px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div data-id="stack-title" style={{ textAlign: "center", marginBottom: "48px", opacity: visible["stack-title"] ? 1 : 0, transition: "all .6s ease" }}>
          <p style={{ fontSize: "11px", fontFamily: "monospace", color: "#7c6dfa", letterSpacing: "0.15em", marginBottom: "12px" }}>TECH STACK</p>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontFamily: "'Syne', sans-serif", fontWeight: "800", letterSpacing: "-0.03em", margin: 0 }}>Built with purpose.</h2>
        </div>
        <div data-id="stack-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", maxWidth: "840px", margin: "0 auto", opacity: visible["stack-grid"] ? 1 : 0, transition: "all .6s ease .1s" }}>
          {STACK.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", transition: "border-color .2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(124,109,250,0.3)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}>
              <span style={{ fontSize: "18px", color: "#7c6dfa", flexShrink: 0 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "500", color: "#e8e8f0" }}>{s.label}</div>
                <div style={{ fontSize: "11px", fontFamily: "monospace", color: "rgba(232,232,240,0.4)" }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "100px 48px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div data-id="cta" style={{ opacity: visible["cta"] ? 1 : 0, transform: visible["cta"] ? "translateY(0)" : "translateY(20px)", transition: "all .7s ease" }}>
          <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(124,109,250,0.1)", border: "1px solid rgba(124,109,250,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", margin: "0 auto 24px" }}>◎</div>
          <h2 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontFamily: "'Syne', sans-serif", fontWeight: "800", letterSpacing: "-0.03em", margin: "0 0 16px" }}>
            Ready to close<br />
            <span style={{ background: "linear-gradient(90deg, #7c6dfa, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>the gap?</span>
          </h2>
          <p style={{ fontSize: "16px", color: "rgba(232,232,240,0.5)", margin: "0 0 40px", lineHeight: "1.6" }}>
            Your resume. Any job description. A scored report in under 15 seconds.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onAnalyse} style={{ padding: "14px 36px", background: "linear-gradient(135deg, #7c6dfa, #5b52d9)", border: "none", borderRadius: "8px", color: "white", fontSize: "15px", fontFamily: "'Syne', sans-serif", fontWeight: "700", cursor: "pointer", letterSpacing: "0.02em", transition: "all .2s" }}
              onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 12px 40px rgba(124,109,250,0.4)"; }}
              onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "none"; }}>
              GET STARTED FREE
            </button>
            <button onClick={onHistory} style={{ padding: "14px 36px", background: "transparent", border: "1px solid rgba(34,211,238,0.3)", borderRadius: "8px", color: "#22d3ee", fontSize: "15px", fontFamily: "'Syne', sans-serif", fontWeight: "600", cursor: "pointer", letterSpacing: "0.02em", transition: "all .2s" }}
              onMouseEnter={e => { e.target.style.borderColor = "rgba(34,211,238,0.6)"; e.target.style.background = "rgba(34,211,238,0.06)"; }}
              onMouseLeave={e => { e.target.style.borderColor = "rgba(34,211,238,0.3)"; e.target.style.background = "transparent"; }}>
              VIEW PAST ANALYSES
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.05)", padding: "24px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "20px", height: "20px", borderRadius: "5px", background: "linear-gradient(135deg, #7c6dfa, #22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "700", color: "white" }}>RA</div>
          <span style={{ fontSize: "12px", fontFamily: "monospace", color: "rgba(232,232,240,0.3)" }}>© 2026 Resume Analyzer · Built with LangChain, FastAPI, FAISS</span>
        </div>
        <div style={{ display: "flex", gap: "20px" }}>
          {[["API Docs", "/docs"], ["GitHub", "#"]].map(([label]) => (
            <span key={label} style={{ fontSize: "12px", fontFamily: "monospace", color: "rgba(232,232,240,0.3)", cursor: "pointer", transition: "color .15s" }}
              onMouseEnter={e => e.target.style.color = "rgba(232,232,240,0.7)"}
              onMouseLeave={e => e.target.style.color = "rgba(232,232,240,0.3)"}>
              {label}
            </span>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes bounce { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(6px)} }
        @keyframes scanBar { 0%{width:20%} 50%{width:90%} 100%{width:20%} }
      `}</style>
    </div>
  );
}
