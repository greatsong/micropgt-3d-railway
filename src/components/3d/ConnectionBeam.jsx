'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function ConnectionBeam({ from, to, color = '#fbbf24', intensity = 1.0 }) {
    const meshRef = useRef();

    const fromVec = useMemo(
        () => new THREE.Vector3(from.x, from.y, from.z),
        [from.x, from.y, from.z]
    );
    const toVec = useMemo(
        () => new THREE.Vector3(to.x, to.y, to.z),
        [to.x, to.y, to.z]
    );

    // 중간점, 방향, 길이를 미리 계산 (매 프레임 new 방지)
    const { mid, length } = useMemo(() => {
        const mid = new THREE.Vector3().addVectors(fromVec, toVec).multiplyScalar(0.5);
        const length = fromVec.distanceTo(toVec);
        return { mid, length };
    }, [fromVec, toVec]);

    // 초기 위치/방향 설정
    useMemo(() => {
        if (!meshRef.current) return;
        meshRef.current.position.copy(mid);
        meshRef.current.lookAt(toVec);
    }, [mid, toVec]);

    useFrame((state) => {
        if (!meshRef.current) return;

        meshRef.current.position.copy(mid);
        meshRef.current.lookAt(toVec);

        // 맥동 효과
        const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
        meshRef.current.scale.set(pulse * 0.04 * intensity, pulse * 0.04 * intensity, length);
    });

    return (
        <mesh ref={meshRef}>
            <cylinderGeometry args={[0.5, 0.5, 1, 8]} />
            <meshBasicMaterial
                color={new THREE.Color(color)}
                transparent
                opacity={0.6 * intensity}
                depthWrite={false}
            />
        </mesh>
    );
}
