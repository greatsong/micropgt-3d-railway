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
import { MAP_LEVELS } from '@/lib/lossFunction';
import {
    advanceRaceBall,
    clampLearningRate,
    clampMomentum,
    createRaceBall,
    createRaceResult,
    getRandomizedStartPosition,
    inspectRaceBall,
    normalizeMapLevel,
    rankRaceResults,
} from '@/lib/raceEngine';
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

// 솔로 연습용 맵 선택지 (전체 8개)
const SOLO_MAP_OPTIONS = [
    { level: 1, emoji: '⛳', label: '완만한 언덕', difficulty: '입문' },
    { level: 2, emoji: '🏔️', label: '함정 지형', difficulty: '초급' },
    { level: 3, emoji: '🌋', label: '로컬 미니마', difficulty: '중급' },
    { level: 4, emoji: '🌊', label: '긴 계곡', difficulty: '고급' },
    { level: 5, emoji: '🎯', label: '함정 미로', difficulty: '마스터' },
    { level: 6, emoji: '⚖️', label: '쌍봉 계곡', difficulty: '중급' },
    { level: 7, emoji: '🌀', label: '나선 계곡', difficulty: '고급' },
    { level: 8, emoji: '🏜️', label: '절벽+롤러코스터', difficulty: '마스터' },
];

