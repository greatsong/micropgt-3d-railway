'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── 코사인 유사도 계산 ──
function cosSim(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i];
    }
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ── STEP 1: 2D 벡터 시각화 ──
function Vector2DPanel() {
    const canvasRef = useRef(null);
    const [vecA, setVecA] = useState([3, 4]);
    const [vecB, setVecB] = useState([4, 1]);
    const [dragging, setDragging] = useState(null);

    const sim = cosSim(vecA, vecB);
    const angleDeg = Math.acos(Math.max(-1, Math.min(1, sim))) * 180 / Math.PI;

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        const cx = W / 2, cy = H / 2;
        const scale = 40;

        ctx.clearRect(0, 0, W, H);

        // 그리드
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let x = -5; x <= 5; x++) {
            ctx.beginPath(); ctx.moveTo(cx + x * scale, 0); ctx.lineTo(cx + x * scale, H); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, cy - x * scale); ctx.lineTo(W, cy - x * scale); ctx.stroke();
        }

        // 축
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

        // 각도 호
        if (sim < 0.999) {
            const angleA = Math.atan2(-vecA[1], vecA[0]);
            const angleB = Math.atan2(-vecB[1], vecB[0]);
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 30, Math.min(angleA, angleB), Math.max(angleA, angleB));
            ctx.stroke();
            // 각도 텍스트
            const midAngle = (angleA + angleB) / 2;
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 11px monospace';
            ctx.fillText(`${angleDeg.toFixed(1)}°`, cx + 38 * Math.cos(midAngle) - 10, cy + 38 * Math.sin(midAngle) + 4);
        }

        // 벡터 그리기 함수
        const drawVec = (v, color, label) => {
            const ex = cx + v[0] * scale, ey = cy - v[1] * scale;
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
            // 화살촉
            const angle = Math.atan2(cy - ey, ex - cx);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - 12 * Math.cos(angle - 0.3), ey + 12 * Math.sin(angle - 0.3));
            ctx.lineTo(ex - 12 * Math.cos(angle + 0.3), ey + 12 * Math.sin(angle + 0.3));
            ctx.fill();
            // 라벨
            ctx.fillStyle = color;
            ctx.font = 'bold 13px sans-serif';
            ctx.fillText(label, ex + 6, ey - 6);
            // 끝점 원
            ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2); ctx.fill();
        };

        drawVec(vecA, '#7c5cfc', `A [${vecA[0]}, ${vecA[1]}]`);
        drawVec(vecB, '#10b981', `B [${vecB[0]}, ${vecB[1]}]`);
    }, [vecA, vecB, angleDeg, sim]);

    useEffect(() => { draw(); }, [draw]);

    const handlePointerDown = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const scale = 40;

        const distA = Math.hypot(mx - (cx + vecA[0] * scale), my - (cy - vecA[1] * scale));
        const distB = Math.hypot(mx - (cx + vecB[0] * scale), my - (cy - vecB[1] * scale));

        if (distA < 20) setDragging('A');
        else if (distB < 20) setDragging('B');
    };

    const handlePointerMove = (e) => {
        if (!dragging) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const scale = 40;
        const x = Math.round((mx - cx) / scale);
        const y = Math.round((cy - my) / scale);
        const clamped = [Math.max(-5, Math.min(5, x)), Math.max(-5, Math.min(5, y))];
        if (dragging === 'A') setVecA(clamped);
        else setVecB(clamped);
    };

    const handlePointerUp = () => setDragging(null);

    return (
        <div style={styles.section}>
            <h2 style={styles.sectionTitle}>📐 Step 1: 2D에서 코사인 유사도 체험</h2>
            <p style={styles.desc}>
                코사인 유사도는 <strong>두 화살표(벡터)가 얼마나 비슷한 방향</strong>을 가리키는지 측정합니다.<br />
                화살표 끝을 <strong>드래그</strong>해서 방향을 바꿔보세요!
            </p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start' }}>
                <canvas
                    ref={canvasRef}
                    width={360} height={360}
                    style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,10,40,0.6)', cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                />

                <div style={{ minWidth: 200 }}>
                    <div style={styles.resultCard}>
                        <div style={styles.resultLabel}>코사인 유사도</div>
                        <div style={{
                            fontSize: '2rem', fontWeight: 800,
                            color: sim > 0.8 ? '#10b981' : sim > 0.3 ? '#fbbf24' : '#f43f5e',
                        }}>
                            {sim.toFixed(3)}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>
                            ({Math.round(sim * 100)}% 유사)
                        </div>
                    </div>
                    <div style={styles.resultCard}>
                        <div style={styles.resultLabel}>두 벡터 사이 각도</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>
                            {angleDeg.toFixed(1)}°
                        </div>
                    </div>

                    <div style={{ ...styles.infoBox, marginTop: 12 }}>
                        <strong style={{ color: '#7c5cfc' }}>💡 핵심 직관</strong>
                        <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                            <li><strong>같은 방향 (0°)</strong> → 유사도 = 1 (완전 동일)</li>
                            <li><strong>직각 (90°)</strong> → 유사도 = 0 (무관)</li>
                            <li><strong>반대 방향 (180°)</strong> → 유사도 = -1 (정반대)</li>
                        </ul>
                    </div>

                    <div style={{ ...styles.infoBox, marginTop: 8, background: 'rgba(251,191,36,0.06)', borderColor: 'rgba(251,191,36,0.15)' }}>
                        <strong style={{ color: '#fbbf24', fontSize: '0.78rem' }}>🤔 왜 유클리드 거리 대신 코사인 유사도?</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                            유클리드 거리는 화살표의 <strong>길이</strong>에 영향을 받지만,
                            코사인 유사도는 <strong>방향</strong>만 봅니다.
                            AI에서는 &quot;의미가 비슷한가?&quot;가 중요하지,
                            벡터가 얼마나 긴지는 중요하지 않기 때문입니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── STEP 2: 3D 벡터 시각화 ──
