const SYMBOLS = ["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","ADAUSDT","AVAXUSDT","DOGEUSDT","LINKUSDT","TRXUSDT","DOTUSDT","NEARUSDT","ATOMUSDT","LTCUSDT","ARBUSDT","OPUSDT","SUIUSDT","TONUSDT"];
const INTERVALS = ["1h","4h","1d"];
const VISIBLE = 25;
const FUTURE = 5;

export default async function handler(req, res) {
  const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const interval = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
  const limit = 200;

  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const r = await fetch(url);
    if (!r.ok) {
      return res.status(502).json({ error: "binance_http", status: r.status });
    }
    const data = await r.json();
    if (!Array.isArray(data) || data.length < VISIBLE + FUTURE + 5) {
      return res.status(502).json({ error: "not_enough_candles" });
    }

    const maxStart = data.length - VISIBLE - FUTURE - 1;
    const start = Math.floor(Math.random() * maxStart);
    const window = data.slice(start, start + VISIBLE + FUTURE);

    const toCandle = (k) => ({
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      ts: k[0],
    });

    const candles = window.slice(0, VISIBLE).map(toCandle);
    const futureCandles = window.slice(VISIBLE).map(toCandle);

    const lastVisible = candles[candles.length - 1].close;
    const lastFuture = futureCandles[futureCandles.length - 1].close;
    const moveBps = Math.round(((lastFuture - lastVisible) / lastVisible) * 10000);
    const correct = lastFuture > lastVisible ? "BUY" : "SELL";

    return res.status(200).json({ symbol, interval, candles, futureCandles, correct, moveBps });
  } catch (err) {
    return res.status(500).json({ error: "fetch_failed", detail: String(err?.message || err) });
  }
}