export default function Week5Page() {
    const router = useRouter();
    const isMobile = useIsMobile();
    const studentName = useClassStore((st) => st.studentName);
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
    const setStageResults = useRaceStore((st) => st.setStageResults);
    const gpFinalResults = useRaceStore((st) => st.gpFinalResults);
    const setGpFinalResults = useRaceStore((st) => st.setGpFinalResults);
    const gpCountdown = useRaceStore((st) => st.gpCountdown);
    const setGpCountdown = useRaceStore((st) => st.setGpCountdown);
    const racePaused = useRaceStore((st) => st.racePaused);
    const setRacePaused = useRaceStore((st) => st.setRacePaused);

    const [isParamsSet, setIsParamsSet] = useState(false);
    const [alerts, setAlerts] = useState([]);
    const [isSoloMode, setIsSoloMode] = useState(false);
    const [pendingSoloStage, setPendingSoloStage] = useState(null); // { stage, myId, botId }
    const [showDeepDive, setShowDeepDive] = useState(false);
    const [raceMode, setRaceMode] = useState('competition'); // 'practice' | 'competition'
    const [soloMapLevel, setSoloMapLevel] = useState(1); // 솔로 연습 맵 레벨
    const [soloSingleMode, setSoloSingleMode] = useState(false); // true = 단일 맵 연습 (GP 아님)
    const soloIntervalRef = useRef(null);
    const soloStageResultsRef = useRef([[], [], []]);
    const paramThrottleRef = useRef(null);

    // ── Socket 이벤트 ──
    useEffect(() => {
        const socket = getSocket();
        if (!socket.connected) connectSocket();

        const handleConnect = () => {
            if (roomCode) {
                socket.emit('join_class', {
                    studentName: studentName || '익명',
                    roomCode,
                });
            }
        };

        if (socket.connected && roomCode) handleConnect();
        socket.on('connect', handleConnect);

        const handleRoomState = (data) => {
            setTeams(data.raceTeams || {});
            setRacePhase(data.racePhase || 'setup');
            updateBalls(data.raceBalls || {});
            setMapLevel(normalizeMapLevel(data.mapLevel, 2));
            setRaceMode(data.raceMode || 'competition');
            setResults(data.results || []);
            setGpActive(!!data.gpActive);
            setGpStage(data.gpStage || 0);
            setStageResults(data.gpStageResults || [[], [], []]);
            setGpFinalResults(data.gpFinalResults || []);
            setGpCountdown(data.gpCountdown || 0);

            const myId = getSocket()?.id;
            const isRegistered = !!(myId && (data.raceTeams?.[myId] || data.raceBalls?.[myId]));
            if (isRegistered) {
                setMyTeamId(myId);
            }
            setIsParamsSet(isRegistered);
        };
        socket.on('room_state', handleRoomState);

        const handleTeamsUpdated = (data) => setTeams(data.teams);
        const handleRaceStarted = (data) => {
            setRacePhase('racing');
            setResults([]);
            setGpCountdown(0);
            updateBalls(data.balls);
            if (data.teams) setTeams(data.teams); // 리셋 후 이름 복구
            if (data.mapLevel) setMapLevel(normalizeMapLevel(data.mapLevel, 2));
            setGpStage(data.gpStage || 0);
            if (data.raceMode) setRaceMode(data.raceMode);
        };
        const handleRaceTick = (data) => updateBalls(data.balls);
        const handleRaceAlert = (data) => {
            setAlerts((prev) => [{ id: Date.now(), ...data }, ...prev].slice(0, 10));
            addNotification(data.message);
        };
        const handleRaceFinished = (data) => {
            setRacePhase('finished');
            setResults(data.results);
            setGpActive(false);
            setGpCountdown(0);
        };
        const handleRaceReset = (data) => {
            reset();
            setIsParamsSet(false);
            setAlerts([]);
            setPendingSoloStage(null);
            setRaceMode('competition');
            if (data?.teams) setTeams(data.teams); // 리셋 후 기존 팀 목록 유지
        };

        // GP 전용 이벤트
        const handleGpStarted = (data) => {
            setGpActive(true);
            setGpStage(data.currentStage);
            setStageResults([[], [], []]);
            setGpFinalResults([]);
            setGpCountdown(0);
            setResults([]);
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
            setGpActive(true);
            setStageResults(data.allStageResults || [[], [], []]);
            setGpFinalResults(data.finalResults);
            setGpCountdown(0);
            addNotification('🏆 Grand Prix 종료! 종합 순위 발표!');
        };

        const handleMapSelected = (data) => {
            if (data?.level) setMapLevel(normalizeMapLevel(data.level, 2));
        };

        const handleRacePrepare = (data) => {
            setRacePhase('preparing');
            setResults([]);
            setGpCountdown(0);
            updateBalls(data.balls);
            if (data.teams) setTeams(data.teams);
            if (data.mapLevel) setMapLevel(normalizeMapLevel(data.mapLevel, 2));
            setIsParamsSet(false); // 파라미터 슬라이더 다시 표시
            // 서버가 자동 등록한 내 공이 있으면 myTeamId 설정 (내 공 하이라이트)
            const myId = getSocket()?.id;
            if (myId && data.balls?.[myId]) {
                setMyTeamId(myId);
            }
        };

        socket.on('race_prepare', handleRacePrepare);
        socket.on('map_selected', handleMapSelected);
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
        const handleRacePaused = (data) => setRacePaused(data.paused);
        socket.on('race_paused', handleRacePaused);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('room_state', handleRoomState);
            socket.off('race_prepare', handleRacePrepare);
            socket.off('map_selected', handleMapSelected);
            socket.off('race_teams_updated', handleTeamsUpdated);
            socket.off('race_started', handleRaceStarted);
            socket.off('race_tick', handleRaceTick);
            socket.off('race_alert', handleRaceAlert);
            socket.off('race_finished', handleRaceFinished);
            socket.off('race_reset', handleRaceReset);
            socket.off('gp_started', handleGpStarted);
            socket.off('gp_stage_complete', handleGpStageComplete);
            socket.off('gp_countdown', handleGpCountdown);
            socket.off('race_paused', handleRacePaused);
            socket.off('gp_final_results', handleGpFinalResults);
        };
    }, [
        addNotification,
        addStageResult,
        reset,
        roomCode,
        setGpActive,
        setGpCountdown,
        setGpFinalResults,
        setGpStage,
        setMapLevel,
        setMyTeamId,
        setRacePhase,
        setResults,
        setStageResults,
        setTeams,
        studentName,
        updateBalls,
    ]);

    // ── 파라미터 제출 ──
    const handleSubmitParams = () => {
        const socket = connectSocket();
        const teamId = socket.id || myTeamId || null;
        const colorIdx = Object.keys(teams).length % TEAM_COLORS.length;
        const learningRate = clampLearningRate(myLearningRate, 0.1);
        const momentum = clampMomentum(myMomentum, 0.9);

        socket.emit('set_race_params', {
            teamName: studentName || '익명',
            color: TEAM_COLORS[colorIdx],
            learningRate,
            momentum,
            mapLevel,
        });

        if (teamId) {
            setMyTeamId(teamId);
        }
        setIsParamsSet(true);
    };

    const resetSoloProgress = useCallback(() => {
        soloStageResultsRef.current = [[], [], []];
        setStageResults([[], [], []]);
        setGpFinalResults([]);
        setGpCountdown(0);
        setPendingSoloStage(null);
    }, [setGpCountdown, setGpFinalResults, setStageResults]);

    const buildSoloTeams = useCallback((myId, botId) => ({
        [myId]: {
            id: myId,
            name: studentName || '나',
            color: TEAM_COLORS[0],
            learningRate: clampLearningRate(myLearningRate, 0.1),
            momentum: clampMomentum(myMomentum, 0.9),
        },
        [botId]: {
            id: botId,
            name: 'AI 봇 (lr=0.1, m=0.9)',
            color: TEAM_COLORS[3],
            learningRate: 0.1,
            momentum: 0.9,
        },
    }), [studentName, myLearningRate, myMomentum]);

    const buildSoloBalls = useCallback((level, myId, botId) => {
        const normalizedLevel = normalizeMapLevel(level, 2);
        const myStart = getRandomizedStartPosition(normalizedLevel);
        const botStart = getRandomizedStartPosition(normalizedLevel);

        return {
            [myId]: createRaceBall({
                level: normalizedLevel,
                x: myStart.x,
                z: myStart.z,
                lr: clampLearningRate(myLearningRate, 0.1),
                momentum: clampMomentum(myMomentum, 0.9),
                status: 'racing',
            }),
            [botId]: createRaceBall({
                level: normalizedLevel,
                x: botStart.x,
                z: botStart.z,
                lr: 0.1,
                momentum: 0.9,
                status: 'racing',
            }),
        };
    }, [myLearningRate, myMomentum]);

    const runSoloSimulation = useCallback((level, myId, botId, onComplete) => {
        const normalizedLevel = normalizeMapLevel(level, 2);
        setMapLevel(normalizedLevel);
        setRacePhase('racing');
        setResults([]);
        setGpCountdown(0);

        const localBalls = buildSoloBalls(normalizedLevel, myId, botId);
        updateBalls(localBalls);

        if (soloIntervalRef.current) clearInterval(soloIntervalRef.current);
        const startTime = Date.now();

        soloIntervalRef.current = setInterval(() => {
            let allDone = true;
            const elapsed = Date.now() - startTime;

            for (const [, ball] of Object.entries(localBalls)) {
                if (ball.status !== 'racing') continue;
                allDone = false;

                advanceRaceBall(ball, normalizedLevel);
                const outcome = inspectRaceBall(ball, normalizedLevel, elapsed);
                if (outcome) {
                    ball.status = outcome.status;
                    ball.finishTimeMs = elapsed;
                }
            }

            updateBalls({ ...localBalls });

            const finishedCount = Object.values(localBalls).filter((ball) => ball.status !== 'racing').length;
            if (finishedCount >= Object.keys(localBalls).length || allDone) {
                clearInterval(soloIntervalRef.current);
                soloIntervalRef.current = null;

                const rankedResults = rankRaceResults(
                    Object.entries(localBalls).map(([id, ball]) => createRaceResult({
                        teamId: id,
                        teamName: id === myId ? (studentName || '나') : 'AI 봇',
                        ball,
                        level: normalizedLevel,
                        timeMs: ball.finishTimeMs ?? (Date.now() - startTime),
                        status: ball.status,
                        lr: ball.lr,
                        momentum: ball.momentum,
                    }))
                );

                onComplete(rankedResults);
            }
        }, 33);
    }, [buildSoloBalls, setGpCountdown, setMapLevel, setRacePhase, setResults, studentName, updateBalls]);

    // ── 솔로 단일 맵 → 맵 선택 화면으로 돌아가기 ──
    const handleBackToMapSelection = useCallback(() => {
        if (soloIntervalRef.current) clearInterval(soloIntervalRef.current);
        resetSoloProgress();
        setIsSoloMode(false);
        setSoloSingleMode(false);
        setRacePhase(null);
        setResults([]);
        setIsParamsSet(false);
        setGpActive(false);
        setGpStage(0);
        // mapLevel과 soloMapLevel은 유지 (마지막 선택 기억)
    }, [resetSoloProgress, setGpActive, setGpStage, setRacePhase, setResults]);

    // ── 솔로 → 전체 레이싱 참여 ──
    const handleJoinCompetition = useCallback(() => {
        if (soloIntervalRef.current) clearInterval(soloIntervalRef.current);
        resetSoloProgress();
        reset();
        setIsSoloMode(false);
        setSoloSingleMode(false);
        setIsParamsSet(false);
        // 소켓 재연결 및 방 참여
        const socket = getSocket();
        if (!socket.connected) connectSocket();
        if (socket.connected && roomCode) {
            socket.emit('join_class', {
                roomCode,
                studentName: studentName || '익명',
            });
        }
    }, [reset, resetSoloProgress, roomCode, studentName]);

    // ── 혼자 연습 모드 (GP 3스테이지) ──
    const handleSoloPractice = useCallback(() => {
        if (soloIntervalRef.current) clearInterval(soloIntervalRef.current);
        resetSoloProgress();
        setIsSoloMode(true);
        setSoloSingleMode(false);
        setGpActive(true);
        setGpStage(1);
        setResults([]);

        const myId = 'solo-me';
        const botId = 'solo-bot';

        setTeams(buildSoloTeams(myId, botId));
        setMyTeamId(myId);
        setIsParamsSet(true);

        runSoloSimulation(1, myId, botId, (rankedResults) => {
            const totalTeams = rankedResults.length;
            const stageResultsWithPoints = rankedResults.map((result) => ({
                ...result,
                points: result.status === 'converged' ? Math.max(0, totalTeams - result.rank + 1) : 0,
            }));

            soloStageResultsRef.current[0] = stageResultsWithPoints;
            addStageResult(0, stageResultsWithPoints);
            setRacePhase('stageResult');
            setPendingSoloStage({ stage: 2, myId, botId });
        });
    }, [addStageResult, buildSoloTeams, resetSoloProgress, runSoloSimulation, setGpActive, setGpStage, setMyTeamId, setRacePhase, setResults, setTeams]);

    // ── 혼자 연습: 단일 맵 모드 (선택한 맵에서 반복 연습) ──
    const handleSoloSingleMap = useCallback((level) => {
        if (soloIntervalRef.current) clearInterval(soloIntervalRef.current);
        resetSoloProgress();

        // level 인자를 직접 사용 (stale soloMapLevel에 의존하지 않음)
        const normalizedLevel = normalizeMapLevel(level, 1);
        setIsSoloMode(true);
        setSoloSingleMode(true);
        setGpActive(false);
        setGpStage(0);
        setSoloMapLevel(normalizedLevel);
        setMapLevel(normalizedLevel);
        setRacePhase('racing');
        setResults([]);

        const myId = 'solo-me';
        const botId = 'solo-bot';

        setTeams(buildSoloTeams(myId, botId));
        setMyTeamId(myId);
        setIsParamsSet(true);

        runSoloSimulation(normalizedLevel, myId, botId, (rankedResults) => {
            setResults(rankedResults);
            setRacePhase('finished');
        });
    }, [buildSoloTeams, resetSoloProgress, runSoloSimulation, setGpActive, setGpStage, setMapLevel, setMyTeamId, setRacePhase, setResults, setTeams]);

    // ── 레이스 중 파라미터 실시간 전송 (throttle 300ms) ──
    useEffect(() => {
        if ((racePhase !== 'racing' && racePhase !== 'preparing') || !myTeamId || isSoloMode) return;
        if (paramThrottleRef.current) clearTimeout(paramThrottleRef.current);
        paramThrottleRef.current = setTimeout(() => {
            const socket = getSocket();
            if (socket?.connected) {
                socket.emit('set_race_params', {
                    teamName: studentName || '익명',
                    learningRate: clampLearningRate(myLearningRate, 0.1),
                    momentum: clampMomentum(myMomentum, 0.9),
                    mapLevel,
                });
            }
        }, 300);
        return () => { if (paramThrottleRef.current) clearTimeout(paramThrottleRef.current); };
    }, [myLearningRate, myMomentum, racePhase, myTeamId, isSoloMode, studentName, mapLevel]);

    const runSoloStage = useCallback((stage, myId, botId) => {
        const level = normalizeMapLevel(stage, 1);
        setGpStage(stage);
        setMapLevel(level);
        setRacePhase('racing');

        setTeams(buildSoloTeams(myId, botId));

        runSoloSimulation(level, myId, botId, (rankedResults) => {
            const totalTeams = rankedResults.length;
            const stageResultsWithPoints = rankedResults.map((result) => ({
                ...result,
                points: result.status === 'converged' ? Math.max(0, totalTeams - result.rank + 1) : 0,
            }));

            soloStageResultsRef.current[stage - 1] = stageResultsWithPoints;
            addStageResult(stage - 1, stageResultsWithPoints);

            if (stage < 3) {
                setRacePhase('stageResult');
                setPendingSoloStage({ stage: stage + 1, myId, botId });
                return;
            }

            const combined = {};
            for (let si = 0; si < 3; si++) {
                for (const result of soloStageResultsRef.current[si]) {
                    if (!combined[result.teamId]) {
                        combined[result.teamId] = {
                            teamId: result.teamId,
                            teamName: result.teamName,
                            totalPoints: 0,
                            stageRanks: [0, 0, 0],
                        };
                    }
                    combined[result.teamId].totalPoints += result.points || 0;
                    combined[result.teamId].stageRanks[si] = result.rank;
                }
            }

            const final = Object.values(combined)
                .sort((left, right) => right.totalPoints - left.totalPoints)
                .map((result, index) => ({ ...result, gpRank: index + 1 }));

            setGpFinalResults(final);
            setRacePhase('finished');
        });
    }, [addStageResult, buildSoloTeams, runSoloSimulation, setGpFinalResults, setGpStage, setMapLevel, setRacePhase, setTeams]);

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
                        {isSoloMode
                            ? '원하는 맵을 선택하고 하이퍼파라미터를 조절하세요!'
                            : (<>3개 스테이지를 연속 레이싱!<br />종합 포인트로 <strong>최종 챔피언</strong>을 가립니다 🏆</>)
                        }
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
                                {racePhase === 'racing' ? `🏁 레이싱` :
                                  racePhase === 'preparing' ? '🎯 준비 중' :
                                  racePhase === 'stageResult' ? `📊 Stage ${gpStage} 결과` :
                                    racePhase === 'finished' ? '🏆 완료' : '⏳ 대기'}
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
                                {racePhase === 'racing' ? '🏁 레이싱'
                                    : racePhase === 'preparing' ? '🎯 출발 위치 확인 중'
                                    : racePhase === 'finished' ? '🏆 완료' : '⏳ 대기'}
                            </span>
                            {racePhase === 'racing' && (
                                <span style={{
                                    fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px',
                                    borderRadius: 20,
                                    background: isSoloMode ? 'rgba(16,185,129,0.18)' : raceMode === 'practice' ? 'rgba(59,130,246,0.18)' : 'rgba(251,191,36,0.18)',
                                    border: `1px solid ${isSoloMode ? '#10b981' : raceMode === 'practice' ? '#3b82f6' : '#fbbf24'}`,
                                    color: isSoloMode ? '#10b981' : raceMode === 'practice' ? '#60a5fa' : '#fbbf24',
                                }}>
                                    {isSoloMode ? '🎮 연습' : raceMode === 'practice' ? '🔵 연습 게임' : '🏆 본 게임'}
                                </span>
                            )}
                            <span className={s.statusText}>{teamCount}팀 참가</span>
                        </div>
                        {racePhase === 'racing' && (
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 6, marginBottom: 0 }}>
                                {raceMode === 'practice'
                                    ? '🔵 자유롭게 실험해보세요! 결과는 순위에 반영되지 않아요.'
                                    : '🏆 연습에서 배운 전략을 활용하세요!'}
                            </p>
                        )}
                    </div>
                )}

                {/* ── 파라미터 설정 — preparing 중엔 항상 표시 (위치 보고 조정), setup/racing 미참여엔 미제출 시 표시 ── */}
                {(racePhase === 'preparing' || (!isParamsSet && (!racePhase || racePhase === 'setup' || (racePhase === 'racing' && !myTeamId)))) && (
                    <div className={`glass-card ${s.inputCard}`}>
                        <label className="label-cosmic">🎛️ 하이퍼파라미터 설정</label>
                        {/* 교사가 선택한 맵 표시 */}
                        {(() => {
                            const mapInfo = MAP_LEVELS.find(m => m.level === mapLevel);
                            return mapInfo ? (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '8px 12px', borderRadius: 10, marginBottom: 10,
                                    background: 'rgba(124,92,252,0.12)',
                                    border: '1px solid rgba(124,92,252,0.3)',
                                }}>
                                    <span style={{ fontSize: '1.3rem' }}>{mapInfo.emoji}</span>
                                    <div>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a78bfa' }}>
                                            다음 맵: {mapInfo.name} ({mapInfo.difficulty})
                                        </div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{mapInfo.description}</div>
                                    </div>
                                </div>
                            ) : null;
                        })()}
                        {racePhase === 'preparing' && (
                            <div style={{
                                padding: '10px 12px', borderRadius: 10, marginBottom: 10,
                                background: 'rgba(16,185,129,0.12)',
                                border: '1px solid rgba(16,185,129,0.3)',
                                fontSize: '0.78rem', color: '#10b981',
                            }}>
                                👆 <strong>3D 화면에서 내 공 위치를 확인</strong>하세요!<br/>
                                시작 위치에 따라 파라미터를 조정하고<br/>
                                <strong style={{ color: '#fbbf24' }}>✅ 파라미터 확정</strong> 버튼을 누르세요.<br/>
                                <span style={{ opacity: 0.7 }}>교사가 시작 버튼을 누르면 바로 레이스가 시작됩니다.</span>
                            </div>
                        )}
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 12 }}>
                            파라미터를 정하고 제출하세요. 교사가 시작하면 바로 레이스가 시작됩니다!
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
                            {racePhase !== 'preparing' && (
                                <>
                                    <button className={`btn-nova ${s.submitBtn}`} onClick={handleSoloPractice}>
                                        🎮 혼자 GP 연습
                                    </button>
                                    <button className={`btn-nova ${s.submitBtn}`}
                                        style={{ background: 'rgba(124,92,252,0.12)', borderColor: '#7c5cfc44' }}
                                        onClick={() => handleSoloSingleMap(soloMapLevel)}>
                                        🗺️ 맵 선택 연습
                                    </button>
                                </>
                            )}
                            {roomCode && (
                                <button
                                    className={`btn-nova ${s.submitBtn}`}
                                    onClick={handleSubmitParams}
                                    style={racePhase === 'preparing' ? {
                                        width: '100%',
                                        background: isParamsSet ? 'rgba(251,191,36,0.18)' : 'rgba(16,185,129,0.18)',
                                        borderColor: isParamsSet ? '#fbbf24' : '#10b981',
                                    } : {}}
                                >
                                    {racePhase === 'preparing'
                                        ? (isParamsSet ? '🔄 파라미터 업데이트' : '✅ 파라미터 확정')
                                        : '🏎️ 수업 참가'}
                                </button>
                            )}
                        </div>
                        {/* 솔로 맵 선택 그리드 (preparing이 아닐 때만) */}
                        {racePhase !== 'preparing' && (
                            <div style={{ marginTop: 14 }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a78bfa', marginBottom: 8 }}>
                                    🗺️ 맵 선택 (솔로 연습용)
                                </div>
                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6,
                                }}>
                                    {SOLO_MAP_OPTIONS.map(m => {
                                        const isSelected = m.level === soloMapLevel;
                                        const diffColors = {
                                            '입문': '#10b981', '초급': '#3b82f6', '중급': '#f59e0b',
                                            '고급': '#f97316', '마스터': '#f43f5e',
                                        };
                                        const dc = diffColors[m.difficulty] || '#a78bfa';
                                        return (
                                            <button
                                                key={m.level}
                                                onClick={() => { setSoloMapLevel(m.level); setMapLevel(m.level); }}
                                                style={{
                                                    padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                                                    border: isSelected ? '2px solid #a78bfa' : '1px solid rgba(255,255,255,0.1)',
                                                    background: isSelected ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.03)',
                                                    textAlign: 'center', transition: 'all 0.2s',
                                                    fontFamily: 'inherit',
                                                }}
                                            >
                                                <div style={{ fontSize: '1.3rem', marginBottom: 2 }}>{m.emoji}</div>
                                                <div style={{
                                                    fontSize: '0.72rem', fontWeight: isSelected ? 700 : 500,
                                                    color: isSelected ? '#a78bfa' : '#e2e8f0',
                                                }}>{m.label}</div>
                                                <div style={{
                                                    fontSize: '0.6rem', fontWeight: 600,
                                                    color: dc, marginTop: 2,
                                                }}>{m.difficulty}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
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
                                    className={`${s.resultItem} ${r.teamId === myTeamId ? s.resultItemMine : ''}`}
                                    style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span className={s.resultRank}>
                                            {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
                                        </span>
                                        <span className={s.resultName}>{r.teamName}</span>
                                        <span className={s.resultLoss} style={{
                                            color: r.status === 'converged' ? '#10b981'
                                                : r.status === 'local_minimum' ? '#f97316'
                                                : '#f43f5e',
                                        }}>
                                            {r.status === 'converged' ? `✅ 수렴 (${r.points || 0}pt)`
                                                : r.status === 'local_minimum' ? '🏔️ 로컬 (0pt)'
                                                : '💥 이탈 (0pt)'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, fontSize: '0.65rem', color: '#94a3b8', paddingLeft: 28 }}>
                                        <span>LR: {r.lr?.toFixed(3) || '?'}</span>
                                        <span>모멘텀: {r.momentum?.toFixed(2) || '?'}</span>
                                        <span>거리: {isFinite(r.distToGlobal) ? r.distToGlobal?.toFixed(2) : '∞'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {isSoloMode && racePhase === 'stageResult' && (
                            <div style={{ marginTop: 16 }}>
                                <label className="label-cosmic" style={{ marginBottom: 8 }}>🎛️ 파라미터 조정</label>
                                <div className={s.paramRow}>
                                    <span className={s.paramLabel}>학습률</span>
                                    <input type="range" className="slider-cosmic" min={0.01} max={1.5} step={0.01}
                                        value={myLearningRate} onChange={(e) => setMyLearningRate(parseFloat(e.target.value))} />
                                    <span className={s.paramValue}>{myLearningRate.toFixed(2)}</span>
                                </div>
                                <div className={s.paramRow}>
                                    <span className={s.paramLabel}>모멘텀</span>
                                    <input type="range" className="slider-cosmic" min={0} max={0.99} step={0.01}
                                        value={myMomentum} onChange={(e) => setMyMomentum(parseFloat(e.target.value))} />
                                    <span className={s.paramValue}>{myMomentum.toFixed(2)}</span>
                                </div>
                                <button
                                    className={`btn-nova ${s.submitBtn}`}
                                    style={{ marginTop: 10, width: '100%' }}
                                    onClick={() => {
                                        // Retry same stage with updated params
                                        const myId = 'solo-me';
                                        const botId = 'solo-bot';
                                        runSoloStage(gpStage, myId, botId);
                                    }}
                                >
                                    🔁 같은 맵 다시 도전
                                </button>
                                {pendingSoloStage && (
                                    <button
                                        className={`btn-nova ${s.submitBtn}`}
                                        style={{ marginTop: 8, width: '100%' }}
                                        onClick={() => {
                                            const { stage, myId, botId } = pendingSoloStage;
                                            setPendingSoloStage(null);
                                            runSoloStage(stage, myId, botId);
                                        }}
                                    >
                                        🚀 Stage {pendingSoloStage.stage} 시작!
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── 레이싱 중: 실시간 데이터 ── */}
                {racePhase === 'racing' && myBall && (
                    <div className={`glass-card ${s.liveCard}`}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <label className="label-cosmic" style={{ margin:0 }}>
                                📊 실시간 현황 {racePaused ? '⏸️ 일시정지' : ''} {gpActive ? `— Stage ${gpStage}: ${currentStageInfo.emoji} ${currentStageInfo.name}` : ''}
                            </label>
                            {isSoloMode && (
                            <button
                                style={{
                                    padding: '5px 14px', borderRadius: 8,
                                    border: '1.5px solid rgba(244,63,94,0.5)',
                                    background: 'rgba(244,63,94,0.15)', color: '#f43f5e',
                                    fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                                onClick={() => {
                                    if (soloIntervalRef.current) { clearInterval(soloIntervalRef.current); soloIntervalRef.current = null; }
                                    setRacePhase(soloSingleMode ? 'finished' : 'stageResult');
                                }}
                            >⏹ 정지</button>
                            )}
                        </div>
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
                                        myBall.status === 'local_minimum' ? '#f97316' :
                                        myBall.status === 'converged' ? '#10b981' : '#fbbf24',
                                }}>
                                    {/* Fix 12: local_minimum 상태 텍스트 추가 */}
                                    {myBall.status === 'escaped' ? '💥 발산! 학습률을 줄여보세요' :
                                        myBall.status === 'local_minimum' ? '🏔️ 로컬 미니마! 어떻게 탈출할까요?' :
                                        myBall.status === 'converged' ? '🏁 글로벌 최솟값 도달!' : '🏎️ 질주 중'}
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

                        {/* 레이스 중 실시간 파라미터 조절 (멀티플레이 전용) */}
                        {!isSoloMode && (
                            <div style={{
                                marginTop: 12, padding: '10px 12px', borderRadius: 10,
                                background: 'rgba(124,92,252,0.08)',
                                border: '1px solid rgba(124,92,252,0.2)',
                            }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa', marginBottom: 8 }}>
                                    🎛️ 실시간 파라미터 조절
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', minWidth: 52 }}>학습률</span>
                                    <input type="range" className="slider-cosmic" min={0.01} max={1.5} step={0.01}
                                        value={myLearningRate}
                                        onChange={(e) => setMyLearningRate(parseFloat(e.target.value))}
                                        style={{ flex: 1 }} />
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: myLearningRate > 0.8 ? '#f43f5e' : '#10b981', minWidth: 34, textAlign: 'right' }}>
                                        {myLearningRate.toFixed(2)}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', minWidth: 52 }}>모멘텀</span>
                                    <input type="range" className="slider-cosmic" min={0} max={0.99} step={0.01}
                                        value={myMomentum}
                                        onChange={(e) => setMyMomentum(parseFloat(e.target.value))}
                                        style={{ flex: 1 }} />
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa', minWidth: 34, textAlign: 'right' }}>
                                        {myMomentum.toFixed(2)}
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.63rem', color: 'var(--text-dim)', margin: '6px 0 0', opacity: 0.7 }}>
                                    슬라이더 변경 시 300ms 후 서버에 자동 반영됩니다
                                </p>
                            </div>
                        )}

                        {myBall.status === 'escaped' && (
                            <div className={s.escapedBox}>
                                💥 학습률이 너무 커서 발산했습니다!<br />
                                <span className={s.escapedHint}>다음 스테이지에서는 회복 기회가 있습니다!</span>
                            </div>
                        )}
                        {/* Fix 12: 로컬 미니마 안내 박스 */}
                        {myBall.status === 'local_minimum' && (
                            <div className={s.escapedBox} style={{ borderColor: '#f97316', background: 'rgba(249,115,22,0.1)' }}>
                                🏔️ 로컬 최솟값에 갇혔어요!<br />
                                <span className={s.escapedHint}>어떻게 탈출할 수 있을까요? 모멘텀과 학습률을 생각해보세요.</span>
                            </div>
                        )}
                    </div>
                )}

                {/* 실시간 리더보드 (연습 모드에서는 비표시) */}
                {racePhase === 'racing' && Object.keys(balls).length > 1 && raceMode !== 'practice' && (
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
                                        {/* Fix 12: local_minimum 아이콘 추가 */}
                                        <span className={s.leaderboardRank}>
                                            {entry.status === 'escaped' ? '💥' :
                                                entry.status === 'local_minimum' ? '🏔️' :
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

                        {/* 솔로 연습 후 액션 버튼 */}
                        {isSoloMode && (
                            <div style={{ marginTop: 16 }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 10, textAlign: 'center' }}>
                                    GP 연습 완료! 다시 도전하거나 친구들과 레이싱해보세요
                                </p>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                                    <button
                                        className={`btn-nova ${s.submitBtn}`}
                                        onClick={handleSoloPractice}
                                        style={{ flex: 1, background: 'rgba(245,158,11,0.18)', borderColor: '#f59e0b' }}
                                    >
                                        🔁 GP 다시 도전
                                    </button>
                                    <button
                                        className={`btn-nova ${s.submitBtn}`}
                                        onClick={handleBackToMapSelection}
                                        style={{ flex: 1, background: 'rgba(124,92,252,0.12)', borderColor: '#7c5cfc44' }}
                                    >
                                        🗺️ 맵 선택 연습
                                    </button>
                                </div>
                                {roomCode && (
                                    <button
                                        className={`btn-nova ${s.submitBtn}`}
                                        onClick={handleJoinCompetition}
                                        style={{ background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)', width: '100%' }}
                                    >
                                        🏆 전체 레이싱 참여하기
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 일반 모드 결과 (멀티 소켓) */}
                {racePhase === 'finished' && !gpActive && !isSoloMode && results.length > 0 && (
                    <div className={`glass-card ${s.resultCard}`}>
                        <label className="label-cosmic" style={{ color: raceMode === 'practice' ? '#60a5fa' : undefined }}>
                            {raceMode === 'practice' ? '🔵 연습 게임 결과 (순위 참고용)' : '🏆 레이스 결과'}
                        </label>
                        {raceMode === 'practice' && (
                            <p style={{ fontSize: '0.72rem', color: '#60a5fa', marginBottom: 10, marginTop: 4 }}>
                                이 결과는 순위에 반영되지 않아요. 어떤 파라미터가 잘 작동했나요?
                            </p>
                        )}
                        <div className={s.resultList}>
                            {results.map((r) => (
                                <div key={r.teamId}
                                    className={`${s.resultItem} ${r.teamId === myTeamId ? s.resultItemMine : ''}`}
                                    style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span className={s.resultRank}>
                                            {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
                                        </span>
                                        <span className={s.resultName}>{r.teamName}</span>
                                        <span className={s.resultLoss} style={{
                                            color: r.status === 'converged' ? '#10b981' : r.status === 'local_minimum' ? '#f59e0b' : '#f43f5e'
                                        }}>
                                            {r.status === 'converged' ? '✅ 수렴!' : r.status === 'local_minimum' ? '🏔️ 로컬' : '💥 이탈'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, fontSize: '0.65rem', color: '#94a3b8', paddingLeft: 28 }}>
                                        <span>LR: {r.lr?.toFixed(3) || '?'}</span>
                                        <span>모멘텀: {r.momentum?.toFixed(2) || '?'}</span>
                                        <span>거리: {isFinite(r.distToGlobal) ? r.distToGlobal?.toFixed(2) : '∞'}</span>
                                        <span>시간: {(r.time / 1000)?.toFixed(1)}s</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 12, textAlign: 'center' }}>
                            선생님이 &quot;같은 맵 재도전&quot; 또는 &quot;다른 맵&quot;을 선택할 때까지 대기합니다.
                        </p>
                    </div>
                )}

                {/* 솔로 단일 맵 결과 */}
                {racePhase === 'finished' && isSoloMode && soloSingleMode && results.length > 0 && (
                    <div className={`glass-card ${s.resultCard}`}>
                        <label className="label-cosmic">
                            🏁 {SOLO_MAP_OPTIONS.find(m => m.level === soloMapLevel)?.emoji || ''} {SOLO_MAP_OPTIONS.find(m => m.level === soloMapLevel)?.label || ''} 결과
                        </label>
                        <div className={s.resultList}>
                            {results.map((r) => (
                                <div key={r.teamId}
                                    className={`${s.resultItem} ${r.teamId === myTeamId ? s.resultItemMine : ''}`}
                                    style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span className={s.resultRank}>
                                            {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
                                        </span>
                                        <span className={s.resultName}>{r.teamName}</span>
                                        <span className={s.resultLoss} style={{
                                            color: r.status === 'converged' ? '#10b981' : r.status === 'local_minimum' ? '#f59e0b' : '#f43f5e'
                                        }}>
                                            {r.status === 'converged' ? '✅ 수렴!' : r.status === 'local_minimum' ? '🏔️ 로컬' : '💥 이탈'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, fontSize: '0.65rem', color: '#94a3b8', paddingLeft: 28 }}>
                                        <span>거리: {isFinite(r.distToGlobal) ? r.distToGlobal?.toFixed(2) : '∞'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 파라미터 조정 */}
                        <div style={{ marginTop: 16 }}>
                            <label className="label-cosmic" style={{ marginBottom: 8 }}>🎛️ 파라미터 조정 후 재도전</label>
                            <div className={s.paramRow}>
                                <span className={s.paramLabel}>학습률</span>
                                <input type="range" className="slider-cosmic" min={0.01} max={1.5} step={0.01}
                                    value={myLearningRate} onChange={(e) => setMyLearningRate(parseFloat(e.target.value))} />
                                <span className={s.paramValue}>{myLearningRate.toFixed(2)}</span>
                            </div>
                            <div className={s.paramRow}>
                                <span className={s.paramLabel}>모멘텀</span>
                                <input type="range" className="slider-cosmic" min={0} max={0.99} step={0.01}
                                    value={myMomentum} onChange={(e) => setMyMomentum(parseFloat(e.target.value))} />
                                <span className={s.paramValue}>{myMomentum.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* 같은 맵 다시 도전 / 다른 맵 선택 */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button
                                className={`btn-nova ${s.submitBtn}`}
                                style={{ flex: 1, background: 'rgba(245,158,11,0.18)', borderColor: '#f59e0b' }}
                                onClick={() => handleSoloSingleMap(soloMapLevel)}
                            >
                                🔁 같은 맵 다시 도전
                            </button>
                            <button
                                className={`btn-nova ${s.submitBtn}`}
                                style={{ flex: 1, background: 'rgba(124,92,252,0.12)', borderColor: '#7c5cfc44' }}
                                onClick={handleBackToMapSelection}
                            >
                                🗺️ 다른 맵 선택
                            </button>
                        </div>

                        {/* 전체 레이싱 참여 */}
                        {roomCode && (
                            <button
                                className={`btn-nova ${s.submitBtn}`}
                                style={{ marginTop: 12, width: '100%', background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)' }}
                                onClick={handleJoinCompetition}
                            >
                                🏆 전체 레이싱 참여하기
                            </button>
                        )}
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

                {/* Theory/DeepDive 제거됨 — 게임에 집중 */}

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
