'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useRaceStore } from '@/stores/useRaceStore';
import { getSocket } from '@/lib/socket';
import LossSurface from './LossSurface';
import RacingBall from './RacingBall';
import SpaceBackground from './SpaceBackground';
import { useState, useEffect } from 'react';

export default function GradientRaceScene() {
    const teams = useRaceStore((s) => s.teams);
    const balls = useRaceStore((s) => s.balls);
    const myTeamId = useRaceStore((s) => s.myTeamId);
    const socket = getSocket();
    const mySocketId = socket?.id ?? null;
    const [visible, setVisible] = useState(true);

    // 탭 숨김/표시 감지 → 렌더링 일시정지
    useEffect(() => {
        const handleVisibility = () => setVisible(!document.hidden);
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    return (
        <Canvas
            camera={{ position: [0, 18, 18], fov: 55 }}
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
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 20, 10]} intensity={0.8} color="#ffffff" />
            <pointLight position={[-5, 10, -5]} intensity={0.5} color="#7c5cfc" />
            <pointLight position={[5, 5, 5]} intensity={0.3} color="#22d3ee" />

            {/* 우주 배경 */}
            <SpaceBackground />
            <Stars
                radius={80}
                depth={40}
                count={1000}
                factor={2}
                saturation={0.5}
                fade
                speed={0.3}
            />

            {/* 3D 손실 지형 */}
            <LossSurface />

            {/* 레이싱 공들 */}
            {Object.entries(balls).map(([teamId, ballData]) => {
                const team = teams[teamId];
                return (
                    <RacingBall
                        key={teamId}
                        teamName={team?.name || teamId}
                        color={team?.color || '#ffffff'}
                        ballData={ballData}
                        isMyTeam={teamId === myTeamId}
                    />
                );
            })}

            {/* 최저점 마커 */}
            <GoalMarker />

            {/* 카메라 컨트롤 */}
            <OrbitControls
                enablePan
                enableZoom
                enableRotate
                maxDistance={40}
                minDistance={5}
                maxPolarAngle={Math.PI / 2.2}
                target={[0, 1, 0]}
            />
        </Canvas>
    );
}

// 프레임 델타 클램핑: 탭 복귀 시 거대한 delta 방지
function DeltaClamp() {
    useFrame((state, delta) => {
        if (delta > 0.1) {
            state.clock.elapsedTime -= (delta - 0.016);
        }
    });
    return null;
}

// 글로벌 미니멈 근처 마커
function GoalMarker() {
    return (
        <group>
            {/* 골든 별 마커 — 대략적 최저점 위치 (0, 2)에 배치 */}
            <mesh position={[0, 1.2, 2]}>
                <octahedronGeometry args={[0.3, 0]} />
                <meshStandardMaterial
                    color="#fbbf24"
                    emissive="#fbbf24"
                    emissiveIntensity={1.5}
                    roughness={0.1}
                    metalness={1}
                />
            </mesh>
            {/* 바닥 링 */}
            <mesh position={[0, 0.7, 2]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.4, 0.6, 32]} />
                <meshBasicMaterial
                    color="#fbbf24"
                    transparent
                    opacity={0.3}
                    side={2}
                />
            </mesh>
        </group>
    );
}

