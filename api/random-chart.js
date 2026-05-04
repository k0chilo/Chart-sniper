// Yahoo Finance unofficial API
// Suporta: forex majors, metais (XAU/XAG via futuros), crypto, indices

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

// Yahoo intervals nativos: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d
// 4h nao existe nativo, vamos agregar de 60m com factor=4
const INTERVALS = [
  { yahoo: "5m", label: "5M", range: "5d" },
  { yahoo: "15m", label: "15M", range: "1mo" },
  { yahoo: "30m", label: "30M", range: "1mo" },
  { yahoo: "60m", label: "1H", range: "2y" },
  { yahoo: "60m", label: "4H", range: "2y", agg: 4 },
  { yahoo: "1d", label: "1D", range: "10y" },
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
      high: Math.max(...g.map(c => c.high)),
      low: Math.min(...g.map(c => c.low)),
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
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(asset.sym)}?interval=${ivl.yahoo}&range=${ivl.range}`;
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "application/json",
      },
    });
    if (!r.ok) {
      return res.status(502).json({ error: "yahoo_http", status: r.status, sym: asset.sym, ivl: ivl.label });
    }
    const data = await r.json();
    const result = data?.chart?.result?.[0];
    if (!result) return res.status(502).json({ error: "no_result", sym: asset.sym });
    const ts = result.timestamp;
    const q = result.indicators?.quote?.[0];
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

    return res.status(200).json({
      symbol: asset.label,
      interval: ivl.label,
      candles: visible,
      futureCandles,
      correct,
      moveBps,
    });
  } catch (err) {
    return res.status(500).json({ error: "fetch_failed", detail: String(err?.message || err) });
  }
}
