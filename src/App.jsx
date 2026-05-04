import { useState, useEffect, useRef, useCallback } from "react";

// Candle Chart Component
function CandleChart({ candles, width = 560, height = 260 }) {
  const padding = { top: 16, right: 16, bottom: 28, left: 52 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allPrices = candles.flatMap((c) => [c.high, c.low]);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP || 1;
  const pad = range * 0.08;
  const toY = (p) => padding.top + ((maxP + pad - p) / (range + 2 * pad)) * chartH;
  const candleW = Math.max(6, Math.floor(chartW / candles.length) - 3);

  const levels = 5;
  const priceLines = Array.from({ length: levels }, (_, i) =>
    minP - pad + ((range + 2 * pad) / (levels - 1)) * i
  ).reverse();

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {priceLines.map((p, i) => (
        <g key={i}>
          <line x1={padding.left} x2={padding.left + chartW} y1={toY(p)} y2={toY(p)} stroke="#1e2d3d" strokeWidth={1} />
          <text x={padding.left - 6} y={toY(p) + 4} textAnchor="end" fill="#4a6278" fontSize={9} fontFamily="'Courier New', monospace">{p.toFixed(2)}</text>
        </g>
      ))}
      {candles.map((c, i) => {
        const x = padding.left + (i / candles.length) * chartW + chartW / candles.length / 2;
        const isGreen = c.close >= c.open;
        const color = isGreen ? "#00d084" : "#ff4757";
        const bodyTop = toY(Math.max(c.open, c.close));
        const bodyBot = toY(Math.min(c.open, c.close));
        const bodyH = Math.max(1, bodyBot - bodyTop);
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={toY(c.high)} y2={toY(c.low)} stroke={color} strokeWidth={1.2} />
            <rect x={x - candleW / 2} y={bodyTop} width={candleW} height={bodyH} fill={color} fillOpacity={0.85} stroke={color} strokeWidth={0.5} />
          </g>
        );
      })}
      {candles.length > 0 && (() => {
        const last = candles[candles.length - 1];
        const y = toY(last.close);
        const isGreen = last.close >= last.open;
        return (
          <g>
            <line x1={padding.left} x2={padding.left + chartW} y1={y} y2={y} stroke={isGreen ? "#00d084" : "#ff4757"} strokeWidth={1} strokeDasharray="4,3" opacity={0.6} />
            <rect x={padding.left + chartW - 2} y={y - 9} width={52} height={16} rx={3} fill={isGreen ? "#00d084" : "#ff4757"} />
            <text x={padding.left + chartW + 24} y={y + 4} textAnchor="middle" fill="#0a0f14" fontSize={9} fontFamily="'Courier New', monospace" fontWeight="bold">{last.close.toFixed(2)}</text>
          </g>
        );
      })()}
      <text x={padding.left + chartW / 2} y={height - 4} textAnchor="middle" fill="#2d4a5f" fontSize={9} fontFamily="monospace">{candles.length} candles | 1H TF</text>
    </svg>
  );
}

