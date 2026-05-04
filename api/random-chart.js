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
  { yahoo: "5m", label: "5M", range: "5d" },
  { yahoo: "15m", label: "15M", range: "1mo" },
  { yahoo: "30m", label: "30M", range: "1mo" },
  { yahoo: "1h", label: "1H", range: "2y" },
  { yahoo: "1h", label: "4H", range: "2y", agg: 4 },
  { yahoo: "1d", label: "1D", range: "10y" },
];
const VISIBLE = 75;
const FUTURE = 15;
const UAS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];
const HOSTS = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];

function aggregateCandles(candles, factor) {
  const out = [];
  for (let i = 0; i < candles.length; i += factor) {
    const g = candles.slice(i, i + factor);
    if (g.length < factor) continue;
    out.push({
      open: g[0].open, high: Math.max(...g.map(c => c.high)),
      low: Math.min(...g.map(c => c.low)), close: g[g.length - 1].close, ts: g[0].ts,
    });
  }
  return out;
}

async function fetchYahoo(sym, ivl) {
  let lastErr = "init";
  for (let i = 0; i < 4; i++) {
    const ua = UAS[i % UAS.length];
    const host = HOSTS[i % HOSTS.length];
    const url = `https://${host}/v8/finance/chart/${encodeURIComponent(sym)}?interval=${ivl.yahoo}&range=${ivl.range}`;
    try {
      const r = await fetch(url, {
        headers: {
          "User-Agent": ua,
          "Accept": "application/json,text/plain,*/*",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://finance.yahoo.com/",
        },
      });
      if (r.ok) return await r.json();
      lastErr = `http_${r.status}`;
      if (r.status === 429 || r.status >= 500) {
        await new Promise(res => setTimeout(res, 300 + Math.floor(Math.random() * 700)));
        continue;
      }
      return { error: lastErr };
    } catch (e) {
      lastErr = String(e && e.message || e);
    }
  }
  return { error: lastErr };
}

export default async function handler(req, res) {
  const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
  const ivl = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
  try {
    const data = await fetchYahoo(asset.sym, ivl);
    if (data && data.error) {
      return res.status(502).json({ error: "yahoo_fail", detail: data.error, sym: asset.sym, ivl: ivl.label });
    }
    const result = data && data.chart && data.chart.result && data.chart.result[0];
    if (!result) return res.status(502).json({ error: "no_result", sym: asset.sym });
    const ts = result.timestamp;
    const q = result.indicators && result.indicators.quote && result.indicators.quote[0];
    if (!ts || !q) return res.status(502).json({ error: "bad_format" });
    let candles = [];
    for (let i = 0; i < ts.length; i++) {
      const o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i];
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({ open: o, high: h, low: l, close: c, ts: ts[i] * 1000 });
    }
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
    return res.status(200).json({ symbol: asset.label, interval: ivl.label, candles: visible, futureCandles, correct, moveBps });
  } catch (err) {
    return res.status(500).json({ error: "fetch_failed", detail: String(err && err.message || err) });
  }
}
