'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import styles from './WordStar.module.css';

export default function WordStar({ studentName, word, position, color, isMe }) {
    const meshRef = useRef();
    const glowRef = useRef();
    const targetPos = useMemo(
        () => new THREE.Vector3(position.x, position.y, position.z),
        [position.x, position.y, position.z]
    );
    const parsedColor = useMemo(() => new THREE.Color(color), [color]);

    useFrame((state, delta) => {
        if (meshRef.current) {
            // 부드러운 위치 보간 (슬라이더 이동 시)
            meshRef.current.position.lerp(targetPos, Math.min(delta * 3, 1));
        }
        if (glowRef.current) {
            glowRef.current.position.copy(meshRef.current.position);
        }
    });

    return (
        <group>
            {/* 글로우 후광 */}
            <mesh ref={glowRef} position={[position.x, position.y, position.z]}>
                <sphereGeometry args={[isMe ? 0.6 : 0.45, 12, 12]} />
                <meshBasicMaterial
                    color={parsedColor}
                    transparent
                    opacity={0.12}
                    depthWrite={false}
                />
            </mesh>

            {/* 메인 별 구체 + 라벨 */}
            <mesh ref={meshRef} position={[position.x, position.y, position.z]}>
                <sphereGeometry args={[isMe ? 0.3 : 0.2, 16, 16]} />
                <meshStandardMaterial
                    color={parsedColor}
                    emissive={parsedColor}
                    emissiveIntensity={isMe ? 1.2 : 0.6}
                    roughness={0.2}
                    metalness={0.8}
                />

                {/* HTML 라벨 — mesh 안에 있어서 자동으로 따라감 */}
                <Html
                    position={[0, isMe ? 0.5 : 0.35, 0]}
                    center
                    className={styles.htmlNoPointer}
                >
                    <div className={styles.labelWrap}>
                        <div
                            className={styles.wordLabel}
                            style={{
                                fontSize: isMe ? '14px' : '11px',
                                color,
                            }}
                        >
                            {word || '?'}
                        </div>
                        <div className={styles.studentName}>
                            {studentName}
                        </div>
                        <div className={styles.coordLabel}>
                            ({position.x.toFixed(1)}, {position.y.toFixed(1)}, {position.z.toFixed(1)})
                        </div>
                    </div>
                </Html>
            </mesh>
        </group>
    );
}
