import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import {
  englishEmbeddings,
  koreanEmbeddings,
  cosineSimilarity,
  findNearest,
  getCategories,
  CATEGORY_COLORS,
  CATEGORY_LABELS_KO,
  displayName,
  searchWords,
} from '../../engine/embeddings';

// ============================================================
// Styles
// ============================================================
const styles = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#f5f7fb',
    color: '#1e293b',
    fontFamily: "'Pretendard', 'Inter', system-ui, sans-serif",
    borderRadius: 12,
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    flexWrap: 'wrap',
  },
  toggleGroup: {
    display: 'flex',
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
  },
  toggleBtn: (active) => ({
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    background: active ? '#3b82f6' : '#e2e8f0',
    color: active ? '#fff' : '#64748b',
    transition: 'all 0.2s',
  }),
  searchBox: {
    position: 'relative',
    flex: 1,
    minWidth: 180,
    maxWidth: 300,
  },
  searchInput: {
    width: '100%',
    padding: '7px 12px 7px 32px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  },
  searchIcon: {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#64748b',
    fontSize: 14,
    pointerEvents: 'none',
  },
  searchResults: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    overflowY: 'auto',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
    zIndex: 100,
  },
  searchItem: {
    padding: '6px 12px',
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  body: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
  },
  legend: {
    width: 160,
    padding: '12px 8px',
    overflowY: 'auto',
    background: '#f0f4f8',
    borderRight: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  legendItem: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 8px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    opacity: active ? 1 : 0.35,
    transition: 'opacity 0.2s',
  }),
  legendDot: (color) => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  }),
  canvasWrap: {
    flex: 1,
    position: 'relative',
    minHeight: 0,
  },
  tooltip: (x, y) => ({
    position: 'absolute',
    left: x + 12,
    top: y - 8,
    padding: '6px 10px',
    borderRadius: 6,
    background: 'rgba(255,255,255,0.97)',
    border: '1px solid #e2e8f0',
    fontSize: 12,
    color: '#1e293b',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    pointerEvents: 'none',
    zIndex: 50,
    whiteSpace: 'nowrap',
  }),
  infoPanel: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 220,
    padding: 12,
    borderRadius: 10,
    background: 'rgba(255,255,255,0.97)',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    fontSize: 12,
    zIndex: 40,
  },
  neighborItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '3px 0',
    borderBottom: '1px solid #e2e8f0',
  },
};

