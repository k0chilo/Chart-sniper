import { useState, useEffect, useRef, useCallback } from "react";

function CandleChart({ candles, width = 700, height = 290, futureCount = 0 }) {
  const padding = { top: 32, right: 70, bottom: 28, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allPrices = candles.flatMap((c) => [c.high, c.low]);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP || 1;
  const pad = range * 0.1;
  const toY = (p) => padding.top + ((maxP + pad - p) / (range + 2 * pad)) * chartH;
  const candleW = Math.max(5, Math.floor(chartW / candles.length) - 2);

  const levels = 5;
  const priceLines = Array.from({ length: levels }, (_, i) =>
    minP - pad + ((range + 2 * pad) / (levels - 1)) * i
  ).reverse();

  const fmtPrice = (p) => {
    if (p == null) return "";
    if (p >= 1000) return p.toFixed(1);
    if (p >= 1) return p.toFixed(3);
    return p.toFixed(5);
  };

  const visibleCount = candles.length - futureCount;
  const candleX = (i) => padding.left + (i / candles.length) * chartW + chartW / candles.length / 2;

  const dividerX = futureCount > 0 ? padding.left + (visibleCount / candles.length) * chartW : null;
  const entryCandle = futureCount > 0 ? candles[visibleCount - 1] : null;
  const exitCandle = futureCount > 0 ? candles[candles.length - 1] : null;
  const entryPrice = entryCandle?.close;
  const exitPrice = exitCandle?.close;
  const movedUp = exitPrice != null && entryPrice != null && exitPrice > entryPrice;
  const exitColor = movedUp ? "#00d084" : "#ff4757";
  const lastCandleX = candles.length > 0 ? candleX(candles.length - 1) : 0;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {futureCount > 0 && dividerX != null && (
        <rect x={dividerX} y={padding.top} width={padding.left + chartW - dividerX} height={chartH}
              fill="#0e1e2e" fillOpacity={0.35} />
      )}

      {priceLines.map((p, i) => (
        <g key={i}>
          <line x1={padding.left} x2={padding.left + chartW} y1={toY(p)} y2={toY(p)}
                stroke="#1a2d3d" strokeWidth={1} />
          <text x={padding.left - 6} y={toY(p) + 4} textAnchor="end"
                fill="#4a6278" fontSize={9} fontFamily="'Courier New', monospace">
            {fmtPrice(p)}
          </text>
        </g>
      ))}

      {candles.map((c, i) => {
        const x = candleX(i);
        const isGreen = c.close >= c.open;
        const isFuture = i >= visibleCount;
        const baseColor = isGreen ? "#00d084" : "#ff4757";
        const opacity = isFuture ? 0.75 : 0.95;
        const bodyTop = toY(Math.max(c.open, c.close));
        const bodyBot = toY(Math.min(c.open, c.close));
        const bodyH = Math.max(1, bodyBot - bodyTop);
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={toY(c.high)} y2={toY(c.low)}
                  stroke={baseColor} strokeWidth={1.4} opacity={opacity} />
            <rect x={x - candleW / 2} y={bodyTop} width={candleW} height={bodyH}
                  fill={baseColor} fillOpacity={opacity} stroke={baseColor} strokeWidth={0.5} />
          </g>
        );
      })}

      {futureCount > 0 && entryPrice != null && (
        <g>
          <line x1={dividerX} x2={dividerX} y1={padding.top} y2={padding.top + chartH}
                stroke="#e8a838" strokeWidth={2} strokeDasharray="6,3" />
          <line x1={padding.left} x2={padding.left + chartW}
                y1={toY(entryPrice)} y2={toY(entryPrice)}
                stroke="#e8a838" strokeWidth={1} strokeDasharray="2,3" opacity={0.55} />
          <rect x={dividerX - 36} y={padding.top - 24} width={72} height={18} rx={3} fill="#e8a838" />
          <text x={dividerX} y={padding.top - 11} textAnchor="middle"
                fill="#0a0f14" fontSize={10} fontFamily="'Courier New', monospace" fontWeight="bold">
            ENTRADA
          </text>
          <rect x={padding.left + chartW + 2} y={toY(entryPrice) - 8} width={64} height={16} rx={3} fill="#e8a838" />
          <text x={padding.left + chartW + 34} y={toY(entryPrice) + 4} textAnchor="middle"
                fill="#0a0f14" fontSize={9} fontFamily="'Courier New', monospace" fontWeight="bold">
            {fmtPrice(entryPrice)}
          </text>
        </g>
      )}

      {futureCount > 0 && exitPrice != null && (
        <g>
          <line x1={dividerX} x2={padding.left + chartW}
                y1={toY(exitPrice)} y2={toY(exitPrice)}
                stroke={exitColor} strokeWidth={2} />
          <rect x={lastCandleX - 22} y={padding.top - 24} width={44} height={18} rx={3} fill={exitColor} />
          <text x={lastCandleX} y={padding.top - 11} textAnchor="middle"
                fill="#0a0f14" fontSize={10} fontFamily="'Courier New', monospace" fontWeight="bold">
            FIM
          </text>
          <rect x={padding.left + chartW + 2} y={toY(exitPrice) - 8} width={64} height={16} rx={3} fill={exitColor} />
          <text x={padding.left + chartW + 34} y={toY(exitPrice) + 4} textAnchor="middle"
                fill="#0a0f14" fontSize={9} fontFamily="'Courier New', monospace" fontWeight="bold">
            {fmtPrice(exitPrice)}
          </text>
        </g>
      )}

      {futureCount === 0 && candles.length > 0 && (() => {
        const last = candles[candles.length - 1];
        const y = toY(last.close);
        const isGreen = last.close >= last.open;
        return (
          <line x1={padding.left} x2={padding.left + chartW} y1={y} y2={y}
                stroke={isGreen ? "#00d084" : "#ff4757"} strokeWidth={1}
                strokeDasharray="4,3" opacity={0.5} />
        );
      })()}
    </svg>
  );
}

