'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { lossFunctionByLevel } from '@/lib/lossFunction';
import styles from './RacingBall.module.css';

export default function RacingBall({ teamName, color, ballData, isMyTeam, hideLabel = false }) {
    const meshRef = useRef();
    const glowRef = useRef();

    const targetPos = useMemo(() => {
        if (!ballData) return new THREE.Vector3(0, 2, 0);
        return new THREE.Vector3(ballData.x, ballData.y + 0.15, ballData.z);
    }, [ballData?.x, ballData?.y, ballData?.z]);

    const parsedColor = useMemo(() => new THREE.Color(color), [color]);

    const isEscaped = ballData?.status === 'escaped';
    const isConverged = ballData?.status === 'converged';
    const isLocalMin = ballData?.status === 'local_minimum'; // Fix 11

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
    // Fix 11: racing=팀색, converged=초록, local_minimum=주황, escaped=빨강
    const ballColor = isEscaped ? new THREE.Color('#ff4444')
        : isLocalMin ? new THREE.Color('#f97316')
        : isConverged ? new THREE.Color('#10b981')
        : parsedColor;
    const emoji = isEscaped ? '💥' : isLocalMin ? '🏔️' : isConverged ? '🏁' : '🏎️';

    return (
        <group>
            {/* 글로우 후광 */}
            <mesh ref={glowRef} position={[ballData.x, ballData.y + 0.15, ballData.z]}>
                <sphereGeometry args={[ballSize * 2, 12, 12]} />
                <meshBasicMaterial
                    color={ballColor}
                    transparent
                    opacity={isEscaped ? 0.3 : isLocalMin ? 0.25 : 0.12}
                    depthWrite={false}
                />
            </mesh>

            {/* 메인 공 */}
            <mesh ref={meshRef} position={[ballData.x, ballData.y + 0.15, ballData.z]}>
                <sphereGeometry args={[ballSize, 16, 16]} />
                <meshStandardMaterial
                    color={ballColor}
                    emissive={isEscaped ? new THREE.Color('#ff0000') : isLocalMin ? new THREE.Color('#f97316') : parsedColor}
                    emissiveIntensity={isEscaped ? 2.0 : isLocalMin ? 1.5 : isConverged ? 0.3 : 0.8}
                    roughness={0.2}
                    metalness={0.9}
                />
            </mesh>

            {/* HTML 라벨: hideLabel=true이면 숨김 (지형뷰에서 내 공 라벨 겹침 방지) */}
            {!hideLabel && (
                <Html
                    position={[ballData.x, ballData.y + 0.6, ballData.z]}
                    center
                    className={styles.htmlNoPointer}
                >
                    <div className={styles.labelWrap}>
                        <div
                            className={styles.teamName}
                            style={{ color: isEscaped ? '#ff4444' : isLocalMin ? '#f97316' : color }}
                        >
                            {emoji} {teamName || 'Unknown'}
                        </div>
                        <div className={styles.lossLabel}>
                            Loss: {ballData.loss?.toFixed(3) || '?'}
                        </div>
                    </div>
                </Html>
            )}

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