// ============================================================
// 2D Canvas View
// ============================================================
function EmbeddingCanvas2D({ embeddings, visibleCats, selected, onSelect, onHover, lang }) {
  const canvasRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef({ dragging: false, sx: 0, sy: 0, tx: 0, ty: 0 });
  const sizeRef = useRef({ w: 800, h: 600 });

  // Compute bounds
  const bounds = useMemo(() => {
    const pts = embeddings.filter((e) => visibleCats.has(e.category));
    if (pts.length === 0) return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.pca2d[0] < minX) minX = p.pca2d[0];
      if (p.pca2d[0] > maxX) maxX = p.pca2d[0];
      if (p.pca2d[1] < minY) minY = p.pca2d[1];
      if (p.pca2d[1] > maxY) maxY = p.pca2d[1];
    }
    const pad = 0.05;
    const dx = (maxX - minX) * pad || 0.1;
    const dy = (maxY - minY) * pad || 0.1;
    return { minX: minX - dx, maxX: maxX + dx, minY: minY - dy, maxY: maxY + dy };
  }, [embeddings, visibleCats]);

  const toScreen = useCallback(
    (px, py) => {
      const { w, h } = sizeRef.current;
      const { minX, maxX, minY, maxY } = bounds;
      const { x: tx, y: ty, scale } = transform;
      const sx = ((px - minX) / (maxX - minX)) * w * scale + tx;
      const sy = ((py - minY) / (maxY - minY)) * h * scale + ty;
      return [sx, sy];
    },
    [bounds, transform]
  );

  const fromScreen = useCallback(
    (sx, sy) => {
      const { w, h } = sizeRef.current;
      const { minX, maxX, minY, maxY } = bounds;
      const { x: tx, y: ty, scale } = transform;
      const px = ((sx - tx) / (w * scale)) * (maxX - minX) + minX;
      const py = ((sy - ty) / (h * scale)) * (maxY - minY) + minY;
      return [px, py];
    },
    [bounds, transform]
  );

  // Neighbors for selected word
  const neighbors = useMemo(() => {
    if (!selected) return [];
    return findNearest(selected.vector, 6, [selected.word], lang === 'ko' ? 'ko' : 'en');
  }, [selected, lang]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = rect.height;
    sizeRef.current = { w, h };
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(0, 0, w, h);

    // Draw neighbor lines
    if (selected) {
      for (const nb of neighbors) {
        const [sx, sy] = toScreen(selected.pca2d[0], selected.pca2d[1]);
        const entry = embeddings.find((e) => e.word === nb.word);
        if (!entry || !visibleCats.has(entry.category)) continue;
        const [nx, ny] = toScreen(entry.pca2d[0], entry.pca2d[1]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = 'rgba(251,146,60,0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Draw points
    const visible = embeddings.filter((e) => visibleCats.has(e.category));
    for (const entry of visible) {
      const [sx, sy] = toScreen(entry.pca2d[0], entry.pca2d[1]);
      if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;

      const isSelected = selected && selected.word === entry.word;
      const isNeighbor = neighbors.some((nb) => nb.word === entry.word);
      const radius = isSelected ? 7 : isNeighbor ? 5.5 : 3.5;
      const color = CATEGORY_COLORS[entry.category] || '#888';

      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#fb923c' : color;
      ctx.fill();

      if (isSelected || isNeighbor) {
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Label for selected and neighbors
      if (isSelected || isNeighbor) {
        ctx.font = '11px Pretendard, Inter, system-ui, sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'center';
        ctx.fillText(displayName(entry.word), sx, sy - radius - 4);
      }
    }
  }, [embeddings, visibleCats, selected, neighbors, transform, toScreen]);

  // Mouse handlers
  const handleMouseDown = (e) => {
    dragRef.current = { dragging: true, sx: e.clientX, sy: e.clientY, tx: transform.x, ty: transform.y };
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (dragRef.current.dragging) {
      const dx = e.clientX - dragRef.current.sx;
      const dy = e.clientY - dragRef.current.sy;
      setTransform((t) => ({ ...t, x: dragRef.current.tx + dx, y: dragRef.current.ty + dy }));
      return;
    }

    // Hover detection
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const visible = embeddings.filter((e2) => visibleCats.has(e2.category));
    let hovered = null;
    let minDist = 15;
    for (const entry of visible) {
      const [sx, sy] = toScreen(entry.pca2d[0], entry.pca2d[1]);
      const dist = Math.hypot(sx - mx, sy - my);
      if (dist < minDist) {
        minDist = dist;
        hovered = { entry, x: mx, y: my };
      }
    }
    onHover(hovered);
  };

  const handleMouseUp = () => {
    dragRef.current.dragging = false;
  };

  const handleClick = (e) => {
    if (dragRef.current.dragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const visible = embeddings.filter((e2) => visibleCats.has(e2.category));
    let closest = null;
    let minDist = 15;
    for (const entry of visible) {
      const [sx, sy] = toScreen(entry.pca2d[0], entry.pca2d[1]);
      const dist = Math.hypot(sx - mx, sy - my);
      if (dist < minDist) {
        minDist = dist;
        closest = entry;
      }
    }
    onSelect(closest);
  };

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setTransform((t) => {
      const newScale = Math.max(0.2, Math.min(20, t.scale * factor));
      const ratio = newScale / t.scale;
      return {
        scale: newScale,
        x: mx - (mx - t.x) * ratio,
        y: my - (my - t.y) * ratio,
      };
    });
  }, []);

  // non-passive wheel listener (React onWheel은 passive라 preventDefault 불가)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', cursor: 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        handleMouseUp();
        onHover(null);
      }}
      onClick={handleClick}
    />
  );
}

