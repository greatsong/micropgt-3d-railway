import { useState, useRef, useEffect, useCallback } from 'react'
import { NeuralNetwork } from '../../engine/neuralNetwork'
import { generateLogicGate } from '../../engine/datasets'

// ---------- Constants ----------
const CANVAS_SIZE = 400
const PADDING = 50
const POINT_RADIUS = 12
const GRID_RANGE = { min: -0.5, max: 1.5 }

const GATES = ['AND', 'OR', 'XOR']

const KNOWN_SOLUTIONS = {
  AND: { w1: 1.5, w2: 1.5, bias: -2.0 },
  OR:  { w1: 1.5, w2: 1.5, bias: -0.5 },
}

// ---------- Styles ----------
const S = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--bg-primary)',
    fontFamily: 'var(--font-sans)',
    color: 'var(--text-primary)',
    overflow: 'hidden',
  },
  layout: {
    display: 'flex',
    flex: 1,
    gap: 16,
    padding: 16,
    overflow: 'hidden',
  },
  canvasPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minWidth: 0,
  },
  canvasWrap: {
    position: 'relative',
    background: 'var(--bg-input)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    overflow: 'hidden',
    aspectRatio: '1',
    maxHeight: 'calc(100vh - 200px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebar: {
    width: 280,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 130px)',
  },
  card: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '10px 14px',
    borderBottom: '1px solid var(--border)',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  cardBody: {
    padding: 14,
  },
  gateGroup: {
    display: 'flex',
    gap: 6,
  },
  gateBtn: (active) => ({
    flex: 1,
    padding: '8px 0',
    border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--border)'}`,
    borderRadius: 20,
    background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
    color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  }),
  sliderRow: {
    marginBottom: 14,
  },
  sliderLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    fontSize: 12,
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  sliderValue: {
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-blue)',
    fontSize: 12,
  },
  slider: {
    width: '100%',
    height: 4,
    WebkitAppearance: 'none',
    background: 'var(--border)',
    borderRadius: 2,
    outline: 'none',
    cursor: 'pointer',
  },
  btnRow: {
    display: 'flex',
    gap: 8,
    marginTop: 4,
  },
  btn: (variant) => ({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '9px 12px',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
    ...(variant === 'primary'
      ? { background: 'var(--accent-blue)', color: '#000' }
      : variant === 'green'
      ? { background: 'var(--accent-green)', color: '#000' }
      : variant === 'purple'
      ? { background: 'var(--accent-purple)', color: '#fff' }
      : { background: 'rgba(59,130,246,0.06)', color: 'var(--text-primary)' }),
  }),
  truthTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
  },
  th: {
    padding: '6px 8px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontWeight: 500,
    borderBottom: '1px solid var(--border)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  td: (highlight) => ({
    padding: '6px 8px',
    textAlign: 'center',
    color: highlight ? 'var(--accent-orange)' : 'var(--text-primary)',
    borderBottom: '1px solid rgba(203,213,225,0.6)',
  }),
  tdPred: (correct) => ({
    padding: '6px 8px',
    textAlign: 'center',
    fontWeight: 600,
    color: correct === null
      ? 'var(--text-muted)'
      : correct
      ? 'var(--accent-green)'
      : 'var(--accent-red)',
    borderBottom: '1px solid rgba(203,213,225,0.6)',
  }),
  messageBox: (type) => ({
    padding: '10px 14px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    fontWeight: 500,
    textAlign: 'center',
    lineHeight: 1.5,
    background:
      type === 'error'
        ? 'rgba(239,68,68,0.12)'
        : type === 'success'
        ? 'rgba(34,197,94,0.12)'
        : 'rgba(59,130,246,0.08)',
    color:
      type === 'error'
        ? 'var(--accent-red)'
        : type === 'success'
        ? 'var(--accent-green)'
        : 'var(--accent-blue)',
    border: `1px solid ${
      type === 'error'
        ? 'rgba(239,68,68,0.25)'
        : type === 'success'
        ? 'rgba(34,197,94,0.25)'
        : 'rgba(59,130,246,0.15)'
    }`,
  }),
  networkDiagram: {
    padding: '8px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    fontSize: 12,
  },
  statusLabel: {
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  statusValue: {
    fontFamily: 'var(--font-mono)',
    fontWeight: 600,
  },
}

