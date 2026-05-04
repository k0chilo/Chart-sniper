// Coinbase Exchange API - publica e acessivel de IPs US (Vercel)
// Klines: GET /products/{product}/candles?granularity={seconds}
// Returns: [[time, low, high, open, close, volume], ...] (mais recente primeiro)

const SYMBOLS = ["BTC-USD","ETH-USD","SOL-USD","XRP-USD","ADA-USD","AVAX-USD","DOGE-USD","LINK-USD","DOT-USD","ATOM-USD","LTC-USD","BCH-USD","NEAR-USD","ARB-USD","OP-USD","SUI-USD","APT-USD"];
// Granularity em segundos -> label
const INTERVALS = [
  { sec: 3600, label: "1h" },
  { sec: 21600, label: "6h" },
  { sec: 86400, label: "1d" },
];
const VISIBLE = 75;
const FUTURE = 15;

export default async function handler(req, res) {
  const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const ivl = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];

  try {
    const url = `https://api.exchange.coinbase.com/products/${symbol}/candles?granularity=${ivl.sec}`;
    const r = await fetch(url, {
      headers: { "User-Agent": "chart-sniper/1.0", "Accept": "application/json" },
    });
    if (!r.ok) {
      return res.status(502).json({ error: "coinbase_http", status: r.status, symbol, interval: ivl.label });
    }
    const data = await r.json();
    if (!Array.isArray(data) || data.length < VISIBLE + FUTURE + 5) {
      return res.status(502).json({ error: "not_enough_candles", got: Array.isArray(data) ? data.length : 0 });
    }

    // Coinbase retorna mais recente primeiro - inverter pra ordem cronologica
    const sorted = [...data].sort((a, b) => a[0] - b[0]);

    const maxStart = sorted.length - VISIBLE - FUTURE - 1;
    const start = Math.floor(Math.random() * maxStart);
    const window = sorted.slice(start, start + VISIBLE + FUTURE);

    // Coinbase: [time, low, high, open, close, volume]
    const toCandle = (k) => ({
      open: parseFloat(k[3]),
      high: parseFloat(k[2]),
      low: parseFloat(k[1]),
      close: parseFloat(k[4]),
      ts: k[0] * 1000,
    });

    const candles = window.slice(0, VISIBLE).map(toCandle);
    const futureCandles = window.slice(VISIBLE).map(toCandle);

    const lastVisible = candles[candles.length - 1].close;
    const lastFuture = futureCandles[futureCandles.length - 1].close;
    const moveBps = Math.round(((lastFuture - lastVisible) / lastVisible) * 10000);
    const correct = lastFuture > lastVisible ? "BUY" : "SELL";

    return res.status(200).json({ symbol, interval: ivl.label, candles, futureCandles, correct, moveBps });
  } catch (err) {
    return res.status(500).json({ error: "fetch_failed", detail: String(err?.message || err) });
  }
}
