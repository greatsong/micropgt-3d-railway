import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { NeuralNetwork } from '../../engine/neuralNetwork'
import {
  generateCircle,
  generateXOR,
  generateGaussian,
  generateSpiral,
  generateMoon,
  datasets
} from '../../engine/datasets'

// ─── Color utilities ────────────────────────────────────────────
// Class 1 = indigo (#6366f1), Class 0 = pink (#f472b6)
// P(class=1): 0 → soft pink (class 0 region), 0.5 → near-white, 1 → soft indigo (class 1 region)

function interpolateColor(value, min, max) {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min + 1e-10)))
  if (t < 0.5) {
    const s = t / 0.5
    const r = Math.round(253 + (248 - 253) * s)
    const g = Math.round(230 + (250 - 230) * s)
    const b = Math.round(243 + (252 - 243) * s)
    return `rgb(${r},${g},${b})`
  } else {
    const s = (t - 0.5) / 0.5
    const r = Math.round(248 + (224 - 248) * s)
    const g = Math.round(250 + (231 - 250) * s)
    const b = Math.round(252 + (255 - 252) * s)
    return `rgb(${r},${g},${b})`
  }
}

function heatmapRGBA(value) {
  // class 0 region: 흰색 → pink-200 (#fce7f3 계열)
  // class 1 region: 흰색 → indigo-200 (#c7d2fe 계열)
  const t = Math.max(0, Math.min(1, value))
  let r, g, b
  if (t < 0.5) {
    const s = 1 - t / 0.5  // s=1(pink) at t=0, s=0(white) at t=0.5
    r = Math.round(255 - s * 4)       // 255 → 251
    g = Math.round(255 - s * 47)      // 255 → 208  (pink-200 g)
    b = Math.round(255 - s * 23)      // 255 → 232  (pink-200 b)
  } else {
    const s = (t - 0.5) / 0.5  // s=0(white) at t=0.5, s=1(indigo) at t=1
    r = Math.round(255 - s * 56)      // 255 → 199  (indigo-200 r)
    g = Math.round(255 - s * 45)      // 255 → 210  (indigo-200 g)
    b = Math.round(255 - s * 1)       // 255 → 254  (indigo-200 b)
  }
  return [r, g, b, 255]
}

function weightColor(w) {
  // Positive = indigo, negative = pink, magnitude = opacity
  const absW = Math.min(Math.abs(w), 3)
  const alpha = 0.2 + (absW / 3) * 0.8
  if (w >= 0) {
    return `rgba(99, 102, 241, ${alpha.toFixed(2)})`
  } else {
    return `rgba(244, 114, 182, ${alpha.toFixed(2)})`
  }
}

function weightWidth(w) {
  return 0.5 + Math.min(Math.abs(w), 3) * 1.5
}

// ─── Constants ──────────────────────────────────────────────────
const GRID_RES = 200
const HEATMAP_SIZE = 320
const NETWORK_WIDTH = 460
const NETWORK_HEIGHT = 360
const NEURON_RADIUS = 18
const MINI_HEATMAP_SIZE = 24
const LOSS_GRAPH_HEIGHT = 100
const LOSS_GRAPH_WIDTH = 320

const DATASET_LIST = [
  { key: 'circle', label: 'Circle', icon: '\u25EF' },
  { key: 'xor', label: 'XOR', icon: '\u2716' },
  { key: 'gaussian', label: 'Gaussian', icon: '\u25CF' },
  { key: 'spiral', label: 'Spiral', icon: '\u223F' },
  { key: 'moon', label: 'Moon', icon: '\u263D' }
]

const ACTIVATIONS = ['relu', 'sigmoid', 'tanh', 'linear', 'leakyrelu']
const ACTIVATION_LABELS = { relu: 'ReLU', sigmoid: 'Sigmoid', tanh: 'Tanh', linear: 'Linear', leakyrelu: 'Leaky' }

const LR_OPTIONS = [0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1]

