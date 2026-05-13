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

  .app { min-height: 100vh; display: grid; grid-template-rows: auto 1fr; }

  /* ── Header ── */
  .header {
    padding: 20px 32px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 16px;
    background: var(--bg);
    position: sticky; top: 0; z-index: 100;
    backdrop-filter: blur(12px);
  }
  .logo-mark {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, var(--accent), var(--teal));
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Syne', sans-serif; font-weight: 800; font-size: 16px;
    color: white; flex-shrink: 0;
  }
  .header-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 17px; letter-spacing: -0.02em; }
  .header-sub { font-size: 12px; color: var(--muted); margin-left: auto; font-family: 'DM Mono', monospace; }
  .nav { display: flex; gap: 4px; margin-left: 24px; }
  .nav-btn {
    padding: 6px 14px; border-radius: 8px; border: none;
    background: transparent; color: var(--muted);
    font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; transition: all .15s;
  }
  .nav-btn:hover { color: var(--text); background: var(--bg3); }
  .nav-btn.active { color: var(--text); background: var(--bg3); border: 1px solid var(--border2); }

  /* ── Analyse layout ── */
  .main { display: grid; grid-template-columns: 420px 1fr; min-height: calc(100vh - 65px); }
  .panel-left { border-right: 1px solid var(--border); padding: 28px; overflow-y: auto; background: var(--bg); }
  .panel-right { padding: 28px; overflow-y: auto; background: var(--bg2); }

  /* ── Shared atoms ── */
  .section-label {
    font-family: 'DM Mono', monospace; font-size: 10px; font-weight: 500;
    letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px;
  }
  .badge { font-size: 10px; padding: 2px 7px; border-radius: 20px; font-family: 'DM Mono', monospace; font-weight: 500; }
  .badge-accent { background: rgba(124,109,250,0.15); color: var(--accent2); }
  .badge-green  { background: rgba(52,211,153,0.12);  color: var(--green); }
  .badge-amber  { background: rgba(251,191,36,0.12);  color: var(--amber); }
  .badge-red    { background: rgba(248,113,113,0.12); color: var(--red); }
  .badge-teal   { background: rgba(34,211,238,0.12);  color: var(--teal); }

  .error-box {
    background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2);
    border-radius: var(--radius-sm); padding: 14px 16px; font-size: 13px; color: var(--red); margin-bottom: 16px;
  }
  .meta-bar { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
  .meta-chip {
    font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted);
    background: var(--bg3); border: 1px solid var(--border); border-radius: 20px;
    padding: 4px 10px; display: flex; align-items: center; gap: 6px;
  }

  /* ── Upload form ── */
  .dropzone {
    border: 1.5px dashed var(--border2); border-radius: var(--radius);
    padding: 32px 20px; text-align: center; cursor: pointer;
    transition: all .2s; background: var(--bg3); margin-bottom: 16px; position: relative;
  }
  .dropzone:hover, .dropzone.drag-over { border-color: var(--accent); background: rgba(124,109,250,0.06); }
  .dropzone.has-file { border-color: var(--green); border-style: solid; background: rgba(52,211,153,0.05); }
  .dropzone input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; }
  .drop-icon { font-size: 28px; margin-bottom: 8px; display: block; }
  .drop-title { font-family: 'Syne', sans-serif; font-weight: 600; font-size: 14px; margin-bottom: 4px; }
  .drop-sub { font-size: 12px; color: var(--muted); }

  .field { margin-bottom: 16px; }
  .field-label { font-size: 12px; font-weight: 500; color: var(--muted); margin-bottom: 6px; display: block; }
  textarea, select {
    width: 100%; background: var(--bg3); border: 1px solid var(--border);
    border-radius: var(--radius-sm); color: var(--text);
    font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 10px 12px;
    resize: vertical; outline: none; transition: border .15s;
  }
  textarea:focus, select:focus { border-color: var(--border2); }
  textarea { min-height: 160px; line-height: 1.5; }
  select { height: 36px; cursor: pointer; }

  .options-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
  .toggle-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 12px; background: var(--bg3); border: 1px solid var(--border);
    border-radius: var(--radius-sm); margin-bottom: 20px;
  }
  .toggle-label { font-size: 13px; color: var(--muted); }
  .toggle {
    width: 36px; height: 20px; background: var(--bg);
    border-radius: 10px; border: 1px solid var(--border2);
    cursor: pointer; position: relative; transition: background .2s; flex-shrink: 0;
  }
  .toggle.on { background: var(--accent); border-color: var(--accent); }
  .toggle::after {
    content: ''; position: absolute; width: 14px; height: 14px; background: white;
    border-radius: 50%; top: 2px; left: 2px; transition: transform .2s;
  }
  .toggle.on::after { transform: translateX(16px); }

  .submit-btn {
    width: 100%; padding: 13px; background: var(--accent); border: none;
    border-radius: var(--radius-sm); color: white;
    font-family: 'Syne', sans-serif; font-weight: 700; font-size: 14px;
    cursor: pointer; letter-spacing: .01em; transition: all .15s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .submit-btn:hover:not(:disabled) { background: var(--accent2); transform: translateY(-1px); }
  .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .spinner {
    width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white; border-radius: 50%; animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Result panel ── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 100%; text-align: center; color: var(--muted); gap: 12px; padding: 48px;
  }
  .empty-icon { font-size: 48px; opacity: 0.3; }
  .empty-title { font-family: 'Syne', sans-serif; font-weight: 600; font-size: 16px; color: var(--text); opacity: 0.4; }

  .score-hero { display: flex; align-items: center; gap: 24px; padding: 24px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 16px; }
  .score-ring { position: relative; width: 100px; height: 100px; flex-shrink: 0; }
  .score-ring svg { transform: rotate(-90deg); }
  .score-num { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 26px; }
  .score-meta { flex: 1; }
  .score-label { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 18px; margin-bottom: 6px; }
  .score-reasoning { font-size: 13px; color: var(--muted); line-height: 1.5; }

  .dims { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 16px; }
  .dim-card { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px; }
  .dim-label { font-size: 11px; color: var(--muted); margin-bottom: 6px; }
  .dim-score { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 20px; }
  .dim-bar { height: 3px; background: var(--border); border-radius: 2px; margin-top: 6px; overflow: hidden; }
  .dim-bar-fill { height: 100%; border-radius: 2px; transition: width .6s ease; }

  .result-section { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; margin-bottom: 12px; }
  .result-section-title { font-family: 'Syne', sans-serif; font-weight: 600; font-size: 13px; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }

  .gap-item { padding: 10px 0; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px; }
  .gap-item:last-child { border-bottom: none; padding-bottom: 0; }
  .gap-item:first-child { padding-top: 0; }
  .gap-header { display: flex; align-items: center; gap: 8px; }
  .gap-skill { font-weight: 500; font-size: 13px; }
  .gap-suggestion { font-size: 12px; color: var(--muted); }

  .bullet-item { padding: 10px 0; border-bottom: 1px solid var(--border); }
  .bullet-item:last-child { border-bottom: none; }
  .bullet-orig { font-size: 12px; color: var(--muted); padding: 6px 10px; border-left: 2px solid var(--red); background: rgba(248,113,113,0.05); border-radius: 0 4px 4px 0; margin-bottom: 6px; font-family: 'DM Mono', monospace; }
  .bullet-improved { font-size: 12px; color: var(--text); padding: 6px 10px; border-left: 2px solid var(--green); background: rgba(52,211,153,0.05); border-radius: 0 4px 4px 0; margin-bottom: 6px; font-family: 'DM Mono', monospace; }
  .bullet-reason { font-size: 11px; color: var(--muted); font-style: italic; }

  .kw-list { display: flex; flex-wrap: wrap; gap: 6px; }
  .kw { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-family: 'DM Mono', monospace; }
  .kw-match { background: rgba(52,211,153,0.1); color: var(--green); border: 1px solid rgba(52,211,153,0.2); }
  .kw-miss  { background: rgba(248,113,113,0.08); color: var(--red); border: 1px solid rgba(248,113,113,0.15); }

  .semantic-row { display: flex; align-items: center; gap: 16px; }
  .semantic-score-block { text-align: center; flex-shrink: 0; }
  .semantic-num { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 32px; line-height: 1; }
  .semantic-label { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .divergence-block { flex: 1; }
  .divergence-flag-label { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
  .divergence-note { font-size: 12px; color: var(--muted); line-height: 1.5; }

  .strength-item { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; padding: 4px 0; color: var(--text); }
  .strength-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); margin-top: 6px; flex-shrink: 0; }

  /* ── History tab ── */
  .history-list { display: flex; flex-direction: column; gap: 8px; }
  .history-item {
    background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius-sm);
    padding: 14px 16px; display: flex; align-items: center; gap: 16px;
    cursor: pointer; transition: border-color .15s;
  }
  .history-item:hover { border-color: var(--border2); }
  .history-score { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 22px; min-width: 44px; text-align: center; }
  .history-meta { flex: 1; }
  .history-id   { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); }
  .history-date { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .history-right { text-align: right; font-size: 12px; color: var(--muted); }

  /* ── History detail drawer ── */
  .drawer-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.6);
    z-index: 200; display: flex; justify-content: flex-end;
    animation: fadeIn .15s ease;
  }
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  .drawer {
    width: min(680px, 100vw); height: 100vh; background: var(--bg2);
    border-left: 1px solid var(--border2); overflow-y: auto;
    animation: slideIn .2s ease;
    display: flex; flex-direction: column;
  }
  @keyframes slideIn { from { transform: translateX(40px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
  .drawer-header {
    padding: 20px 24px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; background: var(--bg2); z-index: 10;
  }
  .drawer-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 15px; }
  .drawer-close {
    width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border2);
    background: transparent; color: var(--muted); font-size: 18px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: all .15s;
  }
  .drawer-close:hover { background: var(--bg3); color: var(--text); }
  .drawer-body { padding: 24px; flex: 1; }
  .drawer-loading { padding: 48px; text-align: center; color: var(--muted); font-size: 13px; }
`;

export default styles;
