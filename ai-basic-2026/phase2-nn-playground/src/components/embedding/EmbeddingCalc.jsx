import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  getWord,
  cosineSimilarity,
  findNearest,
  vectorAdd,
  vectorSub,
  englishEmbeddings,
  koreanEmbeddings,
  searchWords,
  categories,
  DIM
} from '../../engine/embeddings'

/* ─── Category color map ─── */
const catColors = {
  person: '#4fc3f7',
  place: '#66bb6a',
  object: '#ff8a65',
  concept: '#ab47bc',
  action: '#ffd54f',
  animal: '#ef5350',
  food: '#ff8a65',
  nature: '#66bb6a'
}

/* ─── Pre-made recipe definitions ─── */
const recipesEn = [
  { label: 'king - man + woman', chips: [{ word: 'king', sign: '+' }, { word: 'woman', sign: '+' }, { word: 'man', sign: '-' }], desc: '성별 유추' },
  { label: 'sushi - japan + italy', chips: [{ word: 'sushi', sign: '+' }, { word: 'italy', sign: '+' }, { word: 'japan', sign: '-' }], desc: '문화 유추' },
  { label: 'tokyo - japan + france', chips: [{ word: 'tokyo', sign: '+' }, { word: 'france', sign: '+' }, { word: 'japan', sign: '-' }], desc: '수도 유추' },
  { label: 'father - man + woman', chips: [{ word: 'father', sign: '+' }, { word: 'woman', sign: '+' }, { word: 'man', sign: '-' }], desc: '가족 유추' },
  { label: 'prince - boy + girl', chips: [{ word: 'prince', sign: '+' }, { word: 'girl', sign: '+' }, { word: 'boy', sign: '-' }], desc: '왕족 유추' },
  { label: 'dog + big - small', chips: [{ word: 'dog', sign: '+' }, { word: 'big', sign: '+' }, { word: 'small', sign: '-' }], desc: '크기 유추' },
  { label: 'happy + strong', chips: [{ word: 'happy', sign: '+' }, { word: 'strong', sign: '+' }], desc: '감정 합성' },
  { label: 'computer + brain', chips: [{ word: 'computer', sign: '+' }, { word: 'brain', sign: '+' }], desc: 'AI 유추' },
]

const recipesKo = [
  { label: '왕 - 남자 + 여자', chips: [{ word: '왕', sign: '+' }, { word: '여자', sign: '+' }, { word: '남자', sign: '-' }], desc: '성별 유추' },
  { label: '김치 - 한국 + 일본', chips: [{ word: '김치', sign: '+' }, { word: '일본', sign: '+' }, { word: '한국', sign: '-' }], desc: '문화 유추' },
  { label: '서울 - 한국 + 일본', chips: [{ word: '서울', sign: '+' }, { word: '일본', sign: '+' }, { word: '한국', sign: '-' }], desc: '수도 유추' },
  { label: '아버지 - 남자 + 여자', chips: [{ word: '아버지', sign: '+' }, { word: '여자', sign: '+' }, { word: '남자', sign: '-' }], desc: '가족 유추' },
  { label: '왕자 - 소년 + 소녀', chips: [{ word: '왕자', sign: '+' }, { word: '소녀', sign: '+' }, { word: '소년', sign: '-' }], desc: '왕족 유추' },
  { label: '개 + 큰 - 작은', chips: [{ word: '개', sign: '+' }, { word: '큰', sign: '+' }, { word: '작은', sign: '-' }], desc: '크기 유추' },
  { label: '행복 + 강한', chips: [{ word: '행복', sign: '+' }, { word: '강한', sign: '+' }], desc: '감정 합성' },
  { label: '컴퓨터 + 뇌', chips: [{ word: '컴퓨터', sign: '+' }, { word: '뇌', sign: '+' }], desc: 'AI 유추' },
]

