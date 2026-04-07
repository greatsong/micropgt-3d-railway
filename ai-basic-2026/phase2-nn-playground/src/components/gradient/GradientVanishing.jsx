import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { NeuralNetwork, activations } from '../../engine/neuralNetwork'
import { generateXOR } from '../../engine/datasets'

// ── Color helpers ──────────────────────────────────────────────────

function gradientColor(magnitude, maxMag) {
  // blue (near zero) -> green (healthy) -> red (exploding) — light theme
  const ratio = maxMag > 0 ? Math.min(magnitude / maxMag, 1) : 0
  if (ratio < 0.5) {
    // blue -> green
    const t = ratio / 0.5
    const r = Math.round(59 * (1 - t) + 34 * t)
    const g = Math.round(130 * (1 - t) + 197 * t)
    const b = Math.round(246 * (1 - t) + 94 * t)
    return `rgb(${r},${g},${b})`
  } else {
    // green -> red
    const t = (ratio - 0.5) / 0.5
    const r = Math.round(34 * (1 - t) + 239 * t)
    const g = Math.round(197 * (1 - t) + 68 * t)
    const b = Math.round(94 * (1 - t) + 68 * t)
    return `rgb(${r},${g},${b})`
  }
}

function heatmapColor(value, maxVal) {
  const ratio = maxVal > 0 ? Math.min(value / maxVal, 1) : 0
  if (ratio < 0.33) {
    const t = ratio / 0.33
    const r = Math.round(59 + 0 * t)
    const g = Math.round(130 + 0 * t)
    const b = Math.round(246 - 46 * t)
    return `rgb(${r},${g},${b})`
  } else if (ratio < 0.66) {
    const t = (ratio - 0.33) / 0.33
    const r = Math.round(59 - 25 * t)
    const g = Math.round(130 + 67 * t)
    const b = Math.round(200 - 106 * t)
    return `rgb(${r},${g},${b})`
  } else {
    const t = (ratio - 0.66) / 0.34
    const r = Math.round(34 + 205 * t)
    const g = Math.round(197 - 129 * t)
    const b = Math.round(94 - 26 * t)
    return `rgb(${r},${g},${b})`
  }
}

function formatGrad(val) {
  if (val === 0) return '0.000'
  const abs = Math.abs(val)
  if (abs < 0.0001) return val.toExponential(1)
  if (abs < 0.01) return val.toFixed(4)
  if (abs < 1) return val.toFixed(3)
  if (abs < 100) return val.toFixed(2)
  return val.toExponential(1)
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    height: '100%',
    minHeight: 0,
  },

  topRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'stretch',
  },

  controlPanel: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    padding: 16,
    minWidth: 220,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    marginBottom: 2,
  },

  networkVizPanel: {
    flex: 1,
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    padding: 16,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  bottomRow: {
    display: 'flex',
    gap: 12,
    flex: 1,
    minHeight: 0,
  },

  barChartPanel: {
    flex: 1,
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },

  heatmapPanel: {
    flex: 1,
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },

  statsPanel: {
    width: 200,
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    overflowY: 'auto',
    minHeight: 0,
  },

  label: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    fontWeight: 500,
    marginBottom: 4,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  monoValue: {
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-blue)',
    fontSize: 12,
  },

  slider: {
    width: '100%',
  },

  buttonRow: {
    display: 'flex',
    gap: 8,
  },
}

// ── Main Component ─────────────────────────────────────────────────