function Vector3DPanel() {
    const canvasRef = useRef(null);
    const [rotY, setRotY] = useState(-0.5);
    const [rotX, setRotX] = useState(0.3);
    const [isDragging, setIsDragging] = useState(false);
    const lastPos = useRef({ x: 0, y: 0 });

    const WORDS_3D = [
        { word: '고양이', vec: [3, 2, 1], color: '#7c5cfc' },
        { word: '강아지', vec: [3.5, 2.3, 0.8], color: '#a78bfa' },
        { word: '피자', vec: [-3, 1, 2], color: '#f43f5e' },
        { word: '햄버거', vec: [-2.5, 1.3, 2.2], color: '#fb7185' },
        { word: '기쁨', vec: [1, 4, -1], color: '#10b981' },
        { word: '슬픔', vec: [-1, -3, 1], color: '#fbbf24' },
    ];

    const [selA, setSelA] = useState(0);
    const [selB, setSelB] = useState(1);

    const sim = cosSim(WORDS_3D[selA].vec, WORDS_3D[selB].vec);
    const angleDeg = Math.acos(Math.max(-1, Math.min(1, sim))) * 180 / Math.PI;

    const project = useCallback((v) => {
        const [x, y, z] = v;
        const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
        const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
        const rx = x * cosY + z * sinY;
        const rz = -x * sinY + z * cosY;
        const ry = y * cosX - rz * sinX;
        const finalZ = y * sinX + rz * cosX;
        const scale = 30;
        const depth = 1 + finalZ * 0.05;
        return { px: 180 + rx * scale * depth, py: 180 - ry * scale * depth, depth: finalZ };
    }, [rotY, rotX]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        // 축
        const axes = [
            { v: [5, 0, 0], label: 'X', color: 'rgba(244,63,94,0.4)' },
            { v: [0, 5, 0], label: 'Y', color: 'rgba(16,185,129,0.4)' },
            { v: [0, 0, 5], label: 'Z', color: 'rgba(124,92,252,0.4)' },
        ];
        const origin = project([0, 0, 0]);
        axes.forEach(({ v, label, color }) => {
            const p = project(v);
            ctx.strokeStyle = color; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(origin.px, origin.py); ctx.lineTo(p.px, p.py); ctx.stroke();
            ctx.fillStyle = color; ctx.font = '10px sans-serif'; ctx.fillText(label, p.px + 4, p.py - 4);
        });

        // 단어 벡터 화살표
        WORDS_3D.forEach((w, i) => {
            const p = project(w.vec);
            const isSel = i === selA || i === selB;
            ctx.strokeStyle = isSel ? w.color : w.color + '60';
            ctx.lineWidth = isSel ? 2.5 : 1.5;
            ctx.beginPath(); ctx.moveTo(origin.px, origin.py); ctx.lineTo(p.px, p.py); ctx.stroke();
            ctx.fillStyle = isSel ? w.color : w.color + '80';
            ctx.beginPath(); ctx.arc(p.px, p.py, isSel ? 6 : 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = isSel ? '#fff' : 'var(--text-dim)';
            ctx.font = isSel ? 'bold 12px sans-serif' : '11px sans-serif';
            ctx.fillText(w.word, p.px + 8, p.py - 4);
        });
    }, [project, selA, selB]);

    useEffect(() => { draw(); }, [draw]);

    const handlePointerDown = (e) => {
        setIsDragging(true);
        lastPos.current = { x: e.clientX, y: e.clientY };
    };
    const handlePointerMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        setRotY(prev => prev + dx * 0.01);
        setRotX(prev => Math.max(-1.2, Math.min(1.2, prev + dy * 0.01)));
        lastPos.current = { x: e.clientX, y: e.clientY };
    };
    const handlePointerUp = () => setIsDragging(false);

    return (
        <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🧊 Step 2: 3D로 확장!</h2>
            <p style={styles.desc}>
                2D에서는 숫자 2개로 벡터를 만들었죠? 3D에서는 <strong>숫자 3개</strong>로 표현합니다.<br />
                차원이 늘어나도 코사인 유사도의 원리는 동일합니다! 화면을 드래그해서 3D로 돌려보세요.
            </p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start' }}>
                <canvas
                    ref={canvasRef}
                    width={360} height={360}
                    style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,10,40,0.6)', cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                />

                <div style={{ minWidth: 200 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 4 }}>단어 A</div>
                            <select className="select-cosmic" style={{ fontSize: '0.8rem', padding: '6px 8px', width: '100%' }}
                                value={selA} onChange={(e) => setSelA(+e.target.value)}>
                                {WORDS_3D.map((w, i) => <option key={i} value={i}>{w.word}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 4 }}>단어 B</div>
                            <select className="select-cosmic" style={{ fontSize: '0.8rem', padding: '6px 8px', width: '100%' }}
                                value={selB} onChange={(e) => setSelB(+e.target.value)}>
                                {WORDS_3D.map((w, i) => <option key={i} value={i}>{w.word}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={styles.resultCard}>
                        <div style={styles.resultLabel}>코사인 유사도</div>
                        <div style={{
                            fontSize: '1.8rem', fontWeight: 800,
                            color: sim > 0.8 ? '#10b981' : sim > 0.3 ? '#fbbf24' : '#f43f5e',
                        }}>
                            {sim.toFixed(3)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
                            각도: {angleDeg.toFixed(1)}° | {Math.round(sim * 100)}% 유사
                        </div>
                    </div>

                    <div style={{ ...styles.infoBox, marginTop: 8 }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 4 }}>벡터 값:</div>
                        <div style={{ fontSize: '0.78rem', color: WORDS_3D[selA].color, fontWeight: 600 }}>
                            {WORDS_3D[selA].word}: [{WORDS_3D[selA].vec.join(', ')}]
                        </div>
                        <div style={{ fontSize: '0.78rem', color: WORDS_3D[selB].color, fontWeight: 600, marginTop: 2 }}>
                            {WORDS_3D[selB].word}: [{WORDS_3D[selB].vec.join(', ')}]
                        </div>
                    </div>

                    <div style={{ ...styles.infoBox, marginTop: 8, background: 'rgba(52,211,153,0.06)', borderColor: 'rgba(52,211,153,0.15)' }}>
                        <strong style={{ color: '#34d399', fontSize: '0.78rem' }}>🔍 관찰해보세요!</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                            &quot;고양이&quot;와 &quot;강아지&quot;는 방향이 비슷하죠?<br />
                            &quot;피자&quot;와 &quot;햄버거&quot;도 비슷한 방향!<br />
                            하지만 &quot;기쁨&quot;과 &quot;슬픔&quot;은 거의 반대 방향입니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── STEP 3: 실제 임베딩 벡터 연산 ──
const GLOVE_EXAMPLES = [
    { a: 'king', b: 'man', c: 'woman', emoji: '👑', label: '왕 − 남자 + 여자 = ?' },
    { a: 'japan', b: 'tokyo', c: 'seoul', emoji: '🇰🇷', label: '일본 − 도쿄 + 서울 = ?' },
    { a: 'japan', b: 'tokyo', c: 'paris', emoji: '🗼', label: '일본 − 도쿄 + 파리 = ?' },
    { a: 'boy', b: 'man', c: 'woman', emoji: '👦', label: '소년 − 남자 + 여자 = ?' },
    { a: 'actor', b: 'man', c: 'woman', emoji: '🎭', label: '남배우 − 남자 + 여자 = ?' },
    { a: 'cat', b: 'kitten', c: 'puppy', emoji: '🐱', label: '고양이 − 새끼고양이 + 강아지 = ?' },
    { a: 'hot', b: 'summer', c: 'winter', emoji: '🌡️', label: '뜨거운 − 여름 + 겨울 = ?' },
    { a: 'teacher', b: 'school', c: 'hospital', emoji: '🏫', label: '선생님 − 학교 + 병원 = ?' },
    { a: 'prince', b: 'man', c: 'woman', emoji: '🤴', label: '왕자 − 남자 + 여자 = ?' },
    { a: 'doctor', b: 'man', c: 'woman', emoji: '⚠️', label: '의사 − 남자 + 여자 = ? (편향!)' },
];

function VectorArithmeticFullPanel() {
    const [gloveData, setGloveData] = useState(null);
    const [selectedExample, setSelectedExample] = useState(0);
    const [customMode, setCustomMode] = useState(false);
    const [wordA, setWordA] = useState('king');
    const [wordB, setWordB] = useState('man');
    const [wordC, setWordC] = useState('woman');
    const [showDeepDive, setShowDeepDive] = useState(false);

    useEffect(() => {
        fetch('/data/glove_vectors.json')
            .then(r => r.json())
            .then(data => setGloveData(data))
            .catch(() => {});
    }, []);

    if (!gloveData) return (
        <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🧮 Step 3: 실제 AI 임베딩으로 벡터 연산</h2>
            <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>임베딩 데이터 로딩 중...</p>
        </div>
    );

    const vectors = gloveData.words;
    const labels = gloveData.labels;
    const allWords = Object.keys(vectors);

    const ex = GLOVE_EXAMPLES[selectedExample];
    const curA = customMode ? wordA : ex.a;
    const curB = customMode ? wordB : ex.b;
    const curC = customMode ? wordC : ex.c;

    const vecA = vectors[curA];
    const vecB = vectors[curB];
    const vecC = vectors[curC];

    if (!vecA || !vecB || !vecC) return null;

    const resultVec = vecA.map((v, i) => v - vecB[i] + vecC[i]);

    const rankings = allWords
        .filter(w => w !== curA && w !== curB && w !== curC)
        .map(word => ({ word, label: labels[word], sim: cosSim(resultVec, vectors[word]) }))
        .sort((a, b) => b.sim - a.sim);

    const bestMatch = rankings[0];
    const lbl = (w) => labels[w] ? `${labels[w]}(${w})` : w;

    // A-B의 유사도, 결과와 bestMatch의 유사도
    const simAB = cosSim(vecA, vecB);

    return (
        <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🧮 Step 3: 실제 AI 임베딩으로 벡터 연산</h2>
            <p style={styles.desc}>
                지금까지 2D, 3D로 연습했죠? 실제 AI는 <strong>300차원</strong> 벡터를 사용합니다.<br />
                차원이 300개라 직접 보기는 어렵지만, 코사인 유사도의 원리는 똑같습니다!
            </p>

            {/* 차원 비교 */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                {[
                    { dim: '2D', n: 2, desc: '평면 위 방향', done: true },
                    { dim: '3D', n: 3, desc: '공간 위 방향', done: true },
                    { dim: '300D', n: 300, desc: '실제 AI 임베딩', done: false },
                ].map(d => (
                    <div key={d.dim} style={{
                        padding: '8px 16px', borderRadius: 8, textAlign: 'center',
                        background: d.done ? 'rgba(16,185,129,0.08)' : 'rgba(124,92,252,0.1)',
                        border: `1px solid ${d.done ? 'rgba(16,185,129,0.2)' : 'rgba(124,92,252,0.25)'}`,
                    }}>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: d.done ? '#10b981' : '#7c5cfc' }}>
                            {d.done ? '✅' : '👉'} {d.dim}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            숫자 {d.n}개 = {d.desc}
                        </div>
                    </div>
                ))}
            </div>

            {/* 데이터 출처 */}
            <div style={{ ...styles.infoBox, textAlign: 'center', marginBottom: 16 }}>
                <strong style={{ color: '#fbbf24', fontSize: '0.82rem' }}>📊 사용 데이터</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Stanford NLP의 <strong>GloVe</strong> 모델 — Wikipedia + Gigaword (60억 개 단어)에서 학습<br />
                    각 단어가 300개의 숫자로 표현됩니다. 51개 단어를 미리 추출했습니다.
                </p>
            </div>

            {/* 추천 예시 */}
            {!customMode && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, justifyContent: 'center' }}>
                    {GLOVE_EXAMPLES.map((ex, i) => (
                        <button key={i} onClick={() => setSelectedExample(i)} style={{
                            padding: '5px 10px', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer',
                            border: i === selectedExample ? '1.5px solid #7c5cfc' : '1px solid rgba(255,255,255,0.1)',
                            background: i === selectedExample ? 'rgba(124,92,252,0.15)' : 'rgba(255,255,255,0.03)',
                            color: i === selectedExample ? '#a78bfa' : 'var(--text-dim)',
                            fontWeight: i === selectedExample ? 700 : 400,
                        }}>
                            {ex.emoji} {ex.label}
                        </button>
                    ))}
                </div>
            )}

            {/* 자유 모드 토글 */}
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <button onClick={() => setCustomMode(!customMode)} style={{
                    padding: '6px 16px', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer',
                    border: '1px solid rgba(251,191,36,0.3)',
                    background: customMode ? 'rgba(251,191,36,0.15)' : 'transparent',
                    color: '#fbbf24', fontWeight: 600,
                }}>
                    {customMode ? '📋 추천 예시로 돌아가기' : '✏️ 자유롭게 조합하기'}
                </button>
            </div>

            {/* 자유 모드: 드롭다운 */}
            {customMode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 14 }}>
                    <select className="select-cosmic" style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                        value={wordA} onChange={(e) => setWordA(e.target.value)}>
                        {allWords.map(w => <option key={w} value={w}>{labels[w]}({w})</option>)}
                    </select>
                    <span style={{ fontWeight: 800, color: '#f43f5e', fontSize: '1.2rem' }}>−</span>
                    <select className="select-cosmic" style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                        value={wordB} onChange={(e) => setWordB(e.target.value)}>
                        {allWords.map(w => <option key={w} value={w}>{labels[w]}({w})</option>)}
                    </select>
                    <span style={{ fontWeight: 800, color: '#10b981', fontSize: '1.2rem' }}>+</span>
                    <select className="select-cosmic" style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                        value={wordC} onChange={(e) => setWordC(e.target.value)}>
                        {allWords.map(w => <option key={w} value={w}>{labels[w]}({w})</option>)}
                    </select>
                </div>
            )}

            {/* 수식 표시 */}
            <div style={{
                padding: '12px 16px', borderRadius: 10, marginBottom: 12,
                background: 'rgba(15,10,40,0.6)', border: '1px solid rgba(124, 92, 252, 0.2)',
                textAlign: 'center', fontSize: '1rem', color: '#e2e8f0',
            }}>
                {lbl(curA)} <span style={{ color: '#f43f5e', fontWeight: 800 }}>−</span> {lbl(curB)} <span style={{ color: '#10b981', fontWeight: 800 }}>+</span> {lbl(curC)} <span style={{ color: '#fbbf24', fontWeight: 800 }}>=</span> ?
            </div>

            {/* 결과 */}
            {bestMatch && (
                <div style={{
                    padding: '16px 20px', borderRadius: 12,
                    background: 'rgba(16, 185, 129, 0.08)', border: '1.5px solid rgba(16, 185, 129, 0.25)',
                    textAlign: 'center', marginBottom: 12,
                }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 4 }}>300차원 코사인 유사도로 찾은 가장 가까운 단어</div>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>{bestMatch.label || bestMatch.word}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginLeft: 8 }}>
                        ({bestMatch.word}, 유사도 {(bestMatch.sim * 100).toFixed(1)}%)
                    </span>
                    <div style={{ marginTop: 8, fontSize: '0.95rem', color: '#fbbf24', fontWeight: 700 }}>
                        {lbl(curA)} − {lbl(curB)} + {lbl(curC)} ≈ <strong>{bestMatch.label || bestMatch.word}</strong>
                    </div>
                </div>
            )}

            {/* Top 5 순위 */}
            <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 6 }}>Top 5 후보 단어:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {rankings.slice(0, 5).map((r, i) => (
                        <span key={r.word} style={{
                            padding: '4px 10px', borderRadius: 6, fontSize: '0.78rem',
                            background: i === 0 ? 'rgba(16,185,129,0.15)' : 'rgba(124,92,252,0.06)',
                            color: i === 0 ? '#10b981' : 'var(--text-dim)',
                            fontWeight: i === 0 ? 700 : 400,
                            border: i === 0 ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.05)',
                        }}>
                            {i + 1}. {r.label || r.word} ({(r.sim * 100).toFixed(1)}%)
                        </span>
                    ))}
                </div>
            </div>

            {/* 왜 이게 작동하는지 설명 */}
            <div style={{ ...styles.infoBox, background: 'rgba(52,211,153,0.06)', borderColor: 'rgba(52,211,153,0.15)' }}>
                <strong style={{ color: '#34d399', fontSize: '0.82rem' }}>🤯 왜 벡터 빼기/더하기로 의미가 조합될까?</strong>
                <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    AI가 대량의 텍스트를 학습하면, <strong>&quot;왕&quot;과 &quot;여왕&quot;의 관계</strong>가
                    <strong>&quot;남자&quot;와 &quot;여자&quot;의 관계</strong>와 비슷한 방향의 차이로 저장됩니다.<br />
                    그래서 &quot;왕&quot;에서 &quot;남자 방향&quot;을 빼고 &quot;여자 방향&quot;을 더하면
                    &quot;여왕&quot;에 가까워지는 겁니다!
                </p>
            </div>

            {/* 편향 경고 */}
            {(curA === 'doctor' && curB === 'man' && curC === 'woman') && (
                <div style={{ ...styles.infoBox, marginTop: 10, background: 'rgba(244,63,94,0.06)', borderColor: 'rgba(244,63,94,0.2)' }}>
                    <strong style={{ color: '#f43f5e', fontSize: '0.82rem' }}>⚠️ AI 편향 (Bias) 발견!</strong>
                    <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        &quot;의사 − 남자 + 여자 = 간호사&quot;? 이건 AI가 학습 데이터에서 흡수한 <strong>성별 편향</strong>입니다.<br />
                        AI 임베딩은 인터넷 텍스트의 편견까지 학습하므로, 이를 인식하고 보정하는 것이 중요합니다.
                        이것이 바로 14주차에서 배울 <strong>RLHF(인간 피드백 강화학습)</strong>가 필요한 이유 중 하나입니다!
                    </p>
                </div>
            )}

            {/* 한 걸음 더: 코사인 유사도 수식 */}
            <div style={{ marginTop: 12 }}>
                <button onClick={() => setShowDeepDive(!showDeepDive)} style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                    background: 'rgba(124, 92, 252, 0.08)', border: '1px solid rgba(124, 92, 252, 0.25)',
                    color: '#a78bfa', fontSize: '0.85rem', fontWeight: 600,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <span>{showDeepDive ? '▼' : '▶'} 한 걸음 더: 코사인 유사도 수식</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{showDeepDive ? '접기' : '펼치기'}</span>
                </button>
                {showDeepDive && (
                    <div onClick={(e) => e.stopPropagation()} style={{
                        padding: 16, marginTop: 4, borderRadius: 10,
                        background: 'rgba(124, 92, 252, 0.04)', border: '1px solid rgba(124, 92, 252, 0.15)',
                        fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.8,
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,10,40,0.6)' }}>
                            <code style={{ color: '#a78bfa', fontSize: '0.9rem' }}>
                                cos(θ) = (A · B) / (|A| × |B|)
                            </code>
                        </div>
                        <ul style={{ paddingLeft: 20, margin: 0 }}>
                            <li><strong>A · B (내적)</strong> = 같은 위치의 숫자끼리 곱해서 전부 더한 값</li>
                            <li><strong>|A| (크기)</strong> = 벡터의 길이 = √(각 숫자를 제곱해서 더한 값)</li>
                            <li><strong>나누기</strong> = 크기의 영향을 제거하고 <strong>방향만</strong> 비교</li>
                        </ul>
                        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(251,191,36,0.06)' }}>
                            <strong style={{ color: '#fbbf24' }}>계산 예시 (2D)</strong><br />
                            A = [3, 4], B = [4, 1]<br />
                            내적 = 3×4 + 4×1 = 16<br />
                            |A| = √(9+16) = 5, |B| = √(16+1) ≈ 4.12<br />
                            cos(θ) = 16 / (5 × 4.12) ≈ 0.776
                        </div>
                    </div>
                )}
            </div>

            {/* 출처 */}
            <div style={{ marginTop: 10, fontSize: '0.65rem', color: 'var(--text-dim)', textAlign: 'center', opacity: 0.7 }}>
                데이터: GloVe (Stanford NLP) — 60억 단어 학습, 300차원, 51개 단어 추출
            </div>
        </div>
    );
}