/* ─── Heatmap Canvas Drawing ─── */
function drawHeatmap(canvas, words, lang, hoveredCell, setHoveredCell) {
  if (!canvas || words.length < 2) return
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1

  const labelWidth = 70
  const cellSize = Math.min(
    Math.floor((canvas.clientWidth - labelWidth) / words.length),
    44
  )
  const totalSize = labelWidth + cellSize * words.length
  const totalHeight = labelWidth + cellSize * words.length

  canvas.width = totalSize * dpr
  canvas.height = totalHeight * dpr
  canvas.style.width = totalSize + 'px'
  canvas.style.height = totalHeight + 'px'
  ctx.scale(dpr, dpr)

  ctx.clearRect(0, 0, totalSize, totalHeight)

  // Get vectors
  const vectors = words.map(w => {
    const data = getWord(w, lang)
    return data ? data.vector : null
  }).filter(Boolean)

  if (vectors.length !== words.length) return

  // Compute similarity matrix
  const matrix = []
  for (let i = 0; i < words.length; i++) {
    matrix[i] = []
    for (let j = 0; j < words.length; j++) {
      matrix[i][j] = cosineSimilarity(vectors[i], vectors[j])
    }
  }

  // Draw column labels (top)
  ctx.save()
  ctx.font = '10px Inter, sans-serif'
  ctx.fillStyle = '#8892b0'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < words.length; i++) {
    const x = labelWidth + i * cellSize + cellSize / 2
    const y = labelWidth - 6
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(-Math.PI / 4)
    ctx.textAlign = 'right'
    ctx.fillText(words[i], 0, 0)
    ctx.restore()
  }

  // Draw row labels (left)
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < words.length; i++) {
    ctx.fillStyle = '#8892b0'
    ctx.fillText(words[i], labelWidth - 6, labelWidth + i * cellSize + cellSize / 2)
  }
  ctx.restore()

  // Draw cells
  for (let i = 0; i < words.length; i++) {
    for (let j = 0; j < words.length; j++) {
      const sim = matrix[i][j]
      const x = labelWidth + j * cellSize
      const y = labelWidth + i * cellSize

      // Color interpolation: blue (-1) -> dark (0) -> red (1)
      let r, g, b
      if (sim >= 0) {
        // 0 -> 1: dark to red/warm
        const t = Math.min(sim, 1)
        r = Math.round(30 + 225 * t)
        g = Math.round(30 + 50 * t * (1 - t * 0.7))
        b = Math.round(50 * (1 - t))
      } else {
        // -1 -> 0: blue to dark
        const t = Math.min(Math.abs(sim), 1)
        r = Math.round(30 * (1 - t))
        g = Math.round(30 + 60 * t * (1 - t))
        b = Math.round(50 + 200 * t)
      }

      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)

      // Border for hovered cell
      if (hoveredCell && hoveredCell[0] === i && hoveredCell[1] === j) {
        ctx.strokeStyle = '#1e293b'
        ctx.lineWidth = 2
        ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
      }

      // Text for small matrices
      if (words.length <= 8) {
        ctx.fillStyle = sim > 0.5 || sim < -0.5 ? '#fff' : '#aaa'
        ctx.font = '9px JetBrains Mono, monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(sim.toFixed(2), x + cellSize / 2, y + cellSize / 2)
      }
    }
  }
}

