import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// ============================================================
// Data: example sentences with pre-softmax logits
// ============================================================
const SENTENCES = [
  {
    id: 'weather',
    prefix: '오늘 날씨가 정말',
    blank: '___',
    lang: 'ko',
    tokens: [
      { word: '좋다', logit: 4.2 },
      { word: '덥다', logit: 3.5 },
      { word: '춥다', logit: 3.3 },
      { word: '맑다', logit: 3.0 },
      { word: '나쁘다', logit: 2.1 },
      { word: '흐리다', logit: 1.8 },
      { word: '최고다', logit: 1.5 },
      { word: '습하다', logit: 1.2 },
      { word: '시원하다', logit: 1.0 },
      { word: '따뜻하다', logit: 0.8 },
      { word: '끝내준다', logit: 0.5 },
      { word: '미쳤다', logit: 0.3 },
      { word: '별로다', logit: 0.1 },
      { word: '환상적이다', logit: -0.2 },
      { word: '그렇다', logit: -0.5 },
    ],
  },
  {
    id: 'cat',
    prefix: 'The cat sat on the',
    blank: '___',
    lang: 'en',
    tokens: [
      { word: 'mat', logit: 4.5 },
      { word: 'chair', logit: 3.2 },
      { word: 'table', logit: 2.8 },
      { word: 'floor', logit: 2.6 },
      { word: 'bed', logit: 2.3 },
      { word: 'roof', logit: 1.9 },
      { word: 'couch', logit: 1.6 },
      { word: 'sofa', logit: 1.3 },
      { word: 'windowsill', logit: 1.0 },
      { word: 'rug', logit: 0.7 },
      { word: 'ledge', logit: 0.4 },
      { word: 'pillow', logit: 0.2 },
      { word: 'fence', logit: -0.1 },
      { word: 'step', logit: -0.4 },
      { word: 'keyboard', logit: -0.7 },
    ],
  },
  {
    id: 'ai',
    prefix: '인공지능은 미래에',
    blank: '___',
    lang: 'ko',
    tokens: [
      { word: '발전할', logit: 4.0 },
      { word: '필요한', logit: 3.4 },
      { word: '중요한', logit: 3.1 },
      { word: '대체할', logit: 2.7 },
      { word: '변화시킬', logit: 2.4 },
      { word: '도움이 될', logit: 2.0 },
      { word: '위협적인', logit: 1.5 },
      { word: '혁신적인', logit: 1.2 },
      { word: '보편화될', logit: 0.9 },
      { word: '불가피한', logit: 0.6 },
      { word: '놀라운', logit: 0.3 },
      { word: '강력한', logit: 0.0 },
      { word: '지배할', logit: -0.3 },
      { word: '사라질', logit: -0.7 },
      { word: '감동적인', logit: -1.0 },
    ],
  },
  {
    id: 'breakfast',
    prefix: 'I love eating ___ for breakfast',
    blank: '___',
    lang: 'en',
    tokens: [
      { word: 'eggs', logit: 4.3 },
      { word: 'pancakes', logit: 3.8 },
      { word: 'cereal', logit: 3.4 },
      { word: 'toast', logit: 3.0 },
      { word: 'fruit', logit: 2.6 },
      { word: 'bacon', logit: 2.3 },
      { word: 'oatmeal', logit: 1.9 },
      { word: 'waffles', logit: 1.5 },
      { word: 'yogurt', logit: 1.2 },
      { word: 'muffins', logit: 0.8 },
      { word: 'bagels', logit: 0.5 },
      { word: 'granola', logit: 0.2 },
      { word: 'sausage', logit: -0.1 },
      { word: 'donuts', logit: -0.4 },
      { word: 'pizza', logit: -0.8 },
    ],
  },
];

// ============================================================
// Color palette for pie chart segments
// ============================================================
const PIE_COLORS = [
  '#3b82f6', '#f97316', '#22c55e', '#ab47bc', '#eab308',
  '#ef4444', '#26c6da', '#ff7043', '#9ccc65', '#7e57c2',
  '#ffca28', '#42a5f5', '#ec407a', '#8d6e63', '#78909c',
  '#d4e157', '#5c6bc0', '#29b6f6', '#ffee58', '#bdbdbd',
];

// ============================================================
// Utility functions
// ============================================================
function softmax(logits, temperature) {
  const t = Math.max(temperature, 0.01);
  const scaled = logits.map(l => l / t);
  const maxVal = Math.max(...scaled);
  const exps = scaled.map(s => Math.exp(s - maxVal));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

function entropy(probs) {
  return -probs.reduce((sum, p) => {
    if (p > 1e-10) return sum + p * Math.log2(p);
    return sum;
  }, 0);
}

function sampleFromProbs(probs) {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < probs.length; i++) {
    cumulative += probs[i];
    if (r <= cumulative) return i;
  }
  return probs.length - 1;
}