// ============================================================
// 3D Scene Components
// ============================================================
function PointCloud({ embeddings, visibleCats, selected, onSelect, neighbors }) {
  const meshRef = useRef();
  const pointsData = useMemo(() => {
    return embeddings.filter((e) => visibleCats.has(e.category));
  }, [embeddings, visibleCats]);

  return (
    <group>
      {pointsData.map((entry, i) => {
        const isSelected = selected && selected.word === entry.word;
        const isNeighbor = neighbors.some((nb) => nb.word === entry.word);
        const color = isSelected ? '#fb923c' : CATEGORY_COLORS[entry.category] || '#888';
        const scale = isSelected ? 0.022 : isNeighbor ? 0.016 : 0.008;

        return (
          <group key={entry.word} position={entry.pca3d}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onSelect(entry);
              }}
            >
              <sphereGeometry args={[scale, 12, 12]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isSelected ? 0.6 : isNeighbor ? 0.4 : 0.2}
              />
            </mesh>
            {(isSelected || isNeighbor) && (
              <Text
                position={[0, scale + 0.012, 0]}
                fontSize={0.018}
                color="#1e293b"
                anchorX="center"
                anchorY="bottom"
                outlineWidth={0.002}
                outlineColor="#ffffff"
              >
                {displayName(entry.word)}
              </Text>
            )}
          </group>
        );
      })}

      {/* Neighbor lines */}
      {selected &&
        neighbors.map((nb) => {
          const entry = embeddings.find((e) => e.word === nb.word);
          if (!entry || !visibleCats.has(entry.category)) return null;
          return (
            <Line
              key={nb.word}
              points={[selected.pca3d, entry.pca3d]}
              color="#fb923c"
              lineWidth={1.5}
              opacity={0.5}
              transparent
            />
          );
        })}
    </group>
  );
}

function Scene3D({ embeddings, visibleCats, selected, onSelect, lang }) {
  const neighbors = useMemo(() => {
    if (!selected) return [];
    return findNearest(selected.vector, 6, [selected.word], lang === 'ko' ? 'ko' : 'en');
  }, [selected, lang]);

  return (
    <Canvas
      camera={{ position: [0.5, 0.5, 0.8], fov: 50 }}
      style={{ background: '#eef1f8' }}
      onPointerMissed={() => onSelect(null)}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={0.8} />
      <PointCloud
        embeddings={embeddings}
        visibleCats={visibleCats}
        selected={selected}
        onSelect={onSelect}
        neighbors={neighbors}
      />
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
    </Canvas>
  );
}