/* ─── Vector Bar Chart Component ─── */
function VectorBarChart({ vector, width = 500, height = 140 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !vector) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    const actualWidth = width
    const actualHeight = height

    canvas.width = actualWidth * dpr
    canvas.height = actualHeight * dpr
    canvas.style.width = actualWidth + 'px'
    canvas.style.height = actualHeight + 'px'
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, actualWidth, actualHeight)

    const padding = { top: 10, bottom: 20, left: 4, right: 4 }
    const chartW = actualWidth - padding.left - padding.right
    const chartH = actualHeight - padding.top - padding.bottom
    const barW = chartW / DIM
    const midY = padding.top + chartH / 2

    // Zero line
    ctx.strokeStyle = '#2a3a5c'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding.left, midY)
    ctx.lineTo(padding.left + chartW, midY)
    ctx.stroke()

    // Find max for scaling
    let maxVal = 0
    for (let i = 0; i < DIM; i++) {
      const abs = Math.abs(vector[i])
      if (abs > maxVal) maxVal = abs
    }
    if (maxVal === 0) maxVal = 1

    // Draw bars
    for (let i = 0; i < DIM; i++) {
      const val = vector[i] / maxVal
      const x = padding.left + i * barW
      const barHeight = Math.abs(val) * (chartH / 2)

      // Gradient colors
      if (val >= 0) {
        const grad = ctx.createLinearGradient(x, midY - barHeight, x, midY)
        grad.addColorStop(0, '#4fc3f7')
        grad.addColorStop(1, 'rgba(79,195,247,0.3)')
        ctx.fillStyle = grad
        ctx.fillRect(x + 0.5, midY - barHeight, barW - 1, barHeight)
      } else {
        const grad = ctx.createLinearGradient(x, midY, x, midY + barHeight)
        grad.addColorStop(0, 'rgba(255,138,101,0.3)')
        grad.addColorStop(1, '#ff8a65')
        ctx.fillStyle = grad
        ctx.fillRect(x + 0.5, midY, barW - 1, barHeight)
      }
    }

    // Dim labels
    ctx.fillStyle = '#5a6480'
    ctx.font = '9px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let i = 0; i < DIM; i += 10) {
      ctx.fillText(i.toString(), padding.left + i * barW + barW / 2, actualHeight - 14)
    }
  }, [vector, width, height])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        borderRadius: 'var(--radius)',
        background: 'var(--bg-input)',
        border: '1px solid var(--border)'
      }}
    />
  )
}