// ── 메인 페이지 ──
export default function Week4Practice() {
    const router = useRouter();

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button
                    onClick={() => router.push('/week4/intro')}
                    style={styles.backBtn}
                >
                    ← 개념 복습
                </button>
                <h1 style={styles.pageTitle}>📐 코사인 유사도 & 벡터 연산 실습</h1>
                <p style={styles.pageSubtitle}>
                    &quot;비슷한 의미의 단어는 비슷한 방향을 가리킨다&quot; — 이 아이디어를 직접 체험해봅시다!
                </p>
            </div>

            {/* 왜 이걸 배우는지 */}
            <div style={{ ...styles.infoBox, maxWidth: 700, margin: '0 auto 24px', textAlign: 'center' }}>
                <strong style={{ color: '#fbbf24', fontSize: '0.88rem' }}>🤔 왜 코사인 유사도가 중요한가요?</strong>
                <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    AI가 &quot;고양이와 강아지는 비슷하고, 자동차와는 다르다&quot;를 <strong>숫자로</strong> 판단하는 방법이
                    바로 코사인 유사도입니다. 검색 엔진, 추천 시스템, 챗봇 등 모든 AI 서비스의 핵심 기술이에요!
                </p>
            </div>

            <Vector2DPanel />
            <Vector3DPanel />
            <VectorArithmeticFullPanel />

            {/* 다음 단계 */}
            <div style={{ textAlign: 'center', marginTop: 30, marginBottom: 40 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                    코사인 유사도를 이해했다면, 이제 <strong>3D 은하수</strong>에서<br />
                    클래스 친구들과 함께 단어 별을 만들어 보세요!
                </div>
                <button
                    className="btn-nova"
                    style={{ padding: '14px 36px', fontSize: '1.05rem' }}
                    onClick={() => router.push('/week4')}
                >
                    <span>🌌 3D 임베딩 은하수로 이동 →</span>
                </button>
            </div>
        </div>
    );
}

// ── 스타일 ──
const styles = {
    container: {
        minHeight: '100vh',
        padding: '20px 16px',
        maxWidth: 900,
        margin: '0 auto',
    },
    header: {
        textAlign: 'center',
        marginBottom: 30,
    },
    backBtn: {
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.1)',
        color: 'var(--text-dim)',
        padding: '6px 14px',
        borderRadius: 8,
        fontSize: '0.8rem',
        cursor: 'pointer',
        marginBottom: 16,
    },
    pageTitle: {
        fontSize: '2rem',
        fontWeight: 800,
        background: 'linear-gradient(to right, #7c5cfc, #22d3ee)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: 8,
    },
    pageSubtitle: {
        fontSize: '1rem',
        color: 'var(--text-secondary)',
        fontStyle: 'italic',
    },
    section: {
        marginBottom: 30,
        padding: 24,
        borderRadius: 16,
        background: 'rgba(30, 41, 59, 0.5)',
        border: '1px solid rgba(255,255,255,0.08)',
    },
    sectionTitle: {
        fontSize: '1.3rem',
        fontWeight: 700,
        marginBottom: 8,
        color: '#e2e8f0',
    },
    desc: {
        fontSize: '0.88rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.7,
        marginBottom: 16,
    },
    resultCard: {
        padding: '12px 16px',
        borderRadius: 10,
        background: 'rgba(15,10,40,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        textAlign: 'center',
        marginBottom: 8,
    },
    resultLabel: {
        fontSize: '0.72rem',
        color: 'var(--text-dim)',
        marginBottom: 4,
    },
    infoBox: {
        padding: '10px 14px',
        borderRadius: 10,
        background: 'rgba(124,92,252,0.06)',
        border: '1px solid rgba(124,92,252,0.15)',
        fontSize: '0.8rem',
        lineHeight: 1.7,
    },
};