// ============================================================
// Inline styles
// ============================================================
const S = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    flexWrap: 'wrap',
  },
  sentenceBtn: (active) => ({
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 600,
    border: active ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
    borderRadius: 6,
    cursor: 'pointer',
    background: active ? 'rgba(59,130,246,0.15)' : 'var(--bg-card)',
    color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
    transition: 'all 0.2s',
  }),
  sentenceDisplay: {
    textAlign: 'center',
    padding: '16px 20px',
    background: 'var(--bg-card)',
    borderBottom: '1px solid var(--border)',
  },
  sentenceText: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  blank: {
    display: 'inline-block',
    padding: '2px 16px',
    margin: '0 6px',
    borderBottom: '3px solid var(--accent-orange)',
    color: 'var(--accent-orange)',
    fontFamily: 'var(--font-mono)',
  },
  sliderSection: {
    padding: '14px 20px',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  sliderLabel: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  tempValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: 28,
    fontWeight: 800,
    color: 'var(--accent-blue)',
    minWidth: 60,
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    height: 6,
    appearance: 'none',
    WebkitAppearance: 'none',
    background: 'var(--border)',
    borderRadius: 3,
    outline: 'none',
    cursor: 'pointer',
  },
  mainArea: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    minHeight: 0,
  },
  leftPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRight: '1px solid var(--border)',
  },
  rightPanel: {
    width: 320,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  panelTitle: {
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-secondary)',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  barChartArea: {
    flex: 1,
    overflow: 'auto',
    padding: '8px 16px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 8,
    padding: '10px 16px',
    background: 'var(--bg-card)',
    borderBottom: '1px solid var(--border)',
  },
  statBox: {
    textAlign: 'center',
    padding: '8px 4px',
    background: 'var(--bg-secondary)',
    borderRadius: 8,
  },
  statValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--accent-blue)',
  },
  statLabel: {
    fontSize: 10,
    color: 'var(--text-muted)',
    marginTop: 2,
    fontWeight: 600,
  },
  pieArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    minHeight: 200,
  },
  sampleSection: {
    padding: '10px 16px',
    background: 'var(--bg-secondary)',
    borderTop: '1px solid var(--border)',
  },
  sampleBtn: {
    width: '100%',
    padding: '10px 0',
    fontSize: 14,
    fontWeight: 700,
    border: '2px solid var(--accent-orange)',
    borderRadius: 8,
    background: 'rgba(249,115,22,0.1)',
    color: 'var(--accent-orange)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    letterSpacing: 0.5,
  },
  chipArea: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
    maxHeight: 72,
    overflow: 'hidden',
  },
  chip: (color) => ({
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 4,
    background: color,
    color: '#111',
    fontFamily: 'var(--font-mono)',
  }),
  spinnerOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.95)',
    zIndex: 10,
    borderRadius: 8,
  },
  spinnerText: {
    fontFamily: 'var(--font-mono)',
    fontSize: 32,
    fontWeight: 800,
    color: 'var(--accent-orange)',
    animation: 'pulse 0.15s ease-in-out infinite alternate',
  },
};

// ============================================================
// Bar row component
// ============================================================
function BarRow({ word, probability, maxProb, color, rank }) {
  const pct = (probability * 100).toFixed(1);
  const barWidth = maxProb > 0 ? (probability / maxProb) * 100 : 0;
  const opacity = 0.25 + 0.75 * (probability / (maxProb || 1));

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 3,
      height: 28,
    }}>
      <span style={{
        width: 20,
        fontSize: 11,
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        textAlign: 'right',
        flexShrink: 0,
      }}>
        {rank}
      </span>
      <span style={{
        width: 90,
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-mono)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        {word}
      </span>
      <div style={{
        flex: 1,
        height: 20,
        background: 'var(--bg-input)',
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          width: `${barWidth}%`,
          height: '100%',
          background: color,
          opacity,
          borderRadius: 4,
          transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease',
        }} />
      </div>
      <span style={{
        width: 52,
        fontSize: 12,
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        color: probability > 0.05 ? 'var(--accent-blue)' : 'var(--text-muted)',
        textAlign: 'right',
        flexShrink: 0,
      }}>
        {pct}%
      </span>
    </div>
  );
}

