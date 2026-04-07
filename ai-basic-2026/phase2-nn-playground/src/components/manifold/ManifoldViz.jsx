import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Line } from '@react-three/drei'
import * as THREE from 'three'
import { NeuralNetwork } from '../../engine/neuralNetwork'
import { generateXOR, generateSpiral } from '../../engine/datasets'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BLUE = '#3b82f6'
const ORANGE = '#f97316'
const BLUE_VEC = new THREE.Color(BLUE)
const ORANGE_VEC = new THREE.Color(ORANGE)
const TOPOLOGY = [2, 3, 3, 1]
const POINT_SIZE = 0.05
const LEARNING_RATE = 0.05
const BG_3D = '#eef1f8'
const EPOCHS_PER_TICK = 3

/* ------------------------------------------------------------------ */
/*  Dataset helpers                                                    */
/* ------------------------------------------------------------------ */

const datasetGenerators = {
  xor: () => generateXOR(200, 0.15),
  spiral: () => generateSpiral(200, 0.08),
}

/* ------------------------------------------------------------------ */
/*  2D Input Space Canvas (left panel)                                 */
/* ------------------------------------------------------------------ */

function InputCanvas({ data, width, height }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data.length) return
    const ctx = canvas.getContext('2d')
    const w = width
    const h = height
    canvas.width = w * 2
    canvas.height = h * 2
    ctx.scale(2, 2)

    // Background
    ctx.fillStyle = '#f0f4f8'
    ctx.fillRect(0, 0, w, h)

    // Grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * w
      const y = (i / 10) * h
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }

    // Axes
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke()

    // Data points
    for (const { input, target } of data) {
      const px = ((input[0] + 1) / 2) * w
      const py = ((1 - (input[1] + 1) / 2)) * h
      ctx.beginPath()
      ctx.arc(px, py, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = target === 1 ? BLUE : ORANGE
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'
      ctx.lineWidth = 0.5
      ctx.stroke()
    }

    // Axis labels
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.font = '11px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('x\u2081', w / 2, h - 6)
    ctx.save()
    ctx.translate(14, h / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('x\u2082', 0, 0)
    ctx.restore()
  }, [data, width, height])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, borderRadius: 'var(--radius)', display: 'block' }}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  3D Point Cloud (inside react-three-fiber Canvas)                   */
/* ------------------------------------------------------------------ */

function PointCloud({ positions, colors }) {
  const meshRef = useRef()
  const prevPositions = useRef(positions)
  const animatedPositions = useRef(new Float32Array(positions.length))

  // Smooth lerp between old and new positions
  useFrame(() => {
    if (!meshRef.current) return
    const geo = meshRef.current.geometry
    const posAttr = geo.getAttribute('position')
    if (!posAttr) return

    const arr = animatedPositions.current
    const target = positions
    const prev = prevPositions.current

    let needsUpdate = false
    for (let i = 0; i < target.length; i++) {
      const old = arr[i] || prev[i] || 0
      const next = old + (target[i] - old) * 0.12
      if (Math.abs(next - arr[i]) > 0.0001) needsUpdate = true
      arr[i] = next
    }

    if (needsUpdate) {
      posAttr.array.set(arr)
      posAttr.needsUpdate = true
    }
  })

  // When positions array reference changes, store as prev
  useEffect(() => {
    if (positions.length !== prevPositions.current.length) {
      animatedPositions.current = new Float32Array(positions.length)
    }
    prevPositions.current = positions
  }, [positions])

  // Build geometry only once per data length change
  const geometry = useMemo(() => {
    const count = positions.length / 3
    const geo = new THREE.BufferGeometry()
    const posArr = new Float32Array(positions.length)
    posArr.set(positions)
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3))
    return geo
  }, [positions.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update colors when they change
  useEffect(() => {
    if (!meshRef.current) return
    const geo = meshRef.current.geometry
    const colAttr = geo.getAttribute('color')
    if (colAttr) {
      colAttr.array.set(colors)
      colAttr.needsUpdate = true
    }
  }, [colors])

  return (
    <points ref={meshRef} geometry={geometry}>
      <pointsMaterial
        size={POINT_SIZE}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.92}
        depthWrite={false}
      />
    </points>
  )
}