// ---------- Canvas drawing helpers ----------
function toCanvasX(val, w) {
  const range = GRID_RANGE.max - GRID_RANGE.min
  return PADDING + ((val - GRID_RANGE.min) / range) * (w - 2 * PADDING)
}

function toCanvasY(val, h) {
  const range = GRID_RANGE.max - GRID_RANGE.min
  return h - PADDING - ((val - GRID_RANGE.min) / range) * (h - 2 * PADDING)
}

function drawGrid(ctx, w, h) {
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'
  ctx.lineWidth = 1

  for (let v = 0; v <= 1; v += 0.5) {
    const x = toCanvasX(v, w)
    const y = toCanvasY(v, h)

    // vertical
    ctx.beginPath()
    ctx.moveTo(x, PADDING)
    ctx.lineTo(x, h - PADDING)
    ctx.stroke()

    // horizontal
    ctx.beginPath()
    ctx.moveTo(PADDING, y)
    ctx.lineTo(w - PADDING, y)
    ctx.stroke()
  }

  // axes lines (at 0)
  ctx.strokeStyle = 'rgba(100,116,139,0.35)'
  ctx.lineWidth = 1.5

  const x0 = toCanvasX(0, w)
  const y0 = toCanvasY(0, h)
  ctx.beginPath()
  ctx.moveTo(x0, PADDING - 10)
  ctx.lineTo(x0, h - PADDING + 10)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(PADDING - 10, y0)
  ctx.lineTo(w - PADDING + 10, y0)
  ctx.stroke()

  // axis labels
  ctx.fillStyle = 'rgba(100,116,139,0.6)'
  ctx.font = '11px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let v = 0; v <= 1; v++) {
    ctx.fillText(String(v), toCanvasX(v, w), h - PADDING + 14)
  }
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let v = 0; v <= 1; v++) {
    ctx.fillText(String(v), PADDING - 12, toCanvasY(v, h))
  }

  // axis names
  ctx.fillStyle = 'rgba(100,116,139,0.45)'
  ctx.font = '600 12px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('x\u2081', w - PADDING + 24, y0 - 5)
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillText('x\u2082', x0 - 8, PADDING - 22)
}

