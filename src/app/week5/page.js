'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import WebGLErrorBoundary from '@/components/layout/WebGLErrorBoundary';
import Breadcrumb from '@/components/layout/Breadcrumb';
import useIsMobile from '@/lib/useIsMobile';
import { useClassStore } from '@/stores/useClassStore';
import { useRaceStore, TEAM_COLORS, calcGpPoints } from '@/stores/useRaceStore';
import { getSocket, connectSocket } from '@/lib/socket';
import { lossFunctionByLevel, gradientByLevel, MAP_LEVELS } from '@/lib/lossFunction';
import s from './page.module.css';

const GradientRaceScene = dynamic(
    () => import('@/components/3d/GradientRaceScene'),
    {
        ssr: false,
        loading: () => (
            <div className={s.loadingStyle}>
                <div className={s.loadingSpinner}>
                    <div className={`animate-spin ${s.loadingEmoji}`}>🏔️</div>
                </div>
                <div className={`animate-pulse-glow ${s.loadingBox}`}>
                    손실 지형 로딩 중...
                </div>
            </div>
        ),
    }
);

// GP 스테이지 정보
const GP_STAGES = [
    { stage: 1, level: 1, name: '완만한 언덕', emoji: '⛳', description: '워밍업! 경사를 따라 내려가세요' },
    { stage: 2, level: 2, name: '함정 지형', emoji: '🏔️', description: '로컬 최솟값 함정을 피해라!' },
    { stage: 3, level: 3, name: '악마의 지형', emoji: '🌋', description: '안장점과 좁은 계곡의 최종전!' },
];