// ============================================================
// Pie / donut chart (canvas)
// ============================================================
function PieChart({ probs, tokens, colors, size = 200 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2 - 8;
    const innerR = outerR * 0.52;

    let startAngle = -Math.PI / 2;
    for (let i = 0; i < probs.length; i++) {
      const sweep = probs[i] * Math.PI * 2;
      if (sweep < 0.001) continue;

      ctx.beginPath();
      ctx.moveTo(cx + innerR * Math.cos(startAngle), cy + innerR * Math.sin(startAngle));
      ctx.arc(cx, cy, outerR, startAngle, startAngle + sweep);
      const endOuter = startAngle + sweep;
      ctx.lineTo(cx + innerR * Math.cos(endOuter), cy + innerR * Math.sin(endOuter));
      ctx.arc(cx, cy, innerR, endOuter, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = 0.3 + 0.7 * (probs[i] / Math.max(...probs));
      ctx.fill();
      ctx.globalAlpha = 1;

      // label for large segments
      if (probs[i] > 0.06) {
        const midAngle = startAngle + sweep / 2;
        const labelR = (outerR + innerR) / 2;
        const lx = cx + labelR * Math.cos(midAngle);
        const ly = cy + labelR * Math.sin(midAngle);
        ctx.save();
        ctx.font = `bold 10px 'JetBrains Mono', monospace`;
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = tokens[i].length > 5 ? tokens[i].slice(0, 4) + '..' : tokens[i];
        ctx.fillText(label, lx, ly);
        ctx.restore();
      }

      startAngle += sweep;
    }

    // center circle bg
    ctx.beginPath();
    ctx.arc(cx, cy, innerR - 1, 0, Math.PI * 2);
    ctx.fillStyle = 'var(--bg-card)';
    ctx.fill();
  }, [probs, tokens, colors, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
    />
  );
}

// ============================================================
// Sampling spinner animation
// ============================================================
function SamplingSpinner({ tokens, probs, onDone }) {
  const [displayIdx, setDisplayIdx] = useState(0);
  const frameRef = useRef(0);
  const totalFrames = 18;

  useEffect(() => {
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      // weighted random during spin
      setDisplayIdx(sampleFromProbs(probs));
      if (frame >= totalFrames) {
        clearInterval(interval);
        // final pick using actual probabilities
        const finalIdx = sampleFromProbs(probs);
        setDisplayIdx(finalIdx);
        setTimeout(() => onDone(finalIdx), 300);
      }
    }, 60 + frame * 8);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={S.spinnerOverlay}>
      <div style={S.spinnerText}>
        {tokens[displayIdx]}
      </div>
    </div>
  );
}