function drawDecisionBoundary(ctx, w, h, w1, w2, bias) {
  // Decision boundary: w1*x1 + w2*x2 + bias = 0
  // => x2 = -(w1*x1 + bias) / w2 (when w2 != 0)
  // => x1 = -(w2*x2 + bias) / w1 (when w1 != 0)
  if (Math.abs(w1) < 0.001 && Math.abs(w2) < 0.001) return

  const pts = []

  const xMin = GRID_RANGE.min
  const xMax = GRID_RANGE.max

  if (Math.abs(w2) > 0.001) {
    const y_at_xmin = -(w1 * xMin + bias) / w2
    const y_at_xmax = -(w1 * xMax + bias) / w2
    if (y_at_xmin >= xMin && y_at_xmin <= xMax) pts.push([xMin, y_at_xmin])
    if (y_at_xmax >= xMin && y_at_xmax <= xMax) pts.push([xMax, y_at_xmax])
  }

  if (Math.abs(w1) > 0.001) {
    const x_at_ymin = -(w2 * xMin + bias) / w1
    const x_at_ymax = -(w2 * xMax + bias) / w1
    if (x_at_ymin > xMin && x_at_ymin < xMax) pts.push([x_at_ymin, xMin])
    if (x_at_ymax > xMin && x_at_ymax < xMax) pts.push([x_at_ymax, xMax])
  }

  if (pts.length < 2) return

  // Shading: fill the "class 1" side with semi-transparent orange
  const resolution = 80
  const cellW = (w - 2 * PADDING) / resolution
  const cellH = (h - 2 * PADDING) / resolution
  for (let ix = 0; ix < resolution; ix++) {
    for (let iy = 0; iy < resolution; iy++) {
      const dataX = GRID_RANGE.min + (ix / resolution) * (GRID_RANGE.max - GRID_RANGE.min)
      const dataY = GRID_RANGE.min + (iy / resolution) * (GRID_RANGE.max - GRID_RANGE.min)
      const activation = w1 * dataX + w2 * dataY + bias
      const sigmoid = 1 / (1 + Math.exp(-activation))
      const cx = PADDING + ix * cellW
      const cy = h - PADDING - (iy + 1) * cellH
      if (sigmoid > 0.5) {
        ctx.fillStyle = `rgba(249,115,22,${(sigmoid - 0.5) * 0.25})`
      } else {
        ctx.fillStyle = `rgba(59,130,246,${(0.5 - sigmoid) * 0.25})`
      }
      ctx.fillRect(cx, cy, cellW + 0.5, cellH + 0.5)
    }
  }

  // Draw the line
  ctx.strokeStyle = 'rgba(30,41,59,0.8)'
  ctx.lineWidth = 2.5
  ctx.setLineDash([8, 6])
  ctx.beginPath()
  ctx.moveTo(toCanvasX(pts[0][0], w), toCanvasY(pts[0][1], h))
  ctx.lineTo(toCanvasX(pts[1][0], w), toCanvasY(pts[1][1], h))
  ctx.stroke()
  ctx.setLineDash([])
}

function drawMultiDecisionBoundary(ctx, w, h, nn) {
  // For the 2-layer network, draw a heatmap using network predictions
  const resolution = 60
  const cellW = (w - 2 * PADDING) / resolution
  const cellH = (h - 2 * PADDING) / resolution
  for (let ix = 0; ix < resolution; ix++) {
    for (let iy = 0; iy < resolution; iy++) {
      const dataX = GRID_RANGE.min + ((ix + 0.5) / resolution) * (GRID_RANGE.max - GRID_RANGE.min)
      const dataY = GRID_RANGE.min + ((iy + 0.5) / resolution) * (GRID_RANGE.max - GRID_RANGE.min)
      const out = nn.predict([dataX, dataY])[0]
      const cx = PADDING + ix * cellW
      const cy = h - PADDING - (iy + 1) * cellH
      if (out > 0.5) {
        ctx.fillStyle = `rgba(249,115,22,${Math.min((out - 0.5) * 0.5, 0.25)})`
      } else {
        ctx.fillStyle = `rgba(59,130,246,${Math.min((0.5 - out) * 0.5, 0.25)})`
      }
      ctx.fillRect(cx, cy, cellW + 0.5, cellH + 0.5)
    }
  }

  // Draw the 0.5 contour line by marching squares (simplified)
  ctx.strokeStyle = 'rgba(30,41,59,0.7)'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 4])

  const gridRes = 100
  for (let ix = 0; ix < gridRes; ix++) {
    for (let iy = 0; iy < gridRes; iy++) {
      const x0 = GRID_RANGE.min + (ix / gridRes) * (GRID_RANGE.max - GRID_RANGE.min)
      const x1 = GRID_RANGE.min + ((ix + 1) / gridRes) * (GRID_RANGE.max - GRID_RANGE.min)
      const y0 = GRID_RANGE.min + (iy / gridRes) * (GRID_RANGE.max - GRID_RANGE.min)
      const y1 = GRID_RANGE.min + ((iy + 1) / gridRes) * (GRID_RANGE.max - GRID_RANGE.min)

      const v00 = nn.predict([x0, y0])[0]
      const v10 = nn.predict([x1, y0])[0]
      const v01 = nn.predict([x0, y1])[0]
      const v11 = nn.predict([x1, y1])[0]

      const edges = []
      if ((v00 >= 0.5) !== (v10 >= 0.5)) {
        const t = (0.5 - v00) / (v10 - v00)
        edges.push([x0 + t * (x1 - x0), y0])
      }
      if ((v10 >= 0.5) !== (v11 >= 0.5)) {
        const t = (0.5 - v10) / (v11 - v10)
        edges.push([x1, y0 + t * (y1 - y0)])
      }
      if ((v01 >= 0.5) !== (v11 >= 0.5)) {
        const t = (0.5 - v01) / (v11 - v01)
        edges.push([x0 + t * (x1 - x0), y1])
      }
      if ((v00 >= 0.5) !== (v01 >= 0.5)) {
        const t = (0.5 - v00) / (v01 - v00)
        edges.push([x0, y0 + t * (y1 - y0)])
      }

      if (edges.length >= 2) {
        ctx.beginPath()
        ctx.moveTo(toCanvasX(edges[0][0], w), toCanvasY(edges[0][1], h))
        ctx.lineTo(toCanvasX(edges[1][0], w), toCanvasY(edges[1][1], h))
        ctx.stroke()
      }
    }
  }
  ctx.setLineDash([])
}