// ============================================================
// Main Component
// ============================================================
export default function EmbeddingExplorer() {
  const [viewMode, setViewMode] = useState('3d');
  const [lang, setLang] = useState('en');
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [visibleCats, setVisibleCats] = useState(() => new Set(getCategories('en')));

  const embeddings = lang === 'en' ? englishEmbeddings : koreanEmbeddings;
  const categories = useMemo(() => getCategories(lang), [lang]);

  // Update visible categories when lang changes
  useEffect(() => {
    setVisibleCats(new Set(getCategories(lang)));
    setSelected(null);
    setSearch('');
  }, [lang]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    return searchWords(search.trim(), lang).slice(0, 10);
  }, [search, lang]);

  const toggleCategory = (cat) => {
    setVisibleCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const selectAll = () => setVisibleCats(new Set(categories));
  const selectNone = () => setVisibleCats(new Set());

  const neighbors = useMemo(() => {
    if (!selected) return [];
    return findNearest(selected.vector, 5, [selected.word], lang);
  }, [selected, lang]);

  const handleSearchSelect = (entry) => {
    setSelected(entry);
    setSearch('');
    setShowSearch(false);
    if (!visibleCats.has(entry.category)) {
      setVisibleCats((prev) => new Set([...prev, entry.category]));
    }
  };

  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        {/* View mode toggle */}
        <div style={styles.toggleGroup}>
          <button style={styles.toggleBtn(viewMode === '2d')} onClick={() => setViewMode('2d')}>
            2D
          </button>
          <button style={styles.toggleBtn(viewMode === '3d')} onClick={() => setViewMode('3d')}>
            3D
          </button>
        </div>

        {/* Language toggle */}
        <div style={styles.toggleGroup}>
          <button style={styles.toggleBtn(lang === 'en')} onClick={() => setLang('en')}>
            English
          </button>
          <button style={styles.toggleBtn(lang === 'ko')} onClick={() => setLang('ko')}>
            한글
          </button>
        </div>

        {/* Search */}
        <div style={styles.searchBox}>
          <span style={styles.searchIcon}>&#x1F50D;</span>
          <input
            style={styles.searchInput}
            placeholder={lang === 'en' ? 'Search word...' : '단어 검색...'}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
          />
          {showSearch && searchResults.length > 0 && (
            <div style={styles.searchResults}>
              {searchResults.map((entry) => (
                <div
                  key={entry.word}
                  style={styles.searchItem}
                  onMouseDown={() => handleSearchSelect(entry)}
                >
                  <span>{displayName(entry.word)}</span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: CATEGORY_COLORS[entry.category],
                      color: '#000',
                      fontWeight: 600,
                    }}
                  >
                    {lang === 'ko' ? CATEGORY_LABELS_KO[entry.category] : entry.category}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
          {embeddings.length} words &middot; 50 dims
        </span>
      </div>

      {/* Body */}
      <div style={styles.body}>
        {/* Legend */}
        <div style={styles.legend}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <button
              onClick={selectAll}
              style={{
                flex: 1,
                padding: '3px 0',
                fontSize: 10,
                border: '1px solid #e2e8f0',
                borderRadius: 4,
                background: '#e2e8f0',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              All
            </button>
            <button
              onClick={selectNone}
              style={{
                flex: 1,
                padding: '3px 0',
                fontSize: 10,
                border: '1px solid #e2e8f0',
                borderRadius: 4,
                background: '#e2e8f0',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              None
            </button>
          </div>
          {categories.map((cat) => (
            <div
              key={cat}
              style={styles.legendItem(visibleCats.has(cat))}
              onClick={() => toggleCategory(cat)}
            >
              <div style={styles.legendDot(CATEGORY_COLORS[cat])} />
              <span>{lang === 'ko' ? CATEGORY_LABELS_KO[cat] : cat}</span>
            </div>
          ))}
        </div>

        {/* Canvas / 3D */}
        <div style={styles.canvasWrap}>
          {viewMode === '2d' ? (
            <EmbeddingCanvas2D
              embeddings={embeddings}
              visibleCats={visibleCats}
              selected={selected}
              onSelect={setSelected}
              onHover={setHovered}
              lang={lang}
            />
          ) : (
            <Scene3D
              embeddings={embeddings}
              visibleCats={visibleCats}
              selected={selected}
              onSelect={setSelected}
              lang={lang}
            />
          )}

          {/* Hover tooltip (2D only) */}
          {hovered && viewMode === '2d' && (
            <div style={styles.tooltip(hovered.x, hovered.y)}>
              <strong>{displayName(hovered.entry.word)}</strong>
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10,
                  padding: '1px 5px',
                  borderRadius: 3,
                  background: CATEGORY_COLORS[hovered.entry.category],
                  color: '#000',
                  fontWeight: 600,
                }}
              >
                {lang === 'ko'
                  ? CATEGORY_LABELS_KO[hovered.entry.category]
                  : hovered.entry.category}
              </span>
            </div>
          )}

          {/* Selected info panel */}
          {selected && (
            <div style={styles.infoPanel}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: '#fb923c' }}>
                {displayName(selected.word)}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
                {lang === 'ko' ? CATEGORY_LABELS_KO[selected.category] : selected.category}
              </div>
              <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 6, color: '#3b82f6' }}>
                {lang === 'en' ? 'Nearest Neighbors' : '가장 가까운 단어'}
              </div>
              {neighbors.map((nb, i) => (
                <div
                  key={nb.word}
                  style={styles.neighborItem}
                  onClick={() => setSelected(embeddings.find((e) => e.word === nb.word) || null)}
                >
                  <span style={{ cursor: 'pointer' }}>
                    {i + 1}. {displayName(nb.word)}
                  </span>
                  <span style={{ color: '#64748b' }}>{nb.similarity.toFixed(3)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
