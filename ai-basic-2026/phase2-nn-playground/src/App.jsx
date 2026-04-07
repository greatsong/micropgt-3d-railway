import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import PlaygroundPage from './pages/PlaygroundPage'
import EmbeddingPage from './pages/EmbeddingPage'
import TemperaturePage from './pages/TemperaturePage'
import AttentionPage from './pages/AttentionPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">
            <span className="title-icon">🧠</span>
            Neural Network Playground
          </h1>
          <nav className="app-nav">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              신경망
            </NavLink>
            <NavLink to="/embedding" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              임베딩
            </NavLink>
            <NavLink to="/temperature" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Temperature
            </NavLink>
            <NavLink to="/attention" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Attention
            </NavLink>
          </nav>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<PlaygroundPage />} />
            <Route path="/embedding" element={<EmbeddingPage />} />
            <Route path="/temperature" element={<TemperaturePage />} />
            <Route path="/attention" element={<AttentionPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
