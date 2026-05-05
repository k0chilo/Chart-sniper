import { MousePointer2, Minus, Slash, Activity, Trash2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

export function fmtDiff(diff) {
  const sign = diff >= 0 ? "+" : "";
  const abs = Math.abs(diff);
  if (abs >= 100) return sign + diff.toFixed(1);
  if (abs >= 1) return sign + diff.toFixed(3);
  return sign + diff.toFixed(5);
}

export function fmtDateLabel(ts, intervalLabel) {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  if (intervalLabel === "1D") return `${dd}/${mm}/${yy}`;
  const hh = String(d.getHours()).padStart(2, "0");
  const mn = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${mn}`;
}

const FIB_RATIOS = [
  { r: 0, color: "#ff4757", label: "0%" },
  { r: 0.236, color: "#e8a838", label: "23.6%" },
  { r: 0.382, color: "#3d84c8", label: "38.2%" },
  { r: 0.5, color: "#7c5cbf", label: "50%" },
  { r: 0.618, color: "#3d84c8", label: "61.8%" },
  { r: 0.786, color: "#e8a838", label: "78.6%" },
  { r: 1, color: "#ff4757", label: "100%" },
];

export function ToolBtn({ active, onClick, title, children, danger }) {
  return (
    <button onClick={onClick} title={title} type="button" style={{
      width: 34, height: 34, display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: active ? "#1a2332" : "transparent",
      color: danger ? "#ff4757" : (active ? "#00d084" : "#7a8a9a"),
      border: "1px solid " + (active ? "#2a3548" : "#1a2332"),
      borderRadius: 6, cursor: "pointer", padding: 0, transition: "all 0.15s",
    }}>{children}</button>
  );
}

export function ChartToolbar({ tool, setTool, pending, setPending, onClearAll, onZoomIn, onZoomOut, onZoomReset, isCustomZoom }) {
  const hint = pending ? "click para finalizar" : (
    tool === "hline" ? "click no preco" :
    tool === "trendline" ? "click no inicio" :
    tool === "fib" ? "click no topo (ou fundo)" : null
  );
  return (
    <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderBottom: "1px solid #1a2332", marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
      <ToolBtn active={tool === "none"} onClick={() => { setTool("none"); setPending(null); }} title="Cursor"><MousePointer2 size={16}/></ToolBtn>
      <ToolBtn active={tool === "hline"} onClick={() => { setTool("hline"); setPending(null); }} title="Linha horizontal"><Minus size={16}/></ToolBtn>
      <ToolBtn active={tool === "trendline"} onClick={() => { setTool("trendline"); setPending(null); }} title="Linha de tendencia"><Slash size={16}/></ToolBtn>
      <ToolBtn active={tool === "fib"} onClick={() => { setTool("fib"); setPending(null); }} title="Fibonacci (2 cliques)"><Activity size={16}/></ToolBtn>
      {hint && <span style={{ color: "#7a8a9a", fontSize: 11, marginLeft: 6 }}>{hint}</span>}
      <div style={{ flex: 1 }} />
      {onZoomIn && (<>
        <ToolBtn onClick={onZoomOut} title="Mais candles"><ZoomOut size={16}/></ToolBtn>
        <ToolBtn onClick={onZoomIn} title="Menos candles"><ZoomIn size={16}/></ToolBtn>
        <ToolBtn active={isCustomZoom} onClick={onZoomReset} title="Reset zoom"><Maximize2 size={15}/></ToolBtn>
        <div style={{width:1,height:20,background:"#1a2332",margin:"0 4px"}}/>
      </>)}
      <ToolBtn onClick={onClearAll} title="Limpar desenhos" danger><Trash2 size={16}/></ToolBtn>
    </div>
  );
}

export function CandleChart({ candles, width = 950, height = 380, futureCount = 0, watermark, intervalLabel, drawings = [], pending = null, hover = null, tool = "none", svgRef, onClick, onMouseMove, onMouseLeave }) {
  const padding = { top: 38, right: 90, bottom: 42, left: 28 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const allPrices = candles.flatMap((c) => [c.high, c.low]);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP || 1;
  const pad = range * 0.1;
  const toY = (p) => padding.top + ((maxP + pad - p) / (range + 2 * pad)) * chartH;
  const yToPrice = (y) => maxP + pad - ((y - padding.top) / chartH) * (range + 2 * pad);
  const _slotW = chartW / candles.length;
  const candleW = Math.max(2, Math.floor(_slotW * 0.78));
  const wickW = Math.max(0.8, Math.min(1.6, candleW / 7));
  const levels = 5;
  const priceLines = Array.from({ length: levels }, (_, i) => minP - pad + ((range + 2 * pad) / (levels - 1)) * i).reverse();
  const fmtPrice = (p) => { if (p == null) return ""; if (p >= 1000) return p.toFixed(1); if (p >= 1) return p.toFixed(3); return p.toFixed(5); };
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
  const dateTicks = candles.length > 0 ? [0, Math.floor(candles.length * 0.33), Math.floor(candles.length * 0.66), candles.length - 1] : [];

  const renderDrawing = (d) => {
    if (d.type === "hline") {
      const price = yToPrice(d.y);
      return (
        <g key={d.id}>
          <line x1={padding.left} x2={padding.left + chartW} y1={d.y} y2={d.y} stroke="#3d84c8" strokeWidth={1.5} strokeDasharray="5,3" />
          <rect x={padding.left + chartW + 4} y={d.y - 8} width={84} height={16} rx={4} fill="#3d84c8" />
          <text x={padding.left + chartW + 46} y={d.y + 4} textAnchor="middle" fill="#0a0e14" fontSize={10} fontFamily="'JetBrains Mono', monospace" fontWeight={700}>{fmtPrice(price)}</text>
        </g>
      );
    }
    if (d.type === "trendline") {
      return <line key={d.id} x1={d.p1.x} y1={d.p1.y} x2={d.p2.x} y2={d.p2.y} stroke="#7c5cbf" strokeWidth={1.8} />;
    }
    if (d.type === "fib") {
      const p1y = d.p1.y, p2y = d.p2.y;
      return (
        <g key={d.id}>
          <line x1={d.p1.x} y1={d.p1.y} x2={d.p2.x} y2={d.p2.y} stroke="#5a6a7d" strokeWidth={1} strokeDasharray="2,3" opacity={0.6}/>
          {FIB_RATIOS.map(({r, color, label}) => {
            const y = p1y + r * (p2y - p1y);
            const price = yToPrice(y);
            return (
              <g key={r}>
                <line x1={padding.left} x2={padding.left + chartW} y1={y} y2={y} stroke={color} strokeWidth={1} strokeDasharray="3,3" opacity={0.7}/>
                <text x={padding.left + 6} y={y - 3} fill={color} fontSize={9} fontFamily="'JetBrains Mono', monospace" fontWeight={600}>{label}</text>
                <text x={padding.left + chartW - 6} y={y - 3} textAnchor="end" fill={color} fontSize={9} fontFamily="'JetBrains Mono', monospace">{fmtPrice(price)}</text>
              </g>
            );
          })}
        </g>
      );
    }
    return null;
  };
  const cursorStyle = tool !== "none" ? "crosshair" : "default";

  return (
    <svg ref={svgRef} onClick={onClick} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ display: "block", maxHeight: height, cursor: cursorStyle }}>
      {watermark && (
        <text x={padding.left + chartW / 2} y={padding.top + chartH / 2 + 18} textAnchor="middle" fontSize={66} fontFamily="'Inter', sans-serif" fontWeight={800} fill="#1a2332" opacity={0.6} style={{ userSelect: "none", pointerEvents: "none" }}>{watermark}</text>
      )}
      {futureCount > 0 && dividerX != null && (
        <rect x={dividerX} y={padding.top} width={padding.left + chartW - dividerX} height={chartH} fill="#0e1e2e" fillOpacity={0.35} pointerEvents="none" />
      )}
      {priceLines.map((p, i) => (
        <g key={i} pointerEvents="none">
          <line x1={padding.left} x2={padding.left + chartW} y1={toY(p)} y2={toY(p)} stroke="#1a2332" strokeWidth={1} strokeDasharray="2,4" opacity={0.7} />
          <text x={padding.left + chartW + 8} y={toY(p) + 4} textAnchor="start" fill="#5a6a7d" fontSize={10} fontFamily="'JetBrains Mono', monospace">{fmtPrice(p)}</text>
        </g>
      ))}
      {candles.map((c, i) => {
        const x = candleX(i);
        const isGreen = c.close >= c.open;
        const isFuture = i >= visibleCount;
        const baseColor = isGreen ? "#26a69a" : "#ef5350";
        const opacity = isFuture ? 0.75 : 0.95;
        const bodyTop = toY(Math.max(c.open, c.close));
        const bodyBot = toY(Math.min(c.open, c.close));
        const bodyH = Math.max(2, bodyBot - bodyTop);
        return (
          <g key={i} pointerEvents="none">
            <line x1={x} x2={x} y1={toY(c.high)} y2={toY(c.low)} stroke={baseColor} strokeWidth={wickW} opacity={opacity} />
            <rect x={x - candleW / 2} y={bodyTop} width={candleW} height={bodyH} fill={baseColor} fillOpacity={isFuture ? 0.65 : 1} />
          </g>
        );
      })}
      {dateTicks.map((idx, i) => {
        const c = candles[idx];
        if (!c?.ts) return null;
        const x = candleX(idx);
        return (
          <g key={`t${i}`} pointerEvents="none">
            <line x1={x} x2={x} y1={padding.top + chartH} y2={padding.top + chartH + 4} stroke="#2a3548" strokeWidth={1} />
            <text x={x} y={padding.top + chartH + 18} textAnchor="middle" fill="#5a6a7d" fontSize={10} fontFamily="'JetBrains Mono', monospace">{fmtDateLabel(c.ts, intervalLabel)}</text>
          </g>
        );
      })}
      {drawings.map(d => renderDrawing(d))}
      {pending && hover && (
        <g pointerEvents="none">
          <circle cx={pending.p1.x} cy={pending.p1.y} r={4} fill="#7c5cbf" />
          <line x1={pending.p1.x} y1={pending.p1.y} x2={hover.x} y2={hover.y} stroke="#7c5cbf" strokeWidth={1.6} strokeDasharray="3,3" />
        </g>
      )}
      {hover && tool !== "none" && (
        <g pointerEvents="none">
          <line x1={hover.x} x2={hover.x} y1={padding.top} y2={padding.top + chartH} stroke="#7a8a9a" strokeWidth={0.5} strokeDasharray="2,3" opacity={0.5}/>
          <line x1={padding.left} x2={padding.left+chartW} y1={hover.y} y2={hover.y} stroke="#7a8a9a" strokeWidth={0.5} strokeDasharray="2,3" opacity={0.5}/>
          <rect x={padding.left + chartW - 70} y={hover.y - 8} width={66} height={16} rx={3} fill="#7a8a9a" opacity={0.85}/>
          <text x={padding.left + chartW - 37} y={hover.y + 4} textAnchor="middle" fill="#0a0e14" fontSize={10} fontFamily="'JetBrains Mono', monospace" fontWeight={700}>{fmtPrice(yToPrice(hover.y))}</text>
        </g>
      )}
      {futureCount > 0 && entryPrice != null && (
        <g pointerEvents="none">
          <line x1={dividerX} x2={dividerX} y1={padding.top} y2={padding.top + chartH} stroke="#e8a838" strokeWidth={2} strokeDasharray="6,3" />
          <line x1={padding.left} x2={padding.left + chartW} y1={toY(entryPrice)} y2={toY(entryPrice)} stroke="#e8a838" strokeWidth={1} strokeDasharray="2,3" opacity={0.55} />
          <rect x={dividerX - 40} y={padding.top - 26} width={80} height={20} rx={4} fill="#e8a838" />
          <text x={dividerX} y={padding.top - 12} textAnchor="middle" fill="#0a0e14" fontSize={11} fontFamily="'Inter', sans-serif" fontWeight={700}>ENTRADA</text>
          <rect x={padding.left + chartW + 4} y={toY(entryPrice) - 9} width={84} height={18} rx={4} fill="#e8a838" />
          <text x={padding.left + chartW + 46} y={toY(entryPrice) + 4} textAnchor="middle" fill="#0a0e14" fontSize={10} fontFamily="'JetBrains Mono', monospace" fontWeight={700}>{fmtPrice(entryPrice)}</text>
        </g>
      )}
      {futureCount > 0 && exitPrice != null && (
        <g pointerEvents="none">
          <line x1={lastCandleX} x2={lastCandleX} y1={padding.top} y2={padding.top + chartH} stroke={exitColor} strokeWidth={2} strokeDasharray="6,3" />
          <line x1={dividerX} x2={padding.left + chartW} y1={toY(exitPrice)} y2={toY(exitPrice)} stroke={exitColor} strokeWidth={2} />
          <rect x={lastCandleX - 22} y={padding.top - 26} width={44} height={20} rx={4} fill={exitColor} />
          <text x={lastCandleX} y={padding.top - 12} textAnchor="middle" fill="#0a0e14" fontSize={11} fontFamily="'Inter', sans-serif" fontWeight={700}>FIM</text>
          <rect x={padding.left + chartW + 4} y={toY(exitPrice) - 9} width={84} height={18} rx={4} fill={exitColor} />
          <text x={padding.left + chartW + 46} y={toY(exitPrice) + 4} textAnchor="middle" fill="#0a0e14" fontSize={10} fontFamily="'JetBrains Mono', monospace" fontWeight={700}>{fmtPrice(exitPrice)}</text>
        </g>
      )}
      {futureCount === 0 && candles.length > 0 && (() => {
        const last = candles[candles.length - 1];
        const y = toY(last.close);
        const isGreen = last.close >= last.open;
        return (
          <line x1={padding.left} x2={padding.left + chartW} y1={y} y2={y} stroke={isGreen ? "#26a69a" : "#ef5350"} strokeWidth={1} strokeDasharray="4,3" opacity={0.5} pointerEvents="none" />
        );
      })()}
    </svg>
  );
}
