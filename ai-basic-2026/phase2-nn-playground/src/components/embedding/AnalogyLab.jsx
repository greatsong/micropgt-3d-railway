import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  analogy,
  getWord,
  cosineSimilarity,
  vectorAdd,
  vectorSub,
  findNearest,
  ANALOGY_EXAMPLES,
  CATEGORY_COLORS,
  CATEGORY_LABELS_KO,
  displayName,
  searchWords,
  englishEmbeddings,
  koreanEmbeddings,
} from '../../engine/embeddings';

// ============================================================
// Styles
// ============================================================
const s = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#f5f7fb',
    color: '#1e293b',
    fontFamily: "'Pretendard', 'Inter', system-ui, sans-serif",
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    flexWrap: 'wrap',
  },
  toggleGroup: {
    display: 'flex',
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
  },
  toggleBtn: (active) => ({
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    background: active ? '#3b82f6' : '#e2e8f0',
    color: active ? '#fff' : '#64748b',
    transition: 'all 0.2s',
  }),
  body: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    padding: 16,
    overflowY: 'auto',
  },
  section: {
    background: '#ffffff',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 12,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  examplesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280, 1fr))',
    gap: 10,
  },
  exampleCard: (active) => ({
    display: 'flex',
    flexDirection: 'column',
    padding: '10px 14px',
    borderRadius: 8,
    background: active ? 'rgba(59,130,246,0.1)' : '#f0f4f8',
    border: active ? '1px solid #3b82f6' : '1px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }),
  cardLabel: {
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: 0.3,
  },
  cardExpected: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  formulaBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '16px 0',
    flexWrap: 'wrap',
  },
  wordBox: (color) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 14px',
    borderRadius: 8,
    background: color || '#e2e8f0',
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  }),
  opSymbol: {
    fontSize: 22,
    fontWeight: 300,
    color: '#64748b',
    width: 28,
    textAlign: 'center',
  },
  resultCard: (rank, isExpected) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: 8,
    background: isExpected ? 'rgba(251,146,60,0.1)' : '#f0f4f8',
    border: isExpected ? '2px solid #fb923c' : '1px solid #e2e8f0',
    marginBottom: 6,
  }),
  customInputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  input: {
    width: 100,
    padding: '7px 10px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: 14,
    outline: 'none',
    textAlign: 'center',
    fontWeight: 600,
  },
  computeBtn: {
    padding: '7px 20px',
    borderRadius: 8,
    border: 'none',
    background: '#f97316',
    color: '#fff',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  miniCanvas: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    background: '#f0f4f8',
  },
};

