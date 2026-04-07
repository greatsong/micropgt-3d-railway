/**
 * Pure JS Neural Network Engine
 * Supports: feedforward, backpropagation, gradient recording
 */

// Activation functions
const activations = {
  relu: {
    fn: x => Math.max(0, x),
    derivative: x => x > 0 ? 1 : 0
  },
  sigmoid: {
    fn: x => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x)))),
    derivative: x => {
      const s = 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))))
      return s * (1 - s)
    }
  },
  tanh: {
    fn: x => Math.tanh(x),
    derivative: x => 1 - Math.tanh(x) ** 2
  },
  linear: {
    fn: x => x,
    derivative: () => 1
  },
  leakyrelu: {
    fn: x => x > 0 ? x : 0.01 * x,
    derivative: x => x > 0 ? 1 : 0.01
  }
}

function randomWeight() {
  // Xavier initialization
  return (Math.random() - 0.5) * 2
}

export class NeuralNetwork {
  /**
   * @param {number[]} topology - e.g. [2, 4, 4, 1]
   * @param {string} activation - 'relu' | 'sigmoid' | 'tanh'
   */
  constructor(topology, activation = 'relu') {
    this.topology = [...topology]
    this.activation = activation
    this.weights = []    // weights[l][j][i] = weight from neuron i in layer l to neuron j in layer l+1
    this.biases = []     // biases[l][j] = bias for neuron j in layer l+1
    this.gradientHistory = [] // stores gradient magnitudes per layer

    // ReLU/LeakyReLU → He init (scale = sqrt(2/fanIn))
    // Sigmoid/Tanh/Linear → Xavier init (scale = sqrt(2/(fanIn+fanOut)))
    const useHeInit = ['relu', 'leakyrelu'].includes(activation)
    for (let l = 0; l < topology.length - 1; l++) {
      const fanIn = topology[l]
      const fanOut = topology[l + 1]
      const scale = useHeInit ? Math.sqrt(2 / fanIn) : Math.sqrt(2 / (fanIn + fanOut))
      const layerWeights = []
      const layerBiases = []
      for (let j = 0; j < fanOut; j++) {
        const neuronWeights = []
        for (let i = 0; i < fanIn; i++) {
          neuronWeights.push((Math.random() - 0.5) * 2 * scale)
        }
        layerWeights.push(neuronWeights)
        layerBiases.push(0.01)
      }
      this.weights.push(layerWeights)
      this.biases.push(layerBiases)
    }
  }

  getActivation() {
    return activations[this.activation] || activations.relu
  }

  /**
   * Forward pass - returns all intermediate values for visualization
   */
  forward(input) {
    const act = this.getActivation()
    const preActivations = [null]  // no pre-activation for input layer
    const postActivations = [input.slice()]

    let current = input.slice()
    for (let l = 0; l < this.weights.length; l++) {
      const isOutput = l === this.weights.length - 1
      const layerPre = []
      const layerPost = []
      for (let j = 0; j < this.weights[l].length; j++) {
        let sum = this.biases[l][j]
        for (let i = 0; i < current.length; i++) {
          sum += current[i] * this.weights[l][j][i]
        }
        layerPre.push(sum)
        // Output layer uses sigmoid for binary classification
        if (isOutput) {
          layerPost.push(activations.sigmoid.fn(sum))
        } else {
          layerPost.push(act.fn(sum))
        }
      }
      preActivations.push(layerPre)
      postActivations.push(layerPost)
      current = layerPost
    }

    return { preActivations, postActivations, output: current }
  }

  /**
   * Predict output value
   */
  predict(input) {
    return this.forward(input).output
  }

