'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useRaceStore } from '@/stores/useRaceStore';
import LossSurface from './LossSurface';
import RacingBall from './RacingBall';
import SpaceBackground from './SpaceBackground';
import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import styles from './GradientRaceScene.module.css';
import { GLOBAL_MINIMA, lossFunctionByLevel } from '@/lib/lossFunction';

// ── 카메라 모드 정의 ──
// overview  : 조감도 — 기존 OrbitControls (자유 시점)
// follow3rd : 3인칭 추적 — 공 뒤·위에서 따라감, 지형 전체가 보임
// follow1st : 지형뷰 — 공 뒤 낮은 각도, 진행 방향으로 바라봄 (경사 체감)
const CAM_MODES = ['overview', 'follow3rd', 'follow1st'];
const CAM_META = {
    overview:   { icon: '🗺️', label: '조감도' },
    follow3rd:  { icon: '🏎️', label: '추적뷰' },
    follow1st:  { icon: '👁️', label: '지형뷰' },
};

// ── 추적 카메라 컴포넌트 (Canvas 내부에서 useFrame 사용) ──
function FollowCamera({ ballData, mode }) {
    const { camera } = useThree();
    const smoothPos = useRef(null);   // null → 첫 프레임에 현재 camera 위치로 초기화
    const smoothLook = useRef(new THREE.Vector3());

    useFrame((_, delta) => {
        if (!ballData) return;

        // NaN/Infinity 방어 (이탈 공 대비)
        const bx = isFinite(ballData.x) ? ballData.x : 0;
        const by = isFinite(ballData.y) ? ballData.y + 0.15 : 0;
        const bz = isFinite(ballData.z) ? ballData.z : 0;
        const ballPos = new THREE.Vector3(bx, by, bz);

        let desiredPos, desiredLook;

        if (mode === 'follow3rd') {
            // 3인칭 추적: 공 위 5 + 세계 좌표 z방향 뒤 7
            // → 언덕 경사를 위에서 내려다보며 따라감
            desiredPos = new THREE.Vector3(bx, by + 5, bz + 7);
            desiredLook = ballPos.clone();

        } else {
            // 지형뷰: 공 뒤 낮은 각도, 진행 방향으로 바라봄
            const vx = isFinite(ballData.vx) ? ballData.vx : 0;
            const vz = isFinite(ballData.vz) ? ballData.vz : 0;
            const speed = Math.sqrt(vx * vx + vz * vz);

            if (speed > 0.0005) {
                // 속도 단위벡터 기반 — 공 진행 방향 반대쪽에서, 공 위 0.8에 위치
                const nx = vx / speed;
                const nz = vz / speed;
                desiredPos = new THREE.Vector3(bx - nx * 2.5, by + 0.8, bz - nz * 2.5);
                // 진행 방향 앞 6 + 약간 아래 (경사면이 눈에 띄게)
                desiredLook = new THREE.Vector3(bx + nx * 6, by - 0.8, bz + nz * 6);
            } else {
                // 정지(수렴/로컬 미니마): 공 앞쪽 낮은 각도
                desiredPos = new THREE.Vector3(bx, by + 1.5, bz + 4);
                desiredLook = new THREE.Vector3(bx, by - 0.5, bz - 2);
            }
        }

        // 첫 프레임: 현재 카메라 위치에서 부드럽게 전환 시작
        if (!smoothPos.current) {
            smoothPos.current = camera.position.clone();
            smoothLook.current.copy(desiredLook);
        }

        const t = Math.min(delta * 4, 1);
        smoothPos.current.lerp(desiredPos, t);
        smoothLook.current.lerp(desiredLook, t);

        camera.position.copy(smoothPos.current);
        camera.lookAt(smoothLook.current);
    });

    return null;
}

