'use client';

import { useState, useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import styles from './QuizOverlay.module.css';

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
            <div className={styles.overlay}>
                <div className={styles.modal}>
                    <div className={styles.resultBanner}>
                        <span className={styles.resultEmoji}>
                            {isCorrect ? '🎉' : submitted ? '😅' : '⏰'}
                        </span>
                        <h2
                            className={styles.resultHeading}
                            style={{
                                color: isCorrect ? '#4ade80' : submitted ? '#f87171' : '#fbbf24',
                            }}
                        >
                            {isCorrect ? '정답!' : submitted ? '오답...' : '시간 초과!'}
                        </h2>
                    </div>

                    <div className={styles.resultInfo}>
                        <p className={styles.correctAnswerText}>
                            <strong>정답:</strong> {results.correctAnswer === 'O' ? '⭕ O' :
                            results.correctAnswer === 'X' ? '❌ X' : results.correctAnswer}
                        </p>
                        <div className={styles.statRow}>
                            <div className={styles.statItem}>
                                <span className={styles.statValue}>{results.correctRate}%</span>
                                <span className={styles.statLabel}>정답률</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statValue}>{results.correctCount}/{results.totalAnswered}</span>
                                <span className={styles.statLabel}>정답/응답</span>
                            </div>
                        </div>
                        {results.fastest && (
                            <div className={styles.fastestBadge}>
                                ⚡ 최빠 정답: <strong>{results.fastest.studentName}</strong>
                                ({(results.fastest.responseTime / 1000).toFixed(1)}초)
                            </div>
                        )}
                    </div>

                    <button onClick={handleClose} className={styles.closeBtn}>
                        닫기
                    </button>
                </div>
            </div>
        );
    }

    // 퀴즈 진행 중
    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.quizHeader}>
                    <span className={styles.headerEmoji}>📝</span>
                    <div
                        className={styles.timer}
                        style={{
                            color: timeLeft <= 5 ? '#f43f5e' : '#fbbf24',
                            animation: timeLeft <= 5 ? 'pulseGlow 0.5s infinite' : 'none',
                        }}
                    >
                        {timeLeft}초
                    </div>
                </div>

                <h2 className={styles.question}>{quiz.question}</h2>

                {/* O/X 퀴즈 */}
                {quiz.type === 'ox' && (
                    <div className={styles.oxContainer}>
                        <button
                            onClick={() => handleSubmit('O')}
                            disabled={submitted || timeLeft === 0}
                            className={styles.oxBtn}
                            style={{
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
                            className={styles.oxBtn}
                            style={{
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
                    <div className={styles.choiceContainer}>
                        {quiz.options.map((opt, i) => {
                            const labels = ['①', '②', '③', '④'];
                            const colors = ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa'];
                            return (
                                <button
                                    key={i}
                                    onClick={() => handleSubmit(opt)}
                                    disabled={submitted || timeLeft === 0}
                                    className={styles.choiceBtn}
                                    style={{
                                        background: submitted && selectedAnswer === opt
                                            ? `${colors[i]}30` : `${colors[i]}10`,
                                        border: `2px solid ${submitted && selectedAnswer === opt
                                            ? colors[i] : `${colors[i]}40`}`,
                                        opacity: (submitted || timeLeft === 0) ? 0.6 : 1,
                                    }}
                                >
                                    <span className={styles.choiceLabel} style={{ color: colors[i] }}>{labels[i]}</span> {opt}
                                </button>
                            );
                        })}
                    </div>
                )}

                {submitted && (
                    <div className={styles.waitingMsg}>
                        ✅ 제출 완료! 선생님이 결과를 공개할 때까지 기다리세요...
                    </div>
                )}

                {timeLeft === 0 && !submitted && (
                    <div className={styles.timeoutMsg}>
                        ⏰ 시간 초과! 답변을 제출하지 못했어요.
                    </div>
                )}
            </div>
        </div>
    );
}