// ─── Mini heatmap generation for neurons ────────────────────────
function generateMiniHeatmapDataURL(network, layerIndex, neuronIndex, size = MINI_HEATMAP_SIZE) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const imgData = ctx.createImageData(size, size)

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * 2 - 1
      const y = (py / (size - 1)) * 2 - 1
      const outputs = network.getLayerOutputs([x, y])
      const layerOut = outputs[layerIndex]
      if (!layerOut || neuronIndex >= layerOut.length) continue
      let val = layerOut[neuronIndex]
      // Normalize based on activation
      if (network.activation === 'tanh') {
        val = (val + 1) / 2
      } else if (network.activation === 'relu') {
        val = Math.min(val, 2) / 2
      }
      // clamp
      val = Math.max(0, Math.min(1, val))
      const [r, g, b, a] = heatmapRGBA(val)
      const idx = (py * size + px) * 4
      imgData.data[idx] = r
      imgData.data[idx + 1] = g
      imgData.data[idx + 2] = b
      imgData.data[idx + 3] = a
    }
  }
  ctx.putImageData(imgData, 0, 0)
  return canvas.toDataURL()
}

// ─── Component ──────────────────────────────────────────────────
export default function NNPlayground() {
  // --- State ---
  const [datasetKey, setDatasetKey] = useState('circle')
  const [learningRate, setLearningRate] = useState(0.03)
  const [activationName, setActivationName] = useState('relu')
  const [numLayers, setNumLayers] = useState(2)
  const [neuronsPerLayer, setNeuronsPerLayer] = useState(4)
  const [isPlaying, setIsPlaying] = useState(false)
  const [epoch, setEpoch] = useState(0)
  const [lossHistory, setLossHistory] = useState([])
  const [currentLoss, setCurrentLoss] = useState(null)
  const [hoverInfo, setHoverInfo] = useState(null)  // { type:'weight'|'bias', label, value, x, y }

  // Refs
  const networkRef = useRef(null)
  const dataRef = useRef(null)
  const heatmapCanvasRef = useRef(null)
  const lossCanvasRef = useRef(null)
  const svgRef = useRef(null)
  const animFrameRef = useRef(null)
  const isPlayingRef = useRef(false)
  const epochRef = useRef(0)
  const lossHistoryRef = useRef([])
  const miniHeatmapCacheRef = useRef({})
  const [, forceUpdate] = useState(0)

  // --- Build topology from settings ---
  const topology = useMemo(() => {
    const t = [2]
    for (let i = 0; i < numLayers; i++) t.push(neuronsPerLayer)
    t.push(1)
    return t
  }, [numLayers, neuronsPerLayer])

  // --- Initialize network + dataset ---
  const initNetwork = useCallback(() => {
    const nn = new NeuralNetwork(topology, activationName)
    networkRef.current = nn
    miniHeatmapCacheRef.current = {}
    return nn
  }, [topology, activationName])

  const initData = useCallback(() => {
    const gen = datasets[datasetKey]
    if (!gen) return []
    const d = gen.generate(300)
    dataRef.current = d
    return d
  }, [datasetKey])

  // Initialize on mount and when settings change (while not playing)
  useEffect(() => {
    initNetwork()
    initData()
    setEpoch(0)
    epochRef.current = 0
    setLossHistory([])
    lossHistoryRef.current = []
    setCurrentLoss(null)
    setIsPlaying(false)
    isPlayingRef.current = false
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    // Initial render
    setTimeout(() => {
      renderHeatmap()
      renderLossGraph([])
      forceUpdate(c => c + 1)
    }, 0)
  }, [topology, activationName, datasetKey])

  // --- Render heatmap (decision boundary) ---
  const renderHeatmap = useCallback(() => {
    const canvas = heatmapCanvasRef.current
    const nn = networkRef.current
    const data = dataRef.current
    if (!canvas || !nn || !data) return

    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height
    const imgData = ctx.createImageData(w, h)

    // 1단계: 전체 그리드 값 사전 계산
    const vals = new Float32Array(w * h)
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const x = (px / (w - 1)) * 2 - 1
        const y = (py / (h - 1)) * 2 - 1
        vals[py * w + px] = nn.predict([x, y])[0]
      }
    }

    // 2단계: 경계 픽셀 검출 (클래스가 다른 인접 픽셀)
    const edgeMap = new Uint8Array(w * h)
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const cls = vals[py * w + px] >= 0.5
        if (
          (px > 0 && (vals[py * w + px - 1] >= 0.5) !== cls) ||
          (px < w - 1 && (vals[py * w + px + 1] >= 0.5) !== cls) ||
          (py > 0 && (vals[(py - 1) * w + px] >= 0.5) !== cls) ||
          (py < h - 1 && (vals[(py + 1) * w + px] >= 0.5) !== cls)
        ) {
          edgeMap[py * w + px] = 1
        }
      }
    }

    // 3단계: 파스텔 배경 + 경계선 1px dilation (총 ~3px 두께)
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const val = vals[py * w + px]
        let [r, g, b] = heatmapRGBA(val)
        const idx = (py * w + px) * 4

        const nearEdge =
          edgeMap[py * w + px] ||
          (px > 0 && edgeMap[py * w + px - 1]) ||
          (px < w - 1 && edgeMap[py * w + px + 1]) ||
          (py > 0 && edgeMap[(py - 1) * w + px]) ||
          (py < h - 1 && edgeMap[(py + 1) * w + px])

        if (nearEdge) { r = 51; g = 65; b = 85 }  // slate-700

        imgData.data[idx] = r
        imgData.data[idx + 1] = g
        imgData.data[idx + 2] = b
        imgData.data[idx + 3] = 255
      }
    }
    ctx.putImageData(imgData, 0, 0)

    // 3단계: 데이터 포인트 (class 1 = indigo-600, class 0 = pink-600)
    const ptRadius = Math.max(3.5, w / 75)
    for (const pt of data) {
      const px = ((pt.input[0] + 1) / 2) * w
      const py = ((pt.input[1] + 1) / 2) * h
      ctx.beginPath()
      ctx.arc(px, py, ptRadius, 0, Math.PI * 2)
      ctx.fillStyle = pt.target === 1 ? '#4f46e5' : '#db2777'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }, [])

  // --- Render loss graph ---
  const renderLossGraph = useCallback((history) => {
    const canvas = lossCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)

    // Background
    ctx.fillStyle = '#f0f4f8'
    ctx.fillRect(0, 0, w, h)

    // Grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * h
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    if (!history || history.length < 2) return

    const maxLoss = Math.max(...history, 1)
    const minLoss = 0

    // Draw loss line
    ctx.beginPath()
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    for (let i = 0; i < history.length; i++) {
      const x = (i / (history.length - 1)) * w
      const y = h - ((history[i] - minLoss) / (maxLoss - minLoss)) * h
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Gradient fill under line
    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.12)')
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)')
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()
  }, [])

  // --- Refresh mini heatmaps ---
  const refreshMiniHeatmaps = useCallback(() => {
    const nn = networkRef.current
    if (!nn) return
    const cache = {}
    // Skip input layer (0) and output layer
    for (let l = 1; l < nn.topology.length; l++) {
      cache[l] = []
      for (let n = 0; n < nn.topology[l]; n++) {
        cache[l][n] = generateMiniHeatmapDataURL(nn, l, n)
      }
    }
    miniHeatmapCacheRef.current = cache
  }, [])

  // --- Training loop ---
  const trainLoop = useCallback(() => {
    if (!isPlayingRef.current) return
    const nn = networkRef.current
    const data = dataRef.current
    if (!nn || !data || data.length === 0) return

    // Train several epochs per frame for speed
    const epochsPerFrame = 5
    let lastLoss = 0
    for (let i = 0; i < epochsPerFrame; i++) {
      lastLoss = nn.trainEpoch(data, learningRate)
      epochRef.current += 1
      lossHistoryRef.current.push(lastLoss)
      // Keep max 500 entries
      if (lossHistoryRef.current.length > 500) {
        lossHistoryRef.current.shift()
      }
    }

    setEpoch(epochRef.current)
    setCurrentLoss(lastLoss)
    setLossHistory([...lossHistoryRef.current])

    // Render visuals
    renderHeatmap()
    renderLossGraph(lossHistoryRef.current)

    // Update mini heatmaps every 10th frame
    if (epochRef.current % 50 === 0) {
      refreshMiniHeatmaps()
    }

    forceUpdate(c => c + 1)
    animFrameRef.current = requestAnimationFrame(trainLoop)
  }, [learningRate, renderHeatmap, renderLossGraph, refreshMiniHeatmaps])

  // --- Play / Pause / Reset ---
  const handlePlay = useCallback(() => {
    if (isPlayingRef.current) {
      isPlayingRef.current = false
      setIsPlaying(false)
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
    } else {
      isPlayingRef.current = true
      setIsPlaying(true)
      animFrameRef.current = requestAnimationFrame(trainLoop)
    }
  }, [trainLoop])

  const handleReset = useCallback(() => {
    isPlayingRef.current = false
    setIsPlaying(false)
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    initNetwork()
    setEpoch(0)
    epochRef.current = 0
    setLossHistory([])
    lossHistoryRef.current = []
    setCurrentLoss(null)
    miniHeatmapCacheRef.current = {}
    setTimeout(() => {
      renderHeatmap()
      renderLossGraph([])
      forceUpdate(c => c + 1)
    }, 0)
  }, [initNetwork, renderHeatmap, renderLossGraph])

  const handleStepOnce = useCallback(() => {
    const nn = networkRef.current
    const data = dataRef.current
    if (!nn || !data || data.length === 0) return

    const loss = nn.trainEpoch(data, learningRate)
    epochRef.current += 1
    lossHistoryRef.current.push(loss)
    if (lossHistoryRef.current.length > 500) lossHistoryRef.current.shift()

    setEpoch(epochRef.current)
    setCurrentLoss(loss)
    setLossHistory([...lossHistoryRef.current])

    renderHeatmap()
    renderLossGraph(lossHistoryRef.current)
    refreshMiniHeatmaps()
    forceUpdate(c => c + 1)
  }, [learningRate, renderHeatmap, renderLossGraph, refreshMiniHeatmaps])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isPlayingRef.current = false
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // --- Compute network node positions for SVG ---
  const networkLayout = useMemo(() => {
    const nn = networkRef.current
    if (!nn) return { layers: [], connections: [] }
    const topo = nn.topology
    const numL = topo.length
    const layerSpacing = NETWORK_WIDTH / (numL + 1)
    const layers = []

    for (let l = 0; l < numL; l++) {
      const count = topo[l]
      const neuronSpacing = Math.min(50, (NETWORK_HEIGHT - 40) / (count + 1))
      const startY = (NETWORK_HEIGHT - (count - 1) * neuronSpacing) / 2
      const x = layerSpacing * (l + 1)
      const neurons = []
      for (let n = 0; n < count; n++) {
        const y = startY + n * neuronSpacing
        neurons.push({ x, y, layer: l, neuron: n })
      }
      layers.push(neurons)
    }

    // Build connections
    const connections = []
    if (nn.weights) {
      for (let l = 0; l < nn.weights.length; l++) {
        for (let j = 0; j < nn.weights[l].length; j++) {
          for (let i = 0; i < nn.weights[l][j].length; i++) {
            const w = nn.weights[l][j][i]
            const from = layers[l][i]
            const to = layers[l + 1][j]
            if (from && to) {
              connections.push({
                x1: from.x, y1: from.y,
                x2: to.x, y2: to.y,
                weight: w
              })
            }
          }
        }
      }
    }

    return { layers, connections }
  }, [epoch, topology, networkRef.current]) // re-compute when epoch changes to reflect weight updates

  // --- Render network SVG ---
  const renderNetworkSVG = () => {
    const nn = networkRef.current
    if (!nn) return null
    const { layers, connections } = networkLayout
    const miniCache = miniHeatmapCacheRef.current

    return (
      <svg
        ref={svgRef}
        width={NETWORK_WIDTH}
        height={NETWORK_HEIGHT}
        style={{ display: 'block' }}
      >
        {/* Connections */}
        {connections.map((c, i) => (
          <g key={`c-${i}`}>
            <line
              x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
              stroke={weightColor(c.weight)}
              strokeWidth={weightWidth(c.weight)}
            />
            {/* 투명 히트 영역 - 호버 감지용 */}
            <line
              x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
              stroke="transparent"
              strokeWidth={12}
              style={{ cursor: 'crosshair' }}
              onMouseEnter={e => setHoverInfo({
                type: 'weight',
                label: `w = ${c.weight.toFixed(4)}`,
                x: e.clientX + 12,
                y: e.clientY - 30
              })}
              onMouseLeave={() => setHoverInfo(null)}
            />
          </g>
        ))}

        {/* Neurons */}
        {layers.map((layerNeurons, l) =>
          layerNeurons.map((n, ni) => {
            const isInput = l === 0
            const isOutput = l === layers.length - 1
            const hasMini = !isInput && miniCache[l] && miniCache[l][ni]

            // bias 표시용: 입력층은 bias 없음, 은닉/출력층은 biases[l-1][ni]
            const biasVal = (!isInput && nn.biases && nn.biases[l - 1] && nn.biases[l - 1][ni] !== undefined)
              ? nn.biases[l - 1][ni]
              : null

            return (
              <g
                key={`n-${l}-${ni}`}
                style={{ cursor: biasVal !== null ? 'pointer' : 'default' }}
                onMouseEnter={biasVal !== null ? (e => setHoverInfo({
                  type: 'bias',
                  label: `b = ${biasVal.toFixed(4)}`,
                  x: e.clientX + 12,
                  y: e.clientY - 30
                })) : undefined}
                onMouseLeave={biasVal !== null ? (() => setHoverInfo(null)) : undefined}
              >
                {/* Neuron circle background */}
                <circle
                  cx={n.x} cy={n.y}
                  r={NEURON_RADIUS}
                  fill={isInput ? '#eef1f6' : '#f0f4f8'}
                  stroke={
                    isOutput ? '#22c55e' :
                    isInput ? '#3b82f6' :
                    '#cbd5e1'
                  }
                  strokeWidth={isInput || isOutput ? 2 : 1}
                />

                {/* Mini heatmap clipped inside neuron */}
                {hasMini && (
                  <>
                    <defs>
                      <clipPath id={`clip-${l}-${ni}`}>
                        <circle cx={n.x} cy={n.y} r={NEURON_RADIUS - 2} />
                      </clipPath>
                    </defs>
                    <image
                      href={miniCache[l][ni]}
                      x={n.x - NEURON_RADIUS + 2}
                      y={n.y - NEURON_RADIUS + 2}
                      width={(NEURON_RADIUS - 2) * 2}
                      height={(NEURON_RADIUS - 2) * 2}
                      clipPath={`url(#clip-${l}-${ni})`}
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </>
                )}

                {/* Input labels */}
                {isInput && (
                  <text
                    x={n.x} y={n.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#3b82f6"
                    fontSize="11"
                    fontFamily="var(--font-mono)"
                    fontWeight="600"
                  >
                    {ni === 0 ? 'x\u2081' : 'x\u2082'}
                  </text>
                )}

                {/* Output label */}
                {isOutput && (
                  <text
                    x={n.x} y={n.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#22c55e"
                    fontSize="11"
                    fontFamily="var(--font-mono)"
                    fontWeight="600"
                  >
                    y
                  </text>
                )}
              </g>
            )
          })
        )}

        {/* Layer labels at bottom */}
        {layers.map((layerNeurons, l) => {
          const cx = layerNeurons[0]?.x || 0
          const isInput = l === 0
          const isOutput = l === layers.length - 1
          let label = ''
          if (isInput) label = 'Input'
          else if (isOutput) label = 'Output'
          else label = `Hidden ${l}`

          return (
            <text
              key={`label-${l}`}
              x={cx}
              y={NETWORK_HEIGHT - 8}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="10"
              fontFamily="var(--font-sans)"
            >
              {label}
            </text>
          )
        })}
      </svg>
    )
  }

  // ─── Layout styles ────────────────────────────────────────────
  const containerStyle = {
    display: 'flex',
    gap: '16px',
    height: '100%',
    minHeight: 0,
  }

  const leftPanelStyle = {
    width: '220px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'auto',
    paddingRight: '4px',
  }

  const centerPanelStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: 0,
    alignItems: 'center',
  }

  const rightPanelStyle = {
    width: `${HEATMAP_SIZE + 32}px`,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  }

  return (
    <div style={containerStyle}>
      {/* 호버 툴팁 */}
      {hoverInfo && (
        <div className="tooltip" style={{ position: 'fixed', left: hoverInfo.x, top: hoverInfo.y, zIndex: 999 }}>
          {hoverInfo.label}
        </div>
      )}

      {/* ═══ LEFT: Controls ═══ */}
      <div style={leftPanelStyle}>
        {/* Dataset selection */}
        <div className="panel">
          <div className="panel-header">Dataset</div>
          <div className="panel-body">
            <div className="chip-group">
              {DATASET_LIST.map(ds => (
                <button
                  key={ds.key}
                  className={`chip ${datasetKey === ds.key ? 'active' : ''}`}
                  onClick={() => setDatasetKey(ds.key)}
                  title={ds.label}
                >
                  <span style={{ marginRight: 4 }}>{ds.icon}</span>
                  {ds.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Learning Rate */}
        <div className="panel">
          <div className="panel-header">Learning Rate</div>
          <div className="panel-body">
            <div className="chip-group">
              {LR_OPTIONS.map(lr => (
                <button
                  key={lr}
                  className={`chip ${learningRate === lr ? 'active' : ''}`}
                  onClick={() => setLearningRate(lr)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}
                >
                  {lr}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Activation */}
        <div className="panel">
          <div className="panel-header">Activation</div>
          <div className="panel-body">
            <div className="chip-group">
              {ACTIVATIONS.map(act => (
                <button
                  key={act}
                  className={`chip ${activationName === act ? 'active' : ''}`}
                  onClick={() => setActivationName(act)}
                >
                  {ACTIVATION_LABELS[act]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Architecture */}
        <div className="panel">
          <div className="panel-header">Architecture</div>
          <div className="panel-body">
            <div className="control-group">
              <div className="control-label">
                <span>Hidden Layers</span>
                <span className="control-value">{numLayers}</span>
              </div>
              <input
                type="range"
                min={1} max={6} step={1}
                value={numLayers}
                onChange={e => setNumLayers(Number(e.target.value))}
              />
            </div>
            <div className="control-group" style={{ marginBottom: 0 }}>
              <div className="control-label">
                <span>Neurons / Layer</span>
                <span className="control-value">{neuronsPerLayer}</span>
              </div>
              <input
                type="range"
                min={1} max={8} step={1}
                value={neuronsPerLayer}
                onChange={e => setNeuronsPerLayer(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Topology preview */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          padding: '4px 0',
        }}>
          Topology: [{topology.join(', ')}]
        </div>
      </div>

      {/* ═══ CENTER: Network + Controls ═══ */}
      <div style={centerPanelStyle}>
        {/* Transport controls + Epoch */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          width: '100%',
          justifyContent: 'center',
        }}>
          <button
            className="btn btn-play btn-icon"
            onClick={handlePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            style={{
              background: isPlaying ? 'var(--accent-yellow)' : 'var(--accent-green)',
            }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            className="btn btn-secondary btn-icon"
            onClick={handleStepOnce}
            title="Step"
            style={{ fontSize: '14px' }}
          >
            {'⏭'}
          </button>
          <button
            className="btn btn-secondary btn-icon"
            onClick={handleReset}
            title="Reset"
            style={{ fontSize: '14px' }}
          >
            {'↺'}
          </button>

          <div style={{ marginLeft: '12px', display: 'flex', gap: '20px' }}>
            <div>
              <div style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '2px',
              }}>
                Epoch
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--accent-blue)',
              }}>
                {epoch.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '2px',
              }}>
                Loss
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '20px',
                fontWeight: 600,
                color: currentLoss !== null && currentLoss < 0.3
                  ? 'var(--accent-green)'
                  : 'var(--accent-orange)',
              }}>
                {currentLoss !== null ? currentLoss.toFixed(4) : '\u2014'}
              </div>
            </div>
          </div>
        </div>

        {/* Network diagram */}
        <div className="panel" style={{
          width: NETWORK_WIDTH + 32,
          flexShrink: 0,
        }}>
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Network</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              textTransform: 'none',
              letterSpacing: 0,
            }}>
              {activationName} | {numLayers} layers | {neuronsPerLayer} neurons
            </span>
          </div>
          <div className="panel-body" style={{ padding: '8px 16px', overflow: 'hidden' }}>
            {renderNetworkSVG()}
          </div>
        </div>

        {/* Loss curve */}
        <div className="panel" style={{ width: NETWORK_WIDTH + 32, flexShrink: 0 }}>
          <div className="panel-header">Loss Curve</div>
          <div className="panel-body" style={{ padding: '8px 16px' }}>
            <div className="canvas-container" style={{
              width: LOSS_GRAPH_WIDTH,
              height: LOSS_GRAPH_HEIGHT,
              margin: '0 auto',
            }}>
              <canvas
                ref={lossCanvasRef}
                width={LOSS_GRAPH_WIDTH}
                height={LOSS_GRAPH_HEIGHT}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                }}
              />
              {/* Y axis labels */}
              <div style={{
                position: 'absolute',
                top: 2,
                left: 4,
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--text-muted)',
              }}>
                {lossHistory.length > 0
                  ? Math.max(...lossHistory, 1).toFixed(1)
                  : '1.0'
                }
              </div>
              <div style={{
                position: 'absolute',
                bottom: 2,
                left: 4,
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--text-muted)',
              }}>
                0
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT: Decision Boundary Heatmap ═══ */}
      <div style={rightPanelStyle}>
        <div className="panel">
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Decision Boundary</span>
            <span style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              textTransform: 'none',
              letterSpacing: 0,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#6366f1', display: 'inline-block',
                }} />
                <span style={{ color: 'var(--text-muted)' }}>Class 1</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#f472b6', display: 'inline-block',
                }} />
                <span style={{ color: 'var(--text-muted)' }}>Class 0</span>
              </span>
            </span>
          </div>
          <div className="panel-body" style={{ padding: '12px 16px' }}>
            <div className="canvas-container" style={{
              width: HEATMAP_SIZE,
              height: HEATMAP_SIZE,
              margin: '0 auto',
            }}>
              <canvas
                ref={heatmapCanvasRef}
                width={GRID_RES}
                height={GRID_RES}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  imageRendering: 'auto',
                }}
              />
              {/* Axis labels */}
              <div style={{
                position: 'absolute',
                bottom: -18,
                left: '50%',
                transform: 'translateX(-50%)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-muted)',
              }}>
                x&#x2081;
              </div>
              <div style={{
                position: 'absolute',
                left: -16,
                top: '50%',
                transform: 'translateY(-50%) rotate(-90deg)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-muted)',
              }}>
                x&#x2082;
              </div>
              {/* Corner labels */}
              <div style={{
                position: 'absolute', top: 2, left: 4,
                fontFamily: 'var(--font-mono)', fontSize: '9px',
                color: 'rgba(0,0,0,0.3)',
              }}>-1</div>
              <div style={{
                position: 'absolute', top: 2, right: 4,
                fontFamily: 'var(--font-mono)', fontSize: '9px',
                color: 'rgba(0,0,0,0.3)',
              }}>1</div>
              <div style={{
                position: 'absolute', bottom: 2, left: 4,
                fontFamily: 'var(--font-mono)', fontSize: '9px',
                color: 'rgba(0,0,0,0.3)',
              }}>-1</div>
              <div style={{
                position: 'absolute', bottom: 2, right: 4,
                fontFamily: 'var(--font-mono)', fontSize: '9px',
                color: 'rgba(0,0,0,0.3)',
              }}>1</div>
            </div>

            {/* Color bar */}
            <div style={{
              marginTop: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: '#6366f1',
              }}>1.0</span>
              <div style={{
                flex: 1,
                height: '8px',
                borderRadius: '4px',
                background: 'linear-gradient(to right, #6366f1, #ffffff, #f472b6)',
              }} />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: '#f472b6',
              }}>0.0</span>
            </div>
            <div style={{
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--text-muted)',
              marginTop: '4px',
            }}>
              Network output P(class=1)
            </div>
          </div>
        </div>

        {/* Data stats */}
        <div className="panel">
          <div className="panel-header">Data Info</div>
          <div className="panel-body" style={{ fontSize: '12px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '2px' }}>
                  Dataset
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {datasets[datasetKey]?.name || datasetKey}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '2px' }}>
                  Samples
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}>
                  {dataRef.current?.length || 0}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '2px' }}>
                  Parameters
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}>
                  {(() => {
                    let count = 0
                    for (let i = 0; i < topology.length - 1; i++) {
                      count += topology[i] * topology[i + 1] + topology[i + 1]
                    }
                    return count
                  })()}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '2px' }}>
                  LR
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: 'var(--accent-blue)',
                }}>
                  {learningRate}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Weight distribution hint */}
        <div className="panel">
          <div className="panel-header">Weight Legend</div>
          <div className="panel-body" style={{ fontSize: '11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{
                width: 30, height: 3, borderRadius: 2,
                background: 'rgba(99, 102, 241, 0.8)',
              }} />
              <span style={{ color: 'var(--text-secondary)' }}>Positive weight</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{
                width: 30, height: 3, borderRadius: 2,
                background: 'rgba(244, 114, 182, 0.8)',
              }} />
              <span style={{ color: 'var(--text-secondary)' }}>Negative weight</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: 30, height: 5, borderRadius: 2,
                background: 'rgba(0, 0, 0, 0.35)',
              }} />
              <span style={{ color: 'var(--text-secondary)' }}>Large magnitude</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
