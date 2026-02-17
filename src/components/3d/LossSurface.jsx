'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { lossFunction } from '@/lib/lossFunction';

export default function LossSurface() {
    const meshRef = useRef();

    const { geometry, colors } = useMemo(() => {
        const size = 20;
        const segments = 80;
        const geo = new THREE.PlaneGeometry(size, size, segments, segments);
        const positions = geo.attributes.position;
        const colorArray = new Float32Array(positions.count * 3);

        let minY = Infinity,
            maxY = -Infinity;

        // 먼저 Y 범위 파악
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const zPlane = positions.getY(i); // PlaneGeometry의 Y는 3D 공간의 -Z
            const y = lossFunction(x, -zPlane); // Z좌표 부호 반전
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }

        // 정점 위치 + 컬러맵 적용
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const zPlane = positions.getY(i);
            const y = lossFunction(x, -zPlane); // Z좌표 부호 반전

            positions.setZ(i, y); // Z축을 높이로 사용 (회전 후 Y가 됨)

            // 컬러맵: 낮은 곳=파랑/청록, 높은 곳=빨강/주황
            const t = (y - minY) / (maxY - minY);
            const color = new THREE.Color();
            if (t < 0.3) {
                color.setHSL(0.6, 0.9, 0.3 + t * 0.5); // 파랑
            } else if (t < 0.6) {
                color.setHSL(0.45 - (t - 0.3) * 1.0, 0.85, 0.5); // 청록→녹색
            } else {
                color.setHSL(0.08 - (t - 0.6) * 0.15, 0.9, 0.45 + (t - 0.6) * 0.3); // 주황→빨강
            }
            colorArray[i * 3] = color.r;
            colorArray[i * 3 + 1] = color.g;
            colorArray[i * 3 + 2] = color.b;
        }

        geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
        geo.computeVertexNormals();

        return { geometry: geo, colors: colorArray };
    }, []);

    return (
        <group rotation={[-Math.PI / 2, 0, 0]}>
            {/* 솔리드 서피스 */}
            <mesh ref={meshRef} geometry={geometry}>
                <meshStandardMaterial
                    vertexColors
                    side={THREE.DoubleSide}
                    roughness={0.6}
                    metalness={0.2}
                    transparent
                    opacity={0.85}
                />
            </mesh>

            {/* 와이어프레임 오버레이 */}
            <mesh geometry={geometry}>
                <meshBasicMaterial
                    wireframe
                    color="#4a3a8a"
                    transparent
                    opacity={0.15}
                />
            </mesh>
        </group>
    );
}

export { lossFunction };
