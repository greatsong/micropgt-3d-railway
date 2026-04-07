import { useState } from 'react'
import EmbeddingExplorer from '../components/embedding/EmbeddingExplorer'
import AnalogyLab from '../components/embedding/AnalogyLab'
import EmbeddingCalc from '../components/embedding/EmbeddingCalc'

const tabs = [
  { id: 'explorer', label: '임베딩 탐색기', icon: '🔍' },
  { id: 'analogy', label: '유추 실험실', icon: '🧪' },
  { id: 'calc', label: '벡터 계산기', icon: '🧮' }
]

export default function EmbeddingPage() {
  const [activeTab, setActiveTab] = useState('explorer')

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
        {activeTab === 'explorer' && <EmbeddingExplorer />}
        {activeTab === 'analogy' && <AnalogyLab />}
        {activeTab === 'calc' && <EmbeddingCalc />}
      </div>
    </div>
  )
}
