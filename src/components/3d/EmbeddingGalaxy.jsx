'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import { useGalaxyStore } from '@/stores/useGalaxyStore';
import { getSocket } from '@/lib/socket';
import WordStar from './WordStar';
import SpaceBackground from './SpaceBackground';
import ConnectionBeam from './ConnectionBeam';
import { useMemo, useState, useEffect } from 'react';

export default function EmbeddingGalaxy() {
    const stars = useGalaxyStore((s) => s.stars);
    const socket = getSocket();
    const myId = socket?.id ?? null;
    const [visible, setVisible] = useState(true);

    // 탭 숨김/표시 감지 → 렌더링 일시정지
    useEffect(() => {
        const handleVisibility = () => setVisible(!document.hidden);
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    // 근접한 별들 사이에 연결선 그리기 (거리 < 3)
    const connections = useMemo(() => {
        const entries = Object.entries(stars);
        const conns = [];

        for (let i = 0; i < entries.length; i++) {
            for (let j = i + 1; j < entries.length; j++) {
                const [idA, a] = entries[i];
                const [idB, b] = entries[j];
                if (!a.position || !b.position) continue;

                const dx = a.position.x - b.position.x;
                const dy = a.position.y - b.position.y;
                const dz = a.position.z - b.position.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < 3) {
                    conns.push({
                        key: `${idA}-${idB}`,
                        from: a.position,
                        to: b.position,
                        intensity: 1 - dist / 3,
                    });
                }
            }
        }

        return conns;
    }, [stars]);

    return (
        <Canvas
            camera={{ position: [0, 5, 15], fov: 60 }}
            style={{
                width: '100%',
                height: '100%',
                borderRadius: 'var(--radius-md)',
            }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            dpr={[1, 2]}
            frameloop={visible ? 'always' : 'never'}
        >
            {/* 프레임 델타 클램핑 */}
            <DeltaClamp />

            {/* 조명 */}
            <ambientLight intensity={0.3} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#7c5cfc" />
            <pointLight position={[-10, -5, 5]} intensity={0.5} color="#22d3ee" />
            <pointLight position={[0, 10, -10]} intensity={0.3} color="#f472b6" />

            {/* 우주 배경 */}
            <SpaceBackground />
            <Stars
                radius={100}
                depth={50}
                count={1500}
                factor={2}
                saturation={0.5}
                fade
                speed={0.5}
            />

            {/* 그리드 (참조용) */}
            <gridHelper
                args={[20, 20, '#2a1f5e', '#1a1040']}
                position={[0, -5, 0]}
            />

            {/* XYZ 축 (흐리게) */}
            <AxisLine dir={[10, 0, 0]} color="#ff4466" />
            <AxisLine dir={[0, 10, 0]} color="#44ff66" />
            <AxisLine dir={[0, 0, 10]} color="#4488ff" />

            {/* 단어 별 노드들 */}
            {Object.entries(stars).map(([id, star]) => (
                <WordStar
                    key={id}
                    studentName={star.studentName}
                    word={star.word}
                    position={star.position}
                    color={star.color}
                    isMe={id === myId}
                />
            ))}

            {/* 근접 연결선 */}
            {connections.map((conn) => (
                <ConnectionBeam
                    key={conn.key}
                    from={conn.from}
                    to={conn.to}
                    intensity={conn.intensity}
                />
            ))}

            {/* 카메라 컨트롤 */}
            <OrbitControls
                enablePan
                enableZoom
                enableRotate
                maxDistance={50}
                minDistance={3}
            />
        </Canvas>
    );
}

// 프레임 델타 클램핑: 탭 복귀 시 거대한 delta 방지
function DeltaClamp() {
    useFrame((state, delta) => {
        // delta가 비정상적으로 크면 (>100ms) 시계를 리셋
        if (delta > 0.1) {
            state.clock.elapsedTime -= (delta - 0.016);
        }
    });
    return null;
}

// 반투명 축 라인 + 라벨
function AxisLine({ dir, color }) {
    const label = dir[0] ? 'X' : dir[1] ? 'Y' : 'Z';
    return (
        <group>
            <line>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={2}
                        array={new Float32Array([0, 0, 0, ...dir])}
                        itemSize={3}
                    />
                </bufferGeometry>
                <lineBasicMaterial color={color} transparent opacity={0.3} />
            </line>
            <Html
                position={dir}
                center
                style={{ pointerEvents: 'none' }}
            >
                <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: color,
                    opacity: 0.5,
                    textShadow: '0 0 3px rgba(0,0,0,0.8)',
                }}>
                    {label}
                </span>
            </Html>
        </group>
    );
}