// ============================================================
// Arrow Diagram — visualizes the vector arithmetic
// ============================================================
function ArrowDiagram({ wordA, wordB, wordC, results, lang }) {
  const canvasRef = useRef(null);
  const embeddings = lang === 'en' ? englishEmbeddings : koreanEmbeddings;

  const entryA = getWord(wordA, lang);
  const entryB = getWord(wordB, lang);
  const entryC = getWord(wordC, lang);
  const resultEntry = results.length > 0 ? embeddings.find((e) => e.word === results[0].word) : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !entryA || !entryB || !entryC) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = 220;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(0, 0, w, h);

    // Use PCA2D coordinates of A, B, C, result
    const points = [entryA, entryB, entryC];
    if (resultEntry) points.push(resultEntry);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.pca2d[0] < minX) minX = p.pca2d[0];
      if (p.pca2d[0] > maxX) maxX = p.pca2d[0];
      if (p.pca2d[1] < minY) minY = p.pca2d[1];
      if (p.pca2d[1] > maxY) maxY = p.pca2d[1];
    }
    const padX = (maxX - minX) * 0.25 || 0.1;
    const padY = (maxY - minY) * 0.25 || 0.1;
    minX -= padX; maxX += padX;
    minY -= padY; maxY += padY;

    const toScreen = (px, py) => {
      const sx = 40 + ((px - minX) / (maxX - minX)) * (w - 80);
      const sy = 30 + ((py - minY) / (maxY - minY)) * (h - 60);
      return [sx, sy];
    };

    const drawArrow = (x1, y1, x2, y2, color, dashed = false) => {
      ctx.beginPath();
      if (dashed) ctx.setLineDash([6, 4]);
      else ctx.setLineDash([]);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrowhead
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = 10;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle - 0.35), y2 - headLen * Math.sin(angle - 0.35));
      ctx.lineTo(x2 - headLen * Math.cos(angle + 0.35), y2 - headLen * Math.sin(angle + 0.35));
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };

    const drawPoint = (x, y, label, color, big = false) => {
      ctx.beginPath();
      ctx.arc(x, y, big ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = 'bold 12px Pretendard, Inter, system-ui, sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y - 12);
    };

    const [ax, ay] = toScreen(entryA.pca2d[0], entryA.pca2d[1]);
    const [bx, by] = toScreen(entryB.pca2d[0], entryB.pca2d[1]);
    const [cx, cy] = toScreen(entryC.pca2d[0], entryC.pca2d[1]);

    // A -> B arrow (solid blue)
    drawArrow(ax, ay, bx, by, '#3b82f6');

    if (resultEntry) {
      const [rx, ry] = toScreen(resultEntry.pca2d[0], resultEntry.pca2d[1]);

      // C -> Result arrow (solid orange)
      drawArrow(cx, cy, rx, ry, '#fb923c');

      // Dashed arrows showing the parallelogram
      drawArrow(ax, ay, cx, cy, '#64748b', true);
      drawArrow(bx, by, rx, ry, '#64748b', true);

      drawPoint(rx, ry, displayName(resultEntry.word), '#fb923c', true);
    }

    drawPoint(ax, ay, displayName(entryA.word), '#3b82f6');
    drawPoint(bx, by, displayName(entryB.word), '#60a5fa');
    drawPoint(cx, cy, displayName(entryC.word), '#f97316');

    // Legend labels
    ctx.font = '11px Pretendard, Inter, system-ui, sans-serif';

    // A->B label
    const midABx = (ax + bx) / 2;
    const midABy = (ay + by) / 2;
    ctx.fillStyle = '#3b82f6';
    ctx.textAlign = 'center';
    ctx.fillText('B - A', midABx, midABy - 8);

    if (resultEntry) {
      const [rx, ry] = toScreen(resultEntry.pca2d[0], resultEntry.pca2d[1]);
      const midCRx = (cx + rx) / 2;
      const midCRy = (cy + ry) / 2;
      ctx.fillStyle = '#fb923c';
      ctx.fillText('B - A', midCRx, midCRy - 8);
    }
  }, [wordA, wordB, wordC, results, lang, entryA, entryB, entryC, resultEntry, embeddings]);

  return <canvas ref={canvasRef} style={s.miniCanvas} />;
}