/* ------------------------------------------------------------------ */
/*  Grid + Axes in 3D scene                                            */
/* ------------------------------------------------------------------ */

function SceneHelpers({ layerSize }) {
  const axisLen = 1.2
  return (
    <group>
      {/* Grid on XY plane */}
      <gridHelper args={[2.4, 12, '#d0d5e0', '#d0d5e0']} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]} />

      {/* X axis */}
      <Line
        points={[[0, 0, 0], [axisLen, 0, 0]]}
        color="#ef5350"
        lineWidth={1.5}
        transparent
        opacity={0.5}
      />
      <Text position={[axisLen + 0.08, 0, 0]} fontSize={0.08} color="#ef5350" anchorX="left">
        h1
      </Text>

      {/* Y axis */}
      <Line
        points={[[0, 0, 0], [0, axisLen, 0]]}
        color="#66bb6a"
        lineWidth={1.5}
        transparent
        opacity={0.5}
      />
      <Text position={[0, axisLen + 0.08, 0]} fontSize={0.08} color="#66bb6a" anchorY="bottom">
        h2
      </Text>

      {/* Z axis (only if 3-neuron layer) */}
      {layerSize >= 3 && (
        <>
          <Line
            points={[[0, 0, 0], [0, 0, axisLen]]}
            color="#3b82f6"
            lineWidth={1.5}
            transparent
            opacity={0.5}
          />
          <Text position={[0, 0, axisLen + 0.08]} fontSize={0.08} color="#3b82f6">
            h3
          </Text>
        </>
      )}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Camera auto-fit                                                    */
/* ------------------------------------------------------------------ */

function CameraSetup() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(1.8, 1.4, 1.8)
    camera.lookAt(0, 0, 0)
  }, [camera])
  return null
}

/* ------------------------------------------------------------------ */
/*  3D Scene wrapper                                                   */
/* ------------------------------------------------------------------ */

function Scene3D({ positions, colors, layerSize }) {
  return (
    <Canvas
      camera={{ fov: 50, near: 0.1, far: 100, position: [1.8, 1.4, 1.8] }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: BG_3D, borderRadius: 'var(--radius)' }}
    >
      <color attach="background" args={[BG_3D]} />
      <ambientLight intensity={0.6} />
      <CameraSetup />
      <SceneHelpers layerSize={layerSize} />
      <PointCloud positions={positions} colors={colors} />
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
        minDistance={0.8}
        maxDistance={6}
      />
    </Canvas>
  )
}

/* ------------------------------------------------------------------ */
/*  Main ManifoldViz Component                                         */
/* ------------------------------------------------------------------ */

