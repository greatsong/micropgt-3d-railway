import { useState } from 'react'
import LogicGates from '../components/logic-gates/LogicGates'
import NNPlayground from '../components/playground/NNPlayground'
import PropagationViz from '../components/propagation/PropagationViz'
import GradientVanishing from '../components/gradient/GradientVanishing'
import ManifoldViz from '../components/manifold/ManifoldViz'

const tabs = [
  { id: 'logic', label: '논리 게이트', icon: '⚡' },
  { id: 'playground', label: '플레이그라운드', icon: '🎯' },
  { id: 'propagation', label: '순전파 / 역전파', icon: '🔄' },
  { id: 'gradient', label: '기울기 소실', icon: '📉' },
  { id: 'manifold', label: '3D 매니폴드', icon: '🌀' }
]

export default function PlaygroundPage() {
  const [activeTab, setActiveTab] = useState('logic')

  return (
    <div className="page">
      <div className="tab-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span style={{ marginRight: 6 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="page-content">
        {activeTab === 'logic' && <LogicGates />}
        {activeTab === 'playground' && <NNPlayground />}
        {activeTab === 'propagation' && <PropagationViz />}
        {activeTab === 'gradient' && <GradientVanishing />}
        {activeTab === 'manifold' && <ManifoldViz />}
      </div>
    </div>
  )
}