// ============================================================
// Autocomplete Input
// ============================================================
function WordInput({ value, onChange, lang, placeholder }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchWords(query.trim(), lang).slice(0, 6);
  }, [query, lang]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  return (
    <div style={{ position: 'relative' }}>
      <input
        style={s.input}
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (results.length > 0) {
              onChange(results[0].word);
              setQuery(displayName(results[0].word));
              setOpen(false);
            }
          }
        }}
      />
      {open && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: 150,
            overflowY: 'auto',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0 0 8px 8px',
            zIndex: 100,
          }}
        >
          {results.map((entry) => (
            <div
              key={entry.word}
              style={{
                padding: '5px 10px',
                fontSize: 13,
                cursor: 'pointer',
                borderBottom: '1px solid #f0f4f8',
              }}
              onMouseDown={() => {
                onChange(entry.word);
                setQuery(displayName(entry.word));
                setOpen(false);
              }}
            >
              {displayName(entry.word)}
              <span style={{ fontSize: 10, color: '#64748b', marginLeft: 6 }}>
                {lang === 'ko' ? CATEGORY_LABELS_KO[entry.category] : entry.category}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================
export default function AnalogyLab() {
  const [lang, setLang] = useState('en');
  const [activeExample, setActiveExample] = useState(null);
  const [customA, setCustomA] = useState('');
  const [customB, setCustomB] = useState('');
  const [customC, setCustomC] = useState('');
  const [customResults, setCustomResults] = useState([]);
  const [showCustom, setShowCustom] = useState(false);

  const examples = ANALOGY_EXAMPLES[lang] || [];

  // Current analogy being displayed
  const currentAnalogy = useMemo(() => {
    if (showCustom && customA && customB && customC) {
      return { a: customA, b: customB, c: customC };
    }
    if (activeExample !== null && examples[activeExample]) {
      const ex = examples[activeExample];
      return { a: ex.a, b: ex.b, c: ex.c, expected: ex.expected };
    }
    return null;
  }, [showCustom, customA, customB, customC, activeExample, examples]);

  const results = useMemo(() => {
    if (!currentAnalogy) return [];
    return analogy(currentAnalogy.a, currentAnalogy.b, currentAnalogy.c, 5, lang);
  }, [currentAnalogy, lang]);

  const handleExampleClick = (idx) => {
    setActiveExample(idx);
    setShowCustom(false);
  };

  const handleCompute = () => {
    if (!customA || !customB || !customC) return;
    setShowCustom(true);
    setActiveExample(null);
  };

  // Reset on lang change
  useEffect(() => {
    setActiveExample(null);
    setShowCustom(false);
    setCustomA('');
    setCustomB('');
    setCustomC('');
  }, [lang]);

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>
          {lang === 'en' ? 'Word Analogy Lab' : '단어 유추 실험실'}
        </span>
        <div style={s.toggleGroup}>
          <button style={s.toggleBtn(lang === 'en')} onClick={() => setLang('en')}>
            English
          </button>
          <button style={s.toggleBtn(lang === 'ko')} onClick={() => setLang('ko')}>
            한글
          </button>
        </div>
        <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
          A : B = C : ?
        </span>
      </div>

      <div style={s.body}>
        {/* Pre-loaded examples */}
        <div style={s.section}>
          <div style={s.sectionTitle}>
            {lang === 'en' ? 'Example Analogies' : '예시 유추'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {examples.map((ex, idx) => (
              <div
                key={idx}
                style={s.exampleCard(activeExample === idx && !showCustom)}
                onClick={() => handleExampleClick(idx)}
              >
                <div style={s.cardLabel}>{ex.label}</div>
                <div style={s.cardExpected}>
                  {lang === 'en' ? 'Expected' : '예상'}: {displayName(ex.expected)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom input */}
        <div style={s.section}>
          <div style={s.sectionTitle}>
            {lang === 'en' ? 'Custom Analogy' : '직접 만들기'}
          </div>
          <div style={s.customInputGroup}>
            <WordInput value={customA} onChange={setCustomA} lang={lang} placeholder="A" />
            <span style={s.opSymbol}>:</span>
            <WordInput value={customB} onChange={setCustomB} lang={lang} placeholder="B" />
            <span style={s.opSymbol}>=</span>
            <WordInput value={customC} onChange={setCustomC} lang={lang} placeholder="C" />
            <span style={s.opSymbol}>:</span>
            <span style={{ ...s.wordBox('#94a3b8'), fontSize: 14, padding: '7px 14px' }}>?</span>
            <button
              style={{
                ...s.computeBtn,
                opacity: customA && customB && customC ? 1 : 0.4,
              }}
              onClick={handleCompute}
              disabled={!customA || !customB || !customC}
            >
              {lang === 'en' ? 'Compute' : '계산'}
            </button>
          </div>
        </div>

        {/* Results */}
        {currentAnalogy && results.length > 0 && (
          <>
            {/* Vector arithmetic visualization */}
            <div style={s.section}>
              <div style={s.sectionTitle}>
                {lang === 'en' ? 'Vector Arithmetic' : '벡터 연산'}
              </div>

              {/* Formula display */}
              <div style={s.formulaBox}>
                <div style={s.wordBox('#3b82f6')}>
                  {displayName(currentAnalogy.b)}
                </div>
                <span style={s.opSymbol}>-</span>
                <div style={s.wordBox('#1e40af')}>
                  {displayName(currentAnalogy.a)}
                </div>
                <span style={s.opSymbol}>+</span>
                <div style={s.wordBox('#f97316')}>
                  {displayName(currentAnalogy.c)}
                </div>
                <span style={s.opSymbol}>=</span>
                <div style={s.wordBox('#dc2626')}>
                  {displayName(results[0].word)}
                </div>
              </div>

              {/* Arrow diagram */}
              <ArrowDiagram
                wordA={currentAnalogy.a}
                wordB={currentAnalogy.b}
                wordC={currentAnalogy.c}
                results={results}
                lang={lang}
              />
            </div>

            {/* Top 5 results */}
            <div style={s.section}>
              <div style={s.sectionTitle}>
                {lang === 'en' ? 'Top 5 Results' : '상위 5개 결과'}
              </div>
              {results.map((r, i) => {
                const isExpected = currentAnalogy.expected && r.word === currentAnalogy.expected;
                return (
                  <div key={r.word} style={s.resultCard(i, isExpected)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: i === 0 ? '#fb923c' : '#e2e8f0',
                          color: i === 0 ? '#fff' : '#64748b',
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>
                        {displayName(r.word)}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: CATEGORY_COLORS[r.category] || '#334155',
                          color: '#000',
                          fontWeight: 600,
                        }}
                      >
                        {lang === 'ko' ? CATEGORY_LABELS_KO[r.category] : r.category}
                      </span>
                      {isExpected && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: '#22c55e',
                            color: '#000',
                            fontWeight: 700,
                          }}
                        >
                          {lang === 'en' ? 'EXPECTED' : '정답'}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Similarity bar */}
                      <div
                        style={{
                          width: 60,
                          height: 6,
                          borderRadius: 3,
                          background: '#e2e8f0',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.max(0, r.similarity * 100)}%`,
                            height: '100%',
                            borderRadius: 3,
                            background: isExpected
                              ? '#fb923c'
                              : `hsl(${200 + r.similarity * 60}, 80%, 55%)`,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', minWidth: 48, textAlign: 'right' }}>
                        {r.similarity.toFixed(3)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Explanation */}
        <div style={{ ...s.section, background: '#f0f4f8' }}>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: '#94a3b8' }}>
            {lang === 'en' ? (
              <>
                <strong style={{ color: '#1e293b' }}>How it works:</strong> Word embeddings map words to
                vectors. Similar words are close together. The analogy <em>A : B = C : ?</em> is solved
                by computing <strong style={{ color: '#3b82f6' }}>B - A + C</strong> and finding the
                nearest word to that result vector. This works because the relationship between A and B
                (e.g., gender difference) is encoded as a direction in vector space, which can be
                transferred to C.
              </>
            ) : (
              <>
                <strong style={{ color: '#1e293b' }}>원리:</strong> 워드 임베딩은 단어를 벡터로 변환합니다.
                비슷한 단어는 가까이 위치합니다. <em>A : B = C : ?</em> 유추는{' '}
                <strong style={{ color: '#3b82f6' }}>B - A + C</strong>를 계산하고 결과 벡터에 가장
                가까운 단어를 찾아 해결합니다. A와 B의 관계(예: 성별 차이)가 벡터 공간의 방향으로
                인코딩되어 있어 C에도 같은 변환을 적용할 수 있습니다.
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
