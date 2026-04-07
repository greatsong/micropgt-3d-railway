import { useState, useRef, useEffect, useCallback, useMemo } from 'react'

// ============================================================
// Pre-computed attention data
// ============================================================
const EXAMPLE_SENTENCES = [
  { text: 'The cat sat on the mat because it was tired', lang: 'en' },
  { text: '나는 학교에서 친구와 함께 점심을 먹었다', lang: 'ko' },
  { text: 'The bank by the river had a nice view', lang: 'en' },
  { text: 'She gave him the book that she had bought', lang: 'en' },
]

function buildUniform(tokens, base = 0.08) {
  const n = tokens.length
  const m = {}
  tokens.forEach((t, i) => {
    const row = {}
    tokens.forEach((k, j) => { row[k] = base })
    m[t] = row
  })
  return m
}

function mergeWeights(base, overrides) {
  const m = {}
  for (const q of Object.keys(base)) {
    m[q] = { ...base[q] }
    if (overrides[q]) {
      for (const k of Object.keys(overrides[q])) {
        m[q][k] = overrides[q][k]
      }
    }
  }
  // Normalize each row to sum to 1
  for (const q of Object.keys(m)) {
    const vals = Object.values(m[q])
    const s = vals.reduce((a, b) => a + b, 0)
    if (s > 0) {
      for (const k of Object.keys(m[q])) {
        m[q][k] = m[q][k] / s
      }
    }
  }
  return m
}

function buildAttention(tokens, overrides) {
  return mergeWeights(buildUniform(tokens, 0.04), overrides)
}

// Multi-head patterns: positional, syntactic, semantic
function buildPositionalHead(tokens) {
  const n = tokens.length
  const m = {}
  tokens.forEach((t, i) => {
    const row = {}
    tokens.forEach((k, j) => {
      const dist = Math.abs(i - j)
      row[k] = Math.exp(-dist * 0.6)
    })
    m[t] = row
  })
  // Normalize
  for (const q of Object.keys(m)) {
    const s = Object.values(m[q]).reduce((a, b) => a + b, 0)
    for (const k of Object.keys(m[q])) m[q][k] /= s
  }
  return m
}

