import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { NeuralNetwork } from '../../engine/neuralNetwork'

/* ──────────── 상수 ──────────── */
const TOPOLOGY = [2, 3, 1]          // 2-3-1 네트워크
const ACTIVATION = 'sigmoid'
const LEARNING_RATE = 0.5
const NODE_RADIUS = 32

// 순전파 스텝 목록 생성
// 레이어 0→1: hidden 뉴런 3개 × (가중합 + 활성화) = 6 스텝
// 레이어 1→2: output 뉴런 1개 × (가중합 + 활성화) = 2 스텝
// + 마지막 loss 계산 = 1 스텝
// 총 9 스텝
function buildForwardSteps(topology) {
  const steps = []
  for (let l = 0; l < topology.length - 1; l++) {
    for (let j = 0; j < topology[l + 1]; j++) {
      steps.push({ type: 'weightedSum', layer: l, neuron: j })
      steps.push({ type: 'activation', layer: l, neuron: j })
    }
  }
  steps.push({ type: 'loss' })
  return steps
}

// 역전파 스텝 목록 생성
// output delta → hidden deltas → weight gradients (layer by layer) → weight updates
function buildBackwardSteps(topology) {
  const steps = []
  const numLayers = topology.length - 1
  // 1) output delta
  for (let j = 0; j < topology[numLayers]; j++) {
    steps.push({ type: 'outputDelta', neuron: j })
  }
  // 2) hidden deltas (역방향)
  for (let l = numLayers - 2; l >= 0; l--) {
    for (let j = 0; j < topology[l + 1]; j++) {
      steps.push({ type: 'hiddenDelta', layer: l, neuron: j })
    }
  }
  // 3) weight gradients + updates (각 레이어)
  for (let l = numLayers - 1; l >= 0; l--) {
    steps.push({ type: 'weightGradient', layer: l })
    steps.push({ type: 'weightUpdate', layer: l })
  }
  return steps
}

const FORWARD_STEPS = buildForwardSteps(TOPOLOGY)
const BACKWARD_STEPS = buildBackwardSteps(TOPOLOGY)

/* ──────────── 유틸 ──────────── */
function fmt(v, digits = 4) {
  if (v === undefined || v === null || isNaN(v)) return '?'
  return Number(v).toFixed(digits)
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))))
}

function sigmoidDeriv(x) {
  const s = sigmoid(x)
  return s * (1 - s)
}

function reluDeriv(x) {
  return x > 0 ? 1 : 0
}

