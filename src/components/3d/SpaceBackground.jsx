'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function SpaceBackground() {
    const particlesRef = useRef();

    // 별 파티클 생성
    const { positions, colors, sizes } = useMemo(() => {
        const count = 1000;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            // 구 분포 (우주 배경)
            const r = 30 + Math.random() * 70;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            // 다양한 색상 (보라, 시안, 흰색, 핑크)
            const palette = [
                [0.49, 0.36, 0.99], // 보라
                [0.13, 0.83, 0.93], // 시안
                [0.96, 0.44, 0.71], // 핑크
                [1, 1, 1],          // 흰색
                [0.98, 0.75, 0.15], // 금색
            ];
            const c = palette[Math.floor(Math.random() * palette.length)];
            colors[i * 3] = c[0];
            colors[i * 3 + 1] = c[1];
            colors[i * 3 + 2] = c[2];

            sizes[i] = 0.05 + Math.random() * 0.15;
        }

        return { positions, colors, sizes };
    }, []);

    useFrame((state) => {
        if (particlesRef.current) {
            particlesRef.current.rotation.y = state.clock.elapsedTime * 0.005;
            particlesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.003) * 0.05;
        }
    });

    return (
        <points ref={particlesRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    array={positions}
                    count={positions.length / 3}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-color"
                    array={colors}
                    count={colors.length / 3}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.15}
                vertexColors
                transparent
                opacity={0.8}
                sizeAttenuation
                depthWrite={false}
            />
        </points>
    );
}