/* ─── Main EmbeddingCalc Component ─── */
export default function EmbeddingCalc() {
  const [lang, setLang] = useState('en')
  const [chips, setChips] = useState([
    { word: 'king', sign: '+' },
    { word: 'woman', sign: '+' },
    { word: 'man', sign: '-' }
  ])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [heatmapWords, setHeatmapWords] = useState([])
  const [heatmapQuery, setHeatmapQuery] = useState('')
  const [heatmapSearchResults, setHeatmapSearchResults] = useState([])
  const [showHeatmapDropdown, setShowHeatmapDropdown] = useState(false)
  const [hoveredCell, setHoveredCell] = useState(null)
  const [hoveredResult, setHoveredResult] = useState(null)

  const heatmapCanvasRef = useRef(null)
  const searchInputRef = useRef(null)
  const heatmapInputRef = useRef(null)
  const dropdownRef = useRef(null)
  const heatmapDropdownRef = useRef(null)

  const recipes = lang === 'ko' ? recipesKo : recipesEn

  // Compute result vector from chips
  const { resultVector, usedWords } = useMemo(() => {
    if (chips.length === 0) return { resultVector: null, usedWords: [] }
    let result = null
    const used = []
    for (const chip of chips) {
      const data = getWord(chip.word, lang)
      if (!data) continue
      used.push(chip.word)
      if (!result) {
        result = chip.sign === '+'
          ? new Float32Array(data.vector)
          : new Float32Array(data.vector.length).map((_, i) => -data.vector[i])
      } else {
        if (chip.sign === '+') {
          result = vectorAdd(result, data.vector)
        } else {
          result = vectorSub(result, data.vector)
        }
      }
    }
    return { resultVector: result, usedWords: used }
  }, [chips, lang])

  // Nearest words to result
  const nearestWords = useMemo(() => {
    if (!resultVector) return []
    return findNearest(resultVector, 10, usedWords, lang)
  }, [resultVector, lang, usedWords])

  // Search handler
  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
    if (query.length > 0) {
      const results = searchWords(query, lang, 8)
      setSearchResults(results)
      setShowDropdown(results.length > 0)
    } else {
      setSearchResults([])
      setShowDropdown(false)
    }
  }, [lang])

  // Heatmap search
  const handleHeatmapSearch = useCallback((query) => {
    setHeatmapQuery(query)
    if (query.length > 0) {
      const results = searchWords(query, lang, 8)
      setHeatmapSearchResults(results)
      setShowHeatmapDropdown(results.length > 0)
    } else {
      setHeatmapSearchResults([])
      setShowHeatmapDropdown(false)
    }
  }, [lang])

  // Add word chip
  const addChip = useCallback((word) => {
    if (chips.find(c => c.word === word)) return
    setChips(prev => [...prev, { word, sign: '+' }])
    setSearchQuery('')
    setShowDropdown(false)
    searchInputRef.current?.focus()
  }, [chips])

  // Add heatmap word
  const addHeatmapWord = useCallback((word) => {
    if (heatmapWords.includes(word)) return
    setHeatmapWords(prev => [...prev, word])
    setHeatmapQuery('')
    setShowHeatmapDropdown(false)
    heatmapInputRef.current?.focus()
  }, [heatmapWords])

  // Toggle chip sign
  const toggleSign = useCallback((index) => {
    setChips(prev => prev.map((c, i) =>
      i === index ? { ...c, sign: c.sign === '+' ? '-' : '+' } : c
    ))
  }, [])

  // Remove chip
  const removeChip = useCallback((index) => {
    setChips(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Remove heatmap word
  const removeHeatmapWord = useCallback((word) => {
    setHeatmapWords(prev => prev.filter(w => w !== word))
  }, [])

  // Apply recipe
  const applyRecipe = useCallback((recipe) => {
    setChips(recipe.chips.map(c => ({ ...c })))
  }, [])

  // Reset on language change
  useEffect(() => {
    setChips([])
    setHeatmapWords([])
    setSearchQuery('')
    setHeatmapQuery('')

    // Apply first recipe for the new language
    const r = lang === 'ko' ? recipesKo : recipesEn
    if (r.length > 0) {
      setChips(r[0].chips.map(c => ({ ...c })))
    }
  }, [lang])

  // Draw heatmap
  useEffect(() => {
    if (heatmapCanvasRef.current && heatmapWords.length >= 2) {
      drawHeatmap(heatmapCanvasRef.current, heatmapWords, lang, hoveredCell)
    }
  }, [heatmapWords, lang, hoveredCell])

  // Heatmap mouse handler
  const handleHeatmapMouse = useCallback((e) => {
    const canvas = heatmapCanvasRef.current
    if (!canvas || heatmapWords.length < 2) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const labelWidth = 70
    const cellSize = Math.min(
      Math.floor((canvas.clientWidth - labelWidth) / heatmapWords.length),
      44
    )

    const col = Math.floor((mx - labelWidth) / cellSize)
    const row = Math.floor((my - labelWidth) / cellSize)

    if (col >= 0 && col < heatmapWords.length && row >= 0 && row < heatmapWords.length) {
      setHoveredCell([row, col])
    } else {
      setHoveredCell(null)
    }
  }, [heatmapWords])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          searchInputRef.current && !searchInputRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
      if (heatmapDropdownRef.current && !heatmapDropdownRef.current.contains(e.target) &&
          heatmapInputRef.current && !heatmapInputRef.current.contains(e.target)) {
        setShowHeatmapDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Compute hovered cell similarity text
  const hoveredCellInfo = useMemo(() => {
    if (!hoveredCell || heatmapWords.length < 2) return null
    const [r, c] = hoveredCell
    if (r < 0 || r >= heatmapWords.length || c < 0 || c >= heatmapWords.length) return null
    const wA = heatmapWords[r]
    const wB = heatmapWords[c]
    const vA = getWord(wA, lang)
    const vB = getWord(wB, lang)
    if (!vA || !vB) return null
    const sim = cosineSimilarity(vA.vector, vB.vector)
    return { wordA: wA, wordB: wB, similarity: sim }
  }, [hoveredCell, heatmapWords, lang])

  return (
    <div style={styles.container}>
      {/* Header row: title + lang toggle */}
      <div style={styles.headerRow}>
        <h2 style={styles.title}>
          <span style={{ marginRight: 8 }}>&#x1F9EE;</span>
          {lang === 'ko' ? '벡터 계산기' : 'Vector Calculator'}
        </h2>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => setLang('en')}
          >
            English
          </button>
          <button
            className={`toggle-btn ${lang === 'ko' ? 'active' : ''}`}
            onClick={() => setLang('ko')}
          >
            한글
          </button>
        </div>
      </div>

      {/* Recipe buttons */}
      <div style={styles.recipeRow}>
        <span style={styles.recipeLabel}>
          {lang === 'ko' ? '추천 레시피' : 'Recipes'}:
        </span>
        {recipes.map((recipe, i) => (
          <button
            key={i}
            style={styles.recipeBtn}
            onClick={() => applyRecipe(recipe)}
            title={recipe.desc}
          >
            {recipe.label}
          </button>
        ))}
      </div>

      <div style={styles.mainGrid}>
        {/* Left Column: Equation Builder + Results */}
        <div style={styles.leftCol}>
          {/* Equation Builder */}
          <div className="panel" style={styles.equationPanel}>
            <div className="panel-header">
              {lang === 'ko' ? '벡터 수식 만들기' : 'Equation Builder'}
            </div>
            <div className="panel-body">
              {/* Search to add words */}
              <div style={styles.searchRow}>
                <div style={styles.searchWrap}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => { if (searchResults.length > 0) setShowDropdown(true) }}
                    placeholder={lang === 'ko' ? '단어 검색...' : 'Search word...'}
                    style={styles.searchInput}
                  />
                  {showDropdown && searchResults.length > 0 && (
                    <div ref={dropdownRef} style={styles.dropdown}>
                      {searchResults.map(word => {
                        const data = getWord(word, lang)
                        const color = data ? catColors[data.category] || '#888' : '#888'
                        return (
                          <button
                            key={word}
                            style={styles.dropdownItem}
                            onClick={() => addChip(word)}
                          >
                            <span style={{ ...styles.dropdownDot, background: color }} />
                            {word}
                            <span style={styles.dropdownCat}>
                              {data?.category || ''}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Chip equation */}
              <div style={styles.equationDisplay}>
                {chips.length === 0 && (
                  <span style={styles.placeholder}>
                    {lang === 'ko'
                      ? '위에서 단어를 검색하거나 레시피를 선택하세요'
                      : 'Search for words above or pick a recipe'}
                  </span>
                )}
                {chips.map((chip, i) => {
                  const data = getWord(chip.word, lang)
                  const borderColor = data ? catColors[data.category] || '#555' : '#555'
                  return (
                    <div key={chip.word + i} style={styles.chipRow}>
                      {i > 0 && (
                        <button
                          style={{
                            ...styles.signBtn,
                            color: chip.sign === '+' ? 'var(--accent-blue)' : 'var(--accent-orange)',
                            borderColor: chip.sign === '+' ? 'var(--accent-blue)' : 'var(--accent-orange)'
                          }}
                          onClick={() => toggleSign(i)}
                          title={lang === 'ko' ? '+/- 전환' : 'Toggle +/-'}
                        >
                          {chip.sign}
                        </button>
                      )}
                      {i === 0 && <span style={styles.firstSign} />}
                      <div
                        style={{
                          ...styles.wordChip,
                          borderColor,
                          background: `${borderColor}18`
                        }}
                      >
                        <span style={styles.chipText}>{chip.word}</span>
                        <button
                          style={styles.chipClose}
                          onClick={() => removeChip(i)}
                          title={lang === 'ko' ? '삭제' : 'Remove'}
                        >
                          &#x2715;
                        </button>
                      </div>
                    </div>
                  )
                })}
                {chips.length > 0 && (
                  <span style={styles.equalsSign}>=</span>
                )}
                {chips.length > 0 && (
                  <span style={styles.questionMark}>?</span>
                )}
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="panel" style={styles.resultsPanel}>
            <div className="panel-header">
              {lang === 'ko' ? '가장 가까운 단어 (Top 10)' : 'Nearest Words (Top 10)'}
            </div>
            <div className="panel-body" style={{ padding: '8px 16px' }}>
              {nearestWords.length === 0 && (
                <span style={styles.placeholder}>
                  {lang === 'ko'
                    ? '수식에 단어를 추가하면 결과가 표시됩니다'
                    : 'Add words to the equation to see results'}
                </span>
              )}
              {nearestWords.map((item, i) => {
                const color = catColors[item.category] || '#888'
                const barWidth = Math.max(0, item.similarity) * 100
                const isHovered = hoveredResult === i
                return (
                  <div
                    key={item.word}
                    style={{
                      ...styles.resultRow,
                      background: isHovered ? 'rgba(255,255,255,0.04)' : 'transparent'
                    }}
                    onMouseEnter={() => setHoveredResult(i)}
                    onMouseLeave={() => setHoveredResult(null)}
                  >
                    <span style={styles.resultRank}>
                      {i + 1}
                    </span>
                    <span style={{
                      ...styles.resultWord,
                      color: i === 0 ? 'var(--accent-blue)' : 'var(--text-primary)'
                    }}>
                      {item.word}
                    </span>
                    <div style={styles.resultBarBg}>
                      <div
                        style={{
                          ...styles.resultBarFill,
                          width: `${barWidth}%`,
                          background: i === 0
                            ? 'linear-gradient(90deg, var(--accent-blue), var(--accent-green))'
                            : `linear-gradient(90deg, ${color}88, ${color})`
                        }}
                      />
                    </div>
                    <span style={styles.resultSim}>
                      {item.similarity.toFixed(3)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Vector Visualization */}
          {resultVector && (
            <div className="panel">
              <div className="panel-header">
                {lang === 'ko'
                  ? `결과 벡터 (${DIM}차원)`
                  : `Result Vector (${DIM}D)`}
              </div>
              <div className="panel-body">
                <VectorBarChart
                  vector={resultVector}
                  width={Math.min(600, typeof window !== 'undefined' ? window.innerWidth - 100 : 500)}
                  height={130}
                />
                <div style={styles.vectorLegend}>
                  <span style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, background: 'var(--accent-blue)' }} />
                    {lang === 'ko' ? '양수' : 'Positive'}
                  </span>
                  <span style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, background: 'var(--accent-orange)' }} />
                    {lang === 'ko' ? '음수' : 'Negative'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Heatmap */}
        <div style={styles.rightCol}>
          <div className="panel" style={{ height: '100%' }}>
            <div className="panel-header">
              {lang === 'ko' ? '유사도 히트맵' : 'Similarity Heatmap'}
            </div>
            <div className="panel-body">
              {/* Heatmap word selector */}
              <div style={styles.searchRow}>
                <div style={styles.searchWrap}>
                  <input
                    ref={heatmapInputRef}
                    type="text"
                    value={heatmapQuery}
                    onChange={(e) => handleHeatmapSearch(e.target.value)}
                    onFocus={() => { if (heatmapSearchResults.length > 0) setShowHeatmapDropdown(true) }}
                    placeholder={lang === 'ko' ? '히트맵에 단어 추가...' : 'Add word to heatmap...'}
                    style={styles.searchInput}
                  />
                  {showHeatmapDropdown && heatmapSearchResults.length > 0 && (
                    <div ref={heatmapDropdownRef} style={styles.dropdown}>
                      {heatmapSearchResults.map(word => {
                        const data = getWord(word, lang)
                        const color = data ? catColors[data.category] || '#888' : '#888'
                        return (
                          <button
                            key={word}
                            style={styles.dropdownItem}
                            onClick={() => addHeatmapWord(word)}
                          >
                            <span style={{ ...styles.dropdownDot, background: color }} />
                            {word}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick-add from chips */}
              {chips.length > 0 && (
                <div style={styles.quickAddRow}>
                  <span style={styles.quickAddLabel}>
                    {lang === 'ko' ? '수식에서 추가' : 'From equation'}:
                  </span>
                  {chips.map(c => {
                    const alreadyIn = heatmapWords.includes(c.word)
                    return (
                      <button
                        key={c.word}
                        style={{
                          ...styles.quickAddBtn,
                          opacity: alreadyIn ? 0.4 : 1,
                          cursor: alreadyIn ? 'default' : 'pointer'
                        }}
                        onClick={() => !alreadyIn && addHeatmapWord(c.word)}
                        disabled={alreadyIn}
                      >
                        {c.word}
                      </button>
                    )
                  })}
                  {/* Also add top results */}
                  {nearestWords.slice(0, 3).map(r => {
                    const alreadyIn = heatmapWords.includes(r.word)
                    return (
                      <button
                        key={r.word}
                        style={{
                          ...styles.quickAddBtn,
                          opacity: alreadyIn ? 0.4 : 1,
                          cursor: alreadyIn ? 'default' : 'pointer',
                          borderColor: 'var(--accent-green)'
                        }}
                        onClick={() => !alreadyIn && addHeatmapWord(r.word)}
                        disabled={alreadyIn}
                      >
                        {r.word}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Selected heatmap words */}
              {heatmapWords.length > 0 && (
                <div style={styles.heatmapChips}>
                  {heatmapWords.map(w => {
                    const data = getWord(w, lang)
                    const color = data ? catColors[data.category] || '#555' : '#555'
                    return (
                      <span
                        key={w}
                        style={{
                          ...styles.heatmapChip,
                          borderColor: color,
                          background: `${color}18`
                        }}
                      >
                        {w}
                        <button
                          style={styles.chipClose}
                          onClick={() => removeHeatmapWord(w)}
                        >
                          &#x2715;
                        </button>
                      </span>
                    )
                  })}
                  <button
                    style={styles.clearBtn}
                    onClick={() => setHeatmapWords([])}
                  >
                    {lang === 'ko' ? '전체 삭제' : 'Clear all'}
                  </button>
                </div>
              )}

              {/* Heatmap canvas */}
              {heatmapWords.length >= 2 ? (
                <div style={styles.heatmapWrap}>
                  <canvas
                    ref={heatmapCanvasRef}
                    style={{
                      display: 'block',
                      borderRadius: 'var(--radius)',
                      cursor: 'crosshair'
                    }}
                    onMouseMove={handleHeatmapMouse}
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                  {hoveredCellInfo && (
                    <div style={styles.heatmapTooltip}>
                      <strong>{hoveredCellInfo.wordA}</strong>
                      {' \u2194 '}
                      <strong>{hoveredCellInfo.wordB}</strong>
                      {': '}
                      <span style={{
                        color: hoveredCellInfo.similarity >= 0.5
                          ? 'var(--accent-green)'
                          : hoveredCellInfo.similarity >= 0
                            ? 'var(--accent-yellow)'
                            : 'var(--accent-red)',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {hoveredCellInfo.similarity.toFixed(4)}
                      </span>
                    </div>
                  )}
                  {/* Color legend */}
                  <div style={styles.heatmapLegend}>
                    <span style={styles.legendLabel}>-1</span>
                    <div style={styles.heatmapGradient} />
                    <span style={styles.legendLabel}>+1</span>
                  </div>
                </div>
              ) : (
                <div style={styles.heatmapPlaceholder}>
                  <div style={styles.heatmapPlaceholderIcon}>&#x1F50D;</div>
                  <p style={styles.heatmapPlaceholderText}>
                    {lang === 'ko'
                      ? '2개 이상의 단어를 추가하면 유사도 행렬이 표시됩니다'
                      : 'Add 2+ words to see the pairwise similarity matrix'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Inline Styles ─── */
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    maxWidth: 1200,
    margin: '0 auto'
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center'
  },
  recipeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },
  recipeLabel: {
    fontSize: 12,
    color: 'var(--text-muted)',
    fontWeight: 500
  },
  recipeBtn: {
    padding: '6px 12px',
    border: '1px solid var(--border)',
    borderRadius: 20,
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: 12,
    alignItems: 'start'
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  equationPanel: {
    overflow: 'visible'
  },
  searchRow: {
    marginBottom: 12
  },
  searchWrap: {
    position: 'relative'
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    zIndex: 50,
    maxHeight: 220,
    overflowY: 'auto',
    boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '8px 12px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s'
  },
  dropdownDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0
  },
  dropdownCat: {
    marginLeft: 'auto',
    fontSize: 11,
    color: 'var(--text-muted)'
  },
  equationDisplay: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 48,
    padding: '8px 0'
  },
  placeholder: {
    fontSize: 13,
    color: 'var(--text-muted)',
    fontStyle: 'italic'
  },
  chipRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  firstSign: {
    width: 0
  },
  signBtn: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid',
    borderRadius: '50%',
    background: 'transparent',
    fontFamily: 'var(--font-mono)',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    flexShrink: 0
  },
  wordChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 10px 5px 12px',
    border: '1.5px solid',
    borderRadius: 20,
    transition: 'all 0.2s'
  },
  chipText: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-primary)'
  },
  chipClose: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    border: 'none',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '50%',
    color: 'var(--text-muted)',
    fontSize: 10,
    cursor: 'pointer',
    transition: 'all 0.2s',
    flexShrink: 0
  },
  equalsSign: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-muted)',
    margin: '0 4px',
    fontFamily: 'var(--font-mono)'
  },
  questionMark: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'rgba(79,195,247,0.15)',
    border: '2px dashed var(--accent-blue)',
    color: 'var(--accent-blue)',
    fontSize: 18,
    fontWeight: 700,
    fontFamily: 'var(--font-mono)'
  },
  resultsPanel: {},
  resultRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 8px',
    borderRadius: 6,
    transition: 'background 0.15s',
    cursor: 'default'
  },
  resultRank: {
    width: 22,
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textAlign: 'right',
    fontFamily: 'var(--font-mono)',
    flexShrink: 0
  },
  resultWord: {
    width: 90,
    fontSize: 13,
    fontWeight: 500,
    flexShrink: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  resultBarBg: {
    flex: 1,
    height: 10,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 5,
    overflow: 'hidden'
  },
  resultBarFill: {
    height: '100%',
    borderRadius: 5,
    transition: 'width 0.3s ease'
  },
  resultSim: {
    width: 52,
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-secondary)',
    textAlign: 'right',
    flexShrink: 0
  },
  vectorLegend: {
    display: 'flex',
    gap: 16,
    marginTop: 8,
    justifyContent: 'center'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: 'var(--text-muted)'
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2
  },
  quickAddRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 10
  },
  quickAddLabel: {
    fontSize: 11,
    color: 'var(--text-muted)',
    flexShrink: 0
  },
  quickAddBtn: {
    padding: '3px 8px',
    border: '1px solid var(--border)',
    borderRadius: 12,
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-sans)',
    fontSize: 11,
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  heatmapChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
    marginBottom: 10
  },
  heatmapChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px 3px 10px',
    border: '1px solid',
    borderRadius: 14,
    fontSize: 12,
    color: 'var(--text-primary)'
  },
  clearBtn: {
    padding: '3px 8px',
    border: 'none',
    borderRadius: 12,
    background: 'rgba(239,83,80,0.15)',
    color: 'var(--accent-red)',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)'
  },
  heatmapWrap: {
    position: 'relative'
  },
  heatmapTooltip: {
    marginTop: 8,
    padding: '6px 10px',
    background: 'rgba(255,255,255,0.97)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    borderRadius: 6,
    fontSize: 12,
    color: 'var(--text-primary)',
    textAlign: 'center'
  },
  heatmapLegend: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8
  },
  legendLabel: {
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)'
  },
  heatmapGradient: {
    width: 120,
    height: 10,
    borderRadius: 5,
    background: 'linear-gradient(90deg, #0040d0, #1e1e30, #e03020)'
  },
  heatmapPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    opacity: 0.5
  },
  heatmapPlaceholderIcon: {
    fontSize: 36,
    marginBottom: 12
  },
  heatmapPlaceholderText: {
    fontSize: 13,
    color: 'var(--text-muted)',
    textAlign: 'center',
    lineHeight: 1.5
  }
}
