// yahoo-finance2: lida com crumb/cookie automatico, evita rate-limit
import yahooFinance from "yahoo-finance2";

yahooFinance.suppressNotices(["yahooSurvey"]);

const ASSETS = [
  { sym: "EURUSD=X", label: "EUR/USD" },
  { sym: "GBPUSD=X", label: "GBP/USD" },
  { sym: "USDJPY=X", label: "USD/JPY" },
  { sym: "USDCHF=X", label: "USD/CHF" },
  { sym: "AUDUSD=X", label: "AUD/USD" },
  { sym: "USDCAD=X", label: "USD/CAD" },
  { sym: "NZDUSD=X", label: "NZD/USD" },
  { sym: "GC=F", label: "XAU/USD" },
  { sym: "SI=F", label: "XAG/USD" },
  { sym: "BTC-USD", label: "BTC/USD" },
  { sym: "ETH-USD", label: "ETH/USD" },
  { sym: "SOL-USD", label: "SOL/USD" },
  { sym: "XRP-USD", label: "XRP/USD" },
  { sym: "^NDX", label: "NASDAQ" },
];

const INTERVALS = [
  { yahoo: "5m", label: "5M", days: 5 },
  { yahoo: "15m", label: "15M", days: 30 },
  { yahoo: "30m", label: "30M", days: 30 },
  { yahoo: "1h", label: "1H", days: 540 },
  { yahoo: "1h", label: "4H", days: 540, agg: 4 },
  { yahoo: "1d", label: "1D", days: 3650 },
];

const VISIBLE = 75;
const FUTURE = 15;

function aggregateCandles(candles, factor) {
  const out = [];
  for (let i = 0; i < candles.length; i += factor) {
    const g = candles.slice(i, i + factor);
    if (g.length < factor) continue;
    out.push({
      open: g[0].open,
      high: Math.max(...g.map((c) => c.high)),
      low: Math.min(...g.map((c) => c.low)),
      close: g[g.length - 1].close,
      ts: g[0].ts,
    });
  }
  return out;
}

export default async function handler(req, res) {
  const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
  const ivl = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];

  try {
    const period1 = new Date(Date.now() - ivl.days * 24 * 60 * 60 * 1000);
    const result = await yahooFinance.chart(asset.sym, {
      period1,
      interval: ivl.yahoo,
    });

    let candles = (result.quotes || [])
      .filter((q) => q && q.open != null && q.high != null && q.low != null && q.close != null)
      .map((q) => ({
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        ts: q.date instanceof Date ? q.date.getTime() : new Date(q.date).getTime(),
      }));

    if (ivl.agg) candles = aggregateCandles(candles, ivl.agg);

    if (candles.length < VISIBLE + FUTURE + 5) {
      return res.status(502).json({ error: "not_enough_candles", got: candles.length, sym: asset.sym, ivl: ivl.label });
    }

    const maxStart = candles.length - VISIBLE - FUTURE - 1;
    const start = Math.floor(Math.random() * maxStart);
    const window = candles.slice(start, start + VISIBLE + FUTURE);

    const visible = window.slice(0, VISIBLE);
    const futureCandles = window.slice(VISIBLE);

    const lastVisible = visible[visible.length - 1].close;
    const lastFuture = futureCandles[futureCandles.length - 1].close;
    const moveBps = Math.round(((lastFuture - lastVisible) / lastVisible) * 10000);
    const correct = lastFuture > lastVisible ? "BUY" : "SELL";

    return res.status(200).json({
      symbol: asset.label,
      interval: ivl.label,
      candles: visible,
      futureCandles,
      correct,
      moveBps,
    });
  } catch (err) {
    return res.status(500).json({ error: "yfinance_err", detail: String(err?.message || err), sym: asset.sym, ivl: ivl.label });
  }
}