/* ──────────── 메인 컴포넌트 ──────────── */
export default function PropagationViz() {
  // 네트워크
  const [activation, setActivation] = useState('sigmoid') // 'sigmoid' | 'relu'
  const [nn, setNn] = useState(() => new NeuralNetwork(TOPOLOGY, 'sigmoid'))
  const nnRef = useRef(nn)
  nnRef.current = nn

  // 입력, 타겟
  const [x1, setX1] = useState(0.5)
  const [x2, setX2] = useState(0.8)
  const [target, setTarget] = useState(1.0)

  // 모드 & 스텝
  const [mode, setMode] = useState('forward') // 'forward' | 'backward'
  const [step, setStep] = useState(-1)        // -1 = 초기 상태
  const [autoPlay, setAutoPlay] = useState(false)
  const [speed, setSpeed] = useState(1000)     // ms per step
  const autoRef = useRef(null)

  // 계산 결과 캐시
  const [forwardResult, setForwardResult] = useState(null)
  const [backwardResult, setBackwardResult] = useState(null)
  const [oldWeights, setOldWeights] = useState(null)
  const [loss, setLoss] = useState(null)

  // SVG 참조
  const svgRef = useRef(null)

  // 순전파/역전파 결과 계산
  const computeResults = useCallback(() => {
    const network = nnRef.current
    const input = [x1, x2]
    const fwd = network.forward(input)
    setForwardResult(fwd)

    // loss (binary cross-entropy)
    const o = fwd.output[0]
    const t = target
    const l = -(t * Math.log(o + 1e-10) + (1 - t) * Math.log(1 - o + 1e-10))
    setLoss(l)

    const bwd = network.backward(input, target)
    setBackwardResult(bwd)
    setOldWeights(JSON.parse(JSON.stringify(network.weights)))
  }, [x1, x2, target])

  // 입력/타겟/네트워크 변경 시 다시 계산
  useEffect(() => {
    computeResults()
  }, [computeResults, nn])

  // 모드 변경 시 리셋
  useEffect(() => {
    setStep(-1)
    setAutoPlay(false)
  }, [mode])

  // 오토 플레이
  useEffect(() => {
    if (autoPlay) {
      const steps = mode === 'forward' ? FORWARD_STEPS : BACKWARD_STEPS
      autoRef.current = setInterval(() => {
        setStep(prev => {
          const next = prev + 1
          if (next >= steps.length) {
            setAutoPlay(false)
            clearInterval(autoRef.current)
            return steps.length - 1
          }
          return next
        })
      }, speed)
    }
    return () => {
      if (autoRef.current) clearInterval(autoRef.current)
    }
  }, [autoPlay, speed, mode])

  // 스텝 진행
  const handleStep = useCallback(() => {
    const steps = mode === 'forward' ? FORWARD_STEPS : BACKWARD_STEPS
    setStep(prev => {
      if (prev >= steps.length - 1) return prev
      return prev + 1
    })
  }, [mode])

  // 리셋
  const handleReset = useCallback(() => {
    setStep(-1)
    setAutoPlay(false)
  }, [])

  // 네트워크 리셋
  const handleNetworkReset = useCallback(() => {
    const newNn = new NeuralNetwork(TOPOLOGY, activation)
    setNn(newNn)
    setStep(-1)
    setAutoPlay(false)
  }, [activation])

  // 활성화 함수 변경 시 네트워크 재생성
  const handleActivationChange = useCallback((act) => {
    setActivation(act)
    const newNn = new NeuralNetwork(TOPOLOGY, act)
    setNn(newNn)
    setStep(-1)
    setAutoPlay(false)
  }, [])

  // 가중치 적용 (역전파 완료 후)
  const handleApplyWeights = useCallback(() => {
    if (!backwardResult) return
    const network = nnRef.current
    network.trainStep([x1, x2], target, LEARNING_RATE)
    setNn(Object.assign(Object.create(Object.getPrototypeOf(network)), network))
    setStep(-1)
    setAutoPlay(false)
  }, [backwardResult, x1, x2, target])

  const steps = mode === 'forward' ? FORWARD_STEPS : BACKWARD_STEPS
  const currentStep = step >= 0 && step < steps.length ? steps[step] : null
  const isComplete = step >= steps.length - 1

  /* ──────────── 네트워크 레이아웃 계산 ──────────── */
  const layout = useMemo(() => {
    const svgW = 900
    const svgH = 520
    const padX = 140
    const padY = 60
    const layerCount = TOPOLOGY.length
    const layerGap = (svgW - padX * 2) / (layerCount - 1)

    const nodes = [] // [layerIdx][neuronIdx] = {x, y}
    for (let l = 0; l < layerCount; l++) {
      const layerNodes = []
      const n = TOPOLOGY[l]
      const totalH = svgH - padY * 2
      const gap = n > 1 ? totalH / (n - 1) : 0
      const startY = n > 1 ? padY : svgH / 2
      for (let j = 0; j < n; j++) {
        layerNodes.push({
          x: padX + l * layerGap,
          y: startY + j * gap,
          layer: l,
          neuron: j
        })
      }
      nodes.push(layerNodes)
    }

    return { svgW, svgH, nodes }
  }, [])

  /* ──────────── 하이라이트 계산 ──────────── */
  const highlights = useMemo(() => {
    if (!currentStep) return { nodes: new Set(), connections: new Set(), type: null }

    const hNodes = new Set()
    const hConns = new Set()

    if (mode === 'forward') {
      const { type, layer, neuron } = currentStep
      if (type === 'weightedSum' || type === 'activation') {
        // 타겟 뉴런
        hNodes.add(`${layer + 1}-${neuron}`)
        if (type === 'weightedSum') {
          // 이전 레이어 → 타겟 연결
          for (let i = 0; i < TOPOLOGY[layer]; i++) {
            hNodes.add(`${layer}-${i}`)
            hConns.add(`${layer}-${i}-${layer + 1}-${neuron}`)
          }
        }
      } else if (type === 'loss') {
        hNodes.add(`${TOPOLOGY.length - 1}-0`)
      }
    } else {
      // backward
      const { type, layer, neuron } = currentStep
      if (type === 'outputDelta') {
        hNodes.add(`${TOPOLOGY.length - 1}-${neuron}`)
      } else if (type === 'hiddenDelta') {
        hNodes.add(`${layer + 1}-${neuron}`)
        // 다음 레이어에서 오는 연결
        for (let j = 0; j < TOPOLOGY[layer + 2]; j++) {
          hNodes.add(`${layer + 2}-${j}`)
          hConns.add(`${layer + 1}-${neuron}-${layer + 2}-${j}`)
        }
      } else if (type === 'weightGradient' || type === 'weightUpdate') {
        // 해당 레이어의 모든 연결
        for (let j = 0; j < TOPOLOGY[layer + 1]; j++) {
          hNodes.add(`${layer + 1}-${j}`)
          for (let i = 0; i < TOPOLOGY[layer]; i++) {
            hNodes.add(`${layer}-${i}`)
            hConns.add(`${layer}-${i}-${layer + 1}-${j}`)
          }
        }
      }
    }

    return { nodes: hNodes, connections: hConns, type: currentStep.type }
  }, [currentStep, mode])

  /* ──────────── 스텝 설명 텍스트 ──────────── */
  const stepDescription = useMemo(() => {
    if (!currentStep) return '시작 버튼을 눌러 시뮬레이션을 시작하세요.'

    if (mode === 'forward') {
      const { type, layer, neuron } = currentStep
      if (type === 'weightedSum') {
        const layerName = layer === 0 ? '은닉' : '출력'
        // 가중합 계산 수식
        if (!forwardResult) return ''
        const prevActs = forwardResult.postActivations[layer]
        const weights = nnRef.current.weights[layer][neuron]
        const bias = nnRef.current.biases[layer][neuron]
        let formula = `z = `
        const terms = []
        for (let i = 0; i < prevActs.length; i++) {
          terms.push(`(${fmt(prevActs[i], 3)} x ${fmt(weights[i], 3)})`)
        }
        formula += terms.join(' + ') + ` + ${fmt(bias, 3)}`
        const z = forwardResult.preActivations[layer + 1][neuron]
        formula += ` = ${fmt(z, 4)}`
        return `${layerName} 뉴런 ${neuron + 1} 가중합: ${formula}`
      }
      if (type === 'activation') {
        const layerName = layer === 0 ? '은닉' : '출력'
        const z = forwardResult?.preActivations[layer + 1]?.[neuron]
        const a = forwardResult?.postActivations[layer + 1]?.[neuron]
        const actName = activation === 'relu' ? 'relu' : 'sigmoid'
        return `${layerName} 뉴런 ${neuron + 1} 활성화: ${actName}(${fmt(z, 4)}) = ${fmt(a, 4)}`
      }
      if (type === 'loss') {
        const o = forwardResult?.output[0]
        return `손실 = -[${fmt(target, 1)} x ln(${fmt(o, 4)}) + ${fmt(1 - target, 1)} x ln(${fmt(1 - o, 4)})] = ${fmt(loss, 4)}`
      }
    } else {
      // backward
      const { type, layer, neuron } = currentStep
      if (type === 'outputDelta') {
        const o = backwardResult?.output[0]
        const d = backwardResult?.deltas[TOPOLOGY.length - 2]?.[neuron]
        return `출력 델타: delta = output - target = ${fmt(o, 4)} - ${fmt(target, 1)} = ${fmt(d, 4)}`
      }
      if (type === 'hiddenDelta') {
        const d = backwardResult?.deltas[layer]?.[neuron]
        const z = backwardResult?.preActivations[layer + 1]?.[neuron]
        const derivName = activation === 'relu' ? "relu'" : "sigmoid'"
        return `은닉 뉴런 ${neuron + 1} 델타: sum(delta_next x w) x ${derivName}(${fmt(z, 3)}) = ${fmt(d, 4)}`
      }
      if (type === 'weightGradient') {
        const layerName = layer === TOPOLOGY.length - 2 ? '출력' : '은닉'
        return `${layerName} 레이어 기울기 계산: dW = delta x input_to_this_layer`
      }
      if (type === 'weightUpdate') {
        const layerName = layer === TOPOLOGY.length - 2 ? '출력' : '은닉'
        return `${layerName} 레이어 가중치 업데이트: W_new = W_old - ${LEARNING_RATE} x dW`
      }
    }
    return ''
  }, [currentStep, mode, forwardResult, backwardResult, loss, target])

  /* ──────────── 뉴런 값 결정 ──────────── */
  const getNodeValue = useCallback((layerIdx, neuronIdx) => {
    if (!forwardResult) return null

    if (mode === 'forward') {
      // 순전파: 현재 스텝까지 진행된 값만 표시
      if (layerIdx === 0) {
        // 입력층은 항상 표시
        return { value: forwardResult.postActivations[0][neuronIdx], label: 'input' }
      }
      // 해당 뉴런의 activation 스텝 인덱스 찾기
      let activationStepIdx = -1
      let sumStepIdx = -1
      for (let s = 0; s < FORWARD_STEPS.length; s++) {
        const st = FORWARD_STEPS[s]
        if (st.layer === layerIdx - 1 && st.neuron === neuronIdx) {
          if (st.type === 'weightedSum') sumStepIdx = s
          if (st.type === 'activation') activationStepIdx = s
        }
      }

      if (step >= activationStepIdx && activationStepIdx >= 0) {
        return { value: forwardResult.postActivations[layerIdx][neuronIdx], label: 'a' }
      }
      if (step >= sumStepIdx && sumStepIdx >= 0) {
        return { value: forwardResult.preActivations[layerIdx][neuronIdx], label: 'z' }
      }
      return null
    } else {
      // 역전파: 항상 순전파 결과 표시 + 델타 표시
      const a = forwardResult.postActivations[layerIdx]?.[neuronIdx]
      if (layerIdx === 0) {
        return { value: a, label: 'input' }
      }

      // 델타 값 찾기
      if (!backwardResult) return { value: a, label: 'a' }

      // 해당 뉴런의 델타 스텝이 지나갔는지 확인
      let deltaStepIdx = -1
      for (let s = 0; s < BACKWARD_STEPS.length; s++) {
        const st = BACKWARD_STEPS[s]
        if (st.type === 'outputDelta' && layerIdx === TOPOLOGY.length - 1 && st.neuron === neuronIdx) {
          deltaStepIdx = s
        }
        if (st.type === 'hiddenDelta' && st.layer === layerIdx - 1 && st.neuron === neuronIdx) {
          deltaStepIdx = s
        }
      }

      const deltaLayerIdx = layerIdx - 1 // deltas 배열 인덱스
      const delta = backwardResult.deltas[deltaLayerIdx]?.[neuronIdx]
      const showDelta = step >= deltaStepIdx && deltaStepIdx >= 0

      return { value: a, label: 'a', delta: showDelta ? delta : null }
    }
  }, [forwardResult, backwardResult, mode, step])

  /* ──────────── 가중치 라벨 결정 ──────────── */
  const getWeightInfo = useCallback((fromLayer, fromNeuron, toLayer, toNeuron) => {
    const wLayerIdx = fromLayer // weights[fromLayer] = 해당 연결의 가중치 배열
    const w = nnRef.current.weights[wLayerIdx]?.[toNeuron]?.[fromNeuron]
    if (w === undefined) return null

    if (mode === 'backward' && backwardResult) {
      const grad = backwardResult.weightGradients[wLayerIdx]?.[toNeuron]?.[fromNeuron]

      // 기울기 스텝 찾기
      let gradStepIdx = -1
      let updateStepIdx = -1
      for (let s = 0; s < BACKWARD_STEPS.length; s++) {
        const st = BACKWARD_STEPS[s]
        if (st.type === 'weightGradient' && st.layer === wLayerIdx) gradStepIdx = s
        if (st.type === 'weightUpdate' && st.layer === wLayerIdx) updateStepIdx = s
      }

      const showGrad = step >= gradStepIdx && gradStepIdx >= 0
      const showUpdate = step >= updateStepIdx && updateStepIdx >= 0

      if (showUpdate && oldWeights) {
        const oldW = oldWeights[wLayerIdx]?.[toNeuron]?.[fromNeuron]
        const newW = oldW - LEARNING_RATE * grad
        return { weight: w, grad: showGrad ? grad : null, oldWeight: oldW, newWeight: newW, showUpdate: true }
      }
      return { weight: w, grad: showGrad ? grad : null, showUpdate: false }
    }

    return { weight: w, grad: null, showUpdate: false }
  }, [mode, backwardResult, oldWeights, step])

  /* ──────────── SVG 렌더링 ──────────── */
  const { svgW, svgH, nodes } = layout

  return (
    <div style={styles.container}>
      {/* 왼쪽 패널: 컨트롤 */}
      <div style={styles.leftPanel}>
        <div className="panel" style={styles.panel}>
          <div className="panel-header">모드 선택</div>
          <div className="panel-body">
            <div className="toggle-group" style={{ width: '100%' }}>
              <button
                className={`toggle-btn ${mode === 'forward' ? 'active' : ''}`}
                onClick={() => setMode('forward')}
                style={{ flex: 1 }}
              >
                순전파 (Forward)
              </button>
              <button
                className={`toggle-btn ${mode === 'backward' ? 'active' : ''}`}
                onClick={() => setMode('backward')}
                style={{ flex: 1 }}
              >
                역전파 (Backward)
              </button>
            </div>
          </div>
        </div>

        {/* 활성화 함수 선택 */}
        <div className="panel" style={styles.panel}>
          <div className="panel-header">활성화 함수</div>
          <div className="panel-body">
            <div className="toggle-group" style={{ width: '100%' }}>
              <button
                className={`toggle-btn ${activation === 'sigmoid' ? 'active' : ''}`}
                onClick={() => handleActivationChange('sigmoid')}
                style={{ flex: 1 }}
              >
                Sigmoid
              </button>
              <button
                className={`toggle-btn ${activation === 'relu' ? 'active' : ''}`}
                onClick={() => handleActivationChange('relu')}
                style={{ flex: 1 }}
              >
                ReLU
              </button>
            </div>
          </div>
        </div>

        <div className="panel" style={styles.panel}>
          <div className="panel-header">입력값</div>
          <div className="panel-body">
            <div className="control-group">
              <div className="control-label">
                <span>x1</span>
                <span className="control-value">{fmt(x1, 2)}</span>
              </div>
              <input
                type="range" min="-1" max="1" step="0.05"
                value={x1}
                onChange={e => { setX1(Number(e.target.value)); setStep(-1); setAutoPlay(false) }}
              />
            </div>
            <div className="control-group">
              <div className="control-label">
                <span>x2</span>
                <span className="control-value">{fmt(x2, 2)}</span>
              </div>
              <input
                type="range" min="-1" max="1" step="0.05"
                value={x2}
                onChange={e => { setX2(Number(e.target.value)); setStep(-1); setAutoPlay(false) }}
              />
            </div>
            <div className="control-group">
              <div className="control-label">
                <span>목표값 (target)</span>
                <span className="control-value">{fmt(target, 1)}</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.1"
                value={target}
                onChange={e => { setTarget(Number(e.target.value)); setStep(-1); setAutoPlay(false) }}
              />
            </div>
          </div>
        </div>

        <div className="panel" style={styles.panel}>
          <div className="panel-header">제어</div>
          <div className="panel-body">
            <div style={styles.controlButtons}>
              <button className="btn btn-primary" onClick={handleStep} disabled={isComplete}>
                다음 스텝
              </button>
              <button
                className={`btn ${autoPlay ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => setAutoPlay(!autoPlay)}
                style={autoPlay ? { background: 'var(--accent-red)', color: '#000' } : {}}
                disabled={isComplete}
              >
                {autoPlay ? '정지' : '자동 재생'}
              </button>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={handleReset} style={{ flex: 1 }}>
                처음으로
              </button>
              <button className="btn btn-secondary" onClick={handleNetworkReset} style={{ flex: 1 }}>
                초기화
              </button>
            </div>
            <div className="control-group" style={{ marginTop: 12 }}>
              <div className="control-label">
                <span>속도</span>
                <span className="control-value">{speed}ms</span>
              </div>
              <input
                type="range" min="200" max="2000" step="100"
                value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="panel" style={styles.panel}>
          <div className="panel-header">정보</div>
          <div className="panel-body">
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>출력값</span>
              <span style={styles.infoValue}>{forwardResult ? fmt(forwardResult.output[0], 4) : '-'}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>목표값</span>
              <span style={styles.infoValue}>{fmt(target, 1)}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>손실 (Loss)</span>
              <span style={{ ...styles.infoValue, color: 'var(--accent-orange)' }}>
                {loss !== null ? fmt(loss, 4) : '-'}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>학습률</span>
              <span style={styles.infoValue}>{LEARNING_RATE}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>스텝</span>
              <span style={styles.infoValue}>{step + 1} / {steps.length}</span>
            </div>
            {mode === 'backward' && isComplete && (
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 12, background: 'var(--accent-green)' }}
                onClick={handleApplyWeights}
              >
                가중치 업데이트 적용
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 오른쪽: 네트워크 다이어그램 */}
      <div style={styles.rightPanel}>
        {/* 스텝 설명 배너 */}
        <div style={{
          ...styles.stepBanner,
          background: mode === 'forward'
            ? 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.04))'
            : 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(249,115,22,0.04))',
          borderColor: mode === 'forward' ? 'rgba(59,130,246,0.3)' : 'rgba(249,115,22,0.3)'
        }}>
          <div style={styles.stepBannerIcon}>
            {mode === 'forward' ? '→' : '←'}
          </div>
          <div style={styles.stepBannerText}>{stepDescription}</div>
        </div>

        {/* SVG 네트워크 다이어그램 */}
        <div className="canvas-container" style={styles.svgContainer}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${svgW} ${svgH}`}
            style={{ width: '100%', height: '100%' }}
          >
            <defs>
              {/* 순전파 화살표 그라디언트 */}
              <linearGradient id="fwdGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
              </linearGradient>
              {/* 역전파 화살표 그라디언트 */}
              <linearGradient id="bwdGrad" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="1" />
              </linearGradient>
              {/* 글로우 필터 */}
              <filter id="glowBlue" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feFlood floodColor="#3b82f6" floodOpacity="0.6" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glowOrange" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feFlood floodColor="#f97316" floodOpacity="0.6" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feFlood floodColor="#22c55e" floodOpacity="0.6" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* 화살표 마커 */}
              <marker id="arrowFwd" viewBox="0 0 10 10" refX="8" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
              </marker>
              <marker id="arrowBwd" viewBox="0 0 10 10" refX="8" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#f97316" />
              </marker>
            </defs>

            {/* 레이어 라벨 */}
            {['입력층', '은닉층', '출력층'].map((label, idx) => (
              <text
                key={label}
                x={nodes[idx][0].x}
                y={28}
                textAnchor="middle"
                fill="var(--text-muted)"
                fontSize="13"
                fontFamily="var(--font-sans)"
                fontWeight="600"
              >
                {label}
              </text>
            ))}

            {/* 연결선 */}
            {nodes.slice(0, -1).map((layerNodes, l) =>
              layerNodes.map((from, i) =>
                nodes[l + 1].map((to, j) => {
                  const connKey = `${l}-${i}-${l + 1}-${j}`
                  const isHighlighted = highlights.connections.has(connKey)
                  const wInfo = getWeightInfo(l, i, l + 1, j)

                  // 연결선 - 노드 가장자리에서 시작/종료
                  const nodeR = NODE_RADIUS
                  const dx = to.x - from.x
                  const dy = to.y - from.y
                  const dist = Math.sqrt(dx * dx + dy * dy)
                  const nx = dx / dist
                  const ny = dy / dist
                  const x1Start = from.x + nx * nodeR
                  const y1Start = from.y + ny * nodeR
                  const x2End = to.x - nx * nodeR
                  const y2End = to.y - ny * nodeR

                  // 가중치에 따른 두께
                  const absW = wInfo ? Math.abs(wInfo.weight) : 0
                  const strokeWidth = Math.max(1, Math.min(5, absW * 3))

                  // 색상 결정
                  let strokeColor = 'var(--border)'
                  let opacity = 0.4
                  if (isHighlighted) {
                    strokeColor = mode === 'forward' ? '#3b82f6' : '#f97316'
                    opacity = 1
                  } else if (wInfo && step >= 0) {
                    strokeColor = wInfo.weight >= 0 ? 'rgba(59,130,246,0.5)' : 'rgba(249,115,22,0.5)'
                    opacity = 0.6
                  }

                  // 라벨 위치 (선 중간)
                  const mx = (x1Start + x2End) / 2
                  const my = (y1Start + y2End) / 2
                  // 라벨을 선에서 약간 오프셋
                  const perpX = -ny * 14
                  const perpY = nx * 14

                  return (
                    <g key={connKey}>
                      <line
                        x1={x1Start} y1={y1Start}
                        x2={x2End} y2={y2End}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        opacity={opacity}
                        strokeLinecap="round"
                        style={{ transition: 'all 0.4s ease' }}
                      />
                      {/* 가중치 라벨 */}
                      {wInfo && (
                        <g>
                          {/* 배경 */}
                          <rect
                            x={mx + perpX - 30}
                            y={my + perpY - 9}
                            width={60}
                            height={18}
                            rx={4}
                            fill="rgba(255,255,255,0.95)"
                            stroke={isHighlighted
                              ? (mode === 'forward' ? 'rgba(59,130,246,0.4)' : 'rgba(249,115,22,0.4)')
                              : 'transparent'}
                            strokeWidth={1}
                          />
                          {/* 가중치 값 */}
                          <text
                            x={mx + perpX}
                            y={my + perpY + 4}
                            textAnchor="middle"
                            fontSize="11"
                            fontFamily="var(--font-mono)"
                            fill={
                              wInfo.showUpdate
                                ? 'var(--accent-green)'
                                : wInfo.grad !== null
                                  ? 'var(--accent-orange)'
                                  : isHighlighted
                                    ? 'var(--text-primary)'
                                    : 'var(--text-secondary)'
                            }
                            style={{ transition: 'fill 0.3s' }}
                          >
                            {wInfo.showUpdate
                              ? fmt(wInfo.newWeight, 3)
                              : wInfo.grad !== null
                                ? `${fmt(wInfo.weight, 3)} (g:${fmt(wInfo.grad, 2)})`
                                : fmt(wInfo.weight, 3)
                            }
                          </text>
                        </g>
                      )}
                      {/* 하이라이트 시 흐름 화살표 */}
                      {isHighlighted && mode === 'forward' && (
                        <line
                          x1={x1Start} y1={y1Start}
                          x2={x2End} y2={y2End}
                          stroke="url(#fwdGrad)"
                          strokeWidth={2}
                          markerEnd="url(#arrowFwd)"
                          opacity={0.8}
                        >
                          <animate
                            attributeName="stroke-dashoffset"
                            from={dist} to="0"
                            dur="1s"
                            repeatCount="indefinite"
                          />
                        </line>
                      )}
                      {isHighlighted && mode === 'backward' && (
                        <line
                          x1={x2End} y1={y2End}
                          x2={x1Start} y2={y1Start}
                          stroke="url(#bwdGrad)"
                          strokeWidth={2}
                          markerEnd="url(#arrowBwd)"
                          opacity={0.8}
                        >
                          <animate
                            attributeName="stroke-dashoffset"
                            from={dist} to="0"
                            dur="1s"
                            repeatCount="indefinite"
                          />
                        </line>
                      )}
                    </g>
                  )
                })
              )
            )}

            {/* 뉴런 노드 */}
            {nodes.map((layerNodes, l) =>
              layerNodes.map((node, j) => {
                const nodeKey = `${l}-${j}`
                const isHighlighted = highlights.nodes.has(nodeKey)
                const nodeVal = getNodeValue(l, j)
                const nodeR = NODE_RADIUS

                let glowFilter = 'none'
                if (isHighlighted) {
                  if (mode === 'forward') glowFilter = 'url(#glowBlue)'
                  else glowFilter = 'url(#glowOrange)'
                  // 가중치 업데이트 시 녹색 글로우
                  if (currentStep?.type === 'weightUpdate') glowFilter = 'url(#glowGreen)'
                }

                // 노드 색상
                let fillColor = 'var(--bg-card)'
                let strokeColor = 'var(--border)'
                if (isHighlighted) {
                  fillColor = mode === 'forward'
                    ? 'rgba(59,130,246,0.15)'
                    : 'rgba(249,115,22,0.15)'
                  strokeColor = mode === 'forward' ? '#3b82f6' : '#f97316'
                  if (currentStep?.type === 'weightUpdate') {
                    fillColor = 'rgba(34,197,94,0.15)'
                    strokeColor = '#22c55e'
                  }
                }

                return (
                  <g key={nodeKey} filter={glowFilter} style={{ transition: 'filter 0.3s' }}>
                    {/* 노드 원 */}
                    <circle
                      cx={node.x} cy={node.y} r={nodeR}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isHighlighted ? 2.5 : 1.5}
                      style={{ transition: 'all 0.3s ease' }}
                    />
                    {/* 뉴런 인덱스 작게 */}
                    <text
                      x={node.x} y={node.y - 14}
                      textAnchor="middle"
                      fontSize="10"
                      fill="var(--text-muted)"
                      fontFamily="var(--font-sans)"
                    >
                      {l === 0 ? ['x1', 'x2'][j] : l === TOPOLOGY.length - 1 ? 'y' : `h${j + 1}`}
                    </text>
                    {/* 값 */}
                    {nodeVal && (
                      <text
                        x={node.x} y={node.y + 4}
                        textAnchor="middle"
                        fontSize="14"
                        fontWeight="600"
                        fontFamily="var(--font-mono)"
                        fill="var(--text-primary)"
                        style={{ transition: 'all 0.3s' }}
                      >
                        {fmt(nodeVal.value, 3)}
                      </text>
                    )}
                    {/* 라벨 (z 또는 a) */}
                    {nodeVal && nodeVal.label !== 'input' && (
                      <text
                        x={node.x} y={node.y + 18}
                        textAnchor="middle"
                        fontSize="10"
                        fill="var(--text-muted)"
                        fontFamily="var(--font-mono)"
                      >
                        {nodeVal.label === 'z' ? '(z)' : '(a)'}
                      </text>
                    )}
                    {/* 델타 값 (역전파) */}
                    {nodeVal?.delta !== null && nodeVal?.delta !== undefined && (
                      <g>
                        <rect
                          x={node.x + nodeR + 4}
                          y={node.y - 12}
                          width={72}
                          height={24}
                          rx={6}
                          fill="rgba(249,115,22,0.15)"
                          stroke="rgba(249,115,22,0.4)"
                          strokeWidth={1}
                        />
                        <text
                          x={node.x + nodeR + 40}
                          y={node.y + 4}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="600"
                          fontFamily="var(--font-mono)"
                          fill="var(--accent-orange)"
                        >
                          {'d:' + fmt(nodeVal.delta, 4)}
                        </text>
                      </g>
                    )}
                  </g>
                )
              })
            )}

            {/* 바이어스 라벨 */}
            {nodes.slice(1).map((layerNodes, lIdx) =>
              layerNodes.map((node, j) => {
                const bias = nnRef.current.biases[lIdx]?.[j]
                if (bias === undefined) return null
                return (
                  <g key={`bias-${lIdx}-${j}`}>
                    <text
                      x={node.x}
                      y={node.y + NODE_RADIUS + 18}
                      textAnchor="middle"
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                      fill="var(--text-muted)"
                    >
                      b={fmt(bias, 3)}
                    </text>
                  </g>
                )
              })
            )}

            {/* 타겟 & 손실 표시 (출력 노드 옆) */}
            {forwardResult && (
              <g>
                {/* 타겟 값 */}
                <rect
                  x={nodes[TOPOLOGY.length - 1][0].x + 50}
                  y={nodes[TOPOLOGY.length - 1][0].y - 50}
                  width={110}
                  height={68}
                  rx={8}
                  fill="rgba(255,255,255,0.95)"
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                <text
                  x={nodes[TOPOLOGY.length - 1][0].x + 105}
                  y={nodes[TOPOLOGY.length - 1][0].y - 30}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--text-muted)"
                  fontFamily="var(--font-sans)"
                >
                  target
                </text>
                <text
                  x={nodes[TOPOLOGY.length - 1][0].x + 105}
                  y={nodes[TOPOLOGY.length - 1][0].y - 12}
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                  fill="var(--accent-green)"
                >
                  {fmt(target, 1)}
                </text>
                <text
                  x={nodes[TOPOLOGY.length - 1][0].x + 105}
                  y={nodes[TOPOLOGY.length - 1][0].y + 8}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="var(--font-mono)"
                  fill="var(--accent-orange)"
                >
                  Loss: {loss !== null ? fmt(loss, 3) : '-'}
                </text>
              </g>
            )}

            {/* 순전파/역전파 방향 표시 화살표 */}
            {step >= 0 && (
              <g opacity={0.4}>
                {mode === 'forward' ? (
                  <>
                    <line x1={60} y1={svgH - 20} x2={svgW - 60} y2={svgH - 20}
                      stroke="#3b82f6" strokeWidth={2} markerEnd="url(#arrowFwd)" />
                    <text x={svgW / 2} y={svgH - 6} textAnchor="middle"
                      fontSize="11" fill="#3b82f6" fontFamily="var(--font-sans)" fontWeight="500">
                      Forward Pass
                    </text>
                  </>
                ) : (
                  <>
                    <line x1={svgW - 60} y1={svgH - 20} x2={60} y2={svgH - 20}
                      stroke="#f97316" strokeWidth={2} markerEnd="url(#arrowBwd)" />
                    <text x={svgW / 2} y={svgH - 6} textAnchor="middle"
                      fontSize="11" fill="#f97316" fontFamily="var(--font-sans)" fontWeight="500">
                      Backward Pass
                    </text>
                  </>
                )}
              </g>
            )}
          </svg>
        </div>

        {/* 하단: 수식 / 계산 과정 패널 */}
        <div style={styles.formulaPanel}>
          <FormulaDisplay
            step={currentStep}
            mode={mode}
            forwardResult={forwardResult}
            backwardResult={backwardResult}
            nn={nnRef.current}
            x1={x1} x2={x2}
            target={target}
            loss={loss}
            oldWeights={oldWeights}
            learningRate={LEARNING_RATE}
            stepIndex={step}
            totalSteps={steps.length}
            activation={activation}
          />
        </div>
      </div>
    </div>
  )
}