async function fetchRound() {
  const r = await fetch("/api/random-chart");
  if (!r.ok) throw new Error("api_fail");
  const data = await r.json();
  if (!data.candles || !data.futureCandles || !data.correct) throw new Error("bad_payload");
  return data;
}

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

const STORAGE_KEY = "chart_sniper_v2";
function loadState() {
  if (typeof window === "undefined") return null;
  try { const raw = window.localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function saveState(state) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

async function getAIFeedback({ symbol, interval, userChoice, isCorrect, streak, moveBps, correct }) {
  try {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, interval, userChoice, isCorrect, streak, moveBps, correct }),
    });
    if (!res.ok) throw new Error("api_error");
    const data = await res.json();
    if (data?.feedback) return data.feedback;
    throw new Error("no_feedback");
  } catch {
    if (userChoice === "TIMEOUT") return `Tempo esgotado. ${symbol} ${interval}: o correto era ${correct} (move ${moveBps}bps).`;
    return isCorrect
      ? `Bom read em ${symbol} ${interval}. Move foi ${moveBps}bps a favor.`
      : `${symbol} ${interval}: o correto era ${correct} (move ${moveBps}bps). Observe a estrutura antes de clicar.`;
  }
}

export default function TradingGame() {
  const [screen, setScreen] = useState("home");
  const [chartData, setChartData] = useState(null);
  const [loadingChart, setLoadingChart] = useState(false);
  const [chartError, setChartError] = useState(null);
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
  const chartScrollRef = useRef(null);

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

  const startRound = useCallback(async () => {
    setScreen("game");
    setLastResult(null);
    setAiFeedback("");
    setChartData(null);
    setChartError(null);
    setLoadingChart(true);
    try {
      const data = await fetchRound();
      setChartData(data);
      setLoadingChart(false);
      setTimer(30);
      setTimerActive(true);
    } catch (err) {
      setChartError("Falha ao buscar candles da Binance. Tente novamente.");
      setLoadingChart(false);
    }
  }, []);

  const handleAnswer = useCallback(async (choice) => {
    if (!chartData || lastResult) return;
    clearInterval(timerRef.current);
    setTimerActive(false);
    const correctSide = chartData.correct;
    const isCorrect = choice !== "TIMEOUT" && choice === correctSide;
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
    setLastResult({
      isCorrect,
      choice,
      xpEarned,
      correct: correctSide,
      symbol: chartData.symbol,
      interval: chartData.interval,
      moveBps: chartData.moveBps,
    });
    setXp(newXp);
    setStreak(newStreak);
    setBestStreak(newBest);
    setTotalAnswered((t) => t + 1);
    if (isCorrect) setTotalCorrect((t) => t + 1);
    setHistory((h) => [{ symbol: chartData.symbol, interval: chartData.interval, choice, correct: correctSide, isCorrect, xpEarned, moveBps: chartData.moveBps, ts: Date.now() }, ...h.slice(0, 19)]);
    setLoadingFeedback(true);
    const feedback = await getAIFeedback({ symbol: chartData.symbol, interval: chartData.interval, userChoice: choice, isCorrect, streak: newStreak, moveBps: chartData.moveBps, correct: correctSide });
    setAiFeedback(feedback);
    setLoadingFeedback(false);
  }, [chartData, lastResult, streak, xp, bestStreak]);

  const handleAnswerRef = useRef(handleAnswer);
  useEffect(() => { handleAnswerRef.current = handleAnswer; }, [handleAnswer]);

  useEffect(() => {
    if (lastResult && chartScrollRef.current) chartScrollRef.current.scrollLeft = chartScrollRef.current.scrollWidth;
  }, [lastResult]);

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
          <p style={styles.tagline}>Treine sua leitura. Forex, crypto e indices.</p>
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
            <p style={{ color: "#2d4a5f", fontSize: 11, margin: 0 }}>Le 75 candles reais. Adivinhe se o preco subiu ou desceu nos proximos 15.</p>
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
                  <span style={{ color: "#7a9ab0", fontSize: 11, flex: 1 }}>{h.symbol} <span style={{ color: "#3d84c8" }}>{h.interval}</span></span>
                  <span style={{ color: h.isCorrect ? "#00d084" : "#ff4757", fontSize: 11, fontWeight: 700 }}>{h.choice} {h.isCorrect ? "OK" : "X"}</span>
                  <span style={{ color: h.moveBps >= 0 ? "#00d084" : "#ff4757", fontSize: 10, marginLeft: 8 }}>{h.moveBps >= 0 ? "+" : ""}{h.moveBps}bp</span>
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
  const allCandles = chartData ? (lastResult ? [...chartData.candles.slice(-25), ...chartData.futureCandles] : chartData.candles) : [];

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
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {chartData && lastResult && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#e8e8e8", fontWeight: 700, fontSize: 12, letterSpacing: 1 }}>{chartData.symbol}</span>
                <span style={{ color: "#3d84c8", fontSize: 11 }}>{chartData.interval.toUpperCase()}</span>
              </div>
            )}
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
        {!lastResult && chartData && (
          <div style={styles.timerBarBg}>
            <div style={{ ...styles.timerBarFill, width: `${timerPct}%`, background: timerColor, transition: "width 1s linear, background 0.3s" }} />
            <span style={{ ...styles.timerNum, color: timerColor }}>{timer}s</span>
          </div>
        )}
        <div style={styles.chartBox}>
          <div ref={chartScrollRef} style={{ overflowX: "auto", minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {loadingChart && (
              <div style={{ color: "#3d84c8", fontSize: 12, letterSpacing: 2, padding: 60, textAlign: "center" }}>
                <div style={{ ...styles.loadDot, margin: "0 auto 12px" }} />
                BUSCANDO CHART REAL...
              </div>
            )}
            {chartError && (
              <div style={{ color: "#ff4757", fontSize: 12, padding: 40, textAlign: "center" }}>
                {chartError}
                <div><button style={{ ...styles.btnSecondary, marginTop: 12 }} onClick={startRound}>TENTAR DE NOVO</button></div>
              </div>
            )}
            {chartData && !chartError && (
              <CandleChart candles={allCandles} width={700} height={290} futureCount={lastResult ? chartData.futureCandles.length : 0} />
            )}
          </div>
          <div style={styles.chartLabel}>
            {lastResult ? `Movimento: ${lastResult.moveBps >= 0 ? "+" : ""}${lastResult.moveBps}bp em ${chartData.futureCandles.length} candles` : "Onde o preco vai nos proximos 15 candles?"}
          </div>
        </div>
        {!lastResult && chartData && !loadingChart && !chartError ? (
          <div style={styles.actionRow}>
            <button style={styles.btnBuy} onClick={() => handleAnswer("BUY")}>BUY / LONG</button>
            <button style={styles.btnSell} onClick={() => handleAnswer("SELL")}>SELL / SHORT</button>
          </div>
        ) : lastResult ? (
          <div style={styles.resultBox}>
            <div style={{ ...styles.resultBadge, background: lastResult.isCorrect ? "rgba(0,208,132,0.1)" : "rgba(255,71,87,0.1)", border: `1px solid ${lastResult.isCorrect ? "#00d084" : "#ff4757"}` }}>
              <span style={{ fontSize: 22 }}>{lastResult.isCorrect ? "OK" : "X"}</span>
              <div>
                <div style={{ color: lastResult.isCorrect ? "#00d084" : "#ff4757", fontWeight: 700, fontSize: 13 }}>
                  {lastResult.choice === "TIMEOUT" ? "TEMPO ESGOTADO" : lastResult.isCorrect ? "CORRETO!" : "ERRADO"}
                </div>
                <div style={{ color: "#4a6278", fontSize: 11 }}>{lastResult.symbol} <span style={{ color: "#7a9ab0" }}>{lastResult.interval}</span></div>
                {!lastResult.isCorrect && (<div style={{ color: "#4a6278", fontSize: 11 }}>Correto: <span style={{ color: "#e8a838", fontWeight: 700 }}>{lastResult.correct}</span> ({lastResult.moveBps >= 0 ? "+" : ""}{lastResult.moveBps}bp)</div>)}
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
        ) : null}
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
  gameHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px", flexWrap: "wrap", gap: 8 },
  backBtn: { background: "transparent", color: "#4a6278", border: "1px solid #1a2d3d", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontFamily: "'Courier New', monospace", fontSize: 14 },
  timerBarBg: { height: 28, background: "#0a1420", border: "1px solid #0e1e2e", borderRadius: 6, overflow: "hidden", position: "relative", display: "flex", alignItems: "center" },
  timerBarFill: { position: "absolute", left: 0, top: 0, height: "100%", opacity: 0.25 },
  timerNum: { position: "absolute", right: 10, fontWeight: 700, fontSize: 12, letterSpacing: 1 },
  chartBox: { background: "#060e18", border: "1px solid #0e1e2e", borderRadius: 10, padding: "12px 8px 4px", overflow: "hidden" },
  chartLabel: { color: "#1a2d3d", fontSize: 10, textAlign: "center", letterSpacing: 2, textTransform: "uppercase", padding: "6px 0 2px" },
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