// Chart Generation
function generateCandles(scenario) {
  const patterns = {
    uptrend_pullback: () => {
      let price = 100 + Math.random() * 50;
      const candles = [];
      for (let i = 0; i < 18; i++) {
        const body = 0.3 + Math.random() * 1.2;
        const open = price; const close = price + body;
        candles.push({ open, close, high: close + Math.random() * 0.5, low: open - Math.random() * 0.3 });
        price = close;
      }
      for (let i = 0; i < 5; i++) {
        const body = 0.2 + Math.random() * 0.9;
        const open = price; const close = price - body;
        candles.push({ open, close, high: open + Math.random() * 0.3, low: close - Math.random() * 0.5 });
        price = close;
      }
      return candles;
    },
    downtrend_pullback: () => {
      let price = 150 + Math.random() * 50;
      const candles = [];
      for (let i = 0; i < 18; i++) {
        const body = 0.3 + Math.random() * 1.2;
        const open = price; const close = price - body;
        candles.push({ open, close, high: open + Math.random() * 0.3, low: close - Math.random() * 0.5 });
        price = close;
      }
      for (let i = 0; i < 5; i++) {
        const body = 0.2 + Math.random() * 0.9;
        const open = price; const close = price + body;
        candles.push({ open, close, high: close + Math.random() * 0.5, low: open - Math.random() * 0.3 });
        price = close;
      }
      return candles;
    },
    range_breakout_up: () => {
      let price = 100 + Math.random() * 30;
      const candles = [];
      for (let i = 0; i < 16; i++) {
        const dir = Math.random() > 0.5 ? 1 : -1;
        const body = Math.random() * 0.7;
        const open = price; const close = price + dir * body;
        candles.push({ open, close, high: Math.max(open, close) + Math.random() * 0.4, low: Math.min(open, close) - Math.random() * 0.4 });
        price = close;
      }
      for (let i = 0; i < 7; i++) {
        const body = 0.5 + Math.random() * 1.5;
        const open = price; const close = price + body;
        candles.push({ open, close, high: close + Math.random() * 0.4, low: open - Math.random() * 0.2 });
        price = close;
      }
      return candles;
    },
    range_breakout_down: () => {
      let price = 150 + Math.random() * 30;
      const candles = [];
      for (let i = 0; i < 16; i++) {
        const dir = Math.random() > 0.5 ? 1 : -1;
        const body = Math.random() * 0.7;
        const open = price; const close = price + dir * body;
        candles.push({ open, close, high: Math.max(open, close) + Math.random() * 0.4, low: Math.min(open, close) - Math.random() * 0.4 });
        price = close;
      }
      for (let i = 0; i < 7; i++) {
        const body = 0.5 + Math.random() * 1.5;
        const open = price; const close = price - body;
        candles.push({ open, close, high: open + Math.random() * 0.2, low: close - Math.random() * 0.4 });
        price = close;
      }
      return candles;
    },
    liquidity_sweep_buy: () => {
      let price = 120 + Math.random() * 30;
      const candles = [];
      for (let i = 0; i < 12; i++) {
        const body = 0.2 + Math.random() * 1.0;
        const open = price; const close = price - body;
        candles.push({ open, close, high: open + Math.random() * 0.3, low: close - Math.random() * 0.5 });
        price = close;
      }
      const sweepOpen = price; const sweepClose = price + 1.5;
      candles.push({ open: sweepOpen, close: sweepClose, high: sweepClose + 0.5, low: sweepOpen - 3 });
      price = sweepClose;
      for (let i = 0; i < 7; i++) {
        const body = 0.3 + Math.random() * 1.0;
        const open = price; const close = price + body;
        candles.push({ open, close, high: close + Math.random() * 0.4, low: open - Math.random() * 0.2 });
        price = close;
      }
      return candles;
    },
    liquidity_sweep_sell: () => {
      let price = 120 + Math.random() * 30;
      const candles = [];
      for (let i = 0; i < 12; i++) {
        const body = 0.2 + Math.random() * 1.0;
        const open = price; const close = price + body;
        candles.push({ open, close, high: close + Math.random() * 0.5, low: open - Math.random() * 0.3 });
        price = close;
      }
      const sweepOpen = price; const sweepClose = price - 1.5;
      candles.push({ open: sweepOpen, close: sweepClose, high: sweepOpen + 3, low: sweepClose - 0.5 });
      price = sweepClose;
      for (let i = 0; i < 7; i++) {
        const body = 0.3 + Math.random() * 1.0;
        const open = price; const close = price - body;
        candles.push({ open, close, high: open + Math.random() * 0.2, low: close - Math.random() * 0.4 });
        price = close;
      }
      return candles;
    },
    fvg_retest: () => {
      let price = 100 + Math.random() * 40;
      const candles = [];
      for (let i = 0; i < 10; i++) {
        const body = 0.2 + Math.random() * 0.8;
        const open = price; const close = price + body;
        candles.push({ open, close, high: close + Math.random() * 0.3, low: open - Math.random() * 0.2 });
        price = close;
      }
      candles.push({ open: price, close: price + 4, high: price + 4.5, low: price - 0.2 });
      price += 4;
      for (let i = 0; i < 5; i++) {
        const body = 0.1 + Math.random() * 0.6;
        const open = price; const close = price + body;
        candles.push({ open, close, high: close + Math.random() * 0.3, low: open - Math.random() * 0.2 });
        price = close;
      }
      for (let i = 0; i < 6; i++) {
        const body = 0.2 + Math.random() * 0.7;
        const open = price; const close = price - body;
        candles.push({ open, close, high: open + Math.random() * 0.2, low: close - Math.random() * 0.3 });
        price = close;
      }
      return candles;
    },
  };
  const keys = Object.keys(patterns);
  const key = scenario || keys[Math.floor(Math.random() * keys.length)];
  return { candles: patterns[key](), scenario: key };
}