// ── 메인 씬 컴포넌트 ──
export default function GradientRaceScene() {
    const teams     = useRaceStore((s) => s.teams);
    const balls     = useRaceStore((s) => s.balls);
    const myTeamId  = useRaceStore((s) => s.myTeamId);
    const racePhase = useRaceStore((s) => s.racePhase);
    const mapLevel  = useRaceStore((s) => s.mapLevel);
    const [visible, setVisible] = useState(true);
    const [camMode, setCamMode] = useState('overview');

    const myBall    = myTeamId ? balls[myTeamId] : null;
    // 레이싱 중이고 공이 있을 때 카메라 토글 표시
    const showToggle = racePhase === 'racing' && Object.keys(balls).length > 0;

    // 탭 숨김/표시 감지 → 렌더링 일시정지
    useEffect(() => {
        const handleVisibility = () => setVisible(!document.hidden);
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    // 레이스 종료 시 조감도로 복귀
    useEffect(() => {
        if (racePhase === 'finished' || racePhase === 'waiting' || racePhase === 'setup') {
            setCamMode('overview');
        }
    }, [racePhase]);

    const cycleCamera = () => {
        setCamMode(prev => {
            const idx = CAM_MODES.indexOf(prev);
            return CAM_MODES[(idx + 1) % CAM_MODES.length];
        });
    };

    const { icon, label } = CAM_META[camMode];

    return (
        <div className={styles.wrapper}>
            <Canvas
                camera={{ position: [0, 18, 18], fov: 55 }}
                className={styles.canvas}
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
                    radius={80} depth={40} count={1000}
                    factor={2} saturation={0.5} fade speed={0.3}
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
                            // 지형뷰에서 내 공의 라벨 숨김 (카메라가 공 뒤에 붙어있어 텍스트 겹침)
                            hideLabel={camMode === 'follow1st' && teamId === myTeamId}
                        />
                    );
                })}

                {/* 최저점 마커 */}
                <GoalMarker mapLevel={mapLevel} />

                {/* 카메라 컨트롤: 조감도 = OrbitControls, 추적뷰 = FollowCamera */}
                {camMode === 'overview' ? (
                    <OrbitControls
                        enablePan
                        enableZoom
                        enableRotate
                        maxDistance={40}
                        minDistance={5}
                        maxPolarAngle={Math.PI / 2.2}
                        target={[0, 1, 0]}
                    />
                ) : (
                    // key를 camMode로 설정 → 모드 전환 시 컴포넌트 재마운트 → smoothPos 초기화
                    <FollowCamera key={camMode} ballData={myBall} mode={camMode} />
                )}
            </Canvas>

            {/* ── 카메라 전환 토글 버튼 (Canvas 위 DOM 오버레이) ── */}
            {showToggle && (
                <button
                    className={`${styles.camToggle} ${camMode !== 'overview' ? styles.camToggleActive : ''}`}
                    onClick={cycleCamera}
                    title="카메라 시점 전환 (조감도 → 추적뷰 → 지형뷰)"
                    aria-label={`카메라: ${label}`}
                >
                    <span className={styles.camIcon}>{icon}</span>
                    <span className={styles.camLabel}>{label}</span>
                    <span className={styles.camHint}>탭해서 전환</span>
                </button>
            )}

            {/* ── 추적 모드 안내 (첫 진입 시 잠깐 보여줌) ── */}
            {camMode !== 'overview' && (
                <div className={styles.camModeBadge}>
                    {icon} {camMode === 'follow3rd' ? '내 공을 따라가고 있어요' : '내 공 시점으로 내려가는 중'}
                </div>
            )}
        </div>
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

// 글로벌 미니멈 근처 마커 (Level 2 기준 0,2 위치)
function GoalMarker({ mapLevel = 2 }) {
    const minima = GLOBAL_MINIMA[mapLevel] || GLOBAL_MINIMA[2];
    const gx = minima.x;
    const gz = minima.z;
    const gy = lossFunctionByLevel(gx, gz, mapLevel);
    return (
        <group>
            <mesh position={[gx, gy + 0.5, gz]}>
                <octahedronGeometry args={[0.3, 0]} />
                <meshStandardMaterial
                    color="#fbbf24"
                    emissive="#fbbf24"
                    emissiveIntensity={1.5}
                    roughness={0.1}
                    metalness={1}
                />
            </mesh>
            <mesh position={[gx, gy + 0.05, gz]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.4, 0.6, 32]} />
                <meshBasicMaterial
                    color="#fbbf24"
                    transparent
                    opacity={0.5}
                    side={2}
                />
            </mesh>
        </group>
    );
}