// ============================================================
// Main component
// ============================================================
export default function TemperatureViz() {
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [temperature, setTemperature] = useState(1.0);
  const [sampleHistory, setSampleHistory] = useState([]);
  const [spinning, setSpinning] = useState(false);

  const sentence = SENTENCES[sentenceIdx];
  const logits = sentence.tokens.map(t => t.logit);
  const words = sentence.tokens.map(t => t.word);

  // Compute probabilities
  const probs = useMemo(() => softmax(logits, temperature), [logits, temperature]);

  // Sort by probability
  const sorted = useMemo(() => {
    const indexed = probs.map((p, i) => ({ idx: i, prob: p, word: words[i] }));
    indexed.sort((a, b) => b.prob - a.prob);
    return indexed;
  }, [probs, words]);

  const maxProb = sorted.length > 0 ? sorted[0].prob : 0;

  // Stats
  const ent = useMemo(() => entropy(probs), [probs]);
  const top1 = (maxProb * 100).toFixed(1);
  const effectiveVocab = probs.filter(p => p > 0.01).length;

  // Sampling
  const handleSample = useCallback(() => {
    if (spinning) return;
    setSpinning(true);
  }, [spinning]);

  const handleSpinDone = useCallback((idx) => {
    setSpinning(false);
    setSampleHistory(prev => {
      const next = [{ word: words[idx], colorIdx: idx }, ...prev];
      return next.slice(0, 20);
    });
  }, [words]);

  // Reset history on sentence change
  useEffect(() => {
    setSampleHistory([]);
  }, [sentenceIdx]);

  // Temperature color
  const tempColor = temperature <= 1.0
    ? `rgb(59,130,246)`
    : temperature <= 2.0
      ? `rgb(${59 + (temperature - 1) * 190}, ${130 - (temperature - 1) * 15}, ${246 - (temperature - 1) * 224})`
      : `rgb(249, 115, 22)`;

  return (
    <div style={S.container}>
      {/* Sentence selector */}
      <div style={S.topBar}>
        {SENTENCES.map((s, i) => (
          <button
            key={s.id}
            style={S.sentenceBtn(i === sentenceIdx)}
            onClick={() => setSentenceIdx(i)}
          >
            {s.prefix.length > 18 ? s.prefix.slice(0, 18) + '...' : s.prefix}
          </button>
        ))}
      </div>

      {/* Sentence display */}
      <div style={S.sentenceDisplay}>
        <div style={S.sentenceText}>
          {sentence.id === 'breakfast' ? (
            <>
              I love eating <span style={S.blank}>___</span> for breakfast
            </>
          ) : (
            <>
              {sentence.prefix} <span style={S.blank}>{sentence.blank}</span>
            </>
          )}
        </div>
        <div style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          marginTop: 6,
        }}>
          다음에 올 단어를 예측합니다. Temperature가 확률 분포를 어떻게 바꾸는지 관찰하세요.
        </div>
      </div>

      {/* Temperature slider */}
      <div style={S.sliderSection}>
        <div style={S.sliderRow}>
          <span style={{ ...S.sliderLabel, color: 'var(--accent-blue)' }}>
            더 확정적
          </span>
          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.05"
            value={temperature}
            onChange={e => setTemperature(parseFloat(e.target.value))}
            style={S.slider}
          />
          <span style={{ ...S.sliderLabel, color: 'var(--accent-orange)' }}>
            더 창의적
          </span>
          <div style={{ ...S.tempValue, color: tempColor }}>
            {temperature.toFixed(2)}
          </div>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          marginTop: 6,
        }}>
          {[0.1, 0.5, 1.0, 1.5, 2.0, 3.0].map(v => (
            <button
              key={v}
              onClick={() => setTemperature(v)}
              style={{
                padding: '2px 10px',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                border: Math.abs(temperature - v) < 0.03 ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
                borderRadius: 4,
                background: Math.abs(temperature - v) < 0.03 ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: Math.abs(temperature - v) < 0.03 ? 'var(--accent-blue)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              T={v.toFixed(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <div style={S.statsGrid}>
        <div style={S.statBox}>
          <div style={S.statValue}>{top1}%</div>
          <div style={S.statLabel}>Top-1 확률</div>
        </div>
        <div style={S.statBox}>
          <div style={{ ...S.statValue, color: 'var(--accent-orange)' }}>{ent.toFixed(2)}</div>
          <div style={S.statLabel}>엔트로피 (bits)</div>
        </div>
        <div style={S.statBox}>
          <div style={{ ...S.statValue, color: 'var(--accent-green)' }}>{effectiveVocab}</div>
          <div style={S.statLabel}>유효 어휘 수 ({'>'}1%)</div>
        </div>
      </div>

      {/* Main area: bar chart + pie/sampling */}
      <div style={S.mainArea}>
        {/* Left: bar chart */}
        <div style={S.leftPanel}>
          <div style={S.panelTitle}>확률 분포 (Bar Chart)</div>
          <div style={S.barChartArea}>
            {sorted.map((item, rank) => (
              <BarRow
                key={item.word}
                word={item.word}
                probability={item.prob}
                maxProb={maxProb}
                color={PIE_COLORS[item.idx % PIE_COLORS.length]}
                rank={rank + 1}
              />
            ))}
          </div>
        </div>

        {/* Right: pie chart + sampling */}
        <div style={S.rightPanel}>
          <div style={S.panelTitle}>분포 시각화</div>
          <div style={S.pieArea}>
            <PieChart
              probs={sorted.map(s => s.prob)}
              tokens={sorted.map(s => s.word)}
              colors={sorted.map(s => PIE_COLORS[s.idx % PIE_COLORS.length])}
              size={190}
            />
          </div>

          <div style={S.panelTitle}>샘플링 실험</div>
          <div style={{ ...S.sampleSection, position: 'relative' }}>
            {spinning && (
              <SamplingSpinner
                tokens={words}
                probs={probs}
                onDone={handleSpinDone}
              />
            )}
            <button
              style={{
                ...S.sampleBtn,
                opacity: spinning ? 0.4 : 1,
                pointerEvents: spinning ? 'none' : 'auto',
              }}
              onClick={handleSample}
            >
              Sample!
            </button>
            {sampleHistory.length > 0 && (
              <div style={S.chipArea}>
                {sampleHistory.map((item, i) => (
                  <span
                    key={i}
                    style={S.chip(PIE_COLORS[item.colorIdx % PIE_COLORS.length])}
                  >
                    {item.word}
                  </span>
                ))}
              </div>
            )}
            {sampleHistory.length > 0 && (
              <div style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                marginTop: 6,
                textAlign: 'center',
              }}>
                최근 {sampleHistory.length}회 샘플 결과
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slider styling via global style tag */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--accent-blue);
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 0 6px rgba(59,130,246,0.4);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--accent-blue);
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 0 6px rgba(59,130,246,0.4);
        }
        @keyframes pulse {
          from { transform: scale(1); }
          to { transform: scale(1.15); }
        }
        .page-content {
          overflow: hidden !important;
        }
      `}</style>
    </div>
  );
}