const SCENARIO_META = {
  uptrend_pullback: { correct: "BUY", hint: "Uptrend com pullback" },
  downtrend_pullback: { correct: "SELL", hint: "Downtrend com pullback" },
  range_breakout_up: { correct: "BUY", hint: "Rompimento de range pra cima" },
  range_breakout_down: { correct: "SELL", hint: "Rompimento de range pra baixo" },
  liquidity_sweep_buy: { correct: "BUY", hint: "Sweep de liquidez (long)" },
  liquidity_sweep_sell: { correct: "SELL", hint: "Sweep de liquidez (short)" },
  fvg_retest: { correct: "BUY", hint: "Retest de Fair Value Gap" },
};

const LEVELS = [
  { level: 1, name: "Novato", xpRequired: 0, color: "#4a6278" },
  { level: 2, name: "Aprendiz", xpRequired: 100, color: "#3d84c8" },
  { level: 3, name: "Analista", xpRequired: 250, color: "#7c5cbf" },
  { level: 4, name: "Trader", xpRequired: 500, color: "#e8a838" },
  { level: 5, name: "Sniper", xpRequired: 900, color: "#ff4757" },
  { level: 6, name: "Institucional", xpRequired: 1500, color: "#00d084" },
];

function getCurrentLevel(xp) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.xpRequired) lvl = l; }
  return lvl;
}

function getNextLevel(xp) {
  for (const l of LEVELS) { if (xp < l.xpRequired) return l; }
  return null;
}

const STORAGE_KEY = "chart_sniper_v1";

function loadState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveState(state) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

async function getAIFeedback({ scenario, userChoice, isCorrect, streak }) {
  const meta = SCENARIO_META[scenario];
  try {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario, userChoice, isCorrect, streak, hint: meta.hint, correct: meta.correct }),
    });
    if (!res.ok) throw new Error("api_error");
    const data = await res.json();
    if (data?.feedback) return data.feedback;
    throw new Error("no_feedback");
  } catch {
    if (userChoice === "TIMEOUT") return `Tempo esgotado. Setup: ${meta.hint}. Decisao correta era ${meta.correct}.`;
    return isCorrect
      ? `Bom read! ${meta.hint} - entrada coerente com a estrutura.`
      : `Setup era ${meta.hint}. Operacao correta: ${meta.correct}. Observe a estrutura antes de clicar.`;
  }
}

