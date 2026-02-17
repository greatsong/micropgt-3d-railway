'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { lossFunction } from './LossSurface';

export default function RacingBall({ teamName, color, ballData, isMyTeam }) {
    const meshRef = useRef();
    const glowRef = useRef();

    const targetPos = useMemo(() => {
        if (!ballData) return new THREE.Vector3(0, 2, 0);
        return new THREE.Vector3(ballData.x, ballData.y + 0.15, ballData.z);
    }, [ballData?.x, ballData?.y, ballData?.z]);

    const parsedColor = useMemo(() => new THREE.Color(color), [color]);

    const isEscaped = ballData?.status === 'escaped';
    const isConverged = ballData?.status === 'converged';

    useFrame((state, delta) => {
        if (!meshRef.current) return;

        // 부드러운 위치 보간
        meshRef.current.position.lerp(targetPos, Math.min(delta * 5, 1));

        // 글로우 동기화
        if (glowRef.current) {
            glowRef.current.position.copy(meshRef.current.position);
            const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
            glowRef.current.scale.setScalar(isEscaped ? pulse * 1.5 : pulse);
        }
    });

    if (!ballData) return null;

    const ballSize = isMyTeam ? 0.25 : 0.18;
    const emoji = isEscaped ? '💥' : isConverged ? '🏁' : '🏎️';

    return (
        <group>
            {/* 글로우 후광 */}
            <mesh ref={glowRef} position={[ballData.x, ballData.y + 0.15, ballData.z]}>
                <sphereGeometry args={[ballSize * 2, 12, 12]} />
                <meshBasicMaterial
                    color={isEscaped ? '#ff0000' : parsedColor}
                    transparent
                    opacity={isEscaped ? 0.3 : 0.12}
                    depthWrite={false}
                />
            </mesh>

            {/* 메인 공 */}
            <mesh ref={meshRef} position={[ballData.x, ballData.y + 0.15, ballData.z]}>
                <sphereGeometry args={[ballSize, 16, 16]} />
                <meshStandardMaterial
                    color={isEscaped ? '#ff4444' : parsedColor}
                    emissive={isEscaped ? new THREE.Color('#ff0000') : parsedColor}
                    emissiveIntensity={isEscaped ? 2.0 : isConverged ? 0.3 : 0.8}
                    roughness={0.2}
                    metalness={0.9}
                />
            </mesh>

            {/* HTML 라벨 (WebGL 텍스트 대신 DOM 오버레이) */}
            <Html
                position={[ballData.x, ballData.y + 0.6, ballData.z]}
                center
                style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
                <div style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: isEscaped ? '#ff4444' : color,
                        textShadow: '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)',
                    }}>
                        {emoji} {teamName || 'Unknown'}
                    </div>
                    <div style={{
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        color: '#a5a0c0',
                        textShadow: '0 0 3px rgba(0,0,0,0.8)',
                        marginTop: 1,
                    }}>
                        Loss: {ballData.loss?.toFixed(3) || '?'}
                    </div>
                </div>
            </Html>

            {/* 궤적 선 */}
            {ballData.trail && ballData.trail.length > 1 && (
                <TrailLine points={ballData.trail} color={color} />
            )}
        </group>
    );
}

// 궤적 라인 컴포넌트
function TrailLine({ points, color }) {
    const lineRef = useRef();

    const geometry = useMemo(() => {
        const positions = [];
        const recentPoints = points.slice(-100); // 최근 100포인트만
        for (const p of recentPoints) {
            positions.push(p.x, p.y + 0.05, p.z);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(positions, 3)
        );
        return geo;
    }, [points]);

    return (
        <line ref={lineRef} geometry={geometry}>
            <lineBasicMaterial
                color={color}
                transparent
                opacity={0.5}
                linewidth={2}
            />
        </line>
    );
}
