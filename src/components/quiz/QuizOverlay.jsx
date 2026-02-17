'use client';

import { useState, useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';

/**
 * QuizOverlay: 교사가 퀴즈를 브로드캐스트하면 학생 화면에 오버레이로 표시
 * - ClientLayout에 마운트되어 모든 페이지에서 작동
 */
export default function QuizOverlay() {
    const [quiz, setQuiz] = useState(null);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [results, setResults] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleQuizBroadcast = (data) => {
            setQuiz(data);
            setSelectedAnswer(null);
            setSubmitted(false);
            setResults(null);
            setTimeLeft(data.timeLimit || 15);
        };

        const handleQuizResults = (data) => {
            setResults(data);
            if (timerRef.current) clearInterval(timerRef.current);
        };

        const handleQuizCancelled = () => {
            setQuiz(null);
            setResults(null);
            setSubmitted(false);
            setSelectedAnswer(null);
            if (timerRef.current) clearInterval(timerRef.current);
        };

        socket.on('quiz_broadcast', handleQuizBroadcast);
        socket.on('quiz_results', handleQuizResults);
        socket.on('quiz_cancelled', handleQuizCancelled);

        return () => {
            socket.off('quiz_broadcast', handleQuizBroadcast);
            socket.off('quiz_results', handleQuizResults);
            socket.off('quiz_cancelled', handleQuizCancelled);
        };
    }, []);

    // 타이머
    useEffect(() => {
        if (!quiz || submitted || results) return;
        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [quiz, submitted, results]);

    const handleSubmit = (answer) => {
        if (submitted || timeLeft === 0) return;
        setSelectedAnswer(answer);
        setSubmitted(true);

        const socket = getSocket();
        if (socket) {
            socket.emit('submit_quiz_answer', { answer });
        }
    };

    const handleClose = () => {
        setQuiz(null);
        setResults(null);
        setSubmitted(false);
        setSelectedAnswer(null);
    };

    // 퀴즈도 결과도 없으면 렌더링 안 함
    if (!quiz && !results) return null;

    // 결과 화면
    if (results) {
        const isCorrect = selectedAnswer === results.correctAnswer;
        return (
            <div style={styles.overlay}>
                <div style={styles.modal}>
                    <div style={styles.resultBanner}>
                        <span style={{ fontSize: '3rem' }}>
                            {isCorrect ? '🎉' : submitted ? '😅' : '⏰'}
                        </span>
                        <h2 style={{
                            fontSize: '1.5rem', fontWeight: 800, marginTop: 8,
                            color: isCorrect ? '#4ade80' : submitted ? '#f87171' : '#fbbf24',
                        }}>
                            {isCorrect ? '정답!' : submitted ? '오답...' : '시간 초과!'}
                        </h2>
                    </div>

                    <div style={styles.resultInfo}>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
                            <strong>정답:</strong> {results.correctAnswer === 'O' ? '⭕ O' :
                            results.correctAnswer === 'X' ? '❌ X' : results.correctAnswer}
                        </p>
                        <div style={styles.statRow}>
                            <div style={styles.statItem}>
                                <span style={styles.statValue}>{results.correctRate}%</span>
                                <span style={styles.statLabel}>정답률</span>
                            </div>
                            <div style={styles.statItem}>
                                <span style={styles.statValue}>{results.correctCount}/{results.totalAnswered}</span>
                                <span style={styles.statLabel}>정답/응답</span>
                            </div>
                        </div>
                        {results.fastest && (
                            <div style={styles.fastestBadge}>
                                ⚡ 최빠 정답: <strong>{results.fastest.studentName}</strong>
                                ({(results.fastest.responseTime / 1000).toFixed(1)}초)
                            </div>
                        )}
                    </div>

                    <button onClick={handleClose} style={styles.closeBtn}>
                        닫기
                    </button>
                </div>
            </div>
        );
    }

    // 퀴즈 진행 중
    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <div style={styles.quizHeader}>
                    <span style={{ fontSize: '2rem' }}>📝</span>
                    <div style={{
                        ...styles.timer,
                        color: timeLeft <= 5 ? '#f43f5e' : '#fbbf24',
                        animation: timeLeft <= 5 ? 'pulseGlow 0.5s infinite' : 'none',
                    }}>
                        {timeLeft}초
                    </div>
                </div>

                <h2 style={styles.question}>{quiz.question}</h2>

                {/* O/X 퀴즈 */}
                {quiz.type === 'ox' && (
                    <div style={styles.oxContainer}>
                        <button
                            onClick={() => handleSubmit('O')}
                            disabled={submitted || timeLeft === 0}
                            style={{
                                ...styles.oxBtn,
                                background: submitted && selectedAnswer === 'O'
                                    ? 'rgba(96, 165, 250, 0.3)' : 'rgba(96, 165, 250, 0.1)',
                                border: `2px solid ${submitted && selectedAnswer === 'O'
                                    ? '#60a5fa' : 'rgba(96, 165, 250, 0.3)'}`,
                                opacity: (submitted || timeLeft === 0) ? 0.6 : 1,
                            }}
                        >
                            ⭕ O
                        </button>
                        <button
                            onClick={() => handleSubmit('X')}
                            disabled={submitted || timeLeft === 0}
                            style={{
                                ...styles.oxBtn,
                                background: submitted && selectedAnswer === 'X'
                                    ? 'rgba(248, 113, 113, 0.3)' : 'rgba(248, 113, 113, 0.1)',
                                border: `2px solid ${submitted && selectedAnswer === 'X'
                                    ? '#f87171' : 'rgba(248, 113, 113, 0.3)'}`,
                                opacity: (submitted || timeLeft === 0) ? 0.6 : 1,
                            }}
                        >
                            ❌ X
                        </button>
                    </div>
                )}

                {/* 4지선다 */}
                {quiz.type === 'choice' && (
                    <div style={styles.choiceContainer}>
                        {quiz.options.map((opt, i) => {
                            const labels = ['①', '②', '③', '④'];
                            const colors = ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa'];
                            return (
                                <button
                                    key={i}
                                    onClick={() => handleSubmit(opt)}
                                    disabled={submitted || timeLeft === 0}
                                    style={{
                                        ...styles.choiceBtn,
                                        background: submitted && selectedAnswer === opt
                                            ? `${colors[i]}30` : `${colors[i]}10`,
                                        border: `2px solid ${submitted && selectedAnswer === opt
                                            ? colors[i] : `${colors[i]}40`}`,
                                        opacity: (submitted || timeLeft === 0) ? 0.6 : 1,
                                    }}
                                >
                                    <span style={{ color: colors[i], fontWeight: 700 }}>{labels[i]}</span> {opt}
                                </button>
                            );
                        })}
                    </div>
                )}

                {submitted && (
                    <div style={styles.waitingMsg}>
                        ✅ 제출 완료! 선생님이 결과를 공개할 때까지 기다리세요...
                    </div>
                )}

                {timeLeft === 0 && !submitted && (
                    <div style={styles.timeoutMsg}>
                        ⏰ 시간 초과! 답변을 제출하지 못했어요.
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
    },
    modal: {
        background: 'var(--bg-card, #1a1a2e)',
        borderRadius: 20,
        padding: '32px 28px',
        maxWidth: 480,
        width: '100%',
        border: '1px solid rgba(124, 92, 252, 0.3)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    },
    quizHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    timer: {
        fontSize: '1.8rem',
        fontWeight: 800,
        fontFamily: 'monospace',
    },
    question: {
        fontSize: '1.2rem',
        fontWeight: 700,
        color: '#fff',
        lineHeight: 1.6,
        marginBottom: 24,
        textAlign: 'center',
    },
    oxContainer: {
        display: 'flex',
        gap: 16,
        justifyContent: 'center',
    },
    oxBtn: {
        flex: 1,
        padding: '20px 24px',
        borderRadius: 16,
        fontSize: '1.5rem',
        fontWeight: 800,
        cursor: 'pointer',
        color: '#fff',
        transition: 'all 0.2s',
    },
    choiceContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
    },
    choiceBtn: {
        padding: '14px 18px',
        borderRadius: 12,
        fontSize: '0.95rem',
        fontWeight: 600,
        cursor: 'pointer',
        color: '#fff',
        textAlign: 'left',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        transition: 'all 0.2s',
    },
    waitingMsg: {
        marginTop: 20,
        padding: '12px 16px',
        borderRadius: 10,
        background: 'rgba(52, 211, 153, 0.1)',
        border: '1px solid rgba(52, 211, 153, 0.3)',
        color: '#34d399',
        fontSize: '0.9rem',
        textAlign: 'center',
    },
    timeoutMsg: {
        marginTop: 20,
        padding: '12px 16px',
        borderRadius: 10,
        background: 'rgba(251, 191, 36, 0.1)',
        border: '1px solid rgba(251, 191, 36, 0.3)',
        color: '#fbbf24',
        fontSize: '0.9rem',
        textAlign: 'center',
    },
    resultBanner: {
        textAlign: 'center',
        marginBottom: 20,
    },
    resultInfo: {
        padding: '16px 20px',
        borderRadius: 12,
        background: 'rgba(15, 10, 40, 0.4)',
        marginBottom: 20,
    },
    statRow: {
        display: 'flex',
        gap: 16,
        justifyContent: 'center',
        marginTop: 12,
    },
    statItem: {
        textAlign: 'center',
        padding: '10px 20px',
        borderRadius: 10,
        background: 'rgba(124, 92, 252, 0.08)',
    },
    statValue: {
        display: 'block',
        fontSize: '1.5rem',
        fontWeight: 800,
        color: '#fff',
    },
    statLabel: {
        fontSize: '0.75rem',
        color: 'var(--text-dim)',
    },
    fastestBadge: {
        marginTop: 12,
        padding: '8px 14px',
        borderRadius: 8,
        background: 'rgba(251, 191, 36, 0.1)',
        border: '1px solid rgba(251, 191, 36, 0.2)',
        fontSize: '0.85rem',
        color: '#fbbf24',
        textAlign: 'center',
    },
    closeBtn: {
        width: '100%',
        padding: '12px',
        borderRadius: 12,
        background: 'rgba(124, 92, 252, 0.15)',
        border: '1px solid rgba(124, 92, 252, 0.3)',
        color: '#a78bfa',
        fontSize: '1rem',
        fontWeight: 600,
        cursor: 'pointer',
    },
};