export default function GradientVanishing() {
  const [layerCount, setLayerCount] = useState(6)
  const [activationName, setActivationName] = useState('sigmoid')
  const [isTraining, setIsTraining] = useState(false)
  const [epoch, setEpoch] = useState(0)
  const [loss, setLoss] = useState(null)
  const [gradientMags, setGradientMags] = useState([])
  const [gradientHistory, setGradientHistory] = useState([])
  const [animatingLayer, setAnimatingLayer] = useState(-1)
  const [data, setData] = useState(() => generateXOR(200, 0.15))
  const [dataType, setDataType] = useState('xor')

  const networkRef = useRef(null)
  const trainingRef = useRef(false)
  const animFrameRef = useRef(null)
  const canvasRef = useRef(null)
  const heatmapCanvasRef = useRef(null)

  // Build topology: 2 inputs -> N hidden layers of 4 neurons -> 1 output
  const buildTopology = useCallback((count) => {
    const topo = [2]
    for (let i = 0; i < count; i++) {
      topo.push(4)
    }
    topo.push(1)
    return topo
  }, [])

  // Initialize / reset network
  const initNetwork = useCallback(() => {
    const topo = buildTopology(layerCount)
    networkRef.current = new NeuralNetwork(topo, activationName)
    setEpoch(0)
    setLoss(null)
    setGradientMags([])
    setGradientHistory([])
    setAnimatingLayer(-1)
  }, [layerCount, activationName, buildTopology])

  useEffect(() => {
    initNetwork()
  }, [initNetwork])

  // Regenerate data
  const regenerateData = useCallback((type) => {
    if (type === 'xor') {
      setData(generateXOR(200, 0.15))
    } else {
      // circle-like data using generateXOR pattern for simplicity
      const circleData = []
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * 2 - 1
        const y = Math.random() * 2 - 1
        const target = (x * x + y * y) < 0.5 ? 1 : 0
        circleData.push({ input: [x, y], target })
      }
      setData(circleData)
    }
  }, [])

  // Backward pass animation: highlight layers from output to input
  const animateBackward = useCallback((mags) => {
    const numLayers = mags.length
    let idx = numLayers - 1

    const step = () => {
      if (idx < 0) {
        setAnimatingLayer(-1)
        return
      }
      setAnimatingLayer(idx)
      idx--
      animFrameRef.current = setTimeout(step, 80)
    }
    step()
  }, [])

  // Single training step (one epoch over all data)
  const trainOneEpoch = useCallback(() => {
    const nn = networkRef.current
    if (!nn) return

    // Run one epoch
    const epochLoss = nn.trainEpoch(data, 0.05)

    // Compute average gradient magnitudes across a few samples
    const sampleCount = Math.min(20, data.length)
    const avgMags = new Array(nn.weights.length).fill(0)

    for (let s = 0; s < sampleCount; s++) {
      const sample = data[s]
      const result = nn.backward(sample.input, sample.target)
      for (let l = 0; l < result.layerGradientMagnitudes.length; l++) {
        avgMags[l] += result.layerGradientMagnitudes[l]
      }
    }

    for (let l = 0; l < avgMags.length; l++) {
      avgMags[l] /= sampleCount
    }

    return { loss: epochLoss, mags: avgMags }
  }, [data])

  // Training loop
  const startTraining = useCallback(() => {
    if (trainingRef.current) return
    trainingRef.current = true
    setIsTraining(true)

    let localEpoch = epoch

    const loop = () => {
      if (!trainingRef.current) return

      const result = trainOneEpoch()
      if (!result) return

      localEpoch++
      setEpoch(localEpoch)
      setLoss(result.loss)
      setGradientMags(result.mags)

      setGradientHistory(prev => {
        const next = [...prev, result.mags]
        if (next.length > 100) next.shift()
        return next
      })

      // Animate backward flow every 5 epochs
      if (localEpoch % 5 === 0) {
        animateBackward(result.mags)
      }

      if (localEpoch < 500 && trainingRef.current) {
        animFrameRef.current = requestAnimationFrame(loop)
      } else {
        trainingRef.current = false
        setIsTraining(false)
      }
    }

    animFrameRef.current = requestAnimationFrame(loop)
  }, [epoch, trainOneEpoch, animateBackward])

  const stopTraining = useCallback(() => {
    trainingRef.current = false
    setIsTraining(false)
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      clearTimeout(animFrameRef.current)
    }
  }, [])

  // Single step
  const stepOnce = useCallback(() => {
    const result = trainOneEpoch()
    if (!result) return
    setEpoch(prev => prev + 1)
    setLoss(result.loss)
    setGradientMags(result.mags)
    setGradientHistory(prev => {
      const next = [...prev, result.mags]
      if (next.length > 100) next.shift()
      return next
    })
    animateBackward(result.mags)
  }, [trainOneEpoch, animateBackward])

  const reset = useCallback(() => {
    stopTraining()
    initNetwork()
    regenerateData(dataType)
  }, [stopTraining, initNetwork, regenerateData, dataType])

  // Cleanup
  useEffect(() => {
    return () => {
      trainingRef.current = false
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        clearTimeout(animFrameRef.current)
      }
    }
  }, [])

  // Max gradient for color normalization
  const maxGrad = useMemo(() => {
    if (gradientMags.length === 0) return 1
    return Math.max(...gradientMags, 0.001)
  }, [gradientMags])

  // Global max for heatmap
  const heatmapMax = useMemo(() => {
    let max = 0.001
    for (const row of gradientHistory) {
      for (const v of row) {
        if (v > max) max = v
      }
    }
    return max
  }, [gradientHistory])

  // Layer labels
  const layerLabels = useMemo(() => {
    const labels = ['Input']
    for (let i = 0; i < layerCount; i++) {
      labels.push(`H${i + 1}`)
    }
    labels.push('Output')
    return labels
  }, [layerCount])

  // Gradient labels (between layers = weight layers)
  const gradLabels = useMemo(() => {
    const labels = []
    for (let i = 0; i < layerCount + 1; i++) {
      labels.push(`W${i + 1}`)
    }
    return labels
  }, [layerCount])

  // ── Draw network chain ────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    const rect = canvas.parentElement.getBoundingClientRect()
    const W = rect.width
    const H = 140
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const totalNodes = layerCount + 2 // input + hidden + output
    const blockW = Math.min(60, (W - 40) / totalNodes - 8)
    const blockH = 50
    const gap = Math.max(8, ((W - 40) - blockW * totalNodes) / (totalNodes - 1))
    const startX = 20
    const centerY = H / 2

    // Draw connection lines between blocks
    for (let i = 0; i < totalNodes - 1; i++) {
      const x1 = startX + i * (blockW + gap) + blockW
      const x2 = startX + (i + 1) * (blockW + gap)
      const midY = centerY

      // Color connection by gradient magnitude
      const gradIdx = i
      const hasGrad = gradIdx < gradientMags.length
      const gradVal = hasGrad ? gradientMags[gradIdx] : 0
      const color = hasGrad ? gradientColor(gradVal, maxGrad) : 'var(--border)'

      ctx.beginPath()
      ctx.moveTo(x1, midY)
      ctx.lineTo(x2, midY)
      ctx.strokeStyle = color
      ctx.lineWidth = hasGrad ? 2 + Math.min(gradVal / maxGrad, 1) * 3 : 1
      ctx.stroke()

      // Animated flow dot
      if (animatingLayer === gradIdx && hasGrad) {
        const flowX = x2 - (x2 - x1) * 0.5
        ctx.beginPath()
        ctx.arc(flowX, midY, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#eab308'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(flowX, midY, 8, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(234,179,8,0.4)'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Weight label
      if (hasGrad) {
        ctx.fillStyle = 'var(--text-muted)'
        ctx.font = '9px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(gradLabels[gradIdx], (x1 + x2) / 2, midY - 12)
      }
    }

    // Draw layer blocks
    for (let i = 0; i < totalNodes; i++) {
      const x = startX + i * (blockW + gap)
      const y = centerY - blockH / 2

      const isInput = i === 0
      const isOutput = i === totalNodes - 1

      // Background: color by gradient magnitude of the outgoing weights
      let bgColor = 'var(--bg-input)'
      if (!isInput && gradientMags.length > 0) {
        const gradIdx = Math.min(i - 1, gradientMags.length - 1)
        bgColor = gradientColor(gradientMags[gradIdx], maxGrad)
      }

      // Glow if animating
      const isAnimating = !isInput && animatingLayer >= 0 && animatingLayer === Math.min(i - 1, gradientMags.length - 1)
      if (isAnimating) {
        ctx.shadowColor = '#eab308'
        ctx.shadowBlur = 12
      }

      // Block
      ctx.beginPath()
      const r = 8
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + blockW - r, y)
      ctx.quadraticCurveTo(x + blockW, y, x + blockW, y + r)
      ctx.lineTo(x + blockW, y + blockH - r)
      ctx.quadraticCurveTo(x + blockW, y + blockH, x + blockW - r, y + blockH)
      ctx.lineTo(x + r, y + blockH)
      ctx.quadraticCurveTo(x, y + blockH, x, y + blockH - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()

      if (isInput) {
        ctx.fillStyle = 'rgba(59,130,246,0.1)'
      } else {
        // Tint by gradient strength
        const alpha = gradientMags.length > 0 ? 0.2 + 0.6 * Math.min(gradientMags[Math.min(i - 1, gradientMags.length - 1)] / maxGrad, 1) : 0.15
        ctx.fillStyle = isOutput ? `rgba(249,115,22,${alpha})` : bgColor
        ctx.globalAlpha = 0.3
      }
      ctx.globalAlpha = 1
      ctx.fillStyle = isInput ? 'rgba(59,130,246,0.1)' : isOutput ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.95)'
      ctx.fill()

      // Border
      ctx.strokeStyle = isAnimating ? '#eab308' : isInput ? 'var(--accent-blue)' : isOutput ? 'var(--accent-orange)' : 'var(--border)'
      ctx.lineWidth = isAnimating ? 2 : 1
      ctx.stroke()

      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0

      // Gradient colored inner bar (side indicator)
      if (!isInput && gradientMags.length > 0) {
        const gradIdx = Math.min(i - 1, gradientMags.length - 1)
        const barH = blockH * Math.min(gradientMags[gradIdx] / maxGrad, 1)
        ctx.fillStyle = gradientColor(gradientMags[gradIdx], maxGrad)
        ctx.globalAlpha = 0.6
        ctx.fillRect(x + 2, y + blockH - barH - 2, 4, barH)
        ctx.globalAlpha = 1
      }

      // Layer label
      ctx.fillStyle = isInput ? 'var(--accent-blue)' : isOutput ? 'var(--accent-orange)' : 'var(--text-primary)'
      ctx.font = 'bold 11px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(layerLabels[i], x + blockW / 2, centerY - 2)

      // Neuron count
      const topo = networkRef.current?.topology
      if (topo) {
        ctx.fillStyle = 'var(--text-muted)'
        ctx.font = '9px Inter, sans-serif'
        ctx.fillText(`n=${topo[i]}`, x + blockW / 2, centerY + 12)
      }

      // Gradient value
      if (!isInput && gradientMags.length > 0) {
        const gradIdx = Math.min(i - 1, gradientMags.length - 1)
        ctx.fillStyle = 'var(--text-secondary)'
        ctx.font = '9px JetBrains Mono, monospace'
        ctx.fillText(formatGrad(gradientMags[gradIdx]), x + blockW / 2, y + blockH + 14)
      }
    }

    // Direction arrow (backward)
    if (gradientMags.length > 0) {
      ctx.fillStyle = 'var(--text-muted)'
      ctx.font = '10px Inter, sans-serif'
      ctx.textAlign = 'center'
      const arrowY = 14
      ctx.fillText('Gradient Flow (Backward)', W / 2, arrowY)

      // Arrow pointing left
      const arrowLeft = startX + blockW + gap / 2
      const arrowRight = startX + (totalNodes - 1) * (blockW + gap) - gap / 2
      ctx.beginPath()
      ctx.moveTo(arrowRight, arrowY + 6)
      ctx.lineTo(arrowLeft + 10, arrowY + 6)
      ctx.lineTo(arrowLeft + 16, arrowY + 2)
      ctx.moveTo(arrowLeft + 10, arrowY + 6)
      ctx.lineTo(arrowLeft + 16, arrowY + 10)
      ctx.strokeStyle = 'var(--text-muted)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }, [gradientMags, maxGrad, layerCount, animatingLayer, layerLabels, gradLabels])

  // ── Draw heatmap ──────────────────────────────────────────

  useEffect(() => {
    const canvas = heatmapCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    const rect = canvas.parentElement.getBoundingClientRect()
    const W = rect.width
    const H = rect.height - 30
    canvas.width = W * dpr
    canvas.height = Math.max(H, 100) * dpr
    canvas.style.width = W + 'px'
    canvas.style.height = Math.max(H, 100) + 'px'
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, Math.max(H, 100))

    if (gradientHistory.length === 0) {
      ctx.fillStyle = 'var(--text-muted)'
      ctx.font = '12px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('훈련을 시작하면 기울기 히트맵이 여기에 표시됩니다', W / 2, Math.max(H, 100) / 2)
      return
    }

    const numLayers = gradientHistory[0].length
    const numSteps = gradientHistory.length
    const marginLeft = 40
    const marginBottom = 20
    const marginTop = 5
    const marginRight = 10
    const plotW = W - marginLeft - marginRight
    const plotH = Math.max(H, 100) - marginBottom - marginTop
    const cellW = plotW / numLayers
    const cellH = Math.min(plotH / numSteps, 8)
    const actualPlotH = cellH * numSteps

    // Draw cells
    for (let step = 0; step < numSteps; step++) {
      for (let layer = 0; layer < numLayers; layer++) {
        const val = gradientHistory[step][layer]
        ctx.fillStyle = heatmapColor(val, heatmapMax)
        ctx.fillRect(
          marginLeft + layer * cellW,
          marginTop + (numSteps - 1 - step) * cellH,
          cellW - 1,
          cellH - (cellH > 2 ? 1 : 0)
        )
      }
    }

    // X-axis labels
    ctx.fillStyle = 'var(--text-muted)'
    ctx.font = '9px Inter, sans-serif'
    ctx.textAlign = 'center'
    for (let l = 0; l < numLayers; l++) {
      ctx.fillText(`W${l + 1}`, marginLeft + l * cellW + cellW / 2, marginTop + actualPlotH + 14)
    }

    // Y-axis labels
    ctx.textAlign = 'right'
    const stepLabel = Math.max(1, epoch)
    ctx.fillText(`${stepLabel}`, marginLeft - 6, marginTop + 8)
    const bottomStep = Math.max(1, epoch - numSteps + 1)
    ctx.fillText(`${bottomStep}`, marginLeft - 6, marginTop + actualPlotH - 2)

    // Axis label
    ctx.save()
    ctx.translate(10, marginTop + actualPlotH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'
    ctx.fillStyle = 'var(--text-muted)'
    ctx.font = '9px Inter, sans-serif'
    ctx.fillText('Epoch', 0, 0)
    ctx.restore()

  }, [gradientHistory, heatmapMax, epoch])

  // ── Render ────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {/* Top Row: Controls + Network Visualization */}
      <div style={styles.topRow}>
        {/* Control Panel */}
        <div style={styles.controlPanel}>
          <div style={styles.sectionTitle}>활성화 함수</div>
          <div className="chip-group">
            {['sigmoid', 'relu', 'tanh'].map(act => (
              <button
                key={act}
                className={`chip ${activationName === act ? 'active' : ''}`}
                onClick={() => {
                  stopTraining()
                  setActivationName(act)
                }}
              >
                {act === 'sigmoid' ? 'Sigmoid' : act === 'relu' ? 'ReLU' : 'Tanh'}
              </button>
            ))}
          </div>

          <div>
            <div style={styles.label}>
              <span>은닉층 수</span>
              <span style={styles.monoValue}>{layerCount}</span>
            </div>
            <input
              type="range"
              min={2}
              max={20}
              value={layerCount}
              onChange={e => {
                stopTraining()
                setLayerCount(Number(e.target.value))
              }}
              style={styles.slider}
            />
          </div>

          <div>
            <div style={styles.sectionTitle}>데이터셋</div>
            <div className="chip-group">
              <button
                className={`chip ${dataType === 'xor' ? 'active' : ''}`}
                onClick={() => {
                  setDataType('xor')
                  regenerateData('xor')
                }}
              >
                XOR
              </button>
              <button
                className={`chip ${dataType === 'circle' ? 'active' : ''}`}
                onClick={() => {
                  setDataType('circle')
                  regenerateData('circle')
                }}
              >
                Circle
              </button>
            </div>
          </div>

          <div style={styles.buttonRow}>
            {!isTraining ? (
              <button className="btn btn-primary" onClick={startTraining}>
                Train
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={stopTraining}>
                Stop
              </button>
            )}
            <button className="btn btn-secondary" onClick={stepOnce} disabled={isTraining}>
              Step
            </button>
            <button className="btn btn-secondary" onClick={reset}>
              Reset
            </button>
          </div>

          {/* Stats in control panel */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={styles.sectionTitle}>학습 상태</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
              <div style={styles.label}>
                <span>Epoch</span>
                <span style={styles.monoValue}>{epoch}</span>
              </div>
              <div style={styles.label}>
                <span>Loss</span>
                <span style={styles.monoValue}>{loss !== null ? loss.toFixed(4) : '--'}</span>
              </div>
              <div style={styles.label}>
                <span>구조</span>
                <span style={{ ...styles.monoValue, fontSize: 10 }}>
                  {networkRef.current ? networkRef.current.topology.join('-') : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Insight box */}
          <div style={{
            background: 'rgba(59,130,246,0.08)',
            borderRadius: 'var(--radius)',
            padding: '10px 12px',
            borderLeft: '3px solid var(--accent-blue)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-blue)', marginBottom: 4 }}>
              {activationName === 'sigmoid' ? 'Sigmoid 특징' : activationName === 'relu' ? 'ReLU 특징' : 'Tanh 특징'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {activationName === 'sigmoid' && (
                <>
                  미분값 범위: (0, 0.25]<br />
                  층이 깊어지면 기울기가<br />
                  급격히 0에 수렴합니다.<br />
                  <span style={{ color: 'var(--accent-red)' }}>기울기 소실 발생!</span>
                </>
              )}
              {activationName === 'relu' && (
                <>
                  미분값: 0 또는 1<br />
                  기울기가 비교적<br />
                  안정적으로 전파됩니다.<br />
                  <span style={{ color: 'var(--accent-green)' }}>깊은 네트워크에 적합</span>
                </>
              )}
              {activationName === 'tanh' && (
                <>
                  미분값 범위: (0, 1]<br />
                  Sigmoid보다 낫지만<br />
                  깊은 층에서 소실 가능.<br />
                  <span style={{ color: 'var(--accent-yellow)' }}>주의 필요</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Network Chain Visualization */}
        <div style={styles.networkVizPanel}>
          <div style={{ ...styles.sectionTitle, marginBottom: 8 }}>네트워크 구조 & 기울기 흐름</div>
          <div style={{ flex: 1, position: 'relative' }}>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Row: Bar Chart + Heatmap + Layer Stats */}
      <div style={styles.bottomRow}>
        {/* Gradient Bar Chart */}
        <div style={styles.barChartPanel}>
          <div style={{ ...styles.sectionTitle, marginBottom: 8 }}>레이어별 기울기 크기</div>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'flex-end',
            gap: Math.max(2, 8 - layerCount * 0.3),
            padding: '0 8px 24px',
            position: 'relative',
            minHeight: 0,
          }}>
            {gradientMags.length === 0 ? (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: 'var(--text-muted)',
                fontSize: 12,
              }}>
                Train 또는 Step을 눌러 기울기를 확인하세요
              </div>
            ) : (
              gradientMags.map((mag, i) => {
                const maxBarH = 120
                const normalizedH = maxGrad > 0 ? Math.max(2, (mag / maxGrad) * maxBarH) : 2
                const color = gradientColor(mag, maxGrad)
                const isActive = animatingLayer === i

                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {/* Gradient value */}
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: Math.max(8, 10 - layerCount * 0.2),
                      color: 'var(--text-secondary)',
                      textAlign: 'center',
                      minHeight: 14,
                    }}>
                      {formatGrad(mag)}
                    </div>

                    {/* Bar */}
                    <div style={{
                      width: '100%',
                      maxWidth: 40,
                      height: normalizedH,
                      background: color,
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease, background 0.3s ease',
                      boxShadow: isActive ? `0 0 12px ${color}` : 'none',
                      opacity: isActive ? 1 : 0.85,
                      position: 'relative',
                    }}>
                      {isActive && (
                        <div style={{
                          position: 'absolute',
                          top: -2,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#eab308',
                          boxShadow: '0 0 8px rgba(234,179,8,0.6)',
                        }} />
                      )}
                    </div>

                    {/* Label */}
                    <div style={{
                      fontSize: Math.max(8, 10 - layerCount * 0.15),
                      color: 'var(--text-muted)',
                      textAlign: 'center',
                    }}>
                      {gradLabels[i]}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Heatmap */}
        <div style={styles.heatmapPanel}>
          <div style={{ ...styles.sectionTitle, marginBottom: 8 }}>기울기 히트맵 (Layer x Epoch)</div>
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            <canvas
              ref={heatmapCanvasRef}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          {/* Color legend */}
          {gradientHistory.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 8,
              fontSize: 9,
              color: 'var(--text-muted)',
            }}>
              <span>0</span>
              <div style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                background: 'linear-gradient(to right, rgb(59,130,246), rgb(34,197,94), rgb(234,179,8), rgb(239,68,68))',
              }} />
              <span>{formatGrad(heatmapMax)}</span>
            </div>
          )}
        </div>

        {/* Layer-by-layer stats */}
        <div style={styles.statsPanel}>
          <div style={styles.sectionTitle}>레이어별 수치</div>
          {gradientMags.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              학습 시작 후 표시
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              overflowY: 'auto',
              flex: 1,
            }}>
              {gradientMags.map((mag, i) => {
                const ratio = maxGrad > 0 ? mag / maxGrad : 0
                const color = gradientColor(mag, maxGrad)
                let status = 'healthy'
                if (mag < 0.001) status = 'vanishing'
                else if (mag > 10) status = 'exploding'

                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      padding: '6px 8px',
                      background: animatingLayer === i ? 'rgba(234,179,8,0.1)' : 'rgba(59,130,246,0.02)',
                      borderRadius: 'var(--radius)',
                      border: animatingLayer === i ? '1px solid rgba(234,179,8,0.3)' : '1px solid transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {gradLabels[i]}
                      </span>
                      <span style={{
                        fontSize: 8,
                        fontWeight: 600,
                        padding: '1px 5px',
                        borderRadius: 3,
                        background: status === 'vanishing'
                          ? 'rgba(59,130,246,0.12)'
                          : status === 'exploding'
                            ? 'rgba(239,68,68,0.12)'
                            : 'rgba(34,197,94,0.12)',
                        color: status === 'vanishing'
                          ? 'var(--accent-blue)'
                          : status === 'exploding'
                            ? 'var(--accent-red)'
                            : 'var(--accent-green)',
                      }}>
                        {status === 'vanishing' ? 'VANISH' : status === 'exploding' ? 'EXPLODE' : 'OK'}
                      </span>
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: color,
                      fontWeight: 500,
                    }}>
                      {formatGrad(mag)}
                    </div>
                    {/* Mini gradient bar */}
                    <div style={{
                      width: '100%',
                      height: 3,
                      background: 'var(--bg-input)',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${Math.min(ratio * 100, 100)}%`,
                        height: '100%',
                        background: color,
                        borderRadius: 2,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>
                )
              })}

              {/* Summary */}
              {gradientMags.length > 1 && (
                <div style={{
                  marginTop: 4,
                  padding: '8px',
                  borderTop: '1px solid var(--border)',
                  fontSize: 10,
                  color: 'var(--text-muted)',
                }}>
                  <div style={{ marginBottom: 4 }}>
                    비율 (첫층/끝층)
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: (() => {
                      const first = gradientMags[0]
                      const last = gradientMags[gradientMags.length - 1]
                      const ratio = last > 0 ? first / last : 0
                      if (ratio > 100 || ratio < 0.01) return 'var(--accent-red)'
                      if (ratio > 10 || ratio < 0.1) return 'var(--accent-yellow)'
                      return 'var(--accent-green)'
                    })(),
                  }}>
                    {(() => {
                      const first = gradientMags[0]
                      const last = gradientMags[gradientMags.length - 1]
                      if (last === 0) return 'Inf'
                      const ratio = first / last
                      if (ratio > 1000) return ratio.toExponential(1) + 'x'
                      if (ratio < 0.001) return ratio.toExponential(1) + 'x'
                      return ratio.toFixed(2) + 'x'
                    })()}
                  </div>
                  <div style={{ marginTop: 4, lineHeight: 1.4 }}>
                    {(() => {
                      const first = gradientMags[0]
                      const last = gradientMags[gradientMags.length - 1]
                      const ratio = last > 0 ? first / last : Infinity
                      if (ratio > 100) return '기울기가 앞쪽 층에서 폭발적으로 증가합니다.'
                      if (ratio < 0.01) return '기울기가 앞쪽 층에서 거의 사라집니다.'
                      if (ratio > 10) return '기울기 차이가 크지만 학습은 가능합니다.'
                      if (ratio < 0.1) return '기울기가 다소 감소하는 경향이 있습니다.'
                      return '기울기가 안정적으로 전파되고 있습니다.'
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
