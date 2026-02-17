'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useClassStore } from '@/stores/useClassStore';
import { connectSocket } from '@/lib/socket';

const SCHOOLS = [
  { code: 'SEOUL_HIGH', name: '서울고등학교', emoji: '🏫' },
  { code: 'DONGDUK_GIRL', name: '동덕여자고등학교', emoji: '🏫' },
  { code: 'SANGMUN_HIGH', name: '상문고등학교', emoji: '🏫' },
];

// Pre-generate stable particle data to avoid hydration mismatch
function generateParticles(count) {
  return Array.from({ length: count }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    width: `${2 + Math.random() * 3}px`,
    height: `${2 + Math.random() * 3}px`,
    animationDelay: `${Math.random() * 5}s`,
    animationDuration: `${3 + Math.random() * 4}s`,
  }));
}

export default function HomePage() {
  const router = useRouter();
  const setStudentInfo = useClassStore((s) => s.setStudentInfo);
  const setConnected = useClassStore((s) => s.setConnected);
  const addNotification = useClassStore((s) => s.addNotification);

  const savedName = useClassStore((s) => s.studentName);
  const savedSchool = useClassStore((s) => s.schoolCode);
  const savedRoom = useClassStore((s) => s.roomCode);

  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [room, setRoom] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [particles, setParticles] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});

  // Generate particles only on client after mount to avoid SSR mismatch
  useEffect(() => {
    setParticles(generateParticles(30));
  }, []);

  // 저장된 접속 정보 자동 복원
  useEffect(() => {
    if (savedName && !name) setName(savedName);
    if (savedSchool && !school) setSchool(savedSchool);
    if (savedRoom && !room) setRoom(savedRoom);
  }, [savedName, savedSchool, savedRoom]);

  const handleJoin = () => {
    const errors = {};
    if (!name.trim()) errors.name = true;
    if (!school) errors.school = true;
    if (!room.trim()) errors.room = true;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsJoining(true);
    setStudentInfo(name.trim(), school, room.trim());

    const socket = connectSocket();

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_class', {
        studentName: name.trim(),
        schoolCode: school,
        roomCode: room.trim(),
      });
    });

    socket.on('room_state', () => {
      router.push('/hub');
    });

    socket.on('connect_error', () => {
      setIsJoining(false);
      addNotification('서버 연결 실패! 선생님에게 알려주세요.');
    });
  };

  return (
    <div style={styles.container}>
      {/* 배경 파티클 — client-only to prevent hydration mismatch */}
      <div style={styles.bgParticles}>
        {particles.map((p, i) => (
          <div
            key={i}
            style={{
              ...styles.particle,
              left: p.left,
              top: p.top,
              width: p.width,
              height: p.height,
              animationDelay: p.animationDelay,
              animationDuration: p.animationDuration,
            }}
          />
        ))}
      </div>

      {/* 메인 카드 */}
      <div style={styles.card} className="glass-card animate-fade-in">
        {/* 로고 영역 */}
        <div style={styles.logoSection}>
          <div style={styles.logoEmoji} className="animate-float">🚀</div>
          <h1 style={styles.title}>
            <span className="text-gradient">GPT야 놀자!</span>
          </h1>
          <p style={styles.subtitle}>3D 인공지능 융합 교육 플랫폼</p>
          <div style={styles.schoolBadges}>
            {SCHOOLS.map((s) => (
              <span key={s.code} className="badge-glow">
                {s.emoji} {s.name}
              </span>
            ))}
          </div>
        </div>

        {/* 입력 폼 */}
        <div style={styles.form}>
          <div style={styles.field}>
            <label className="label-cosmic">닉네임</label>
            <input
              className="input-cosmic"
              style={fieldErrors.name ? styles.inputError : undefined}
              placeholder="예: 스페이스 라이더 석리"
              value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors(prev => ({ ...prev, name: false })); }}
              maxLength={20}
            />
            {fieldErrors.name && <p style={styles.errorMsg}>필수 입력 항목입니다</p>}
          </div>

          <div style={styles.field}>
            <label className="label-cosmic">소속 학교</label>
            <select
              className="select-cosmic"
              style={fieldErrors.school ? styles.inputError : undefined}
              value={school}
              onChange={(e) => { setSchool(e.target.value); setFieldErrors(prev => ({ ...prev, school: false })); }}
            >
              <option value="">학교를 선택하세요</option>
              {SCHOOLS.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
            {fieldErrors.school && <p style={styles.errorMsg}>학교를 선택해주세요</p>}
          </div>

          <div style={styles.field}>
            <label className="label-cosmic">비밀 입장 코드</label>
            <input
              className="input-cosmic"
              style={fieldErrors.room ? styles.inputError : undefined}
              placeholder="선생님이 알려준 코드를 입력하세요"
              value={room}
              onChange={(e) => { setRoom(e.target.value); setFieldErrors(prev => ({ ...prev, room: false })); }}
            />
            {fieldErrors.room && <p style={styles.errorMsg}>필수 입력 항목입니다</p>}
          </div>

          <button
            className="btn-nova"
            style={styles.joinBtn}
            onClick={handleJoin}
            disabled={isJoining || !name.trim() || !school || !room.trim()}
          >
            <span>{isJoining ? '🌠 우주로 진입 중...' : '🚀 우주선 탑승하기'}</span>
          </button>
        </div>

        {/* 하단 안내 */}
        <p style={styles.hint}>
          선생님이신가요?{' '}
          <a href="/dashboard" style={styles.link}>
            관제탑 열기 →
          </a>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  bgParticles: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    borderRadius: '50%',
    background: 'rgba(124, 92, 252, 0.4)',
    animation: 'pulseGlow 3s ease-in-out infinite',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    padding: '48px 40px',
    margin: '20px',
    zIndex: 2,
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: 36,
  },
  logoEmoji: {
    fontSize: '4rem',
    marginBottom: 12,
    display: 'inline-block',
  },
  title: {
    fontSize: '2.4rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: '1rem',
    color: 'var(--text-secondary)',
    fontWeight: 400,
    marginBottom: 16,
  },
  schoolBadges: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  field: {},
  joinBtn: {
    width: '100%',
    padding: '16px',
    fontSize: '1.1rem',
    marginTop: 8,
  },
  hint: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: '0.85rem',
    color: 'var(--text-dim)',
  },
  link: {
    color: 'var(--accent-pulsar)',
    textDecoration: 'none',
    fontWeight: 600,
  },
  inputError: {
    borderColor: '#f43f5e',
    boxShadow: '0 0 0 2px rgba(244, 63, 94, 0.2)',
  },
  errorMsg: {
    fontSize: '0.75rem',
    color: '#f43f5e',
    marginTop: 4,
    fontWeight: 500,
  },
};