export default function ManifoldViz() {
  const [datasetKey, setDatasetKey] = useState('xor')
  const [isTraining, setIsTraining] = useState(false)
  const [epoch, setEpoch] = useState(0)
  const [loss, setLoss] = useState(null)
  const [selectedLayer, setSelectedLayer] = useState(1) // 0=input, 1=hidden1, 2=hidden2, 3=output

  const nnRef = useRef(null)
  const dataRef = useRef([])
  const animFrameRef = useRef(null)
  const isTrainingRef = useRef(false)

  // 3D point data
  const [positions, setPositions] = useState(new Float32Array(0))
  const [colors, setColors] = useState(new Float32Array(0))

  /* ---- Initialize network + data ---- */

  const initNetwork = useCallback((dsKey) => {
    const nn = new NeuralNetwork(TOPOLOGY, 'relu')
    nnRef.current = nn
    const data = datasetGenerators[dsKey]()
    dataRef.current = data

    setEpoch(0)
    setLoss(null)
    setIsTraining(false)
    isTrainingRef.current = false

    updatePointCloud(nn, data, selectedLayer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    initNetwork(datasetKey)
    return () => {
      isTrainingRef.current = false
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [datasetKey]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Build positions/colors from network state ---- */

  const updatePointCloud = useCallback((nn, data, layer) => {
    if (!nn || !data.length) return

    const count = data.length
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const layerOutputs = nn.getLayerOutputs(data[i].input)
      const vals = layerOutputs[layer] || layerOutputs[0]
      const t = data[i].target
      const c = t === 1 ? BLUE_VEC : ORANGE_VEC

      // Map outputs to coordinates, normalizing to keep points visible
      pos[i * 3 + 0] = vals[0] !== undefined ? vals[0] : 0
      pos[i * 3 + 1] = vals[1] !== undefined ? vals[1] : 0
      pos[i * 3 + 2] = vals[2] !== undefined ? vals[2] : 0

      col[i * 3 + 0] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }

    setPositions(pos)
    setColors(col)
  }, [])

  /* ---- Update cloud when layer selection changes ---- */

  useEffect(() => {
    if (nnRef.current && dataRef.current.length) {
      updatePointCloud(nnRef.current, dataRef.current, selectedLayer)
    }
  }, [selectedLayer, updatePointCloud])

  /* ---- Training loop ---- */

  const trainLoop = useCallback(() => {
    if (!isTrainingRef.current || !nnRef.current) return

    const nn = nnRef.current
    const data = dataRef.current

    let currentLoss = 0
    for (let e = 0; e < EPOCHS_PER_TICK; e++) {
      currentLoss = nn.trainEpoch(data, LEARNING_RATE)
    }

    setEpoch(prev => prev + EPOCHS_PER_TICK)
    setLoss(currentLoss)
    updatePointCloud(nn, data, selectedLayer)

    animFrameRef.current = requestAnimationFrame(trainLoop)
  }, [selectedLayer, updatePointCloud])

  const toggleTraining = useCallback(() => {
    if (isTrainingRef.current) {
      isTrainingRef.current = false
      setIsTraining(false)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    } else {
      isTrainingRef.current = true
      setIsTraining(true)
      animFrameRef.current = requestAnimationFrame(trainLoop)
    }
  }, [trainLoop])

  const resetNetwork = useCallback(() => {
    isTrainingRef.current = false
    setIsTraining(false)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    initNetwork(datasetKey)
  }, [datasetKey, initNetwork])

  /* ---- Layer info ---- */

  const layerLabels = useMemo(() => {
    return TOPOLOGY.map((size, i) => {
      if (i === 0) return `Input (${size})`
      if (i === TOPOLOGY.length - 1) return `Output (${size})`
      return `Hidden ${i} (${size})`
    })
  }, [])

  const currentLayerSize = TOPOLOGY[selectedLayer] || 2

  /* ---- Panel dimensions ---- */

  const panelWidth = 360
  const canvasSize = panelWidth - 32 // padding

  return (
    <div style={styles.container}>
      {/* ============ Left Panel: 2D Input + Controls ============ */}
      <div style={styles.leftPanel}>
        <div className="panel" style={{ flex: '0 0 auto' }}>
          <div className="panel-header">2D Input Space</div>
          <div className="panel-body">
            <InputCanvas data={dataRef.current} width={canvasSize} height={canvasSize} />
          </div>
        </div>

        {/* Controls */}
        <div className="panel" style={{ flex: '1 1 auto', overflow: 'auto' }}>
          <div className="panel-header">Controls</div>
          <div className="panel-body">

            {/* Dataset selector */}
            <div className="control-group">
              <div className="control-label">Dataset</div>
              <div className="chip-group">
                {Object.entries(datasetGenerators).map(([key]) => (
                  <button
                    key={key}
                    className={`chip ${datasetKey === key ? 'active' : ''}`}
                    onClick={() => {
                      setDatasetKey(key)
                    }}
                  >
                    {key === 'xor' ? 'XOR' : 'Spiral'}
                  </button>
                ))}
              </div>
            </div>

            {/* Layer selector */}
            <div className="control-group">
              <div className="control-label">
                <span>Layer</span>
                <span className="control-value">{layerLabels[selectedLayer]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={TOPOLOGY.length - 1}
                step={1}
                value={selectedLayer}
                onChange={e => setSelectedLayer(Number(e.target.value))}
              />
              <div style={styles.layerTicks}>
                {layerLabels.map((label, i) => (
                  <span
                    key={i}
                    style={{
                      ...styles.layerTick,
                      color: i === selectedLayer ? 'var(--accent-blue)' : 'var(--text-muted)',
                      fontWeight: i === selectedLayer ? 600 : 400,
                    }}
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>

            {/* Topology display */}
            <div className="control-group">
              <div className="control-label">Topology</div>
              <div style={styles.topologyRow}>
                {TOPOLOGY.map((size, i) => (
                  <span key={i} style={styles.topologyItem}>
                    <span style={{
                      ...styles.topologyNode,
                      background: i === selectedLayer ? 'var(--accent-blue)' : 'var(--border)',
                      color: i === selectedLayer ? '#000' : 'var(--text-secondary)',
                    }}>
                      {size}
                    </span>
                    {i < TOPOLOGY.length - 1 && (
                      <span style={styles.topologyArrow}>&rarr;</span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Play / Pause / Reset */}
            <div style={styles.controlRow}>
              <button
                className={`btn ${isTraining ? 'btn-secondary' : 'btn-play'}`}
                style={{ borderRadius: '50%', width: 44, height: 44, fontSize: 20, padding: 0 }}
                onClick={toggleTraining}
              >
                {isTraining ? '\u23F8' : '\u25B6'}
              </button>
              <button className="btn btn-secondary" onClick={resetNetwork}>
                Reset
              </button>
              <div style={styles.statsRow}>
                <div className="stat">
                  <span className="stat-value" style={{ fontSize: 18 }}>{epoch}</span>
                  <span className="stat-label">epoch</span>
                </div>
                {loss !== null && (
                  <div className="stat">
                    <span className="stat-value" style={{ fontSize: 18 }}>{loss.toFixed(4)}</span>
                    <span className="stat-label">loss</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hint */}
            <div style={styles.hint}>
              Drag to orbit, scroll to zoom. Watch how the hidden layer untangles the data.
            </div>
          </div>
        </div>
      </div>

      {/* ============ Right Panel: 3D Transformed Space ============ */}
      <div style={styles.rightPanel}>
        <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>3D Transformed Space</span>
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)', fontSize: 11 }}>
              {layerLabels[selectedLayer]} &mdash; {currentLayerSize === 1 ? '1D' : currentLayerSize === 2 ? '2D in 3D' : '3D'}
            </span>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <Scene3D
              positions={positions}
              colors={colors}
              layerSize={currentLayerSize}
            />

            {/* Legend overlay */}
            <div style={styles.legend}>
              <div style={styles.legendItem}>
                <span style={{ ...styles.legendDot, background: BLUE }} />
                <span>Class 1</span>
              </div>
              <div style={styles.legendItem}>
                <span style={{ ...styles.legendDot, background: ORANGE }} />
                <span>Class 0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Inline styles                                                      */
/* ------------------------------------------------------------------ */

const styles = {
  container: {
    display: 'flex',
    gap: 16,
    height: '100%',
    minHeight: 0,
  },
  leftPanel: {
    width: 360,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflowY: 'auto',
  },
  rightPanel: {
    flex: 1,
    minWidth: 0,
  },
  controlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  statsRow: {
    display: 'flex',
    gap: 16,
    marginLeft: 'auto',
  },
  topologyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  topologyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  topologyNode: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    borderRadius: '50%',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    transition: 'all 0.2s',
  },
  topologyArrow: {
    color: 'var(--text-muted)',
    fontSize: 14,
    margin: '0 2px',
  },
  layerTicks: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 4,
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
  },
  layerTick: {
    transition: 'color 0.2s',
  },
  hint: {
    fontSize: 11,
    color: 'var(--text-muted)',
    lineHeight: 1.5,
    marginTop: 4,
  },
  legend: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    background: 'rgba(255,255,255,0.92)',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 12,
    color: 'rgba(30,41,59,0.8)',
    pointerEvents: 'none',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    display: 'inline-block',
  },
}