const ATTENTION_DATA = {
  'The cat sat on the mat because it was tired': {
    tokens: ['The', 'cat', 'sat', 'on', 'the', 'mat', 'because', 'it', 'was', 'tired'],
    heads: [
      // Head 0 - default/coreference
      null,
      // Head 1 - syntactic (subject-verb)
      null,
      // Head 2 - semantic
      null,
    ],
    overrides: {
      it: { cat: 0.45, it: 0.15, sat: 0.10, was: 0.08, tired: 0.06 },
      tired: { cat: 0.25, was: 0.20, tired: 0.15, it: 0.10, sat: 0.08 },
      mat: { the: 0.20, on: 0.25, mat: 0.15, sat: 0.10, cat: 0.06 },
      because: { sat: 0.22, cat: 0.18, on: 0.10, mat: 0.12, because: 0.08 },
      sat: { cat: 0.30, sat: 0.12, on: 0.15, The: 0.10, mat: 0.08 },
      The: { The: 0.20, cat: 0.35, sat: 0.12, on: 0.06, the: 0.05 },
      cat: { The: 0.22, cat: 0.18, sat: 0.20, on: 0.06, mat: 0.06 },
      on: { sat: 0.20, on: 0.12, the: 0.18, mat: 0.22, cat: 0.06 },
      the: { the: 0.15, mat: 0.35, on: 0.18, sat: 0.06, cat: 0.05 },
      was: { it: 0.22, was: 0.12, tired: 0.28, cat: 0.10, because: 0.08 },
    },
    syntacticOverrides: {
      sat: { cat: 0.40, sat: 0.15, The: 0.12 },
      was: { it: 0.35, was: 0.15, tired: 0.20 },
      cat: { The: 0.30, cat: 0.20, sat: 0.18 },
      it: { it: 0.20, was: 0.25, because: 0.15 },
      tired: { was: 0.30, it: 0.18, tired: 0.15 },
      mat: { the: 0.30, on: 0.20, mat: 0.15 },
    },
    semanticOverrides: {
      cat: { cat: 0.15, it: 0.20, tired: 0.18, sat: 0.15 },
      it: { cat: 0.40, it: 0.12, tired: 0.15, was: 0.08 },
      tired: { cat: 0.22, it: 0.15, was: 0.12, sat: 0.10, tired: 0.12 },
      mat: { on: 0.22, sat: 0.15, the: 0.18, mat: 0.12 },
      because: { tired: 0.20, sat: 0.15, cat: 0.15, was: 0.12 },
    },
  },
  '나는 학교에서 친구와 함께 점심을 먹었다': {
    tokens: ['나는', '학교에서', '친구와', '함께', '점심을', '먹었다'],
    overrides: {
      '먹었다': { '나는': 0.25, '점심을': 0.30, '먹었다': 0.10, '친구와': 0.12, '함께': 0.08 },
      '나는': { '나는': 0.18, '먹었다': 0.22, '학교에서': 0.15, '친구와': 0.12, '점심을': 0.10 },
      '점심을': { '먹었다': 0.30, '점심을': 0.15, '나는': 0.12, '함께': 0.10, '친구와': 0.10 },
      '친구와': { '함께': 0.28, '친구와': 0.15, '나는': 0.15, '학교에서': 0.12, '먹었다': 0.08 },
      '함께': { '친구와': 0.30, '함께': 0.12, '먹었다': 0.15, '나는': 0.10, '점심을': 0.10 },
      '학교에서': { '학교에서': 0.15, '나는': 0.18, '친구와': 0.15, '먹었다': 0.12, '함께': 0.10 },
    },
    syntacticOverrides: {
      '먹었다': { '나는': 0.30, '점심을': 0.25, '먹었다': 0.12 },
      '나는': { '나는': 0.20, '먹었다': 0.28, '학교에서': 0.15 },
      '점심을': { '먹었다': 0.35, '점심을': 0.15, '나는': 0.10 },
      '친구와': { '함께': 0.30, '친구와': 0.18, '나는': 0.12 },
    },
    semanticOverrides: {
      '먹었다': { '점심을': 0.32, '나는': 0.15, '친구와': 0.12, '함께': 0.10 },
      '점심을': { '먹었다': 0.30, '학교에서': 0.15, '나는': 0.12 },
      '친구와': { '함께': 0.28, '나는': 0.18, '학교에서': 0.12 },
      '학교에서': { '나는': 0.20, '친구와': 0.15, '함께': 0.12 },
    },
  },
  'The bank by the river had a nice view': {
    tokens: ['The', 'bank', 'by', 'the', 'river', 'had', 'a', 'nice', 'view'],
    overrides: {
      bank: { river: 0.35, The: 0.15, by: 0.12, bank: 0.10, view: 0.08 },
      view: { nice: 0.25, bank: 0.15, river: 0.20, view: 0.10, had: 0.08 },
      river: { bank: 0.22, by: 0.18, the: 0.15, river: 0.12, view: 0.08 },
      nice: { view: 0.30, nice: 0.12, a: 0.15, bank: 0.08, river: 0.10 },
      had: { bank: 0.20, had: 0.10, a: 0.12, nice: 0.15, view: 0.18 },
      The: { The: 0.18, bank: 0.35, by: 0.10, river: 0.08, had: 0.06 },
      by: { bank: 0.22, the: 0.20, river: 0.25, by: 0.08, The: 0.05 },
      the: { the: 0.12, river: 0.35, by: 0.18, bank: 0.10, had: 0.05 },
      a: { nice: 0.30, view: 0.25, a: 0.10, had: 0.12, bank: 0.05 },
    },
    syntacticOverrides: {
      bank: { The: 0.25, bank: 0.18, had: 0.22, by: 0.10 },
      had: { bank: 0.28, had: 0.15, view: 0.20, a: 0.10 },
      view: { a: 0.20, nice: 0.22, view: 0.15, had: 0.12 },
      river: { the: 0.28, river: 0.15, by: 0.18, bank: 0.10 },
    },
    semanticOverrides: {
      bank: { river: 0.38, view: 0.12, nice: 0.08, bank: 0.10 },
      view: { nice: 0.22, river: 0.18, bank: 0.15, view: 0.12 },
      river: { bank: 0.30, view: 0.15, by: 0.12, river: 0.10 },
      nice: { view: 0.32, bank: 0.10, river: 0.12, nice: 0.10 },
    },
  },
  'She gave him the book that she had bought': {
    tokens: ['She', 'gave', 'him', 'the', 'book', 'that', 'she', 'had', 'bought'],
    overrides: {
      She: { She: 0.18, gave: 0.25, him: 0.12, book: 0.10, she: 0.12 },
      gave: { She: 0.22, gave: 0.10, him: 0.20, book: 0.18, the: 0.08 },
      him: { She: 0.15, gave: 0.25, him: 0.12, the: 0.10, book: 0.12 },
      the: { the: 0.12, book: 0.35, gave: 0.10, him: 0.08, that: 0.08 },
      book: { the: 0.20, book: 0.12, bought: 0.22, gave: 0.12, that: 0.10 },
      that: { book: 0.25, that: 0.10, she: 0.15, bought: 0.18, had: 0.08 },
      she: { She: 0.35, she: 0.12, had: 0.15, bought: 0.12, gave: 0.08 },
      had: { she: 0.20, had: 0.10, bought: 0.30, book: 0.10, that: 0.08 },
      bought: { book: 0.25, had: 0.18, she: 0.15, bought: 0.10, that: 0.08 },
    },
    syntacticOverrides: {
      gave: { She: 0.30, him: 0.22, book: 0.15, gave: 0.10 },
      bought: { she: 0.25, had: 0.22, book: 0.18, bought: 0.10 },
      she: { She: 0.30, had: 0.18, bought: 0.15, she: 0.12 },
      book: { the: 0.28, book: 0.15, that: 0.15, gave: 0.10 },
    },
    semanticOverrides: {
      gave: { bought: 0.20, book: 0.18, him: 0.15, She: 0.12 },
      bought: { gave: 0.18, book: 0.22, she: 0.15, had: 0.12 },
      book: { bought: 0.25, gave: 0.15, the: 0.12, that: 0.10 },
      she: { She: 0.38, gave: 0.10, bought: 0.12, she: 0.10 },
    },
  },
}

function getAttentionForSentence(text) {
  const data = ATTENTION_DATA[text]
  if (!data) return null
  const tokens = data.tokens

  const defaultHead = buildAttention(tokens, data.overrides)
  const positionalHead = buildPositionalHead(tokens)
  const syntacticHead = buildAttention(tokens, data.syntacticOverrides || {})
  const semanticHead = buildAttention(tokens, data.semanticOverrides || {})

  return {
    tokens,
    heads: [
      { label: 'Head 1: Positional', desc: '가까운 토큰에 주목', weights: positionalHead },
      { label: 'Head 2: Syntactic', desc: '문법적 관계 (주어-서술어)', weights: syntacticHead },
      { label: 'Head 3: Semantic', desc: '의미적 연관 (유사 개념)', weights: semanticHead },
      { label: 'Head 4: Default', desc: '종합 어텐션 패턴', weights: defaultHead },
    ],
    default: defaultHead,
  }
}

