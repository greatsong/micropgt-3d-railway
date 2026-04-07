/**
 * Dataset generators for neural network playground
 * All datasets return {input: [x, y], target: 0 | 1} in range [-1, 1]
 */

export function generateCircle(n = 200, noise = 0.1) {
  const data = []
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2
    const isInner = Math.random() < 0.5
    const r = isInner
      ? Math.random() * 0.4 + noise * (Math.random() - 0.5)
      : 0.6 + Math.random() * 0.4 + noise * (Math.random() - 0.5)
    const x = Math.cos(angle) * r
    const y = Math.sin(angle) * r
    data.push({ input: [x, y], target: isInner ? 1 : 0 })
  }
  return data
}

export function generateXOR(n = 200, noise = 0.15) {
  const data = []
  for (let i = 0; i < n; i++) {
    const x = Math.random() * 2 - 1 + noise * (Math.random() - 0.5)
    const y = Math.random() * 2 - 1 + noise * (Math.random() - 0.5)
    const target = (x > 0) !== (y > 0) ? 1 : 0
    data.push({ input: [x, y], target })
  }
  return data
}

export function generateGaussian(n = 200, noise = 0.1) {
  const data = []
  const centers = [
    { x: -0.4, y: -0.4, target: 0 },
    { x: 0.4, y: 0.4, target: 1 }
  ]
  for (let i = 0; i < n; i++) {
    const c = centers[i % 2]
    const x = c.x + gaussRandom() * 0.3
    const y = c.y + gaussRandom() * 0.3
    data.push({ input: [clamp(x), clamp(y)], target: c.target })
  }
  return data
}

export function generateSpiral(n = 200, noise = 0.08) {
  const data = []
  const half = Math.floor(n / 2)
  for (let cls = 0; cls < 2; cls++) {
    for (let i = 0; i < half; i++) {
      const r = (i / half) * 0.8 + 0.1
      const t = (i / half) * Math.PI * 2.5 + cls * Math.PI + noise * gaussRandom()
      const x = r * Math.cos(t)
      const y = r * Math.sin(t)
      data.push({ input: [clamp(x), clamp(y)], target: cls })
    }
  }
  return data
}

export function generateMoon(n = 200, noise = 0.12) {
  const data = []
  const half = Math.floor(n / 2)
  for (let i = 0; i < half; i++) {
    const angle = Math.PI * (i / half)
    // Upper moon
    const x1 = Math.cos(angle) * 0.6 + noise * gaussRandom()
    const y1 = Math.sin(angle) * 0.6 + noise * gaussRandom()
    data.push({ input: [clamp(x1), clamp(y1 - 0.1)], target: 0 })
    // Lower moon (shifted)
    const x2 = 0.5 - Math.cos(angle) * 0.6 + noise * gaussRandom()
    const y2 = -Math.sin(angle) * 0.6 + 0.3 + noise * gaussRandom()
    data.push({ input: [clamp(x2), clamp(y2 - 0.1)], target: 1 })
  }
  return data
}

// Logic gate datasets
export function generateLogicGate(gate) {
  const inputs = [[0, 0], [0, 1], [1, 0], [1, 1]]
  const targets = {
    AND: [0, 0, 0, 1],
    OR:  [0, 1, 1, 1],
    XOR: [0, 1, 1, 0],
    NAND: [1, 1, 1, 0],
    NOR: [1, 0, 0, 0]
  }
  return inputs.map((input, i) => ({
    input,
    target: targets[gate][i]
  }))
}

// Helper: Gaussian random (Box-Muller)
function gaussRandom() {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

function clamp(x, min = -1, max = 1) {
  return Math.max(min, Math.min(max, x))
}

// Dataset registry
export const datasets = {
  circle:   { name: 'Circle', generate: generateCircle, icon: '⭕' },
  xor:      { name: 'XOR', generate: generateXOR, icon: '✖' },
  gaussian: { name: 'Gaussian', generate: generateGaussian, icon: '🔵' },
  spiral:   { name: 'Spiral', generate: generateSpiral, icon: '🌀' },
  moon:     { name: 'Moon', generate: generateMoon, icon: '🌙' }
}