  /**
   * Backward pass with gradient recording
   * Returns detailed gradient info for visualization
   */
  backward(input, target) {
    const act = this.getActivation()
    const { preActivations, postActivations, output } = this.forward(input)
    const numLayers = this.weights.length

    // Compute deltas for each layer (backpropagation)
    const deltas = new Array(numLayers)

    // Output layer delta (binary cross-entropy derivative with sigmoid)
    const outputLayer = numLayers - 1
    deltas[outputLayer] = []
    for (let j = 0; j < this.weights[outputLayer].length; j++) {
      const o = postActivations[outputLayer + 1][j]
      const t = Array.isArray(target) ? target[j] : target
      // derivative of cross-entropy + sigmoid = output - target
      deltas[outputLayer][j] = o - t
    }

    // Hidden layers
    for (let l = numLayers - 2; l >= 0; l--) {
      deltas[l] = []
      for (let i = 0; i < this.weights[l].length; i++) {
        let error = 0
        for (let j = 0; j < this.weights[l + 1].length; j++) {
          error += deltas[l + 1][j] * this.weights[l + 1][j][i]
        }
        deltas[l][i] = error * act.derivative(preActivations[l + 1][i])
      }
    }

    // Compute weight gradients
    const weightGradients = []
    const biasGradients = []
    const layerGradientMagnitudes = []

    for (let l = 0; l < numLayers; l++) {
      const wGrad = []
      const bGrad = []
      let gradMag = 0
      for (let j = 0; j < this.weights[l].length; j++) {
        const neuronGrad = []
        for (let i = 0; i < this.weights[l][j].length; i++) {
          const g = deltas[l][j] * postActivations[l][i]
          neuronGrad.push(g)
          gradMag += g * g
        }
        wGrad.push(neuronGrad)
        bGrad.push(deltas[l][j])
        gradMag += deltas[l][j] * deltas[l][j]
      }
      weightGradients.push(wGrad)
      biasGradients.push(bGrad)
      layerGradientMagnitudes.push(Math.sqrt(gradMag))
    }

    return {
      deltas,
      weightGradients,
      biasGradients,
      layerGradientMagnitudes,
      preActivations,
      postActivations,
      output
    }
  }

  /**
   * Train on a single sample
   */
  trainStep(input, target, learningRate = 0.03) {
    const result = this.backward(input, target)

    // Update weights and biases
    for (let l = 0; l < this.weights.length; l++) {
      for (let j = 0; j < this.weights[l].length; j++) {
        for (let i = 0; i < this.weights[l][j].length; i++) {
          this.weights[l][j][i] -= learningRate * result.weightGradients[l][j][i]
        }
        this.biases[l][j] -= learningRate * result.biasGradients[l][j]
      }
    }

    // Record gradient magnitudes
    this.gradientHistory.push(result.layerGradientMagnitudes)
    if (this.gradientHistory.length > 200) {
      this.gradientHistory.shift()
    }

    return result
  }

  /**
   * Train on a batch of data for one epoch
   */
  trainEpoch(data, learningRate = 0.03) {
    let totalLoss = 0
    // Shuffle data
    const shuffled = [...data].sort(() => Math.random() - 0.5)

    for (const { input, target } of shuffled) {
      const result = this.trainStep(input, target, learningRate)
      // Binary cross-entropy loss
      const o = result.output[0]
      const t = Array.isArray(target) ? target[0] : target
      const loss = -(t * Math.log(o + 1e-10) + (1 - t) * Math.log(1 - o + 1e-10))
      totalLoss += loss
    }

    return totalLoss / data.length
  }

  /**
   * Get all intermediate layer outputs for manifold visualization
   */
  getLayerOutputs(input) {
    const act = this.getActivation()
    const outputs = [input.slice()]
    let current = input.slice()

    for (let l = 0; l < this.weights.length; l++) {
      const isOutput = l === this.weights.length - 1
      const layerOut = []
      for (let j = 0; j < this.weights[l].length; j++) {
        let sum = this.biases[l][j]
        for (let i = 0; i < current.length; i++) {
          sum += current[i] * this.weights[l][j][i]
        }
        layerOut.push(isOutput ? activations.sigmoid.fn(sum) : act.fn(sum))
      }
      outputs.push(layerOut)
      current = layerOut
    }

    return outputs
  }

  /**
   * Clone the network
   */
  clone() {
    const nn = new NeuralNetwork(this.topology, this.activation)
    nn.weights = JSON.parse(JSON.stringify(this.weights))
    nn.biases = JSON.parse(JSON.stringify(this.biases))
    return nn
  }

  /**
   * Reset weights
   */
  reset() {
    const useHeInit = ['relu', 'leakyrelu'].includes(this.activation)
    for (let l = 0; l < this.topology.length - 1; l++) {
      const fanIn = this.topology[l]
      const fanOut = this.topology[l + 1]
      const scale = useHeInit ? Math.sqrt(2 / fanIn) : Math.sqrt(2 / (fanIn + fanOut))
      for (let j = 0; j < fanOut; j++) {
        for (let i = 0; i < fanIn; i++) {
          this.weights[l][j][i] = (Math.random() - 0.5) * 2 * scale
        }
        this.biases[l][j] = 0.01
      }
    }
    this.gradientHistory = []
  }
}

export { activations }
