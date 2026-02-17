'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import WebGLErrorBoundary from '@/components/layout/WebGLErrorBoundary';
import Breadcrumb from '@/components/layout/Breadcrumb';
import useIsMobile from '@/lib/useIsMobile';
import { useClassStore } from '@/stores/useClassStore';
import { useRaceStore, TEAM_COLORS } from '@/stores/useRaceStore';
import { getSocket, connectSocket } from '@/lib/socket';
import { lossFunction, gradient as gradientFn } from '@/lib/lossFunction';
import s from './page.module.css';

// Three.js SSR 미지원 → 동적 임포트
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

        const handleTeamsUpdated = (data) => {
            setTeams(data.teams);
        };
        const handleRaceStarted = (data) => {
            setRacePhase('racing');
            updateBalls(data.balls);
        };
        const handleRaceTick = (data) => {
            updateBalls(data.balls);
        };
        const handleRaceAlert = (data) => {
            setAlerts((prev) => [
                { id: Date.now(), ...data },
                ...prev,
            ].slice(0, 10));
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

        socket.on('race_teams_updated', handleTeamsUpdated);
        socket.on('race_started', handleRaceStarted);
        socket.on('race_tick', handleRaceTick);
        socket.on('race_alert', handleRaceAlert);
        socket.on('race_finished', handleRaceFinished);
        socket.on('race_reset', handleRaceReset);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('race_teams_updated', handleTeamsUpdated);
            socket.off('race_started', handleRaceStarted);
            socket.off('race_tick', handleRaceTick);
            socket.off('race_alert', handleRaceAlert);
            socket.off('race_finished', handleRaceFinished);
            socket.off('race_reset', handleRaceReset);
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

    // ── 혼자 연습 모드 ──
    const handleSoloPractice = useCallback(() => {
        setIsSoloMode(true);
        const myId = 'solo-me';
        const botId = 'solo-bot';

        // 팀 설정
        setTeams({
            [myId]: { id: myId, name: studentName || '나', color: TEAM_COLORS[0], learningRate: myLearningRate, momentum: myMomentum },
            [botId]: { id: botId, name: 'AI 봇 (lr=0.1, m=0.9)', color: TEAM_COLORS[3], learningRate: 0.1, momentum: 0.9 },
        });
        setMyTeamId(myId);

        // 랜덤 시작점 (높은 곳에서 시작하도록 반경 6~8 사이 랜덤)
        const angle = Math.random() * Math.PI * 2;
        const radius = 6 + Math.random() * 2; // 반경 6~8
        const startX = Math.cos(angle) * radius;
        const startZ = Math.sin(angle) * radius;

        const localBalls = {
            [myId]: { x: startX, z: startZ, y: 0, vx: 0, vz: 0, trail: [], status: 'racing', loss: 0, lr: myLearningRate, momentum: myMomentum },
            [botId]: { x: startX + 0.5, z: startZ + 0.5, y: 0, vx: 0, vz: 0, trail: [], status: 'racing', loss: 0, lr: 0.1, momentum: 0.9 },
        };
        localBalls[myId].y = lossFunction(localBalls[myId].x, localBalls[myId].z);
        localBalls[myId].loss = localBalls[myId].y;
        localBalls[botId].y = lossFunction(localBalls[botId].x, localBalls[botId].z);
        localBalls[botId].loss = localBalls[botId].y;

        updateBalls(localBalls);
        setRacePhase('racing');
        setIsParamsSet(true);

        // 로컬 물리 시뮬레이션 (30fps)
        if (soloIntervalRef.current) clearInterval(soloIntervalRef.current);
        soloIntervalRef.current = setInterval(() => {
            let allDone = true;

            for (const [teamId, ball] of Object.entries(localBalls)) {
                if (ball.status !== 'racing') continue;
                allDone = false;

                const grad = gradientFn(ball.x, ball.z);
                ball.vx = ball.momentum * ball.vx - ball.lr * grad.gx;
                ball.vz = ball.momentum * ball.vz - ball.lr * grad.gz;
                ball.x += ball.vx;
                ball.z += ball.vz;
                ball.y = lossFunction(ball.x, ball.z);
                ball.loss = ball.y;
                ball.trail.push({ x: ball.x, y: ball.y, z: ball.z });
                if (ball.trail.length > 200) ball.trail.shift();

                // 이탈 판정
                if (Math.abs(ball.x) > 12 || Math.abs(ball.z) > 12 || ball.y > 10) {
                    ball.status = 'escaped';
                }
                // 수렴 판정
                const speed = Math.sqrt(ball.vx * ball.vx + ball.vz * ball.vz);
                if (speed < 0.001 && ball.trail.length > 30) {
                    ball.status = 'converged';
                }
            }

            updateBalls({ ...localBalls });

            if (allDone) {
                clearInterval(soloIntervalRef.current);
                setRacePhase('finished');
                const res = Object.entries(localBalls).map(([id, b]) => ({
                    teamId: id,
                    teamName: id === myId ? (studentName || '나') : 'AI 봇',
                    finalLoss: b.loss,
                    status: b.status,
                }));
                setResults(res);
            }
        }, 33);
    }, [studentName, myLearningRate, myMomentum]);

    // cleanup
    useEffect(() => {
        return () => { if (soloIntervalRef.current) clearInterval(soloIntervalRef.current); };
    }, []);

    const teamCount = Object.keys(teams).length;
    const myBall = balls[myTeamId];

    return (
        <div className={`${s.container} ${isMobile ? s.containerMobile : ''}`}>
            {/* ── 모바일: 3D 캔버스 상단 ── */}
            {isMobile && (
                <div className={s.mobileCanvas}>
                    <WebGLErrorBoundary fallbackProps={{
                        weekTitle: '3D 경사하강법 레이싱',
                        conceptSummary: '경사하강법(Gradient Descent)은 손실 함수의 최저점을 찾아가는 최적화 알고리즘입니다. 학습률이 크면 빠르지만 발산 위험이 있고, 작으면 안전하지만 느립니다.',
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
                {/* 빵크럼 */}
                <Breadcrumb
                    items={[{ label: '5주차 인트로', href: '/week5/intro' }]}
                    current="경사하강법 레이싱"
                />

                {/* 헤더 */}
                <div className={s.header}>
                    <h2 className={s.weekTitle}>5주차</h2>
                    <h1 className={s.moduleTitle}>
                        <span className="text-gradient">경사하강법 레이싱</span>
                    </h1>
                    <p className={s.description}>
                        학습률과 모멘텀을 조절해 손실 지형의
                        <br />
                        <strong>최저점</strong>에 가장 먼저 도달하세요! 🏎️💨
                    </p>
                    <p className={s.whyNote}>
                        왜 경사하강법이 필요할까? AI가 틀린 답을 냈을 때, 어떻게 하면 더 나은 답을 낼 수 있을까? 경사하강법은 &quot;오차를 줄이는 방향으로 조금씩 이동하기&quot;라는 가장 기본적인 학습 방법입니다.
                    </p>
                </div>

                {/* 접속 현황 */}
                <div className={`glass-card ${s.statusCard}`}>
                    <div className={s.statusRow}>
                        <span className="badge-glow online">
                            {racePhase === 'racing' ? '🏁 레이싱' : racePhase === 'finished' ? '🏆 완료' : '⏳ 대기'}
                        </span>
                        <span className={s.statusText}>
                            {teamCount}팀 참가
                        </span>
                    </div>
                </div>

                {/* 파라미터 설정 */}
                {racePhase === 'setup' && !isParamsSet && (
                    <div className={`glass-card ${s.inputCard}`}>
                        <label className="label-cosmic">🎛️ 하이퍼파라미터 설정</label>

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
                            <input
                                type="range"
                                className="slider-cosmic"
                                min={0.01}
                                max={1.5}
                                step={0.01}
                                value={myLearningRate}
                                onChange={(e) => setMyLearningRate(parseFloat(e.target.value))}
                            />
                            <span className={s.paramValue}>{myLearningRate.toFixed(2)}</span>
                        </div>
                        <p className={s.lrExplain}>
                            학습률 = 한 번에 얼마나 크게 이동할지. 너무 크면 정답을 지나치고, 너무 작으면 학습이 너무 느립니다.
                        </p>
                        {myLearningRate > 0.8 ? (
                            <div className={s.highLrWarning}
                                style={{
                                    animation: myLearningRate > 1.0 ? 'pulseGlow 1s infinite' : 'none',
                                }}>
                                {myLearningRate > 1.0
                                    ? '🔥 극도로 높음! 거의 확실히 발산(diverge)합니다!'
                                    : '⚠️ 위험 구간! 손실이 폭발할 수 있어요.'}
                                <div className={s.divergeDetail}>
                                    발산 = 최적점에서 점점 멀어져 Loss가 무한대로 ↑
                                </div>
                            </div>
                        ) : (
                            <p className={s.paramHint}>
                                {myLearningRate < 0.05
                                    ? '🐌 너무 작으면 늦게 도착해요...'
                                    : '✅ 적당한 범위입니다'}
                            </p>
                        )}

                        <div className={s.paramRow}>
                            <span className={s.paramLabel}>모멘텀 (Momentum)</span>
                            <input
                                type="range"
                                className="slider-cosmic"
                                min={0}
                                max={0.99}
                                step={0.01}
                                value={myMomentum}
                                onChange={(e) => setMyMomentum(parseFloat(e.target.value))}
                            />
                            <span className={s.paramValue}>{myMomentum.toFixed(2)}</span>
                        </div>
                        <p className={s.paramHint}>
                            모멘텀은 관성! 높으면 지역 최솟값을 탈출할 수 있어요.
                        </p>

                        <div className={s.submitBtnRow}>
                            <button
                                className={`btn-nova ${s.submitBtn}`}
                                onClick={handleSoloPractice}
                            >
                                🎮 혼자 연습
                            </button>
                            {roomCode && (
                                <button
                                    className={`btn-nova ${s.submitBtn}`}
                                    onClick={handleSubmitParams}
                                >
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
                            선생님이 레이스를 시작하면 출발합니다.
                        </p>
                        <div className={s.myParams}>
                            <span>학습률: <strong>{myLearningRate.toFixed(2)}</strong></span>
                            <span>모멘텀: <strong>{myMomentum.toFixed(2)}</strong></span>
                        </div>
                    </div>
                )}

                {/* 레이싱 중: 실시간 데이터 + Loss 차트 */}
                {racePhase === 'racing' && myBall && (
                    <div className={`glass-card ${s.liveCard}`}>
                        <label className="label-cosmic">📊 실시간 현황</label>
                        <div className={s.liveGrid}>
                            <div className={s.liveItem}>
                                <span className={s.liveLabel}>현재 Loss</span>
                                <span className={s.liveValue} style={{
                                    color: myBall.loss > 5 ? '#f43f5e' : myBall.loss > 2 ? '#fbbf24' : '#10b981',
                                }}>{myBall.loss?.toFixed(4)}</span>
                            </div>
                            <div className={s.liveItem}>
                                <span className={s.liveLabel}>위치 (X, Z)</span>
                                <span className={s.liveValue}>
                                    ({myBall.x?.toFixed(2)}, {myBall.z?.toFixed(2)})
                                </span>
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

                        {/* 미니 Loss 차트 */}
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
                                                borderRadius: '2px 2px 0 0',
                                                transition: 'height 0.1s',
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
                                <span className={s.escapedHint}>더 작은 학습률로 다시 시도해보세요.</span>
                            </div>
                        )}
                    </div>
                )}

                {/* 실시간 리더보드 (레이싱 중) */}
                {racePhase === 'racing' && Object.keys(balls).length > 1 && (
                    <div className={`glass-card ${s.leaderboardCard}`}>
                        <label className="label-cosmic">📊 실시간 순위</label>
                        <div className={s.leaderboardList}>
                            {Object.entries(balls)
                                .map(([id, ball]) => ({
                                    teamId: id,
                                    teamName: teams[id]?.name || id,
                                    color: teams[id]?.color || '#a78bfa',
                                    loss: ball.loss,
                                    status: ball.status,
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

                {/* 결과 */}
                {racePhase === 'finished' && results.length > 0 && (
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
                                    <span className={s.resultLoss} style={{
                                        color: r.status === 'escaped' ? '#f43f5e' : '#10b981',
                                    }}>
                                        {r.status === 'escaped' ? '이탈' : `Loss: ${r.finalLoss?.toFixed(3)}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 알림/경고 */}
                {alerts.length > 0 && (
                    <div className={`glass-card ${s.alertCard}`}>
                        <label className="label-cosmic">⚡ 알림</label>
                        {alerts.slice(0, 5).map((a) => (
                            <div key={a.id} className={s.alertItem}>
                                {a.message}
                            </div>
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
                                <span className={s.teamParams}>
                                    lr:{team.learningRate} m:{team.momentum}
                                </span>
                            </div>
                        ))}
                        {teamCount === 0 && (
                            <p className={s.emptyText}>
                                아직 참가한 팀이 없어요...
                            </p>
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
                            경사하강법의 목표는 이 Loss를 최소화하는 것!
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

                {/* 한 걸음 더: Loss 함수의 종류 */}
                <div className={s.deepDiveWrap}>
                    <button
                        onClick={() => setShowDeepDive(!showDeepDive)}
                        className={s.deepDiveToggle}
                    >
                        {showDeepDive ? '▼' : '▶'} 한 걸음 더: Loss 함수는 어떤 종류가 있을까?
                    </button>
                    {showDeepDive && (
                        <div className={s.deepDiveContent}>
                            <p className={s.deepDiveP}>
                                <strong className={s.colorYellow}>Cross-Entropy Loss</strong> —
                                GPT가 사용하는 Loss 함수! 모델이 예측한 확률 분포와 정답 사이의 차이를 측정해요.
                                2주차에서 배운 Softmax 확률이 여기서 쓰입니다.
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
                        conceptSummary: '경사하강법(Gradient Descent)은 손실 함수의 최저점을 찾아가는 최적화 알고리즘입니다. 학습률이 크면 빠르지만 발산 위험이 있고, 작으면 안전하지만 느립니다. 모멘텀은 관성을 더해 지역 최솟값을 탈출하는 데 도움을 줍니다.',
                    }}>
                        <GradientRaceScene />
                    </WebGLErrorBoundary>

                    <div className={s.canvasOverlay}>
                        <span className={`badge-glow ${s.badgeDesktop}`}>
                            🏔️ 손실 지형 · 마우스로 드래그하여 탐색
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