// ============================================================
// Utility
// ============================================================
function softmax(arr) {
  const max = Math.max(...arr)
  const exps = arr.map(x => Math.exp(x - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map(e => e / sum)
}

function dotProduct(a, b) {
  return a.reduce((s, v, i) => s + v * b[i], 0)
}

function colorForWeight(w, maxW = 1) {
  const t = Math.min(w / maxW, 1)
  // light -> red (high attention = red/warm)
  const r = Math.round(240 + t * (239 - 240))
  const g = Math.round(244 + t * (68 - 244))
  const b = Math.round(248 + t * (68 - 248))
  return `rgb(${r},${g},${b})`
}

function colorForWeightAlpha(w, maxW = 1) {
  const t = Math.min(w / maxW, 1)
  return `rgba(239, 68, 68, ${0.08 + t * 0.88})`
}

// ============================================================
// Styles
// ============================================================
const s = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  section: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--border)',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--accent-blue)',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sentenceBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  sentenceBtn: (active) => ({
    padding: '8px 14px',
    fontSize: 13,
    fontFamily: 'var(--font-sans)',
    border: active ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
    borderRadius: 8,
    background: active ? 'rgba(59,130,246,0.15)' : 'var(--bg-card)',
    color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: active ? 600 : 400,
    maxWidth: 340,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
  customInput: {
    flex: 1,
    minWidth: 200,
    padding: '8px 12px',
    fontSize: 13,
    fontFamily: 'var(--font-sans)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  heatmapWrap: {
    overflowX: 'auto',
    paddingBottom: 8,
  },
  tooltip: {
    position: 'fixed',
    padding: '6px 10px',
    background: '#ffffff',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
    color: '#1e293b',
    pointerEvents: 'none',
    zIndex: 1000,
    whiteSpace: 'nowrap',
  },
  arcContainer: {
    width: '100%',
    position: 'relative',
  },
  tokenRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 2,
    flexWrap: 'wrap',
  },
  tokenChip: (active, hovered) => ({
    padding: '6px 12px',
    fontSize: 13,
    fontFamily: 'var(--font-mono)',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: active
      ? '2px solid var(--accent-blue)'
      : hovered
        ? '2px solid rgba(59,130,246,0.4)'
        : '2px solid transparent',
    background: active
      ? 'rgba(59,130,246,0.2)'
      : hovered
        ? 'rgba(59,130,246,0.08)'
        : 'var(--bg-card)',
    color: active ? 'var(--accent-blue)' : 'var(--text-primary)',
    fontWeight: active ? 600 : 400,
    userSelect: 'none',
  }),
  stepNav: {
    display: 'flex',
    gap: 6,
    marginBottom: 16,
  },
  stepBtn: (active) => ({
    padding: '8px 16px',
    fontSize: 13,
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    background: active ? 'var(--accent-blue)' : 'var(--bg-card)',
    color: active ? '#f5f7fb' : 'var(--text-secondary)',
    transition: 'all 0.2s',
  }),
  vectorBox: {
    display: 'inline-flex',
    gap: 3,
    padding: '4px 8px',
    borderRadius: 6,
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
  },
  vecVal: (color) => ({
    padding: '2px 6px',
    borderRadius: 4,
    background: color,
    color: '#1e293b',
    fontSize: 11,
    fontWeight: 600,
    minWidth: 32,
    textAlign: 'center',
  }),
  headTabs: {
    display: 'flex',
    gap: 6,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  headTab: (active) => ({
    padding: '8px 14px',
    fontSize: 13,
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    border: active ? '1px solid var(--accent-orange)' : '1px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
    background: active ? 'rgba(249,115,22,0.15)' : 'var(--bg-card)',
    color: active ? 'var(--accent-orange)' : 'var(--text-secondary)',
    transition: 'all 0.2s',
  }),
  headDesc: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  explanationBox: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '16px 20px',
    fontSize: 14,
    lineHeight: 1.7,
    color: 'var(--text-primary)',
  },
  formula: {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    color: 'var(--accent-blue)',
    background: 'var(--bg-input)',
    padding: '8px 12px',
    borderRadius: 6,
    display: 'inline-block',
    margin: '8px 0',
  },
  highlight: {
    color: 'var(--accent-orange)',
    fontWeight: 600,
  },
  highlightBlue: {
    color: 'var(--accent-blue)',
    fontWeight: 600,
  },
  miniHeatmap: {
    overflowX: 'auto',
    paddingBottom: 4,
  },
  stepExplanation: {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '12px 16px',
    marginTop: 12,
    fontSize: 13,
    lineHeight: 1.7,
    color: 'var(--text-secondary)',
  },
}

// ============================================================
// Section 1: Sentence Input
// ============================================================
function SentenceInput({ selected, onSelect }) {
  return (
    <div style={s.section}>
      <div style={s.sectionTitle}>
        <span style={s.sectionIcon}>1</span>
        Sentence Input - 문장 선택
      </div>
      <div style={s.sentenceBar}>
        {EXAMPLE_SENTENCES.map((sent, i) => (
          <button
            key={i}
            style={s.sentenceBtn(selected === sent.text)}
            onClick={() => onSelect(sent.text)}
            title={sent.text}
          >
            {sent.text}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        문장을 선택하면 Self-Attention 패턴을 확인할 수 있습니다.
      </div>
    </div>
  )
}

// ============================================================
// Section 2: Attention Heatmap
// ============================================================
function AttentionHeatmap({ tokens, weights, selectedRow, onSelectRow }) {
  const [hover, setHover] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const cellSize = Math.min(52, Math.max(36, 420 / tokens.length))
  const labelW = Math.max(60, Math.min(80, tokens.reduce((m, t) => Math.max(m, t.length * 8), 0)))

  const maxWeight = useMemo(() => {
    let mx = 0
    tokens.forEach(q => {
      tokens.forEach(k => {
        const w = weights[q]?.[k] || 0
        if (w > mx) mx = w
      })
    })
    return mx || 1
  }, [tokens, weights])

  const handleMouseMove = useCallback((e) => {
    setTooltipPos({ x: e.clientX + 12, y: e.clientY - 30 })
  }, [])

  return (
    <div style={s.heatmapWrap}>
      {hover && (
        <div style={{ ...s.tooltip, left: tooltipPos.x, top: tooltipPos.y }}>
          <span style={{ color: 'var(--accent-orange)' }}>{hover.query}</span>
          {' \u2192 '}
          <span style={{ color: 'var(--accent-blue)' }}>{hover.key}</span>
          {': '}
          <span style={{ color: '#1e293b', fontWeight: 700 }}>{hover.weight.toFixed(3)}</span>
        </div>
      )}
      <div style={{ display: 'inline-block', minWidth: 'fit-content' }}>
        {/* Column headers */}
        <div style={{ display: 'flex', marginLeft: labelW + 4, alignItems: 'flex-end', height: tokens.length > 7 ? 56 : 22, overflow: 'visible' }}>
          {tokens.map((t, j) => (
            <div
              key={j}
              style={{
                width: cellSize,
                flexShrink: 0,
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                overflow: 'visible',
                whiteSpace: 'nowrap',
                transform: tokens.length > 7 ? 'rotate(-45deg)' : 'none',
                transformOrigin: 'bottom left',
                marginLeft: tokens.length > 7 ? 4 : 0,
                paddingBottom: tokens.length > 7 ? 0 : 2,
              }}
              title={t}
            >
              {t}
            </div>
          ))}
          <div style={{ width: 10, fontSize: 10, color: 'var(--text-muted)', paddingLeft: 6, alignSelf: 'flex-end' }}>Key</div>
        </div>
        {/* Rows */}
        {tokens.map((q, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              borderRadius: 4,
              background: selectedRow === i ? 'rgba(59,130,246,0.06)' : 'transparent',
              transition: 'background 0.15s',
            }}
            onClick={() => onSelectRow(selectedRow === i ? null : i)}
          >
            <div
              style={{
                width: labelW,
                textAlign: 'right',
                paddingRight: 6,
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                color: selectedRow === i ? 'var(--accent-orange)' : 'var(--text-secondary)',
                fontWeight: selectedRow === i ? 600 : 400,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={q}
            >
              {q}
            </div>
            {tokens.map((k, j) => {
              const w = weights[q]?.[k] || 0
              const isRowSelected = selectedRow === i
              return (
                <div
                  key={j}
                  style={{
                    width: cellSize,
                    height: cellSize - 4,
                    margin: 1,
                    borderRadius: 3,
                    background: colorForWeight(w, maxWeight),
                    border: isRowSelected && w > maxWeight * 0.2
                      ? '1px solid rgba(249,115,22,0.6)'
                      : '1px solid transparent',
                    transition: 'all 0.15s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHover({ query: q, key: k, weight: w })}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHover(null)}
                />
              )
            })}
          </div>
        ))}
        <div style={{ marginLeft: labelW + 4, display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Query</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 20, height: 8, borderRadius: 2, background: colorForWeight(0, 1), display: 'inline-block', border: '1px solid var(--border)' }} />
            0
            <span style={{ width: 40, height: 8, borderRadius: 2, background: 'linear-gradient(to right, #f0f4f8, #ef4444)', display: 'inline-block' }} />
            max
            <span style={{ width: 20, height: 8, borderRadius: 2, background: colorForWeight(1, 1), display: 'inline-block' }} />
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Section 3: Arc Diagram
// ============================================================
function ArcDiagram({ tokens, weights, selectedToken, onSelectToken }) {
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const [dims, setDims] = useState({ w: 600, h: 200 })
  const [hoveredToken, setHoveredToken] = useState(null)

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDims({ w: rect.width, h: Math.max(160, Math.min(240, rect.width * 0.25)) })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const active = selectedToken ?? hoveredToken
  const { w, h } = dims
  const n = tokens.length
  const padX = 40
  const tokenY = h - 30
  const spacing = (w - padX * 2) / Math.max(n - 1, 1)

  // Get top-5 connections for active token
  const arcs = useMemo(() => {
    if (active == null || !weights[tokens[active]]) return []
    const q = tokens[active]
    const row = weights[q]
    return tokens
      .map((k, j) => ({ key: k, idx: j, weight: row[k] || 0 }))
      .filter(a => a.idx !== active)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
  }, [active, tokens, weights])

  const maxArcW = arcs.length ? Math.max(...arcs.map(a => a.weight)) : 1

  return (
    <div ref={containerRef} style={s.arcContainer}>
      <svg ref={svgRef} width={w} height={h} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent-orange)" />
            <stop offset="100%" stopColor="var(--accent-blue)" />
          </linearGradient>
        </defs>
        {/* Draw arcs */}
        {arcs.map((arc, idx) => {
          const x1 = padX + active * spacing
          const x2 = padX + arc.idx * spacing
          const midX = (x1 + x2) / 2
          const dist = Math.abs(x2 - x1)
          const arcH = Math.min(dist * 0.5, h - 60)
          const thickness = 1 + (arc.weight / maxArcW) * 5
          const opacity = 0.3 + (arc.weight / maxArcW) * 0.65
          return (
            <path
              key={idx}
              d={`M ${x1} ${tokenY - 10} Q ${midX} ${tokenY - 10 - arcH} ${x2} ${tokenY - 10}`}
              fill="none"
              stroke={`rgba(239, 68, 68, ${opacity})`}
              strokeWidth={thickness}
              strokeLinecap="round"
            />
          )
        })}
        {/* Token positions */}
        {tokens.map((t, i) => {
          const x = padX + i * spacing
          const isActive = i === active
          const isTarget = arcs.some(a => a.idx === i)
          const arcInfo = arcs.find(a => a.idx === i)
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={tokenY}
                r={isActive ? 14 : isTarget ? 11 : 8}
                fill={isActive ? 'rgba(249,115,22,0.3)' : isTarget ? 'rgba(59,130,246,0.2)' : 'rgba(203,213,225,0.5)'}
                stroke={isActive ? 'var(--accent-orange)' : isTarget ? 'var(--accent-blue)' : 'var(--border)'}
                strokeWidth={isActive ? 2 : 1}
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => onSelectToken(selectedToken === i ? null : i)}
                onMouseEnter={() => setHoveredToken(i)}
                onMouseLeave={() => setHoveredToken(null)}
              />
              <text
                x={x}
                y={tokenY + (isActive ? 28 : 24)}
                textAnchor="middle"
                fill={isActive ? 'var(--accent-orange)' : isTarget ? 'var(--accent-blue)' : 'var(--text-secondary)'}
                fontSize={11}
                fontFamily="var(--font-mono)"
                fontWeight={isActive ? 700 : 400}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => onSelectToken(selectedToken === i ? null : i)}
                onMouseEnter={() => setHoveredToken(i)}
                onMouseLeave={() => setHoveredToken(null)}
              >
                {t}
              </text>
              {isTarget && arcInfo && (
                <text
                  x={x}
                  y={tokenY - 18}
                  textAnchor="middle"
                  fill="var(--accent-blue)"
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                  fontWeight={600}
                >
                  {arcInfo.weight.toFixed(2)}
                </text>
              )}
            </g>
          )
        })}
        {active == null && (
          <text
            x={w / 2}
            y={h / 2 - 20}
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize={13}
            fontFamily="var(--font-sans)"
          >
            토큰을 클릭하거나 호버하면 어텐션 연결을 볼 수 있습니다
          </text>
        )}
      </svg>
    </div>
  )
}

// ============================================================
// Section 4: Q/K/V Explanation
// ============================================================
const QKV_STEPS = [
  {
    id: 'embed',
    label: '1. 임베딩',
    title: '각 토큰은 벡터로 변환됩니다',
  },
  {
    id: 'qkv',
    label: '2. Q, K, V',
    title: 'Query, Key, Value 벡터를 생성합니다',
  },
  {
    id: 'score',
    label: '3. Score',
    title: 'Q와 K의 내적으로 점수를 계산합니다',
  },
  {
    id: 'softmax',
    label: '4. Softmax',
    title: 'Softmax로 어텐션 가중치를 구합니다',
  },
  {
    id: 'output',
    label: '5. Output',
    title: 'Value의 가중합으로 출력을 생성합니다',
  },
]

// Demo vectors for Q/K/V (simplified 4-dim)
const DEMO_DIM = 4
function makeDemoVectors(tokens) {
  // Generate deterministic pseudo-random vectors
  const seed = (str) => {
    let h = 0
    for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0
    return h
  }
  const rand = (s, i) => {
    const x = Math.sin(s * 9301 + i * 49297 + 233280) * 0.5 + 0.5
    return +(x * 2 - 1).toFixed(2)
  }
  return tokens.map(t => {
    const s = seed(t)
    return {
      token: t,
      embed: Array.from({ length: DEMO_DIM }, (_, i) => rand(s, i)),
      q: Array.from({ length: DEMO_DIM }, (_, i) => rand(s + 1, i + 10)),
      k: Array.from({ length: DEMO_DIM }, (_, i) => rand(s + 2, i + 20)),
      v: Array.from({ length: DEMO_DIM }, (_, i) => rand(s + 3, i + 30)),
    }
  })
}

function VectorDisplay({ label, values, color, highlightIdx }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color, fontWeight: 700, width: 16 }}>{label}</span>
      <div style={s.vectorBox}>
        {values.map((v, i) => (
          <span
            key={i}
            style={{
              ...s.vecVal(highlightIdx != null && highlightIdx === i ? color : 'rgba(203,213,225,0.8)'),
              border: highlightIdx != null && highlightIdx === i ? `1px solid ${color}` : '1px solid transparent',
            }}
          >
            {v.toFixed(2)}
          </span>
        ))}
      </div>
    </div>
  )
}

function QKVExplanation({ tokens }) {
  const [step, setStep] = useState(0)
  const [queryIdx, setQueryIdx] = useState(0)
  const [keyIdx, setKeyIdx] = useState(1)
  const [dotStep, setDotStep] = useState(null)

  const demoVecs = useMemo(() => makeDemoVectors(tokens), [tokens])
  const currentStep = QKV_STEPS[step]

  const qVec = demoVecs[queryIdx]
  const kVec = demoVecs[keyIdx]
  const score = dotProduct(qVec.q, kVec.k)
  const dK = Math.sqrt(DEMO_DIM)

  // Compute all scores for softmax demo
  const allScores = useMemo(() =>
    demoVecs.map(kv => dotProduct(qVec.q, kv.k) / dK),
    [qVec, demoVecs, dK]
  )
  const attWeights = useMemo(() => softmax(allScores), [allScores])

  return (
    <div>
      {/* Step navigation */}
      <div style={s.stepNav}>
        {QKV_STEPS.map((st, i) => (
          <button key={st.id} style={s.stepBtn(step === i)} onClick={() => { setStep(i); setDotStep(null) }}>
            {st.label}
          </button>
        ))}
      </div>

      <div style={s.explanationBox}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: 'var(--accent-blue)' }}>
          {currentStep.title}
        </div>

        {/* Step: Embedding */}
        {step === 0 && (
          <div>
            <p style={{ marginBottom: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              입력 문장의 각 토큰은 <span style={s.highlightBlue}>벡터</span>로 변환됩니다.
              이 벡터는 토큰의 의미를 담고 있습니다. (실제로는 수백 차원이지만, 여기서는 {DEMO_DIM}차원으로 단순화합니다)
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {demoVecs.slice(0, 6).map((v, i) => (
                <div key={i} style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>{v.token}</div>
                  <VectorDisplay label="E" values={v.embed} color="var(--accent-purple)" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step: Q, K, V */}
        {step === 1 && (
          <div>
            <p style={{ marginBottom: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              각 임베딩 벡터에 학습된 가중치 행렬을 곱하여 3개의 벡터를 생성합니다:
            </p>
            <p style={{ marginBottom: 8, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <span style={s.highlight}>Query (Q)</span>: "내가 찾고 싶은 것" - 이 토큰이 다른 토큰에게 하는 질문
            </p>
            <p style={{ marginBottom: 8, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <span style={s.highlightBlue}>Key (K)</span>: "내가 가진 정보의 라벨" - 다른 토큰이 검색할 수 있는 색인
            </p>
            <p style={{ marginBottom: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>Value (V)</span>: "내가 전달할 실제 정보" - 어텐션을 받으면 전달되는 내용
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              {demoVecs.slice(0, 4).map((v, i) => (
                <button
                  key={i}
                  style={{
                    ...s.sentenceBtn(queryIdx === i),
                    fontSize: 12,
                    padding: '4px 10px',
                  }}
                  onClick={() => setQueryIdx(i)}
                >
                  {v.token}
                </button>
              ))}
            </div>
            <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                "{demoVecs[queryIdx].token}" 의 Q, K, V 벡터
              </div>
              <VectorDisplay label="Q" values={demoVecs[queryIdx].q} color="var(--accent-orange)" />
              <VectorDisplay label="K" values={demoVecs[queryIdx].k} color="var(--accent-blue)" />
              <VectorDisplay label="V" values={demoVecs[queryIdx].v} color="var(--accent-green)" />
            </div>
          </div>
        )}

        {/* Step: Score */}
        {step === 2 && (
          <div>
            <p style={{ marginBottom: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              Query와 Key의 <span style={s.highlightBlue}>내적(dot product)</span>으로 유사도 점수를 계산합니다.
              점수가 높을수록 두 토큰이 서로 관련이 깊습니다.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Query:</span>
              {demoVecs.slice(0, Math.min(5, demoVecs.length)).map((v, i) => (
                <button key={i} style={{ ...s.sentenceBtn(queryIdx === i), fontSize: 12, padding: '4px 10px' }} onClick={() => setQueryIdx(i)}>
                  {v.token}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Key:</span>
              {demoVecs.slice(0, Math.min(5, demoVecs.length)).map((v, i) => (
                <button key={i} style={{ ...s.sentenceBtn(keyIdx === i), fontSize: 12, padding: '4px 10px' }} onClick={() => setKeyIdx(i)}>
                  {v.token}
                </button>
              ))}
            </div>
            <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border)' }}>
              <div style={{ marginBottom: 8 }}>
                <VectorDisplay label="Q" values={qVec.q} color="var(--accent-orange)" highlightIdx={dotStep} />
                <VectorDisplay label="K" values={kVec.k} color="var(--accent-blue)" highlightIdx={dotStep} />
              </div>
              <div style={s.formula}>
                Score = Q &middot; K = {qVec.q.map((v, i) => (
                  <span key={i}>
                    {i > 0 && ' + '}
                    <span
                      style={{
                        color: dotStep === i ? 'var(--accent-orange)' : 'inherit',
                        fontWeight: dotStep === i ? 700 : 400,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={() => setDotStep(i)}
                      onMouseLeave={() => setDotStep(null)}
                    >
                      ({v.toFixed(2)} x {kVec.k[i].toFixed(2)})
                    </span>
                  </span>
                ))} = <span style={{ color: '#1e293b', fontWeight: 700 }}>{score.toFixed(3)}</span>
              </div>
            </div>
            <div style={s.stepExplanation}>
              "{qVec.token}"의 Query와 "{kVec.token}"의 Key 내적 결과: <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{score.toFixed(3)}</span>
              <br />각 차원의 곱을 합산하여 하나의 점수로 만듭니다. 마우스를 올려 각 차원별 계산을 확인해보세요.
            </div>
          </div>
        )}

        {/* Step: Softmax */}
        {step === 3 && (
          <div>
            <p style={{ marginBottom: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              모든 점수를 <span style={s.highlight}>sqrt(d_k)</span>로 나누고, <span style={s.highlightBlue}>Softmax</span>를 적용하여
              0~1 사이의 확률 분포(어텐션 가중치)로 변환합니다.
            </p>
            <div style={s.formula}>
              Attention(Q, K, V) = softmax(Q &middot; K<sup>T</sup> / sqrt(d_k)) &middot; V
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Query 토큰:</span>
              {demoVecs.slice(0, Math.min(5, demoVecs.length)).map((v, i) => (
                <button key={i} style={{ ...s.sentenceBtn(queryIdx === i), fontSize: 12, padding: '4px 10px' }} onClick={() => setQueryIdx(i)}>
                  {v.token}
                </button>
              ))}
            </div>
            <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)' }}>
                "{demoVecs[queryIdx].token}" 에 대한 어텐션 가중치
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {demoVecs.slice(0, Math.min(tokens.length, 8)).map((kv, j) => {
                  const w = attWeights[j] || 0
                  return (
                    <div key={j} style={{ textAlign: 'center' }}>
                      <div style={{
                        width: 50,
                        height: 32,
                        borderRadius: 6,
                        background: colorForWeightAlpha(w),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        color: '#1e293b',
                        marginBottom: 3,
                      }}>
                        {w.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{kv.token}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                Raw scores / sqrt({DEMO_DIM}) = [{allScores.slice(0, Math.min(tokens.length, 8)).map(s => s.toFixed(2)).join(', ')}]
                {' \u2192 '} Softmax {' \u2192 '} [{attWeights.slice(0, Math.min(tokens.length, 8)).map(w => w.toFixed(2)).join(', ')}]
              </div>
            </div>
            <div style={s.stepExplanation}>
              Softmax는 모든 점수를 0~1 사이로 변환하고, 합이 1이 되도록 만듭니다.
              이렇게 하면 각 토큰에 "얼마나 주목할지"를 확률로 표현할 수 있습니다.
            </div>
          </div>
        )}

        {/* Step: Output */}
        {step === 4 && (
          <div>
            <p style={{ marginBottom: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              최종 출력은 각 토큰의 <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>Value 벡터</span>에
              어텐션 가중치를 곱해 합산한 것입니다.
            </p>
            <div style={s.formula}>
              Output = {'\u03A3'} (attention_weight_j &times; V_j)
            </div>
            <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border)', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)' }}>
                "{demoVecs[queryIdx].token}" 의 출력 계산
              </div>
              {demoVecs.slice(0, Math.min(4, demoVecs.length)).map((kv, j) => {
                const w = attWeights[j] || 0
                return (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)', width: 36, fontWeight: 600 }}>
                      {w.toFixed(2)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>&times;</span>
                    <VectorDisplay label="V" values={kv.v} color="var(--accent-green)" />
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      ({kv.token})
                    </span>
                  </div>
                )
              })}
              {demoVecs.length > 4 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 0' }}>+ ... (나머지 토큰)</div>
              )}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-orange)' }}>Output =</span>
                <div style={s.vectorBox}>
                  {Array.from({ length: DEMO_DIM }, (_, d) => {
                    let sum = 0
                    demoVecs.forEach((kv, j) => { sum += (attWeights[j] || 0) * kv.v[d] })
                    return (
                      <span key={d} style={s.vecVal('rgba(249,115,22,0.6)')}>
                        {sum.toFixed(2)}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
            <div style={s.stepExplanation}>
              어텐션 가중치가 높은 토큰의 Value가 출력에 더 많이 반영됩니다.
              예를 들어 "it"의 출력은 "cat"의 Value 정보를 많이 포함하게 됩니다.
              이것이 Self-Attention이 문맥을 이해하는 핵심 원리입니다.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Section 5: Multi-Head Attention (mini heatmaps)
// ============================================================
function MiniHeatmap({ tokens, weights, label }) {
  const [hover, setHover] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const cellSize = Math.min(28, Math.max(18, 200 / tokens.length))

  const maxWeight = useMemo(() => {
    let mx = 0
    tokens.forEach(q => {
      tokens.forEach(k => {
        const w = weights[q]?.[k] || 0
        if (w > mx) mx = w
      })
    })
    return mx || 1
  }, [tokens, weights])

  return (
    <div style={s.miniHeatmap}>
      {hover && (
        <div style={{ ...s.tooltip, left: tooltipPos.x, top: tooltipPos.y }}>
          {hover.query} {'\u2192'} {hover.key}: {hover.weight.toFixed(3)}
        </div>
      )}
      <div style={{ display: 'inline-block' }}>
        {/* Column labels */}
        <div style={{ display: 'flex', marginLeft: 46 }}>
          {tokens.map((t, j) => (
            <div
              key={j}
              style={{
                width: cellSize,
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                transform: 'rotate(-40deg)',
                transformOrigin: 'bottom left',
                height: 24,
              }}
              title={t}
            >
              {t.length > 4 ? t.slice(0, 3) + '..' : t}
            </div>
          ))}
        </div>
        {tokens.map((q, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: 44,
              textAlign: 'right',
              paddingRight: 3,
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }} title={q}>
              {q.length > 5 ? q.slice(0, 4) + '..' : q}
            </div>
            {tokens.map((k, j) => {
              const w = weights[q]?.[k] || 0
              return (
                <div
                  key={j}
                  style={{
                    width: cellSize,
                    height: cellSize - 2,
                    margin: '0.5px',
                    borderRadius: 2,
                    background: colorForWeight(w, maxWeight),
                    cursor: 'default',
                  }}
                  onMouseEnter={() => setHover({ query: q, key: k, weight: w })}
                  onMouseMove={(e) => setTooltipPos({ x: e.clientX + 10, y: e.clientY - 28 })}
                  onMouseLeave={() => setHover(null)}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function MultiHeadSection({ attentionData }) {
  const [activeHead, setActiveHead] = useState(0)
  const { tokens, heads } = attentionData

  return (
    <div>
      <div style={s.headTabs}>
        {heads.map((h, i) => (
          <button key={i} style={s.headTab(activeHead === i)} onClick={() => setActiveHead(i)}>
            {h.label}
          </button>
        ))}
      </div>
      <div style={s.headDesc}>{heads[activeHead].desc}</div>

      {/* Side-by-side mini heatmaps */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        {heads.map((h, i) => (
          <div
            key={i}
            style={{
              flex: '1 1 180px',
              minWidth: 160,
              background: activeHead === i ? 'rgba(249,115,22,0.06)' : 'var(--bg-card)',
              border: activeHead === i ? '1px solid var(--accent-orange)' : '1px solid var(--border)',
              borderRadius: 10,
              padding: 10,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={() => setActiveHead(i)}
          >
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: activeHead === i ? 'var(--accent-orange)' : 'var(--text-secondary)' }}>
              {h.label}
            </div>
            <MiniHeatmap tokens={tokens} weights={h.weights} label={h.label} />
          </div>
        ))}
      </div>

      {/* Explanation of the active head */}
      <div style={s.explanationBox}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--accent-orange)' }}>
          {heads[activeHead].label}
        </div>
        {activeHead === 0 && (
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 13 }}>
            <strong>Positional Head</strong>는 현재 토큰 주변의 가까운 토큰에 강하게 주목합니다.
            거리가 멀어질수록 어텐션 가중치가 줄어드는 패턴을 보입니다.
            이 헤드는 "문장 내 순서"와 "국지적 맥락"을 파악하는 데 사용됩니다.
          </p>
        )}
        {activeHead === 1 && (
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 13 }}>
            <strong>Syntactic Head</strong>는 문법적 관계가 있는 토큰에 주목합니다.
            예: 주어-서술어(cat-sat), 수식어-피수식어(nice-view) 등의 구문적 관계를 학습합니다.
            한국어에서는 주어-서술어(나는-먹었다), 목적어-서술어(점심을-먹었다) 등의 관계를 포착합니다.
          </p>
        )}
        {activeHead === 2 && (
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 13 }}>
            <strong>Semantic Head</strong>는 의미적으로 연관된 토큰에 주목합니다.
            예: "it"과 "cat"(대명사-선행사), "bank"와 "river"(의미 모호성 해소) 등
            단어 간 의미적 관계를 파악하여 문맥을 이해합니다.
          </p>
        )}
        {activeHead === 3 && (
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 13 }}>
            <strong>Default Head</strong>는 여러 패턴이 종합된 어텐션입니다.
            실제 트랜스포머에서는 모든 헤드의 출력이 합쳐져서 최종 결과를 만듭니다.
            각 헤드가 다른 관점으로 문장을 분석하고, 이를 종합하여 풍부한 문맥 표현을 생성합니다.
          </p>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================
export default function AttentionViz() {
  const [sentence, setSentence] = useState(EXAMPLE_SENTENCES[0].text)
  const [selectedRow, setSelectedRow] = useState(null)
  const [selectedToken, setSelectedToken] = useState(null)

  const attentionData = useMemo(() => getAttentionForSentence(sentence), [sentence])

  if (!attentionData) {
    return (
      <div style={s.container}>
        <div style={{ ...s.section, textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-muted)' }}>선택한 문장에 대한 어텐션 데이터가 없습니다.</p>
        </div>
      </div>
    )
  }

  const { tokens, default: defaultWeights, heads } = attentionData

  return (
    <div style={s.container}>
      {/* Section 1: Sentence Input */}
      <SentenceInput
        selected={sentence}
        onSelect={(text) => {
          setSentence(text)
          setSelectedRow(null)
          setSelectedToken(null)
        }}
      />

      {/* Section 2: Attention Heatmap */}
      <div style={s.section}>
        <div style={s.sectionTitle}>
          <span style={s.sectionIcon}>2</span>
          Attention Heatmap - 어텐션 히트맵
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          행(Query)이 열(Key)에 얼마나 주목하는지를 나타냅니다. 밝을수록 높은 어텐션입니다. 행을 클릭하면 강조됩니다.
        </div>
        <AttentionHeatmap
          tokens={tokens}
          weights={defaultWeights}
          selectedRow={selectedRow}
          onSelectRow={setSelectedRow}
        />
      </div>

      {/* Section 3: Arc Diagram */}
      <div style={s.section}>
        <div style={s.sectionTitle}>
          <span style={s.sectionIcon}>3</span>
          Attention Arcs - 어텐션 연결
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          토큰을 클릭/호버하면 상위 5개 연결이 아크로 표시됩니다. 아크가 두꺼울수록 어텐션이 강합니다.
        </div>
        <ArcDiagram
          tokens={tokens}
          weights={defaultWeights}
          selectedToken={selectedToken}
          onSelectToken={setSelectedToken}
        />
      </div>

      {/* Section 4: Q/K/V Explanation */}
      <div style={s.section}>
        <div style={s.sectionTitle}>
          <span style={s.sectionIcon}>4</span>
          Q / K / V Explanation - 어텐션 작동 원리
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          Self-Attention이 어떻게 동작하는지 단계별로 살펴봅니다.
        </div>
        <QKVExplanation tokens={tokens} />
      </div>

      {/* Section 5: Multi-Head Attention */}
      <div style={s.section}>
        <div style={s.sectionTitle}>
          <span style={s.sectionIcon}>5</span>
          Multi-Head Attention - 멀티헤드 어텐션
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          여러 헤드가 각각 다른 패턴을 학습합니다. 헤드를 클릭하여 비교해보세요.
        </div>
        <MultiHeadSection attentionData={attentionData} />
      </div>

      {/* Bottom padding */}
      <div style={{ height: 40, flexShrink: 0 }} />
    </div>
  )
}
