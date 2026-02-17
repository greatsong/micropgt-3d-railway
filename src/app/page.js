'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useClassStore } from '@/stores/useClassStore';
import { connectSocket } from '@/lib/socket';
import s from './page.module.css';

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
  const setStudentInfo = useClassStore((st) => st.setStudentInfo);
  const setConnected = useClassStore((st) => st.setConnected);
  const addNotification = useClassStore((st) => st.addNotification);

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
    <div className={s.container}>
      {/* 배경 파티클 — client-only to prevent hydration mismatch */}
      <div className={s.bgParticles}>
        {particles.map((p, i) => (
          <div
            key={i}
            className={s.particle}
            style={{
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
      <div className={`glass-card animate-fade-in ${s.card}`}>
        {/* 로고 영역 */}
        <div className={s.logoSection}>
          <div className={`animate-float ${s.logoEmoji}`}>🚀</div>
          <h1 className={s.title}>
            <span className="text-gradient">GPT야 놀자!</span>
          </h1>
          <p className={s.subtitle}>3D 인공지능 융합 교육 플랫폼</p>
          <div className={s.schoolBadges}>
            {SCHOOLS.map((sc) => (
              <span key={sc.code} className="badge-glow">
                {sc.emoji} {sc.name}
              </span>
            ))}
          </div>
        </div>

        {/* 입력 폼 */}
        <div className={s.form}>
          <div>
            <label className="label-cosmic">닉네임</label>
            <input
              className={`input-cosmic ${fieldErrors.name ? s.inputError : ''}`}
              placeholder="예: 스페이스 라이더 석리"
              value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors(prev => ({ ...prev, name: false })); }}
              maxLength={20}
            />
            {fieldErrors.name && <p className={s.errorMsg}>필수 입력 항목입니다</p>}
          </div>

          <div>
            <label className="label-cosmic">소속 학교</label>
            <select
              className={`select-cosmic ${fieldErrors.school ? s.inputError : ''}`}
              value={school}
              onChange={(e) => { setSchool(e.target.value); setFieldErrors(prev => ({ ...prev, school: false })); }}
            >
              <option value="">학교를 선택하세요</option>
              {SCHOOLS.map((sc) => (
                <option key={sc.code} value={sc.code}>
                  {sc.name}
                </option>
              ))}
            </select>
            {fieldErrors.school && <p className={s.errorMsg}>학교를 선택해주세요</p>}
          </div>

          <div>
            <label className="label-cosmic">비밀 입장 코드</label>
            <input
              className={`input-cosmic ${fieldErrors.room ? s.inputError : ''}`}
              placeholder="선생님이 알려준 코드를 입력하세요"
              value={room}
              onChange={(e) => { setRoom(e.target.value); setFieldErrors(prev => ({ ...prev, room: false })); }}
            />
            {fieldErrors.room && <p className={s.errorMsg}>필수 입력 항목입니다</p>}
          </div>

          <button
            className={`btn-nova ${s.joinBtn}`}
            onClick={handleJoin}
            disabled={isJoining || !name.trim() || !school || !room.trim()}
          >
            <span>{isJoining ? '🌠 우주로 진입 중...' : '🚀 우주선 탑승하기'}</span>
          </button>
        </div>

        {/* 하단 안내 */}
        <p className={s.hint}>
          선생님이신가요?{' '}
          <a href="/dashboard" className={s.link}>
            관제탑 열기 →
          </a>
        </p>
      </div>
    </div>
  );
}