export default function TradingGame() {
  const [screen, setScreen] = useState("home");
  const [chartData, setChartData] = useState(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [history, setHistory] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [aiFeedback, setAiFeedback] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [timer, setTimer] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const [levelUpFlash, setLevelUpFlash] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const s = loadState();
    if (s) {
      setXp(s.xp || 0);
      setStreak(s.streak || 0);
      setBestStreak(s.bestStreak || 0);
      setTotalAnswered(s.totalAnswered || 0);
      setTotalCorrect(s.totalCorrect || 0);
      setHistory(Array.isArray(s.history) ? s.history : []);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveState({ xp, streak, bestStreak, totalAnswered, totalCorrect, history });
  }, [hydrated, xp, streak, bestStreak, totalAnswered, totalCorrect, history]);

  const currentLevel = getCurrentLevel(xp);
  const nextLevel = getNextLevel(xp);
  const xpProgress = nextLevel ? ((xp - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired)) * 100 : 100;

  const startRound = useCallback(() => {
    const { candles, scenario } = generateCandles();
    setChartData({ candles, scenario });
    setLastResult(null);
    setAiFeedback("");
    setTimer(30);
    setTimerActive(true);
    setScreen("game");
  }, []);

  const handleAnswer = useCallback(async (choice) => {
    if (!chartData || lastResult) return;
    clearInterval(timerRef.current);
    setTimerActive(false);
    const meta = SCENARIO_META[chartData.scenario];
    const isCorrect = choice !== "TIMEOUT" && choice === meta.correct;
    const xpEarned = choice === "TIMEOUT" ? 0 : isCorrect ? 20 + streak * 5 : 5;
    const newStreak = isCorrect ? streak + 1 : 0;
    const newXp = xp + xpEarned;
    const newBest = Math.max(bestStreak, newStreak);
    const oldLevel = getCurrentLevel(xp).level;
    const newLevelObj = getCurrentLevel(newXp);
    if (newLevelObj.level > oldLevel) {
      setLevelUpFlash(newLevelObj);
      setTimeout(() => setLevelUpFlash(null), 2400);
    }
    setLastResult({ isCorrect, choice, xpEarned, correct: meta.correct, hint: meta.hint });
    setXp(newXp);
    setStreak(newStreak);
    setBestStreak(newBest);
    setTotalAnswered((t) => t + 1);
    if (isCorrect) setTotalCorrect((t) => t + 1);
    setHistory((h) => [{ scenario: meta.hint, choice, correct: meta.correct, isCorrect, xpEarned, ts: Date.now() }, ...h.slice(0, 19)]);
    setLoadingFeedback(true);
    const feedback = await getAIFeedback({ scenario: chartData.scenario, userChoice: choice, isCorrect, streak: newStreak });
    setAiFeedback(feedback);
    setLoadingFeedback(false);
  }, [chartData, lastResult, streak, xp, bestStreak]);

  const handleAnswerRef = useRef(handleAnswer);
  useEffect(() => { handleAnswerRef.current = handleAnswer; }, [handleAnswer]);

  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setTimerActive(false);
          handleAnswerRef.current("TIMEOUT");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const resetProgress = () => {
    if (!confirm("Zerar todo o progresso? Essa acao nao pode ser desfeita.")) return;
    setXp(0); setStreak(0); setBestStreak(0); setTotalAnswered(0); setTotalCorrect(0); setHistory([]);
  };

  if (screen === "home") {
    return (
      <div style={styles.root}>
        <div style={styles.homeWrap}>
          <div style={styles.logo}>
            <span style={styles.logoAccent}>CHART</span>
            <span style={styles.logoMain}>SNIPER</span>
          </div>
          <p style={styles.tagline}>Treine sua leitura de mercado. Suba de nivel.</p>
          <div style={styles.levelCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ color: currentLevel.color, fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: "uppercase" }}>{currentLevel.name}</span>
              <span style={{ color: "#4a6278", fontSize: 11 }}>{xp} XP</span>
            </div>
            <div style={styles.xpBarBg}>
              <div style={{ ...styles.xpBarFill, width: `${xpProgress}%`, background: currentLevel.color }} />
            </div>
            {nextLevel && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ color: "#2d4a5f", fontSize: 10 }}>Lv {currentLevel.level}</span>
                <span style={{ color: "#2d4a5f", fontSize: 10 }}>Lv {nextLevel.level} - {nextLevel.name}</span>
              </div>
            )}
          </div>
          <div style={styles.statsRow}>
            {[{ label: "Acertos", value: `${accuracy}%` }, { label: "Streak", value: streak }, { label: "Rodadas", value: totalAnswered }].map((s) => (
              <div key={s.label} style={styles.statBox}>
                <div style={styles.statVal}>{s.value}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
          <button style={styles.btnPrimary} onClick={startRound}>INICIAR ROUND</button>
          {totalAnswered > 0 && (<button style={styles.btnSecondary} onClick={() => setScreen("stats")}>VER HISTORICO</button>)}
          <div style={styles.howto}>
            <p style={{ color: "#2d4a5f", fontSize: 11, margin: 0 }}>Analise o grafico - escolha BUY ou SELL - ganhe XP - suba de nivel</p>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "stats") {
    return (
      <div style={styles.root}>
        <div style={styles.statsWrap}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button style={styles.backBtn} onClick={() => setScreen("home")}>{"<"}</button>
              <span style={styles.sectionTitle}>Historico</span>
            </div>
            <button style={{ ...styles.backBtn, color: "#ff4757", borderColor: "#3a1a22", fontSize: 10, letterSpacing: 1 }} onClick={resetProgress}>RESET</button>
          </div>
          <div style={styles.statsRow}>
            {[{ label: "Total", value: totalAnswered }, { label: "Corretos", value: totalCorrect }, { label: "Acuracia", value: `${accuracy}%` }, { label: "Best streak", value: bestStreak }].map((s) => (
              <div key={s.label} style={styles.statBox}>
                <div style={styles.statVal}>{s.value}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            {history.length === 0 ? (
              <div style={{ color: "#2d4a5f", fontSize: 11, textAlign: "center", padding: "40px 0" }}>Nenhum round registrado ainda.</div>
            ) : (
              history.map((h, i) => (
                <div key={i} style={{ ...styles.historyItem, borderLeft: `3px solid ${h.isCorrect ? "#00d084" : "#ff4757"}` }}>
                  <span style={{ color: "#7a9ab0", fontSize: 11, flex: 1 }}>{h.scenario}</span>
                  <span style={{ color: h.isCorrect ? "#00d084" : "#ff4757", fontSize: 11, fontWeight: 700 }}>{h.choice} {h.isCorrect ? "OK" : "X"}</span>
                  <span style={{ color: "#3d84c8", fontSize: 11, marginLeft: 8 }}>+{h.xpEarned}xp</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  const timerPct = (timer / 30) * 100;
  const timerColor = timer > 15 ? "#00d084" : timer > 8 ? "#e8a838" : "#ff4757";

  return (
    <div style={styles.root}>
      <div style={styles.gameWrap}>
        {levelUpFlash && (
          <div style={styles.levelUpOverlay}>
            <div style={{ ...styles.levelUpCard, borderColor: levelUpFlash.color, boxShadow: `0 0 40px ${levelUpFlash.color}66` }}>
              <div style={{ color: levelUpFlash.color, fontSize: 11, letterSpacing: 4 }}>LEVEL UP</div>
              <div style={{ color: "#e8e8e8", fontSize: 22, fontWeight: 800, letterSpacing: 3, marginTop: 4 }}>{levelUpFlash.name.toUpperCase()}</div>
              <div style={{ color: "#4a6278", fontSize: 10, marginTop: 6 }}>Lv {levelUpFlash.level}</div>
            </div>
          </div>
        )}
        <div style={styles.gameHeader}>
          <button style={styles.backBtn} onClick={() => setScreen("home")}>{"<"}</button>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#e8a838", fontSize: 11 }}>STREAK</span>
              <span style={{ color: "#e8a838", fontWeight: 700, fontSize: 13 }}>{streak}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#3d84c8", fontSize: 11 }}>XP</span>
              <span style={{ color: "#3d84c8", fontWeight: 700, fontSize: 13 }}>{xp}</span>
            </div>
            <div style={{ color: currentLevel.color, fontWeight: 700, fontSize: 11, letterSpacing: 1 }}>{currentLevel.name}</div>
          </div>
        </div>
        {!lastResult && (
          <div style={styles.timerBarBg}>
            <div style={{ ...styles.timerBarFill, width: `${timerPct}%`, background: timerColor, transition: "width 1s linear, background 0.3s" }} />
            <span style={{ ...styles.timerNum, color: timerColor }}>{timer}s</span>
          </div>
        )}
        <div style={styles.chartBox}>
          <div style={{ overflowX: "auto" }}>
            {chartData && (<CandleChart candles={chartData.candles} width={560} height={260} />)}
          </div>
          <div style={styles.chartLabel}>Onde o preco vai?</div>
        </div>
        {!lastResult ? (
          <div style={styles.actionRow}>
            <button style={styles.btnBuy} onClick={() => handleAnswer("BUY")}>BUY / LONG</button>
            <button style={styles.btnSell} onClick={() => handleAnswer("SELL")}>SELL / SHORT</button>
          </div>
        ) : (
          <div style={styles.resultBox}>
            <div style={{ ...styles.resultBadge, background: lastResult.isCorrect ? "rgba(0,208,132,0.1)" : "rgba(255,71,87,0.1)", border: `1px solid ${lastResult.isCorrect ? "#00d084" : "#ff4757"}` }}>
              <span style={{ fontSize: 22 }}>{lastResult.isCorrect ? "OK" : "X"}</span>
              <div>
                <div style={{ color: lastResult.isCorrect ? "#00d084" : "#ff4757", fontWeight: 700, fontSize: 13 }}>
                  {lastResult.choice === "TIMEOUT" ? "TEMPO ESGOTADO" : lastResult.isCorrect ? "CORRETO!" : "ERRADO"}
                </div>
                <div style={{ color: "#4a6278", fontSize: 11 }}>Setup: <span style={{ color: "#7a9ab0" }}>{lastResult.hint}</span></div>
                {!lastResult.isCorrect && (<div style={{ color: "#4a6278", fontSize: 11 }}>Correto era: <span style={{ color: "#e8a838", fontWeight: 700 }}>{lastResult.correct}</span></div>)}
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ color: "#3d84c8", fontWeight: 700, fontSize: 16 }}>+{lastResult.xpEarned}</div>
                <div style={{ color: "#2d4a5f", fontSize: 10 }}>XP</div>
              </div>
            </div>
            <div style={styles.feedbackBox}>
              {loadingFeedback ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={styles.loadDot} />
                  <span style={{ color: "#2d4a5f", fontSize: 11 }}>Analisando...</span>
                </div>
              ) : (
                <p style={{ color: "#7a9ab0", fontSize: 12, margin: 0, lineHeight: 1.6 }}>{aiFeedback}</p>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button style={{ ...styles.btnPrimary, flex: 2 }} onClick={startRound}>PROXIMO CHART</button>
              <button style={{ ...styles.btnSecondary, flex: 1 }} onClick={() => setScreen("home")}>HOME</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "#060b10", display: "flex", alignItems: "flex-start", justifyContent: "center", fontFamily: "'Courier New', 'Consolas', monospace", padding: "0 0 40px" },
  homeWrap: { width: "100%", maxWidth: 480, padding: "40px 20px 20px", display: "flex", flexDirection: "column", gap: 16 },
  logo: { textAlign: "center", letterSpacing: 6, fontSize: 28, fontWeight: 900, textTransform: "uppercase", lineHeight: 1, marginBottom: 4 },
  logoAccent: { color: "#00d084" },
  logoMain: { color: "#e8e8e8" },
  tagline: { textAlign: "center", color: "#2d4a5f", fontSize: 12, letterSpacing: 2, margin: 0, textTransform: "uppercase" },
  levelCard: { background: "#0a1420", border: "1px solid #0e1e2e", borderRadius: 8, padding: "14px 16px" },
  xpBarBg: { height: 6, background: "#0e1e2e", borderRadius: 3, overflow: "hidden" },
  xpBarFill: { height: "100%", borderRadius: 3, transition: "width 0.5s ease" },
  statsRow: { display: "flex", gap: 8 },
  statBox: { flex: 1, background: "#0a1420", border: "1px solid #0e1e2e", borderRadius: 8, padding: "10px 6px", textAlign: "center" },
  statVal: { color: "#e8e8e8", fontSize: 18, fontWeight: 700 },
  statLabel: { color: "#2d4a5f", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 },
  btnPrimary: { background: "linear-gradient(135deg, #00d084 0%, #00a86b 100%)", color: "#060b10", border: "none", borderRadius: 8, padding: "14px 20px", fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: 13, letterSpacing: 2, cursor: "pointer", textTransform: "uppercase" },
  btnSecondary: { background: "transparent", color: "#4a6278", border: "1px solid #1a2d3d", borderRadius: 8, padding: "12px 20px", fontFamily: "'Courier New', monospace", fontSize: 11, letterSpacing: 2, cursor: "pointer", textTransform: "uppercase" },
  howto: { border: "1px solid #0e1e2e", borderRadius: 6, padding: "10px 14px", textAlign: "center" },
  gameWrap: { width: "100%", maxWidth: 600, padding: "16px 12px 20px", display: "flex", flexDirection: "column", gap: 12, position: "relative" },
  gameHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" },
  backBtn: { background: "transparent", color: "#4a6278", border: "1px solid #1a2d3d", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontFamily: "'Courier New', monospace", fontSize: 14 },
  timerBarBg: { height: 28, background: "#0a1420", border: "1px solid #0e1e2e", borderRadius: 6, overflow: "hidden", position: "relative", display: "flex", alignItems: "center" },
  timerBarFill: { position: "absolute", left: 0, top: 0, height: "100%", opacity: 0.25 },
  timerNum: { position: "absolute", right: 10, fontWeight: 700, fontSize: 12, letterSpacing: 1 },
  chartBox: { background: "#060e18", border: "1px solid #0e1e2e", borderRadius: 10, padding: "12px 8px 4px", overflow: "hidden" },
  chartLabel: { color: "#1a2d3d", fontSize: 10, textAlign: "center", letterSpacing: 3, textTransform: "uppercase", padding: "6px 0 2px" },
  actionRow: { display: "flex", gap: 10 },
  btnBuy: { flex: 1, padding: "18px", background: "rgba(0,208,132,0.08)", border: "2px solid #00d084", borderRadius: 10, color: "#00d084", fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: 15, letterSpacing: 2, cursor: "pointer" },
  btnSell: { flex: 1, padding: "18px", background: "rgba(255,71,87,0.08)", border: "2px solid #ff4757", borderRadius: 10, color: "#ff4757", fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: 15, letterSpacing: 2, cursor: "pointer" },
  resultBox: { display: "flex", flexDirection: "column", gap: 10 },
  resultBadge: { borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 },
  feedbackBox: { background: "#080f18", border: "1px solid #0e1e2e", borderRadius: 8, padding: "12px 14px", minHeight: 52, display: "flex", alignItems: "center" },
  loadDot: { width: 8, height: 8, borderRadius: "50%", background: "#3d84c8", animation: "pulse 1s infinite" },
  historyItem: { display: "flex", alignItems: "center", padding: "8px 10px", background: "#080f18", borderRadius: 6, marginBottom: 4, gap: 8 },
  sectionTitle: { color: "#e8e8e8", fontWeight: 700, fontSize: 14, letterSpacing: 3, textTransform: "uppercase" },
  statsWrap: { width: "100%", maxWidth: 480, padding: "20px 16px" },
  levelUpOverlay: { position: "fixed", inset: 0, background: "rgba(6,11,16,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, pointerEvents: "none" },
  levelUpCard: { background: "#0a1420", border: "2px solid", borderRadius: 12, padding: "26px 44px", textAlign: "center", animation: "levelup 0.45s ease-out" },
};