function drawPoints(ctx, w, h, data, predictions, celebratePhase) {
  data.forEach((d, i) => {
    const cx = toCanvasX(d.input[0], w)
    const cy = toCanvasY(d.input[1], h)

    const pred = predictions ? predictions[i] : null
    const correct = pred !== null ? (pred >= 0.5 ? 1 : 0) === d.target : null

    // Subtle celebration glow only when every point is solved
    if (celebratePhase > 0 && correct) {
      const pulseR = POINT_RADIUS + 8 + Math.sin(celebratePhase * 0.12 + i) * 2
      const gradient = ctx.createRadialGradient(cx, cy, POINT_RADIUS - 2, cx, cy, pulseR)
      gradient.addColorStop(0, 'rgba(34,197,94,0.14)')
      gradient.addColorStop(0.65, 'rgba(34,197,94,0.08)')
      gradient.addColorStop(1, 'rgba(34,197,94,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, pulseR, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
    }

    // Shadow
    ctx.beginPath()
    ctx.arc(cx, cy + 2, POINT_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(15,23,42,0.08)'
    ctx.fill()

    // Main node
    ctx.beginPath()
    ctx.arc(cx, cy, POINT_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.96)'
    ctx.fill()

    // Border color communicates correctness
    ctx.beginPath()
    ctx.arc(cx, cy, POINT_RADIUS, 0, Math.PI * 2)
    ctx.strokeStyle = correct === null
      ? 'rgba(148,163,184,0.7)'
      : correct
      ? 'rgba(34,197,94,0.95)'
      : 'rgba(248,113,113,0.95)'
    ctx.lineWidth = celebratePhase > 0 && correct ? 3.5 : 3
    ctx.stroke()

    // Label
    ctx.fillStyle = '#0f172a'
    ctx.font = '700 11px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(d.target), cx, cy)
  })
}

function drawNetworkMini(ctx, w, h, topology, isTraining) {
  ctx.clearRect(0, 0, w, h)
  const layers = topology.length
  const layerGap = w / (layers + 1)

  const layerColors = [
    'var(--accent-blue)',
    'var(--accent-purple)',
    'var(--accent-orange)',
  ]
  const colorValues = ['#3b82f6', '#a855f7', '#f97316']

  // Draw connections
  for (let l = 0; l < layers - 1; l++) {
    for (let i = 0; i < topology[l]; i++) {
      for (let j = 0; j < topology[l + 1]; j++) {
        const x1 = layerGap * (l + 1)
        const y1 = (h / (topology[l] + 1)) * (i + 1)
        const x2 = layerGap * (l + 2)
        const y2 = (h / (topology[l + 1] + 1)) * (j + 1)
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.strokeStyle = isTraining
          ? `rgba(168,85,247,${0.3 + Math.random() * 0.3})`
          : 'rgba(203,213,225,0.6)'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
    }
  }

  // Draw neurons
  for (let l = 0; l < layers; l++) {
    for (let i = 0; i < topology[l]; i++) {
      const x = layerGap * (l + 1)
      const y = (h / (topology[l] + 1)) * (i + 1)
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.fillStyle = colorValues[Math.min(l, colorValues.length - 1)]
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }
}

// ---------- Component ----------
export default function LogicGates() {
  const canvasRef = useRef(null)
  const netCanvasRef = useRef(null)
  const animRef = useRef(null)
  const celebrateRef = useRef(0)
  const trainIntervalRef = useRef(null)

  const [gate, setGate] = useState('AND')
  const [w1, setW1] = useState(0.5)
  const [w2, setW2] = useState(0.5)
  const [bias, setBias] = useState(0)
  const [mode, setMode] = useState('single') // 'single' | 'multi'
  const [isAutoSolving, setIsAutoSolving] = useState(false)
  const [isSolved, setIsSolved] = useState(false)
  const [xorMessage, setXorMessage] = useState('')
  const [multiNet, setMultiNet] = useState(null)
  const [multiTraining, setMultiTraining] = useState(false)
  const [multiEpoch, setMultiEpoch] = useState(0)
  const [multiLoss, setMultiLoss] = useState(null)
  const [multiPredictions, setMultiPredictions] = useState(null)
  const [canvasSize, setCanvasSize] = useState(CANVAS_SIZE)

  const data = generateLogicGate(gate)

  // ---------- Predictions (single mode) ----------
  const getSinglePredictions = useCallback(() => {
    return data.map(d => {
      const val = w1 * d.input[0] + w2 * d.input[1] + bias
      return 1 / (1 + Math.exp(-val))
    })
  }, [data, w1, w2, bias])

  const checkSolved = useCallback((preds) => {
    return data.every((d, i) => {
      const predicted = preds[i] >= 0.5 ? 1 : 0
      return predicted === d.target
    })
  }, [data])

  // ---------- Canvas resize ----------
  useEffect(() => {
    const resizeCanvas = () => {
      const wrapEl = canvasRef.current?.parentElement
      if (wrapEl) {
        const rect = wrapEl.getBoundingClientRect()
        const size = Math.min(rect.width, rect.height, 600)
        setCanvasSize(Math.max(280, Math.floor(size)))
      }
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  // ---------- Main canvas draw ----------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height

    const draw = () => {
      ctx.clearRect(0, 0, w, h)

      // Background
      ctx.fillStyle = '#f0f4f8'
      ctx.fillRect(0, 0, w, h)

      drawGrid(ctx, w, h)

      if (mode === 'single') {
        drawDecisionBoundary(ctx, w, h, w1, w2, bias)
        const preds = getSinglePredictions()
        drawPoints(ctx, w, h, data, preds, celebrateRef.current)

        // Check if solved
        const solved = checkSolved(preds)
        if (solved && !isSolved) {
          setIsSolved(true)
          celebrateRef.current = 1
        } else if (!solved && isSolved) {
          setIsSolved(false)
          celebrateRef.current = 0
        }
      } else {
        // Multi-layer mode
        if (multiNet) {
          drawMultiDecisionBoundary(ctx, w, h, multiNet)
          drawPoints(ctx, w, h, data, multiPredictions, celebrateRef.current)
        } else {
          drawPoints(ctx, w, h, data, null, 0)
        }
      }

      // Celebrate animation
      if (celebrateRef.current > 0 && celebrateRef.current < 120) {
        celebrateRef.current++
        animRef.current = requestAnimationFrame(draw)
        return
      } else if (celebrateRef.current >= 120) {
        celebrateRef.current = 60 // keep subtle pulsing
      }

      if (multiTraining || celebrateRef.current > 0) {
        animRef.current = requestAnimationFrame(draw)
      }
    }

    draw()

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [canvasSize, gate, w1, w2, bias, mode, data, multiNet, multiPredictions, multiTraining, isSolved, getSinglePredictions, checkSolved])

  // ---------- Network diagram canvas ----------
  useEffect(() => {
    const canvas = netCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const topology = mode === 'single' ? [2, 1] : [2, 4, 1]
    drawNetworkMini(ctx, canvas.width, canvas.height, topology, multiTraining)
  }, [mode, multiTraining])

  // ---------- Auto-solve animation ----------
  const autoSolveStartRef = useRef(null)
  useEffect(() => {
    if (!isAutoSolving) return

    if (gate === 'XOR') {
      setXorMessage('XOR: 직선 하나로는 불가능!')
      setIsAutoSolving(false)
      return
    }

    const target = KNOWN_SOLUTIONS[gate]
    if (!target) return

    // Save start values on first trigger only
    if (!autoSolveStartRef.current) {
      autoSolveStartRef.current = { w1, w2, bias, time: performance.now() }
    }
    const { w1: startW1, w2: startW2, bias: startBias, time: startTime } = autoSolveStartRef.current
    const duration = 1200

    const animate = (now) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)

      setW1(+(startW1 + (target.w1 - startW1) * ease).toFixed(2))
      setW2(+(startW2 + (target.w2 - startW2) * ease).toFixed(2))
      setBias(+(startBias + (target.bias - startBias) * ease).toFixed(2))

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        setIsAutoSolving(false)
        autoSolveStartRef.current = null
      }
    }

    animRef.current = requestAnimationFrame(animate)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [isAutoSolving, gate])

  // ---------- Multi-layer training ----------
  const startMultiTraining = useCallback(() => {
    const nn = new NeuralNetwork([2, 4, 1], 'relu')
    setMultiNet(nn)
    setMultiTraining(true)
    setMultiEpoch(0)
    setMultiLoss(null)
    setMultiPredictions(null)
    celebrateRef.current = 0

    let epoch = 0
    const trainData = data.map(d => ({ input: d.input, target: d.target }))

    if (trainIntervalRef.current) clearInterval(trainIntervalRef.current)

    trainIntervalRef.current = setInterval(() => {
      // Run a batch of epochs per tick for faster convergence
      for (let i = 0; i < 10; i++) {
        const loss = nn.trainEpoch(trainData, 0.5)
        epoch++
        if (epoch % 10 === 0) {
          setMultiEpoch(epoch)
          setMultiLoss(loss)
        }
      }

      const preds = trainData.map(d => nn.predict(d.input)[0])
      setMultiPredictions(preds)
      setMultiNet(nn.clone())

      // Check if solved
      const solved = trainData.every((d, i) => {
        const predicted = preds[i] >= 0.5 ? 1 : 0
        return predicted === d.target
      })

      if (solved || epoch >= 2000) {
        clearInterval(trainIntervalRef.current)
        trainIntervalRef.current = null
        setMultiTraining(false)
        setMultiEpoch(epoch)
        if (solved) {
          celebrateRef.current = 1
          setIsSolved(true)
        }
      }
    }, 30)
  }, [data])

  // Cleanup training interval on unmount
  useEffect(() => {
    return () => {
      if (trainIntervalRef.current) clearInterval(trainIntervalRef.current)
    }
  }, [])

  // ---------- Gate change handler ----------
  const handleGateChange = (newGate) => {
    setGate(newGate)
    setIsSolved(false)
    setXorMessage('')
    setMode('single')
    setMultiNet(null)
    setMultiTraining(false)
    setMultiPredictions(null)
    celebrateRef.current = 0
    if (trainIntervalRef.current) {
      clearInterval(trainIntervalRef.current)
      trainIntervalRef.current = null
    }
    // Reset weights
    setW1(0.5)
    setW2(0.5)
    setBias(0)
  }

  const handleReset = () => {
    setW1(0.5)
    setW2(0.5)
    setBias(0)
    setIsSolved(false)
    setXorMessage('')
    celebrateRef.current = 0
  }

  const handleAutoSolve = () => {
    if (gate === 'XOR' && mode === 'single') {
      setXorMessage('XOR: 직선 하나로는 불가능!')
      return
    }
    setXorMessage('')
    autoSolveStartRef.current = null
    setIsAutoSolving(true)
  }

  const handleAddHiddenLayer = () => {
    setMode('multi')
    setXorMessage('')
    setIsSolved(false)
    celebrateRef.current = 0
    startMultiTraining()
  }

  const handleBackToSingle = () => {
    setMode('single')
    setMultiNet(null)
    setMultiTraining(false)
    setMultiPredictions(null)
    setIsSolved(false)
    celebrateRef.current = 0
    if (trainIntervalRef.current) {
      clearInterval(trainIntervalRef.current)
      trainIntervalRef.current = null
    }
  }

  // ---------- Derived ----------
  const singlePredictions = mode === 'single' ? getSinglePredictions() : null
  const accuracy = mode === 'single'
    ? data.filter((d, i) => (singlePredictions[i] >= 0.5 ? 1 : 0) === d.target).length
    : multiPredictions
    ? data.filter((d, i) => (multiPredictions[i] >= 0.5 ? 1 : 0) === d.target).length
    : 0

  const equation = mode === 'single'
    ? `${w1 >= 0 ? '' : '-'}${Math.abs(w1)}x\u2081 ${w2 >= 0 ? '+' : '-'} ${Math.abs(w2)}x\u2082 ${bias >= 0 ? '+' : '-'} ${Math.abs(bias)} = 0`
    : null

  return (
    <div style={S.container}>
      <div style={S.layout}>
        {/* Canvas Area */}
        <div style={S.canvasPanel}>
          <div style={S.canvasWrap}>
            <canvas
              ref={canvasRef}
              width={canvasSize}
              height={canvasSize}
              style={{ width: canvasSize, height: canvasSize, display: 'block' }}
            />
          </div>

          {/* Status bar */}
          <div style={S.statusBar}>
            <div>
              <span style={S.statusLabel}>
                {mode === 'single' ? '결정 경계: ' : '네트워크: '}
              </span>
              <span style={{
                ...S.statusValue,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--accent-blue)',
              }}>
                {mode === 'single'
                  ? equation
                  : `[2, 4, 1] \u00b7 Epoch ${multiEpoch}`
                }
              </span>
            </div>
            <div>
              <span style={S.statusLabel}>정확도: </span>
              <span style={{
                ...S.statusValue,
                fontSize: 14,
                color: accuracy === 4 ? 'var(--accent-green)' : accuracy >= 3 ? 'var(--accent-yellow)' : 'var(--accent-red)',
              }}>
                {accuracy}/4
              </span>
              {isSolved && (
                <span style={{
                  marginLeft: 8,
                  color: 'var(--accent-green)',
                  fontWeight: 600,
                  fontSize: 12,
                }}>
                  SOLVED
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={S.sidebar}>
          {/* Gate selector */}
          <div style={S.card}>
            <div style={S.cardHeader}>Logic Gate</div>
            <div style={S.cardBody}>
              <div style={S.gateGroup}>
                {GATES.map(g => (
                  <button
                    key={g}
                    style={S.gateBtn(g === gate)}
                    onClick={() => handleGateChange(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Truth Table */}
          <div style={S.card}>
            <div style={S.cardHeader}>Truth Table</div>
            <div style={{ ...S.cardBody, padding: '8px 14px' }}>
              <table style={S.truthTable}>
                <thead>
                  <tr>
                    <th style={S.th}>x1</th>
                    <th style={S.th}>x2</th>
                    <th style={S.th}>Target</th>
                    <th style={S.th}>Pred</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d, i) => {
                    const pred = mode === 'single'
                      ? singlePredictions[i]
                      : multiPredictions
                      ? multiPredictions[i]
                      : null
                    const predClass = pred !== null ? (pred >= 0.5 ? 1 : 0) : null
                    const correct = predClass !== null ? predClass === d.target : null
                    return (
                      <tr key={i}>
                        <td style={S.td(false)}>{d.input[0]}</td>
                        <td style={S.td(false)}>{d.input[1]}</td>
                        <td style={S.td(d.target === 1)}>{d.target}</td>
                        <td style={S.tdPred(correct)}>
                          {pred !== null ? predClass : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Network diagram */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              {mode === 'single' ? 'Perceptron' : '2-Layer Network'}
            </div>
            <div style={{ ...S.cardBody, padding: '8px' }}>
              <canvas
                ref={netCanvasRef}
                width={252}
                height={80}
                style={{ width: '100%', height: 80, display: 'block' }}
              />
            </div>
          </div>

          {/* Controls */}
          {mode === 'single' && (
            <div style={S.card}>
              <div style={S.cardHeader}>Weights & Bias</div>
              <div style={S.cardBody}>
                <div style={S.sliderRow}>
                  <div style={S.sliderLabel}>
                    <span>w1</span>
                    <span style={S.sliderValue}>{w1.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={-3}
                    max={3}
                    step={0.05}
                    value={w1}
                    onChange={e => { setW1(+e.target.value); setIsSolved(false); celebrateRef.current = 0 }}
                    style={S.slider}
                    disabled={isAutoSolving}
                  />
                </div>
                <div style={S.sliderRow}>
                  <div style={S.sliderLabel}>
                    <span>w2</span>
                    <span style={S.sliderValue}>{w2.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={-3}
                    max={3}
                    step={0.05}
                    value={w2}
                    onChange={e => { setW2(+e.target.value); setIsSolved(false); celebrateRef.current = 0 }}
                    style={S.slider}
                    disabled={isAutoSolving}
                  />
                </div>
                <div style={S.sliderRow}>
                  <div style={S.sliderLabel}>
                    <span>bias</span>
                    <span style={S.sliderValue}>{bias.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={-3}
                    max={3}
                    step={0.05}
                    value={bias}
                    onChange={e => { setBias(+e.target.value); setIsSolved(false); celebrateRef.current = 0 }}
                    style={S.slider}
                    disabled={isAutoSolving}
                  />
                </div>

                <div style={S.btnRow}>
                  <button
                    style={S.btn('primary')}
                    onClick={handleAutoSolve}
                    disabled={isAutoSolving}
                  >
                    Auto-Solve
                  </button>
                  <button
                    style={S.btn('secondary')}
                    onClick={handleReset}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {xorMessage && (
            <div style={S.messageBox('error')}>
              {xorMessage}
            </div>
          )}

          {isSolved && mode === 'single' && (
            <div style={S.messageBox('success')}>
              {gate} 게이트 해결!
            </div>
          )}

          {isSolved && mode === 'multi' && (
            <div style={S.messageBox('success')}>
              Hidden Layer로 {gate} 해결! (Epoch {multiEpoch})
            </div>
          )}

          {/* Multi-layer controls */}
          {mode === 'single' && gate === 'XOR' && xorMessage && (
            <button
              style={S.btn('purple')}
              onClick={handleAddHiddenLayer}
            >
              + Hidden Layer 추가
            </button>
          )}

          {mode === 'single' && gate !== 'XOR' && isSolved && (
            <div style={S.messageBox('info')}>
              XOR 게이트를 선택해서 차이를 확인해 보세요
            </div>
          )}

          {mode === 'multi' && (
            <div style={S.card}>
              <div style={S.cardHeader}>Training</div>
              <div style={S.cardBody}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Epoch</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-blue)' }}>
                    {multiEpoch}
                  </span>
                </div>
                {multiLoss !== null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Loss</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-orange)' }}>
                      {multiLoss.toFixed(4)}
                    </span>
                  </div>
                )}
                <div style={S.btnRow}>
                  {!multiTraining && !isSolved && (
                    <button
                      style={S.btn('green')}
                      onClick={startMultiTraining}
                    >
                      Re-train
                    </button>
                  )}
                  <button
                    style={S.btn('secondary')}
                    onClick={handleBackToSingle}
                  >
                    Single Layer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
