import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, Check, X as XIcon, TrendingUp, TrendingDown, Flame, Trophy, Play, Home as HomeIcon, ArrowRight, BarChart3, RotateCcw, Target, Clock, Award } from "lucide-react";

import { CandleChart, ChartToolbar, fmtDiff, fmtDateLabel } from "./chart.jsx";

async function fetchRound(sym, ivl) {
  const _qs = new URLSearchParams(); if (sym) _qs.set("symbol", sym); if (ivl) _qs.set("interval", ivl); const r = await fetch("/api/random-chart" + (_qs.toString() ? "?" + _qs.toString() : ""));
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
  const [pickedSymbol, setPickedSymbol] = useState("");
  const [pickedInterval, setPickedInterval] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [aiFeedback, setAiFeedback] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [timer, setTimer] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const [levelUpFlash, setLevelUpFlash] = useState(null);
  const timerRef = useRef(null);
  const chartScrollRef = useRef(null);
  const svgRef = useRef(null);
  const [tool, setTool] = useState("none");
  const [drawings, setDrawings] = useState([]);
  const [pending, setPending] = useState(null);
  const [hoverPt, setHoverPt] = useState(null);
  const [pastOverride, setPastOverride] = useState(null);

  useEffect(() => {
    setDrawings([]);
    setPending(null);
    setHoverPt(null);
    setTool("none");
    setPastOverride(null);
  }, [chartData?.symbol, chartData?.interval, chartData?.candles?.[0]?.ts]);

  const eventToCoords = (e) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 950,
      y: ((e.clientY - rect.top) / rect.height) * 380,
    };
  };

  const handleSvgClick = (e) => {
    if (tool === "none") return;
    const pt = eventToCoords(e);
    if (!pt) return;
    if (tool === "hline") {
      setDrawings((d) => [...d, { type: "hline", y: pt.y, id: Date.now() }]);
    } else if (tool === "trendline" || tool === "fib") {
      if (!pending) setPending({ type: tool, p1: pt });
      else {
        setDrawings((d) => [...d, { ...pending, p2: pt, id: Date.now() }]);
        setPending(null);
      }
    }
  };

  const handleSvgMove = (e) => {
    if (tool === "none" && !pending) return;
    setHoverPt(eventToCoords(e));
  };

  const handleSvgLeave = () => setHoverPt(null);

  useEffect(() => {
    const s = loadState();
    if (s) {
      setXp(s.xp || 0);
      setStreak(s.streak || 0);
      setBestStreak(s.bestStreak || 0);
      setTotalAnswered(s.totalAnswered || 0);
      setTotalCorrect(s.totalCorrect || 0);
      setHistory(Array.isArray(s.history) ? s.history : []);
      setPickedSymbol(s.pickedSymbol || "");
      setPickedInterval(s.pickedInterval || "");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveState({ xp, streak, bestStreak, totalAnswered, totalCorrect, history, pickedSymbol, pickedInterval });
  }, [hydrated, xp, streak, bestStreak, totalAnswered, totalCorrect, history, pickedSymbol, pickedInterval]);

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
      const data = await fetchRound(pickedSymbol, pickedInterval);
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
      moveBps: chartData.moveBps, priceDiffStr: fmtDiff(chartData.futureCandles[chartData.futureCandles.length-1].close - chartData.candles[chartData.candles.length-1].close) });
    setXp(newXp);
    setStreak(newStreak);
    setBestStreak(newBest);
    setTotalAnswered((t) => t + 1);
    if (isCorrect) setTotalCorrect((t) => t + 1);
    setHistory((h) => [{ symbol: chartData.symbol, interval: chartData.interval, choice, correct: correctSide, isCorrect, xpEarned, moveBps: chartData.moveBps, priceDiffStr: fmtDiff(chartData.futureCandles[chartData.futureCandles.length-1].close - chartData.candles[chartData.candles.length-1].close), ts: Date.now() }, ...h.slice(0, 19)]);
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
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: "#5a6a7d", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Ativo</label>
              <select value={pickedSymbol} onChange={(e) => setPickedSymbol(e.target.value)} style={styles.selectBox}>
                <option value="">Aleatorio</option>
                <option value="EUR/USD">EUR/USD</option>
                <option value="GBP/USD">GBP/USD</option>
                <option value="USD/JPY">USD/JPY</option>
                <option value="USD/CHF">USD/CHF</option>
                <option value="AUD/USD">AUD/USD</option>
                <option value="USD/CAD">USD/CAD</option>
                <option value="NZD/USD">NZD/USD</option>
                <option value="XAU/USD">XAU/USD</option>
                <option value="XAG/USD">XAG/USD</option>
                <option value="BTC/USD">BTC/USD</option>
                <option value="ETH/USD">ETH/USD</option>
                <option value="SOL/USD">SOL/USD</option>
                <option value="XRP/USD">XRP/USD</option>
                <option value="NASDAQ">NASDAQ</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ color: "#5a6a7d", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Timeframe</label>
              <select value={pickedInterval} onChange={(e) => setPickedInterval(e.target.value)} style={styles.selectBox}>
                <option value="">Aleatorio</option>
                <option value="5M">5M</option>
                <option value="15M">15M</option>
                <option value="30M">30M</option>
                <option value="1H">1H</option>
                <option value="4H">4H</option>
                <option value="1D">1D</option>
              </select>
            </div>
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
              <button style={styles.backBtn} onClick={() => setScreen("home")}><ChevronLeft size={18} strokeWidth={2.5} /></button>
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
                  <span style={{ color: h.isCorrect ? "#00d084" : "#ff4757", fontSize: 11, fontWeight: 700 }}>{h.choice} {h.isCorrect ? "✓" : "✗"}</span>
                  <span style={{ color: h.moveBps >= 0 ? "#00d084" : "#ff4757", fontSize: 10, marginLeft: 8 }}>{h.priceDiffStr || (h.moveBps + "bp")}</span>
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
  const _eff = pastOverride ?? 75;
  const allCandles = chartData ? (lastResult ? [...chartData.candles.slice(-_eff), ...chartData.futureCandles] : chartData.candles.slice(-_eff)) : [];

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
          <button style={styles.backBtn} onClick={() => setScreen("home")}><ChevronLeft size={18} strokeWidth={2.5} /></button>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {chartData && lastResult && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#e8e8e8", fontWeight: 700, fontSize: 12, letterSpacing: 1 }}>{chartData.symbol}</span>
                <span style={{ color: "#3d84c8", fontSize: 11 }}>{chartData.interval.toUpperCase()}</span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Flame size={14} color="#e8a838" strokeWidth={2.5} />
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
          {chartData && !chartError && !loadingChart && (
            <ChartToolbar tool={tool} setTool={setTool} pending={pending} setPending={setPending} onClearAll={() => { setDrawings([]); setPending(null); }} onZoomIn={() => setPastOverride(Math.max(15, _eff - 15))} onZoomOut={() => setPastOverride(Math.min(75, _eff + 15))} onZoomReset={() => setPastOverride(null)} isCustomZoom={pastOverride !== null} />
          )}
          <div ref={chartScrollRef} style={{ overflowX: "auto", minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {loadingChart && (
              <div className="skeleton" style={{ width: "100%", height: 380, borderRadius: 8 }} />
            )}
            {chartError && (
              <div style={{ color: "#ff4757", fontSize: 12, padding: 40, textAlign: "center" }}>
                {chartError}
                <div><button style={{ ...styles.btnSecondary, marginTop: 12 }} onClick={startRound}>TENTAR DE NOVO</button></div>
              </div>
            )}
            {chartData && !chartError && (
              <CandleChart candles={allCandles} width={950} height={380} futureCount={lastResult ? chartData.futureCandles.length : 0} watermark={lastResult ? `${chartData.symbol} ${chartData.interval}` : null} intervalLabel={chartData?.interval} drawings={drawings} pending={pending} hover={hoverPt} tool={tool} svgRef={svgRef} onClick={handleSvgClick} onMouseMove={handleSvgMove} onMouseLeave={handleSvgLeave} />
            )}
          </div>
          <div style={styles.chartLabel}>
            {lastResult ? `Movimento: ${fmtDiff(chartData.futureCandles[chartData.futureCandles.length-1].close - chartData.candles[chartData.candles.length-1].close)} em ${chartData.futureCandles.length} candles` : "Onde o preco vai nos proximos 15 candles?"}
          </div>
        </div>
        {!lastResult && chartData && !loadingChart && !chartError ? (
          <div style={styles.actionRow}>
            <button style={styles.btnBuy} onClick={() => handleAnswer("BUY")}><span style={{display:"inline-flex",alignItems:"center",gap:10,justifyContent:"center"}}><TrendingUp size={20} strokeWidth={2.5}/>BUY / LONG</span></button>
            <button style={styles.btnSell} onClick={() => handleAnswer("SELL")}><span style={{display:"inline-flex",alignItems:"center",gap:10,justifyContent:"center"}}><TrendingDown size={20} strokeWidth={2.5}/>SELL / SHORT</span></button>
          </div>
        ) : lastResult ? (
          <div style={styles.resultBox}>
            <div style={{ ...styles.resultBadge, background: lastResult.isCorrect ? "rgba(0,208,132,0.1)" : "rgba(255,71,87,0.1)", border: `1px solid ${lastResult.isCorrect ? "#00d084" : "#ff4757"}` }}>
              <span style={{ display: "inline-flex", padding: 8, borderRadius: 999, background: lastResult.isCorrect ? "rgba(0,208,132,0.18)" : "rgba(255,71,87,0.18)" }}>{lastResult.isCorrect ? <Check size={22} color="#00d084" strokeWidth={3} /> : <XIcon size={22} color="#ff4757" strokeWidth={3} />}</span>
              <div>
                <div style={{ color: lastResult.isCorrect ? "#00d084" : "#ff4757", fontWeight: 700, fontSize: 13 }}>
                  {lastResult.choice === "TIMEOUT" ? "TEMPO ESGOTADO" : lastResult.isCorrect ? "CORRETO!" : "ERRADO"}
                </div>
                <div style={{ color: "#4a6278", fontSize: 11 }}>{lastResult.symbol} <span style={{ color: "#7a9ab0" }}>{lastResult.interval}</span></div>
                {!lastResult.isCorrect && (<div style={{ color: "#4a6278", fontSize: 11 }}>Correto: <span style={{ color: "#e8a838", fontWeight: 700 }}>{lastResult.correct}</span> ({lastResult.priceDiffStr})</div>)}
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
  root: { minHeight: "100vh", background: "#0a0e14", display: "flex", alignItems: "flex-start", justifyContent: "center", fontFamily: "'Inter', -apple-system, sans-serif", padding: "0 0 40px" },
  homeWrap: { width: "100%", maxWidth: 480, padding: "40px 20px 20px", display: "flex", flexDirection: "column", gap: 16 },
  logo: { textAlign: "center", letterSpacing: 4, fontSize: 32, fontWeight: 800, textTransform: "uppercase", lineHeight: 1, marginBottom: 4 },
  logoAccent: { color: "#00d084" },
  logoMain: { color: "#e8e8e8" },
  tagline: { textAlign: "center", color: "#2d4a5f", fontSize: 12, letterSpacing: 2, margin: 0, textTransform: "uppercase" },
  levelCard: { background: "#0f1620", border: "1px solid #1a2332", borderRadius: 10, padding: "14px 16px" },
  xpBarBg: { height: 6, background: "#0e1e2e", borderRadius: 3, overflow: "hidden" },
  xpBarFill: { height: "100%", borderRadius: 3, transition: "width 0.5s ease" },
  statsRow: { display: "flex", gap: 8 },
  statBox: { flex: 1, background: "#0f1620", border: "1px solid #1a2332", borderRadius: 10, padding: "12px 8px", textAlign: "center" },
  statVal: { color: "#e6e8eb", fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" },
  statLabel: { color: "#2d4a5f", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 },
  selectBox: {
    width: "100%",
    background: "#0f1620",
    color: "#e6e8eb",
    border: "1px solid #1a2332",
    borderRadius: 8,
    padding: "10px 12px",
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
  },
  btnPrimary: { background: "linear-gradient(135deg, #00d084 0%, #00a86b 100%)", color: "#060b10", border: "none", borderRadius: 10, padding: "14px 20px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, letterSpacing: 2, cursor: "pointer", textTransform: "uppercase" },
  btnSecondary: { background: "transparent", color: "#4a6278", border: "1px solid #2a3548", borderRadius: 10, padding: "12px 20px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, cursor: "pointer", textTransform: "uppercase" },
  howto: { border: "1px solid #1a2332", borderRadius: 8, padding: "10px 14px", textAlign: "center" },
  gameWrap: { width: "100%", maxWidth: 1000, padding: "16px 12px 20px", display: "flex", flexDirection: "column", gap: 12, position: "relative" },
  gameHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px", flexWrap: "wrap", gap: 8 },
  backBtn: { background: "transparent", color: "#4a6278", border: "1px solid #2a3548", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 14 },
  timerBarBg: { height: 28, background: "#0f1620", border: "1px solid #1a2332", borderRadius: 8, overflow: "hidden", position: "relative", display: "flex", alignItems: "center" },
  timerBarFill: { position: "absolute", left: 0, top: 0, height: "100%", opacity: 0.25 },
  timerNum: { position: "absolute", right: 10, fontWeight: 700, fontSize: 12, letterSpacing: 1 },
  chartBox: { background: "#0c121a", border: "1px solid #1a2332", borderRadius: 10, padding: "12px 8px 4px", overflow: "hidden" },
  chartLabel: { color: "#1a2d3d", fontSize: 10, textAlign: "center", letterSpacing: 2, textTransform: "uppercase", padding: "6px 0 2px" },
  actionRow: { display: "flex", gap: 10 },
  btnBuy: { flex: 1, padding: "18px", background: "rgba(0,208,132,0.08)", border: "2px solid #00d084", borderRadius: 10, color: "#00d084", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15, letterSpacing: 2, cursor: "pointer" },
  btnSell: { flex: 1, padding: "18px", background: "rgba(255,71,87,0.08)", border: "2px solid #ff4757", borderRadius: 10, color: "#ff4757", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15, letterSpacing: 2, cursor: "pointer" },
  resultBox: { display: "flex", flexDirection: "column", gap: 10 },
  resultBadge: { borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 },
  feedbackBox: { background: "#0f1620", border: "1px solid #1a2332", borderRadius: 10, padding: "12px 14px", minHeight: 52, display: "flex", alignItems: "center" },
  loadDot: { width: 8, height: 8, borderRadius: "50%", background: "#3d84c8", animation: "pulse 1s infinite" },
  historyItem: { display: "flex", alignItems: "center", padding: "8px 10px", background: "#0f1620", borderRadius: 8, marginBottom: 4, gap: 8 },
  sectionTitle: { color: "#e8e8e8", fontWeight: 700, fontSize: 14, letterSpacing: 3, textTransform: "uppercase" },
  statsWrap: { width: "100%", maxWidth: 480, padding: "20px 16px" },
  levelUpOverlay: { position: "fixed", inset: 0, background: "rgba(6,11,16,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, pointerEvents: "none" },
  levelUpCard: { background: "#0f1620", border: "2px solid", borderRadius: 12, padding: "26px 44px", textAlign: "center", animation: "levelup 0.45s ease-out" },
};