export default function Week5Page() {
    const router = useRouter();
    const isMobile = useIsMobile();
    const studentName = useClassStore((st) => st.studentName);
    const schoolCode = useClassStore((st) => st.schoolCode);
    const roomCode = useClassStore((st) => st.roomCode);
    const addNotification = useClassStore((st) => st.addNotification);

    const racePhase = useRaceStore((st) => st.racePhase);
    const setRacePhase = useRaceStore((st) => st.setRacePhase);
    const teams = useRaceStore((st) => st.teams);
    const setTeams = useRaceStore((st) => st.setTeams);
    const balls = useRaceStore((st) => st.balls);
    const updateBalls = useRaceStore((st) => st.updateBalls);
    const myTeamId = useRaceStore((st) => st.myTeamId);
    const setMyTeamId = useRaceStore((st) => st.setMyTeamId);
    const myLearningRate = useRaceStore((st) => st.myLearningRate);
    const setMyLearningRate = useRaceStore((st) => st.setMyLearningRate);
    const myMomentum = useRaceStore((st) => st.myMomentum);
    const setMyMomentum = useRaceStore((st) => st.setMyMomentum);
    const results = useRaceStore((st) => st.results);
    const setResults = useRaceStore((st) => st.setResults);
    const reset = useRaceStore((st) => st.reset);
    const mapLevel = useRaceStore((st) => st.mapLevel);
    const setMapLevel = useRaceStore((st) => st.setMapLevel);

    // GP state
    const gpActive = useRaceStore((st) => st.gpActive);
    const setGpActive = useRaceStore((st) => st.setGpActive);
    const gpStage = useRaceStore((st) => st.gpStage);
    const setGpStage = useRaceStore((st) => st.setGpStage);
    const stageResults = useRaceStore((st) => st.stageResults);
    const addStageResult = useRaceStore((st) => st.addStageResult);
    const gpFinalResults = useRaceStore((st) => st.gpFinalResults);
    const setGpFinalResults = useRaceStore((st) => st.setGpFinalResults);
    const gpCountdown = useRaceStore((st) => st.gpCountdown);
    const setGpCountdown = useRaceStore((st) => st.setGpCountdown);

    const [isParamsSet, setIsParamsSet] = useState(false);
    const [alerts, setAlerts] = useState([]);
    const [isSoloMode, setIsSoloMode] = useState(false);
    const [showDeepDive, setShowDeepDive] = useState(false);
    const soloIntervalRef = useRef(null);

    // ── Socket 이벤트 ──
    useEffect(() => {
        const socket = getSocket();
        if (!socket.connected) connectSocket();

        const handleConnect = () => {
            if (roomCode) {
                socket.emit('join_class', {
                    studentName: studentName || '익명',
                    schoolCode: schoolCode || 'UNKNOWN',
                    roomCode,
                });
            }
        };

        if (socket.connected && roomCode) handleConnect();
        socket.on('connect', handleConnect);

        const handleRoomState = (data) => {
            if (data.raceTeams && Object.keys(data.raceTeams).length > 0) setTeams(data.raceTeams);
            if (data.racePhase && data.racePhase !== 'waiting') setRacePhase(data.racePhase);
            if (data.raceBalls && Object.keys(data.raceBalls).length > 0) updateBalls(data.raceBalls);
            if (data.mapLevel) setMapLevel(data.mapLevel);
        };
        socket.on('room_state', handleRoomState);

        const handleTeamsUpdated = (data) => setTeams(data.teams);
        const handleRaceStarted = (data) => {
            setRacePhase('racing');
            updateBalls(data.balls);
            if (data.mapLevel) setMapLevel(data.mapLevel);
            if (data.gpStage) setGpStage(data.gpStage);
        };
        const handleRaceTick = (data) => updateBalls(data.balls);
        const handleRaceAlert = (data) => {
            setAlerts((prev) => [{ id: Date.now(), ...data }, ...prev].slice(0, 10));
            addNotification(data.message);
        };
        const handleRaceFinished = (data) => {
            setRacePhase('finished');
            setResults(data.results);
        };
        const handleRaceReset = () => {
            reset();
            setIsParamsSet(false);
            setAlerts([]);
        };

        // GP 전용 이벤트
        const handleGpStarted = (data) => {
            setGpActive(true);
            setGpStage(data.currentStage);
            addNotification('🏎️ Grand Prix 시작!');
        };
        const handleGpStageComplete = (data) => {
            setRacePhase('stageResult');
            addStageResult(data.stage - 1, data.results);
            addNotification(`🏁 스테이지 ${data.stage}/3 완료!`);
        };
        const handleGpCountdown = (data) => {
            setGpCountdown(data.seconds);
        };
        const handleGpFinalResults = (data) => {
            setRacePhase('finished');
            setGpFinalResults(data.finalResults);
            addNotification('🏆 Grand Prix 종료! 종합 순위 발표!');
        };

        socket.on('race_teams_updated', handleTeamsUpdated);
        socket.on('race_started', handleRaceStarted);
        socket.on('race_tick', handleRaceTick);
        socket.on('race_alert', handleRaceAlert);
        socket.on('race_finished', handleRaceFinished);
        socket.on('race_reset', handleRaceReset);
        socket.on('gp_started', handleGpStarted);
        socket.on('gp_stage_complete', handleGpStageComplete);
        socket.on('gp_countdown', handleGpCountdown);
        socket.on('gp_final_results', handleGpFinalResults);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('room_state', handleRoomState);
            socket.off('race_teams_updated', handleTeamsUpdated);
            socket.off('race_started', handleRaceStarted);
            socket.off('race_tick', handleRaceTick);
            socket.off('race_alert', handleRaceAlert);
            socket.off('race_finished', handleRaceFinished);
            socket.off('race_reset', handleRaceReset);
            socket.off('gp_started', handleGpStarted);
            socket.off('gp_stage_complete', handleGpStageComplete);
            socket.off('gp_countdown', handleGpCountdown);
            socket.off('gp_final_results', handleGpFinalResults);
        };
    }, [roomCode]);

    // ── 파라미터 제출 ──
    const handleSubmitParams = useCallback(() => {
        const socket = getSocket();
        const teamId = socket.id;
        const colorIdx = Object.keys(teams).length % TEAM_COLORS.length;

        socket.emit('set_race_params', {
            teamId,
            teamName: studentName || '익명',
            color: TEAM_COLORS[colorIdx],
            learningRate: myLearningRate,
            momentum: myMomentum,
        });

        setMyTeamId(teamId);
        setIsParamsSet(true);
    }, [studentName, myLearningRate, myMomentum, teams]);

    // ── 혼자 연습 모드 (GP 3스테이지) ──
    const handleSoloPractice = useCallback(() => {
        setIsSoloMode(true);
        setGpActive(true);
        setGpStage(1);

        const myId = 'solo-me';
        const botId = 'solo-bot';

        setTeams({
            [myId]: { id: myId, name: studentName || '나', color: TEAM_COLORS[0], learningRate: myLearningRate, momentum: myMomentum },
            [botId]: { id: botId, name: 'AI 봇 (lr=0.1, m=0.9)', color: TEAM_COLORS[3], learningRate: 0.1, momentum: 0.9 },
        });
        setMyTeamId(myId);
        setIsParamsSet(true);

        // 솔로 GP: 스테이지 1부터 시작
        runSoloStage(1, myId, botId);
    }, [studentName, myLearningRate, myMomentum]);

    const soloStageResultsRef = useRef([[], [], []]);

    function runSoloStage(stage, myId, botId) {
        const level = stage; // stage 1=level 1, etc.
        setGpStage(stage);
        setMapLevel(level);
        setRacePhase('racing');

        const angle = Math.random() * Math.PI * 2;
        const radius = 6 + Math.random() * 2;
        const startX = Math.cos(angle) * radius;
        const startZ = Math.sin(angle) * radius;

        const localBalls = {
            [myId]: { x: startX, z: startZ, y: 0, vx: 0, vz: 0, trail: [], status: 'racing', loss: 0, lr: myLearningRate, momentum: myMomentum },
            [botId]: { x: startX + 0.5, z: startZ + 0.5, y: 0, vx: 0, vz: 0, trail: [], status: 'racing', loss: 0, lr: 0.1, momentum: 0.9 },
        };
        localBalls[myId].y = lossFunctionByLevel(localBalls[myId].x, localBalls[myId].z, level);
        localBalls[myId].loss = localBalls[myId].y;
        localBalls[botId].y = lossFunctionByLevel(localBalls[botId].x, localBalls[botId].z, level);
        localBalls[botId].loss = localBalls[botId].y;

        updateBalls(localBalls);

        if (soloIntervalRef.current) clearInterval(soloIntervalRef.current);
        soloIntervalRef.current = setInterval(() => {
            let allDone = true;

            for (const [, ball] of Object.entries(localBalls)) {
                if (ball.status !== 'racing') continue;
                allDone = false;

                const grad = gradientByLevel(ball.x, ball.z, level);
                ball.vx = ball.momentum * ball.vx - ball.lr * grad.gx;
                ball.vz = ball.momentum * ball.vz - ball.lr * grad.gz;
                ball.vx = Math.max(-10, Math.min(10, ball.vx));
                ball.vz = Math.max(-10, Math.min(10, ball.vz));
                ball.x += ball.vx;
                ball.z += ball.vz;
                ball.y = lossFunctionByLevel(ball.x, ball.z, level);
                ball.loss = ball.y;

                if (!isFinite(ball.x) || !isFinite(ball.z) || !isFinite(ball.y)) { ball.status = 'escaped'; continue; }
                if (isFinite(ball.x) && isFinite(ball.y) && isFinite(ball.z)) ball.trail.push({ x: ball.x, y: ball.y, z: ball.z });
                if (ball.trail.length > 200) ball.trail.shift();
                if (Math.abs(ball.x) > 12 || Math.abs(ball.z) > 12 || ball.y > 10) ball.status = 'escaped';
                const speed = Math.sqrt(ball.vx * ball.vx + ball.vz * ball.vz);
                if (speed < 0.001 && ball.trail.length > 30) ball.status = 'converged';
            }

            updateBalls({ ...localBalls });

            if (allDone) {
                clearInterval(soloIntervalRef.current);
                const res = Object.entries(localBalls)
                    .map(([id, b]) => ({
                        teamId: id, teamName: id === myId ? (studentName || '나') : 'AI 봇',
                        finalLoss: b.loss, status: b.status,
                    }))
                    .sort((a, b) => {
                        if (a.status === 'escaped' && b.status !== 'escaped') return 1;
                        if (b.status === 'escaped' && a.status !== 'escaped') return -1;
                        return a.finalLoss - b.finalLoss;
                    })
                    .map((r, i) => ({ ...r, rank: i + 1, points: r.status === 'escaped' ? 0 : Math.max(0, 2 - i) }));

                soloStageResultsRef.current[stage - 1] = res;
                addStageResult(stage - 1, res);

                if (stage < 3) {
                    setRacePhase('stageResult');
                    let cd = 5;
                    setGpCountdown(cd);
                    const cdInterval = setInterval(() => {
                        cd--;
                        setGpCountdown(cd);
                        if (cd <= 0) {
                            clearInterval(cdInterval);
                            runSoloStage(stage + 1, myId, botId);
                        }
                    }, 1000);
                } else {
                    // 종합 결과 계산
                    const combined = {};
                    for (let si = 0; si < 3; si++) {
                        for (const r of soloStageResultsRef.current[si]) {
                            if (!combined[r.teamId]) combined[r.teamId] = { teamId: r.teamId, teamName: r.teamName, totalPoints: 0, stageRanks: [0, 0, 0] };
                            combined[r.teamId].totalPoints += r.points;
                            combined[r.teamId].stageRanks[si] = r.rank;
                        }
                    }
                    const final = Object.values(combined)
                        .sort((a, b) => b.totalPoints - a.totalPoints)
                        .map((r, i) => ({ ...r, gpRank: i + 1 }));
                    setGpFinalResults(final);
                    setRacePhase('finished');
                }
            }
        }, 33);
    }

    useEffect(() => {
        return () => { if (soloIntervalRef.current) clearInterval(soloIntervalRef.current); };
    }, []);

    const teamCount = Object.keys(teams).length;
    const myBall = balls[myTeamId];
    const currentStageInfo = GP_STAGES.find(g => g.stage === gpStage) || GP_STAGES[0];

    return (
        <div className={`${s.container} ${isMobile ? s.containerMobile : ''}`}>
            {/* ── 모바일: 3D 캔버스 상단 ── */}
            {isMobile && (
                <div className={s.mobileCanvas}>
                    <WebGLErrorBoundary fallbackProps={{
                        weekTitle: '3D 경사하강법 레이싱',
                        conceptSummary: '경사하강법(Gradient Descent)은 손실 함수의 최저점을 찾아가는 최적화 알고리즘입니다.',
                    }}>
                        <GradientRaceScene />
                    </WebGLErrorBoundary>
                    <div className={s.canvasOverlay}>
                        <span className={`badge-glow ${s.badgeMobile}`}>
                            🏔️ 터치로 탐색
                        </span>
                    </div>
                </div>
            )}

            {/* ── 좌측 패널 ── */}
            <div className={`${s.leftPanel} ${isMobile ? s.leftPanelMobile : ''}`}>
                <Breadcrumb
                    items={[{ label: '5주차 인트로', href: '/week5/intro' }]}
                    current="경사하강법 GP"
                />

                {/* 헤더 */}
                <div className={s.header}>
                    <h2 className={s.weekTitle}>5주차</h2>
                    <h1 className={s.moduleTitle}>
                        <span className="text-gradient">경사하강법 Grand Prix</span>
                    </h1>
                    <p className={s.description}>
                        3개 스테이지를 연속 레이싱!
                        <br />
                        종합 포인트로 <strong>최종 챔피언</strong>을 가립니다 🏆
                    </p>
                </div>

                {/* GP 진행 표시 */}
                {gpActive && (
                    <div className={`glass-card ${s.statusCard}`}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                            {GP_STAGES.map(g => {
                                const isDone = gpStage > g.stage || (gpStage === g.stage && (racePhase === 'stageResult' || racePhase === 'finished'));
                                const isCurrent = gpStage === g.stage && racePhase === 'racing';
                                return (
                                    <div key={g.stage} style={{
                                        flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 10,
                                        background: isCurrent ? 'rgba(124,92,252,0.2)' : isDone ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                                        border: isCurrent ? '2px solid #7c5cfc' : isDone ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                                        transition: 'all 0.3s',
                                    }}>
                                        <div style={{ fontSize: '1.3rem' }}>{g.emoji}</div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: isCurrent ? '#a78bfa' : isDone ? '#10b981' : 'var(--text-dim)' }}>
                                            {isDone ? '✅' : isCurrent ? '🏎️ 진행중' : `Stage ${g.stage}`}
                                        </div>
                                        <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>{g.name}</div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className={s.statusRow}>
                            <span className="badge-glow online">
                                {racePhase === 'racing' ? `🏁 Stage ${gpStage} 레이싱` :
                                    racePhase === 'stageResult' ? `📊 Stage ${gpStage} 결과` :
                                        racePhase === 'finished' ? '🏆 Grand Prix 완료' : '⏳ 대기'}
                            </span>
                            <span className={s.statusText}>{teamCount}팀 참가</span>
                        </div>
                    </div>
                )}

                {/* 일반 모드 상태 표시 */}
                {!gpActive && (
                    <div className={`glass-card ${s.statusCard}`}>
                        <div className={s.statusRow}>
                            <span className="badge-glow online">
                                {racePhase === 'racing' ? '🏁 레이싱' : racePhase === 'finished' ? '🏆 완료' : '⏳ 대기'}
                            </span>
                            <span className={s.statusText}>{teamCount}팀 참가</span>
                        </div>
                    </div>
                )}

                {/* ── 파라미터 설정 ── */}
                {racePhase === 'setup' && !isParamsSet && (
                    <div className={`glass-card ${s.inputCard}`}>
                        <label className="label-cosmic">🎛️ 하이퍼파라미터 설정</label>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 12 }}>
                            이 파라미터로 3개 스테이지 모두 도전합니다. 신중하게 선택하세요!
                        </p>

                        {/* 프리셋 버튼 */}
                        <div className={s.presetRow}>
                            {[
                                { label: '🛡️ 안전', lr: 0.05, m: 0.9, color: '#10b981' },
                                { label: '⚖️ 균형', lr: 0.1, m: 0.8, color: '#3b82f6' },
                                { label: '🚀 빠름', lr: 0.5, m: 0.5, color: '#f59e0b' },
                                { label: '💥 위험', lr: 1.2, m: 0.3, color: '#f43f5e' },
                            ].map(p => (
                                <button key={p.label} onClick={() => { setMyLearningRate(p.lr); setMyMomentum(p.m); }}
                                    style={{
                                        flex: 1, minWidth: 70, padding: '6px 8px', borderRadius: 8,
                                        border: `1px solid ${p.color}44`, background: `${p.color}15`,
                                        color: p.color, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                    }}>
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <div className={s.paramRow}>
                            <span className={s.paramLabel}>학습률 (Learning Rate)</span>
                            <input type="range" className="slider-cosmic" min={0.01} max={1.5} step={0.01}
                                value={myLearningRate} onChange={(e) => setMyLearningRate(parseFloat(e.target.value))} />
                            <span className={s.paramValue}>{myLearningRate.toFixed(2)}</span>
                        </div>
                        <p className={s.lrExplain}>
                            학습률 = 한 번에 얼마나 크게 이동할지. 너무 크면 정답을 지나치고, 너무 작으면 학습이 너무 느립니다.
                        </p>
                        {myLearningRate > 0.8 ? (
                            <div className={s.highLrWarning} style={{ animation: myLearningRate > 1.0 ? 'pulseGlow 1s infinite' : 'none' }}>
                                {myLearningRate > 1.0
                                    ? '🔥 극도로 높음! 거의 확실히 발산(diverge)합니다!'
                                    : '⚠️ 위험 구간! 손실이 폭발할 수 있어요.'}
                                <div className={s.divergeDetail}>발산 = 최적점에서 점점 멀어져 Loss가 무한대로 ↑</div>
                            </div>
                        ) : (
                            <p className={s.paramHint}>
                                {myLearningRate < 0.05 ? '🐌 너무 작으면 늦게 도착해요...' : '✅ 적당한 범위입니다'}
                            </p>
                        )}

                        <div className={s.paramRow}>
                            <span className={s.paramLabel}>모멘텀 (Momentum)</span>
                            <input type="range" className="slider-cosmic" min={0} max={0.99} step={0.01}
                                value={myMomentum} onChange={(e) => setMyMomentum(parseFloat(e.target.value))} />
                            <span className={s.paramValue}>{myMomentum.toFixed(2)}</span>
                        </div>
                        <p className={s.paramHint}>
                            모멘텀은 관성! 높으면 지역 최솟값을 탈출할 수 있어요.
                        </p>

                        <div className={s.submitBtnRow}>
                            <button className={`btn-nova ${s.submitBtn}`} onClick={handleSoloPractice}>
                                🎮 혼자 GP 연습
                            </button>
                            {roomCode && (
                                <button className={`btn-nova ${s.submitBtn}`} onClick={handleSubmitParams}>
                                    🏎️ 수업 참가
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* 파라미터 확정 후 대기 */}
                {racePhase === 'setup' && isParamsSet && (
                    <div className={`glass-card ${s.waitCard}`}>
                        <div className={s.waitIcon}>🏎️</div>
                        <p className={s.waitText}>
                            파라미터 세팅 완료!<br />
                            선생님이 Grand Prix를 시작하면 출발합니다.
                        </p>
                        <div className={s.myParams}>
                            <span>학습률: <strong>{myLearningRate.toFixed(2)}</strong></span>
                            <span>모멘텀: <strong>{myMomentum.toFixed(2)}</strong></span>
                        </div>
                    </div>
                )}

                {/* ── 스테이지 전환 카운트다운 ── */}
                {racePhase === 'stageResult' && gpActive && (
                    <div className={`glass-card ${s.resultCard}`}>
                        <label className="label-cosmic">
                            🏁 Stage {gpStage} 완료! — {currentStageInfo.emoji} {currentStageInfo.name}
                        </label>
                        <div className={s.resultList}>
                            {(stageResults[gpStage - 1] || []).map((r) => (
                                <div key={r.teamId}
                                    className={`${s.resultItem} ${r.teamId === myTeamId ? s.resultItemMine : ''}`}>
                                    <span className={s.resultRank}>
                                        {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
                                    </span>
                                    <span className={s.resultName}>{r.teamName}</span>
                                    <span className={s.resultLoss} style={{ color: r.status === 'escaped' ? '#f43f5e' : '#10b981' }}>
                                        {r.status === 'escaped' ? '이탈 (0pt)' : `${r.points || 0}pt`}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {gpCountdown > 0 && gpStage < 3 && (
                            <div style={{
                                textAlign: 'center', marginTop: 16, padding: '12px',
                                background: 'rgba(124,92,252,0.1)', borderRadius: 12,
                                border: '1px solid rgba(124,92,252,0.3)',
                            }}>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#a78bfa' }}>
                                    {gpCountdown}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                                    다음 스테이지까지...
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── 레이싱 중: 실시간 데이터 ── */}
                {racePhase === 'racing' && myBall && (
                    <div className={`glass-card ${s.liveCard}`}>
                        <label className="label-cosmic">
                            📊 실시간 현황 {gpActive ? `— Stage ${gpStage}: ${currentStageInfo.emoji} ${currentStageInfo.name}` : ''}
                        </label>
                        <div className={s.liveGrid}>
                            <div className={s.liveItem}>
                                <span className={s.liveLabel}>현재 Loss</span>
                                <span className={s.liveValue} style={{
                                    color: myBall.loss > 5 ? '#f43f5e' : myBall.loss > 2 ? '#fbbf24' : '#10b981',
                                }}>{myBall.loss?.toFixed(4)}</span>
                            </div>
                            <div className={s.liveItem}>
                                <span className={s.liveLabel}>위치 (X, Z)</span>
                                <span className={s.liveValue}>({myBall.x?.toFixed(2)}, {myBall.z?.toFixed(2)})</span>
                            </div>
                            <div className={s.liveItem}>
                                <span className={s.liveLabel}>상태</span>
                                <span className={s.liveValue} style={{
                                    color: myBall.status === 'escaped' ? '#f43f5e' :
                                        myBall.status === 'converged' ? '#10b981' : '#fbbf24',
                                }}>
                                    {myBall.status === 'escaped' ? '💥 발산! (이탈)' :
                                        myBall.status === 'converged' ? '🏁 수렴!' : '🏎️ 질주 중'}
                                </span>
                            </div>
                        </div>

                        {myBall.trail && myBall.trail.length > 2 && (
                            <div className={s.lossHistoryWrap}>
                                <div className={s.lossHistoryLabel}>Loss 히스토리</div>
                                <div className={s.lossChart}>
                                    {myBall.trail.slice(-50).map((p, i, arr) => {
                                        const maxLoss = Math.max(...arr.map(t => t.y), 1);
                                        const h = Math.min(100, Math.max(2, (p.y / maxLoss) * 100));
                                        return (
                                            <div key={i} style={{
                                                flex: 1, minWidth: 2, height: `${h}%`,
                                                background: i === arr.length - 1 ? '#fbbf24' :
                                                    p.y > 3 ? 'rgba(244,63,94,0.6)' : 'rgba(16,185,129,0.5)',
                                                borderRadius: '2px 2px 0 0', transition: 'height 0.1s',
                                            }} />
                                        );
                                    })}
                                </div>
                                <div className={s.lossChartFooter}>
                                    <span>← 과거</span>
                                    <span className={s.lossChartCurrent}>현재: {myBall.loss?.toFixed(3)}</span>
                                </div>
                            </div>
                        )}

                        {myBall.status === 'escaped' && (
                            <div className={s.escapedBox}>
                                💥 학습률이 너무 커서 발산했습니다!<br />
                                <span className={s.escapedHint}>다음 스테이지에서는 회복 기회가 있습니다!</span>
                            </div>
                        )}
                    </div>
                )}

                {/* 실시간 리더보드 */}
                {racePhase === 'racing' && Object.keys(balls).length > 1 && (
                    <div className={`glass-card ${s.leaderboardCard}`}>
                        <label className="label-cosmic">📊 실시간 순위</label>
                        <div className={s.leaderboardList}>
                            {Object.entries(balls)
                                .map(([id, ball]) => ({
                                    teamId: id, teamName: teams[id]?.name || id,
                                    color: teams[id]?.color || '#a78bfa', loss: ball.loss, status: ball.status,
                                }))
                                .sort((a, b) => {
                                    if (a.status === 'escaped' && b.status !== 'escaped') return 1;
                                    if (a.status !== 'escaped' && b.status === 'escaped') return -1;
                                    return a.loss - b.loss;
                                })
                                .map((entry, idx) => (
                                    <div key={entry.teamId}
                                        className={`${s.leaderboardItem} ${entry.teamId === myTeamId ? s.leaderboardItemMine : ''}`}
                                        style={entry.status === 'escaped' ? { opacity: 0.5 } : undefined}>
                                        <span className={s.leaderboardRank}>
                                            {entry.status === 'escaped' ? '💥' :
                                                entry.status === 'converged' ? '🏁' :
                                                    idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                        </span>
                                        <div className={s.leaderboardDot} style={{ background: entry.color }} />
                                        <span className={s.leaderboardName}>{entry.teamName}</span>
                                        <span className={s.leaderboardLoss} style={{
                                            color: entry.status === 'escaped' ? '#f43f5e' :
                                                entry.status === 'converged' ? '#10b981' :
                                                    entry.loss < 2 ? '#10b981' : entry.loss < 4 ? '#fbbf24' : '#f43f5e',
                                        }}>
                                            {entry.status === 'escaped' ? '이탈' : entry.loss?.toFixed(3)}
                                        </span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )}

                {/* ── GP 최종 결과 (종합 시상식) ── */}
                {racePhase === 'finished' && gpActive && gpFinalResults.length > 0 && (
                    <div className={`glass-card ${s.resultCard}`}>
                        <label className="label-cosmic" style={{ fontSize: '1rem' }}>
                            🏆 Grand Prix 종합 시상식
                        </label>

                        {/* 포디엄 */}
                        <div style={{
                            display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
                            gap: 8, margin: '16px 0', padding: '12px 0',
                        }}>
                            {[1, 0, 2].map(idx => {
                                const r = gpFinalResults[idx];
                                if (!r) return null;
                                const heights = ['120px', '90px', '70px'];
                                const medals = ['🥇', '🥈', '🥉'];
                                const colors = ['#fbbf24', '#94a3b8', '#cd7f32'];
                                const orderIdx = idx === 1 ? 0 : idx === 0 ? 1 : 2;
                                return (
                                    <div key={r.teamId} style={{
                                        textAlign: 'center', flex: 1,
                                    }}>
                                        <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{medals[orderIdx]}</div>
                                        <div style={{
                                            fontSize: '0.75rem', fontWeight: 700,
                                            color: r.teamId === myTeamId ? '#a78bfa' : '#fff',
                                            marginBottom: 4,
                                        }}>{r.teamName}</div>
                                        <div style={{
                                            height: heights[orderIdx],
                                            background: `linear-gradient(to top, ${colors[orderIdx]}33, ${colors[orderIdx]}11)`,
                                            border: `1px solid ${colors[orderIdx]}66`,
                                            borderRadius: '8px 8px 0 0',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 800, fontSize: '1.1rem', color: colors[orderIdx],
                                        }}>
                                            {r.totalPoints}pt
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* 전체 순위 테이블 */}
                        <div className={s.resultList}>
                            {gpFinalResults.map((r) => (
                                <div key={r.teamId}
                                    className={`${s.resultItem} ${r.teamId === myTeamId ? s.resultItemMine : ''}`}>
                                    <span className={s.resultRank}>
                                        {r.gpRank === 1 ? '🥇' : r.gpRank === 2 ? '🥈' : r.gpRank === 3 ? '🥉' : `#${r.gpRank}`}
                                    </span>
                                    <span className={s.resultName}>{r.teamName}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                        S1:{r.stageRanks[0]} S2:{r.stageRanks[1]} S3:{r.stageRanks[2]}
                                    </span>
                                    <span className={s.resultLoss} style={{ color: '#a78bfa', fontWeight: 800 }}>
                                        {r.totalPoints}pt
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 일반 모드 결과 */}
                {racePhase === 'finished' && !gpActive && results.length > 0 && (
                    <div className={`glass-card ${s.resultCard}`}>
                        <label className="label-cosmic">🏆 레이스 결과</label>
                        <div className={s.resultList}>
                            {results.map((r) => (
                                <div key={r.teamId}
                                    className={`${s.resultItem} ${r.teamId === myTeamId ? s.resultItemMine : ''}`}>
                                    <span className={s.resultRank}>
                                        {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
                                    </span>
                                    <span className={s.resultName}>{r.teamName}</span>
                                    <span className={s.resultLoss} style={{ color: r.status === 'escaped' ? '#f43f5e' : '#10b981' }}>
                                        {r.status === 'escaped' ? '이탈' : `Loss: ${r.finalLoss?.toFixed(3)}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 알림 */}
                {alerts.length > 0 && (
                    <div className={`glass-card ${s.alertCard}`}>
                        <label className="label-cosmic">⚡ 알림</label>
                        {alerts.slice(0, 5).map((a) => (
                            <div key={a.id} className={s.alertItem}>{a.message}</div>
                        ))}
                    </div>
                )}

                {/* 팀 목록 */}
                <div className={`glass-card ${s.teamList}`}>
                    <label className="label-cosmic">🏎️ 참가 팀</label>
                    <div className={s.teamScroll}>
                        {Object.entries(teams).map(([id, team]) => (
                            <div key={id} className={s.teamItem}>
                                <div className={s.teamDot} style={{ background: team.color }} />
                                <span className={s.teamNameText}>{team.name}</span>
                                <span className={s.teamParams}>lr:{team.learningRate} m:{team.momentum}</span>
                            </div>
                        ))}
                        {teamCount === 0 && (
                            <p className={s.emptyText}>아직 참가한 팀이 없어요...</p>
                        )}
                    </div>
                </div>

                {/* ── Theory Section ── */}
                <div className={`glass-card ${s.card}`}>
                    <label className="label-cosmic">🤖 LLM 학습의 비밀</label>
                    <div className={s.theoryBody}>
                        <div className={s.lossTip}>
                            💡 <strong className={s.colorGreen}>Loss(손실) 함수란?</strong> —
                            AI가 얼마나 틀렸는지를 숫자로 나타내는 함수. 이 값을 줄이는 것이 학습의 목표입니다.
                            Loss가 <strong>0에 가까울수록</strong> 정확한 예측이에요.
                        </div>
                        <p className={s.mb10}>
                            <strong>1. 천문학적인 비용 (GPU)</strong><br />
                            GPT-4를 학습시킬 때는 이 경사하강법을 <strong>수천 대의 GPU</strong>에서 동시에 돌립니다.
                            전기세만 수백억 원이 나오는데, 그 이유가 바로 이 &quot;최저점 찾기&quot;를 엄청나게 많이 반복해야 하기 때문입니다.
                        </p>
                        <p className={s.mb10}>
                            <strong>2. 학습률(Learning Rate) 스케줄링</strong><br />
                            처음엔 과감하게(Step을 크게) 내려가다가, 최저점에 가까워지면 아주 조심스럽게(Step을 작게) 이동합니다.
                            이것을 <strong>&quot;Learning Rate Scheduler&quot;</strong>라고 부릅니다.
                        </p>
                        <p className={s.mb10}>
                            <strong>3. 옵티마이저(Optimizer) 비교</strong>
                        </p>
                        <div className={s.tableWrap}>
                            <div className={s.tableHeader}>
                                <div className={s.tableHeaderCell}>옵티마이저</div>
                                <div className={s.tableHeaderCell}>특징</div>
                                <div className={s.tableHeaderCell}>사용처</div>
                            </div>
                            {[
                                { name: 'SGD', feat: '가장 기본적인 경사하강. 모멘텀(관성) 추가 가능', use: '간단한 모델, 연구', color: '#94a3b8' },
                                { name: 'Adam', feat: '학습률을 자동으로 조절 + 모멘텀 결합 (만능형)', use: 'GPT, BERT 등 LLM', color: '#10b981' },
                                { name: 'AdaGrad', feat: '자주 등장하는 파라미터는 천천히, 드문 파라미터는 빠르게', use: '희소 데이터 (NLP)', color: '#3b82f6' },
                                { name: 'AdamW', feat: 'Adam + 가중치 감쇠(과적합 방지)', use: 'GPT-3, LLaMA', color: '#a78bfa' },
                            ].map(o => (
                                <div key={o.name} className={s.tableRow}>
                                    <div className={s.tableNameCell} style={{ color: o.color }}>{o.name}</div>
                                    <div className={s.tableDimCell}>{o.feat}</div>
                                    <div className={s.tableDimCell}>{o.use}</div>
                                </div>
                            ))}
                        </div>
                        <div className={s.tipBox}>
                            💡 <strong>실전 팁:</strong> 대부분의 LLM 학습에는 <strong className={s.colorEmerald}>AdamW</strong>가 사용됩니다.
                            이 게임에서 사용한 SGD+Momentum을 기반으로 학습률 자동 조절이 추가된 것입니다.
                        </div>
                    </div>
                </div>

                {/* 한 걸음 더 */}
                <div className={s.deepDiveWrap}>
                    <button onClick={() => setShowDeepDive(!showDeepDive)} className={s.deepDiveToggle}>
                        {showDeepDive ? '▼' : '▶'} 한 걸음 더: Loss 함수는 어떤 종류가 있을까?
                    </button>
                    {showDeepDive && (
                        <div className={s.deepDiveContent}>
                            <p className={s.deepDiveP}>
                                <strong className={s.colorYellow}>Cross-Entropy Loss</strong> —
                                GPT가 사용하는 Loss 함수! 모델이 예측한 확률 분포와 정답 사이의 차이를 측정해요.
                            </p>
                            <p className={s.deepDiveP}>
                                <strong className={s.colorGreen}>MSE (Mean Squared Error)</strong> —
                                예측값과 정답의 차이를 제곱해서 평균 낸 것. 숫자 예측(회귀) 문제에 많이 써요.
                            </p>
                            <p>
                                <strong className={s.colorRed}>핵심 포인트</strong> —
                                어떤 Loss를 선택하느냐에 따라 AI가 &quot;무엇을 잘하려고 노력하는지&quot;가 달라져요.
                                Loss 함수는 AI에게 주는 <strong>성적표</strong>와 같습니다!
                            </p>
                        </div>
                    )}
                </div>

                {/* 네비게이션 */}
                <div className={s.navRow}>
                    <button onClick={() => router.push('/week5/intro')} className={s.backBtn}>← 인트로로</button>
                    <button className={`btn-nova ${s.nextBtn}`} onClick={() => router.push('/week6/intro')}>
                        <span>🧪 6주차: 인공 뉴런 →</span>
                    </button>
                </div>
            </div>

            {/* ── 우측: 3D 캔버스 (데스크톱만) ── */}
            {!isMobile && (
                <div className={s.canvasWrapper}>
                    <WebGLErrorBoundary fallbackProps={{
                        weekTitle: '3D 경사하강법 레이싱',
                        conceptSummary: '경사하강법(Gradient Descent)은 손실 함수의 최저점을 찾아가는 최적화 알고리즘입니다.',
                    }}>
                        <GradientRaceScene />
                    </WebGLErrorBoundary>

                    <div className={s.canvasOverlay}>
                        <span className={`badge-glow ${s.badgeDesktop}`}>
                            {gpActive
                                ? `${currentStageInfo.emoji} Stage ${gpStage}: ${currentStageInfo.name}`
                                : '🏔️ 손실 지형 · 마우스로 드래그하여 탐색'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