/* ──────────── 수식 표시 서브 컴포넌트 ──────────── */
function FormulaDisplay({
  step: currentStep, mode, forwardResult, backwardResult,
  nn, x1, x2, target, loss, oldWeights, learningRate, stepIndex, totalSteps, activation
}) {
  if (!currentStep) {
    return (
      <div style={formulaStyles.empty}>
        <div style={formulaStyles.emptyTitle}>
          {mode === 'forward' ? '순전파 시뮬레이션' : '역전파 시뮬레이션'}
        </div>
        <div style={formulaStyles.emptyDesc}>
          "다음 스텝" 또는 "자동 재생" 버튼을 눌러 시작하세요.
          <br />
          각 스텝에서 실제 계산 과정을 확인할 수 있습니다.
        </div>
      </div>
    )
  }

  if (mode === 'forward') {
    const { type, layer, neuron } = currentStep
    if (type === 'weightedSum' && forwardResult) {
      const prevActs = forwardResult.postActivations[layer]
      const weights = nn.weights[layer][neuron]
      const bias = nn.biases[layer][neuron]
      const z = forwardResult.preActivations[layer + 1][neuron]
      const layerName = layer === 0 ? '은닉' : '출력'

      return (
        <div style={formulaStyles.box}>
          <div style={formulaStyles.title}>
            {layerName} 뉴런 {neuron + 1} - 가중합 (Weighted Sum)
          </div>
          <div style={formulaStyles.formula}>
            <span style={formulaStyles.var}>z</span> = {prevActs.map((a, i) => (
              <span key={i}>
                {i > 0 && <span style={formulaStyles.op}> + </span>}
                <span style={formulaStyles.num}>{fmt(a, 3)}</span>
                <span style={formulaStyles.op}> x </span>
                <span style={formulaStyles.weight}>{fmt(weights[i], 3)}</span>
              </span>
            ))}
            <span style={formulaStyles.op}> + </span>
            <span style={formulaStyles.bias}>{fmt(bias, 3)}</span>
            <span style={formulaStyles.op}> = </span>
            <span style={formulaStyles.result}>{fmt(z, 4)}</span>
          </div>
        </div>
      )
    }

    if (type === 'activation' && forwardResult) {
      const z = forwardResult.preActivations[layer + 1][neuron]
      const a = forwardResult.postActivations[layer + 1][neuron]
      const layerName = layer === 0 ? '은닉' : '출력'
      const isRelu = activation === 'relu'

      return (
        <div style={formulaStyles.box}>
          <div style={formulaStyles.title}>
            {layerName} 뉴런 {neuron + 1} - {isRelu ? 'ReLU' : 'Sigmoid'} 활성화
          </div>
          <div style={formulaStyles.formula}>
            <span style={formulaStyles.var}>a</span>
            {isRelu ? (
              <>
                <span style={formulaStyles.op}> = relu(</span>
                <span style={formulaStyles.num}>{fmt(z, 4)}</span>
                <span style={formulaStyles.op}>) = max(0, </span>
                <span style={formulaStyles.num}>{fmt(z, 4)}</span>
                <span style={formulaStyles.op}>) = </span>
                <span style={formulaStyles.result}>{fmt(a, 4)}</span>
              </>
            ) : (
              <>
                <span style={formulaStyles.op}> = sigmoid(</span>
                <span style={formulaStyles.num}>{fmt(z, 4)}</span>
                <span style={formulaStyles.op}>) = </span>
                <span style={formulaStyles.op}>1 / (1 + e</span>
                <sup style={formulaStyles.op}>-{fmt(z, 3)}</sup>
                <span style={formulaStyles.op}>) = </span>
                <span style={formulaStyles.result}>{fmt(a, 4)}</span>
              </>
            )}
          </div>
        </div>
      )
    }

    if (type === 'loss' && forwardResult) {
      const o = forwardResult.output[0]
      return (
        <div style={formulaStyles.box}>
          <div style={{ ...formulaStyles.title, color: 'var(--accent-orange)' }}>
            손실 함수 (Binary Cross-Entropy)
          </div>
          <div style={formulaStyles.formula}>
            <span style={formulaStyles.var}>L</span>
            <span style={formulaStyles.op}> = -[</span>
            <span style={formulaStyles.num}>{fmt(target, 1)}</span>
            <span style={formulaStyles.op}> x ln(</span>
            <span style={formulaStyles.num}>{fmt(o, 4)}</span>
            <span style={formulaStyles.op}>) + </span>
            <span style={formulaStyles.num}>{fmt(1 - target, 1)}</span>
            <span style={formulaStyles.op}> x ln(</span>
            <span style={formulaStyles.num}>{fmt(1 - o, 4)}</span>
            <span style={formulaStyles.op}>)] = </span>
            <span style={{ ...formulaStyles.result, color: 'var(--accent-orange)' }}>
              {fmt(loss, 4)}
            </span>
          </div>
        </div>
      )
    }
  }

  if (mode === 'backward') {
    const { type, layer, neuron } = currentStep

    if (type === 'outputDelta' && backwardResult) {
      const o = backwardResult.output[0]
      const d = backwardResult.deltas[TOPOLOGY.length - 2][neuron]
      return (
        <div style={formulaStyles.box}>
          <div style={{ ...formulaStyles.title, color: 'var(--accent-orange)' }}>
            출력 뉴런 - 델타 (오차 신호)
          </div>
          <div style={formulaStyles.formula}>
            <span style={formulaStyles.var}>delta</span>
            <span style={formulaStyles.op}> = output - target = </span>
            <span style={formulaStyles.num}>{fmt(o, 4)}</span>
            <span style={formulaStyles.op}> - </span>
            <span style={formulaStyles.num}>{fmt(target, 1)}</span>
            <span style={formulaStyles.op}> = </span>
            <span style={{ ...formulaStyles.result, color: 'var(--accent-orange)' }}>
              {fmt(d, 4)}
            </span>
          </div>
          <div style={formulaStyles.note}>
            Cross-Entropy + Sigmoid에서 출력 델타는 단순히 (출력 - 목표)입니다.
          </div>
        </div>
      )
    }

    if (type === 'hiddenDelta' && backwardResult) {
      const d = backwardResult.deltas[layer][neuron]
      const z = backwardResult.preActivations[layer + 1][neuron]
      const isRelu = activation === 'relu'
      const derivVal = isRelu ? reluDeriv(z) : sigmoidDeriv(z)
      const derivName = isRelu ? "relu'" : "sigmoid'"
      const derivNote = isRelu
        ? `relu'(${fmt(z, 3)}) = ${derivVal} (z > 0이면 1, 아니면 0)`
        : `sigmoid'(${fmt(z, 3)}) = ${fmt(derivVal, 4)} | Chain Rule: 오차를 거꾸로 전파합니다.`

      // 다음 레이어에서 오는 delta * weight 합
      const nextLayerIdx = layer + 1
      let sumParts = []
      for (let k = 0; k < TOPOLOGY[nextLayerIdx + 1]; k++) {
        const nextDelta = backwardResult.deltas[nextLayerIdx]?.[k]
        const w = nn.weights[nextLayerIdx]?.[k]?.[neuron]
        if (nextDelta !== undefined && w !== undefined) {
          sumParts.push({ delta: nextDelta, weight: w })
        }
      }

      return (
        <div style={formulaStyles.box}>
          <div style={{ ...formulaStyles.title, color: 'var(--accent-orange)' }}>
            은닉 뉴런 {neuron + 1} - 델타 (Chain Rule)
          </div>
          <div style={formulaStyles.formula}>
            <span style={formulaStyles.var}>delta</span>
            <span style={formulaStyles.op}> = (</span>
            {sumParts.map((p, i) => (
              <span key={i}>
                {i > 0 && <span style={formulaStyles.op}> + </span>}
                <span style={formulaStyles.num}>{fmt(p.delta, 3)}</span>
                <span style={formulaStyles.op}> x </span>
                <span style={formulaStyles.weight}>{fmt(p.weight, 3)}</span>
              </span>
            ))}
            <span style={formulaStyles.op}>) x {derivName}(</span>
            <span style={formulaStyles.num}>{fmt(z, 3)}</span>
            <span style={formulaStyles.op}>) = </span>
            <span style={{ ...formulaStyles.result, color: 'var(--accent-orange)' }}>
              {fmt(d, 4)}
            </span>
          </div>
          <div style={formulaStyles.note}>{derivNote}</div>
        </div>
      )
    }

    if (type === 'weightGradient' && backwardResult) {
      const layerName = layer === TOPOLOGY.length - 2 ? '출력' : '은닉'
      // 해당 레이어의 모든 기울기 표시
      const grads = backwardResult.weightGradients[layer]
      return (
        <div style={formulaStyles.box}>
          <div style={{ ...formulaStyles.title, color: 'var(--accent-yellow)' }}>
            {layerName} 레이어 - 가중치 기울기 (dW = delta x input)
          </div>
          <div style={formulaStyles.gradGrid}>
            {grads.map((neuronGrads, j) => (
              <div key={j} style={formulaStyles.gradRow}>
                <span style={formulaStyles.gradLabel}>뉴런 {j + 1}:</span>
                {neuronGrads.map((g, i) => (
                  <span key={i} style={formulaStyles.gradItem}>
                    dW[{i}]={fmt(g, 4)}
                  </span>
                ))}
                <span style={formulaStyles.gradItem}>
                  db={fmt(backwardResult.biasGradients[layer][j], 4)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (type === 'weightUpdate' && backwardResult && oldWeights) {
      const layerName = layer === TOPOLOGY.length - 2 ? '출력' : '은닉'
      const grads = backwardResult.weightGradients[layer]
      return (
        <div style={formulaStyles.box}>
          <div style={{ ...formulaStyles.title, color: 'var(--accent-green)' }}>
            {layerName} 레이어 - 가중치 업데이트 (W_new = W_old - lr x dW)
          </div>
          <div style={formulaStyles.gradGrid}>
            {grads.map((neuronGrads, j) => (
              <div key={j} style={formulaStyles.gradRow}>
                <span style={formulaStyles.gradLabel}>뉴런 {j + 1}:</span>
                {neuronGrads.map((g, i) => {
                  const oldW = oldWeights[layer]?.[j]?.[i]
                  const newW = oldW - learningRate * g
                  return (
                    <span key={i} style={formulaStyles.updateItem}>
                      <span style={{ color: 'var(--text-muted)' }}>{fmt(oldW, 3)}</span>
                      <span style={{ color: 'var(--accent-red)', margin: '0 4px' }}>→</span>
                      <span style={{ color: 'var(--accent-green)' }}>{fmt(newW, 3)}</span>
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
          <div style={formulaStyles.note}>
            학습률(lr) = {learningRate}
          </div>
        </div>
      )
    }
  }

  // fallback
  return (
    <div style={formulaStyles.empty}>
      <div style={formulaStyles.emptyDesc}>
        스텝 {stepIndex + 1} / {totalSteps}
      </div>
    </div>
  )
}

/* ──────────── 스타일 ──────────── */
const styles = {
  container: {
    display: 'flex',
    gap: 16,
    height: '100%',
    minHeight: 0,
  },
  leftPanel: {
    width: 260,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflowY: 'auto',
    paddingBottom: 8,
  },
  panel: {
    flexShrink: 0,
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minWidth: 0,
  },
  stepBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    borderRadius: 'var(--radius)',
    border: '1px solid',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    lineHeight: 1.5,
    flexShrink: 0,
  },
  stepBannerIcon: {
    fontSize: 20,
    fontWeight: 700,
    flexShrink: 0,
  },
  stepBannerText: {
    wordBreak: 'break-word',
  },
  svgContainer: {
    flex: 1,
    minHeight: 300,
  },
  formulaPanel: {
    flexShrink: 0,
    minHeight: 100,
  },
  controlButtons: {
    display: 'flex',
    gap: 8,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
    borderBottom: '1px solid rgba(203,213,225,0.8)',
  },
  infoLabel: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  infoValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--accent-blue)',
  },
}

const formulaStyles = {
  box: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '14px 18px',
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--accent-blue)',
    marginBottom: 10,
    fontFamily: 'var(--font-sans)',
  },
  formula: {
    fontFamily: 'var(--font-mono)',
    fontSize: 14,
    lineHeight: 1.8,
    color: 'var(--text-primary)',
    overflowX: 'auto',
    whiteSpace: 'nowrap',
    padding: '4px 0',
  },
  var: {
    color: 'var(--accent-purple)',
    fontWeight: 700,
    fontSize: 15,
  },
  op: {
    color: 'var(--text-secondary)',
  },
  num: {
    color: 'var(--accent-blue)',
    fontWeight: 600,
  },
  weight: {
    color: 'var(--accent-yellow)',
    fontWeight: 600,
  },
  bias: {
    color: 'var(--accent-purple)',
    fontWeight: 600,
    fontStyle: 'italic',
  },
  result: {
    color: 'var(--accent-green)',
    fontWeight: 700,
    fontSize: 16,
  },
  note: {
    marginTop: 8,
    fontSize: 11,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  empty: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px 18px',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
  },
  gradGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  gradRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
  },
  gradLabel: {
    color: 'var(--text-secondary)',
    fontWeight: 600,
    minWidth: 60,
  },
  gradItem: {
    color: 'var(--accent-orange)',
    fontWeight: 500,
    background: 'rgba(249,115,22,0.1)',
    padding: '2px 8px',
    borderRadius: 4,
  },
  updateItem: {
    display: 'inline-flex',
    alignItems: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    fontWeight: 500,
    background: 'rgba(34,197,94,0.1)',
    padding: '2px 8px',
    borderRadius: 4,
  },
}
