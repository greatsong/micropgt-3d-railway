'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import s from './page.module.css';

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
        <div className={s.section}>
            <h2 className={s.sectionTitle}>📐 Step 1: 2D에서 코사인 유사도 체험</h2>
            <p className={s.desc}>
                코사인 유사도는 <strong>두 화살표(벡터)가 얼마나 비슷한 방향</strong>을 가리키는지 측정합니다.<br />
                화살표 끝을 <strong>드래그</strong>해서 방향을 바꿔보세요!
            </p>

            <div className={s.flexRow}>
                <canvas
                    ref={canvasRef}
                    width={360} height={360}
                    className={s.canvas}
                    style={{ cursor: dragging ? 'grabbing' : 'grab' }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                />

                <div className={s.sidePanel}>
                    <div className={s.resultCard}>
                        <div className={s.resultLabel}>코사인 유사도</div>
                        <div
                            className={s.simBig}
                            style={{ color: sim > 0.8 ? '#10b981' : sim > 0.3 ? '#fbbf24' : '#f43f5e' }}
                        >
                            {sim.toFixed(3)}
                        </div>
                        <div className={s.simPercent}>
                            ({Math.round(sim * 100)}% 유사)
                        </div>
                    </div>
                    <div className={s.resultCard}>
                        <div className={s.resultLabel}>두 벡터 사이 각도</div>
                        <div className={s.angleBig}>
                            {angleDeg.toFixed(1)}°
                        </div>
                    </div>

                    <div className={s.insightBox}>
                        <strong className={s.insightTitle}>💡 핵심 직관</strong>
                        <ul className={s.insightList}>
                            <li><strong>같은 방향 (0°)</strong> → 유사도 = 1 (완전 동일)</li>
                            <li><strong>직각 (90°)</strong> → 유사도 = 0 (무관)</li>
                            <li><strong>반대 방향 (180°)</strong> → 유사도 = -1 (정반대)</li>
                        </ul>
                    </div>

                    <div className={s.whyBox}>
                        <strong className={s.whyBoxTitle}>🤔 왜 유클리드 거리 대신 코사인 유사도?</strong>
                        <p className={s.whyBoxText}>
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
        <div className={s.section}>
            <h2 className={s.sectionTitle}>🧊 Step 2: 3D로 확장!</h2>
            <p className={s.desc}>
                2D에서는 숫자 2개로 벡터를 만들었죠? 3D에서는 <strong>숫자 3개</strong>로 표현합니다.<br />
                차원이 늘어나도 코사인 유사도의 원리는 동일합니다! 화면을 드래그해서 3D로 돌려보세요.
            </p>

            <div className={s.flexRow}>
                <canvas
                    ref={canvasRef}
                    width={360} height={360}
                    className={s.canvas}
                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                />

                <div className={s.sidePanel}>
                    <div className={s.selectRow}>
                        <div className={s.selectCol}>
                            <div className={s.selectLabel}>단어 A</div>
                            <select className={`select-cosmic ${s.selectInput}`}
                                value={selA} onChange={(e) => setSelA(+e.target.value)}>
                                {WORDS_3D.map((w, i) => <option key={i} value={i}>{w.word}</option>)}
                            </select>
                        </div>
                        <div className={s.selectCol}>
                            <div className={s.selectLabel}>단어 B</div>
                            <select className={`select-cosmic ${s.selectInput}`}
                                value={selB} onChange={(e) => setSelB(+e.target.value)}>
                                {WORDS_3D.map((w, i) => <option key={i} value={i}>{w.word}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className={s.resultCard}>
                        <div className={s.resultLabel}>코사인 유사도</div>
                        <div
                            className={s.simBig3D}
                            style={{ color: sim > 0.8 ? '#10b981' : sim > 0.3 ? '#fbbf24' : '#f43f5e' }}
                        >
                            {sim.toFixed(3)}
                        </div>
                        <div className={s.angleText}>
                            각도: {angleDeg.toFixed(1)}° | {Math.round(sim * 100)}% 유사
                        </div>
                    </div>

                    <div className={s.vecInfoBox}>
                        <div className={s.vecInfoLabel}>벡터 값:</div>
                        <div style={{ fontSize: '0.78rem', color: WORDS_3D[selA].color, fontWeight: 600 }}>
                            {WORDS_3D[selA].word}: [{WORDS_3D[selA].vec.join(', ')}]
                        </div>
                        <div style={{ fontSize: '0.78rem', color: WORDS_3D[selB].color, fontWeight: 600, marginTop: 2 }}>
                            {WORDS_3D[selB].word}: [{WORDS_3D[selB].vec.join(', ')}]
                        </div>
                    </div>

                    <div className={s.observeBox}>
                        <strong className={s.observeTitle}>🔍 관찰해보세요!</strong>
                        <p className={s.observeText}>
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
        <div className={s.section}>
            <h2 className={s.sectionTitle}>🧮 Step 3: 실제 AI 임베딩으로 벡터 연산</h2>
            <p className={s.loadingText}>임베딩 데이터 로딩 중...</p>
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
        <div className={s.section}>
            <h2 className={s.sectionTitle}>🧮 Step 3: 실제 AI 임베딩으로 벡터 연산</h2>
            <p className={s.desc}>
                지금까지 2D, 3D로 연습했죠? 실제 AI는 <strong>300차원</strong> 벡터를 사용합니다.<br />
                차원이 300개라 직접 보기는 어렵지만, 코사인 유사도의 원리는 똑같습니다!
            </p>

            {/* 차원 비교 */}
            <div className={s.dimRow}>
                {[
                    { dim: '2D', n: 2, desc: '평면 위 방향', done: true },
                    { dim: '3D', n: 3, desc: '공간 위 방향', done: true },
                    { dim: '300D', n: 300, desc: '실제 AI 임베딩', done: false },
                ].map(d => (
                    <div key={d.dim} className={d.done ? s.dimCardDone : s.dimCardCurrent}>
                        <div className={d.done ? s.dimCardDoneLabel : s.dimCardCurrentLabel}>
                            {d.done ? '✅' : '👉'} {d.dim}
                        </div>
                        <div className={s.dimCardSub}>
                            숫자 {d.n}개 = {d.desc}
                        </div>
                    </div>
                ))}
            </div>

            {/* 데이터 출처 */}
            <div className={s.dataSourceBox}>
                <strong className={s.dataSourceTitle}>📊 사용 데이터</strong>
                <p className={s.dataSourceText}>
                    Stanford NLP의 <strong>GloVe</strong> 모델 — Wikipedia + Gigaword (60억 개 단어)에서 학습<br />
                    각 단어가 300개의 숫자로 표현됩니다. 51개 단어를 미리 추출했습니다.
                </p>
            </div>

            {/* 추천 예시 */}
            {!customMode && (
                <div className={s.exampleBtnRow}>
                    {GLOVE_EXAMPLES.map((ex, i) => (
                        <button
                            key={i}
                            onClick={() => setSelectedExample(i)}
                            className={i === selectedExample ? s.exampleBtnActive : s.exampleBtn}
                        >
                            {ex.emoji} {ex.label}
                        </button>
                    ))}
                </div>
            )}

            {/* 자유 모드 토글 */}
            <div className={s.toggleBtnWrap}>
                <button
                    onClick={() => setCustomMode(!customMode)}
                    className={customMode ? s.toggleBtnActive : s.toggleBtn}
                >
                    {customMode ? '📋 추천 예시로 돌아가기' : '✏️ 자유롭게 조합하기'}
                </button>
            </div>

            {/* 자유 모드: 드롭다운 */}
            {customMode && (
                <div className={s.customRow}>
                    <select className={`select-cosmic ${s.customSelect}`}
                        value={wordA} onChange={(e) => setWordA(e.target.value)}>
                        {allWords.map(w => <option key={w} value={w}>{labels[w]}({w})</option>)}
                    </select>
                    <span className={s.opMinus}>−</span>
                    <select className={`select-cosmic ${s.customSelect}`}
                        value={wordB} onChange={(e) => setWordB(e.target.value)}>
                        {allWords.map(w => <option key={w} value={w}>{labels[w]}({w})</option>)}
                    </select>
                    <span className={s.opPlus}>+</span>
                    <select className={`select-cosmic ${s.customSelect}`}
                        value={wordC} onChange={(e) => setWordC(e.target.value)}>
                        {allWords.map(w => <option key={w} value={w}>{labels[w]}({w})</option>)}
                    </select>
                </div>
            )}

            {/* 수식 표시 */}
            <div className={s.formulaBar}>
                {lbl(curA)} <span className={s.formulaMinus}>−</span> {lbl(curB)} <span className={s.formulaPlus}>+</span> {lbl(curC)} <span className={s.formulaEquals}>=</span> ?
            </div>

            {/* 결과 */}
            {bestMatch && (
                <div className={s.bestMatchCard}>
                    <div className={s.bestMatchLabel}>300차원 코사인 유사도로 찾은 가장 가까운 단어</div>
                    <span className={s.bestMatchWord}>{bestMatch.label || bestMatch.word}</span>
                    <span className={s.bestMatchMeta}>
                        ({bestMatch.word}, 유사도 {(bestMatch.sim * 100).toFixed(1)}%)
                    </span>
                    <div className={s.bestMatchFormula}>
                        {lbl(curA)} − {lbl(curB)} + {lbl(curC)} ≈ <strong>{bestMatch.label || bestMatch.word}</strong>
                    </div>
                </div>
            )}

            {/* Top 5 순위 */}
            <div className={s.rankingWrap}>
                <div className={s.rankingTitle}>Top 5 후보 단어:</div>
                <div className={s.rankingRow}>
                    {rankings.slice(0, 5).map((r, i) => (
                        <span key={r.word} className={i === 0 ? s.rankingFirst : s.rankingOther}>
                            {i + 1}. {r.label || r.word} ({(r.sim * 100).toFixed(1)}%)
                        </span>
                    ))}
                </div>
            </div>

            {/* 왜 이게 작동하는지 설명 */}
            <div className={s.whyWorksBox}>
                <strong className={s.whyWorksTitle}>🤯 왜 벡터 빼기/더하기로 의미가 조합될까?</strong>
                <p className={s.whyWorksText}>
                    AI가 대량의 텍스트를 학습하면, <strong>&quot;왕&quot;과 &quot;여왕&quot;의 관계</strong>가
                    <strong>&quot;남자&quot;와 &quot;여자&quot;의 관계</strong>와 비슷한 방향의 차이로 저장됩니다.<br />
                    그래서 &quot;왕&quot;에서 &quot;남자 방향&quot;을 빼고 &quot;여자 방향&quot;을 더하면
                    &quot;여왕&quot;에 가까워지는 겁니다!
                </p>
            </div>

            {/* 편향 경고 */}
            {(curA === 'doctor' && curB === 'man' && curC === 'woman') && (
                <div className={s.biasBox}>
                    <strong className={s.biasTitle}>⚠️ AI 편향 (Bias) 발견!</strong>
                    <p className={s.biasText}>
                        &quot;의사 − 남자 + 여자 = 간호사&quot;? 이건 AI가 학습 데이터에서 흡수한 <strong>성별 편향</strong>입니다.<br />
                        AI 임베딩은 인터넷 텍스트의 편견까지 학습하므로, 이를 인식하고 보정하는 것이 중요합니다.
                        이것이 바로 14주차에서 배울 <strong>RLHF(인간 피드백 강화학습)</strong>가 필요한 이유 중 하나입니다!
                    </p>
                </div>
            )}

            {/* 한 걸음 더: 코사인 유사도 수식 */}
            <div className={s.deepDiveWrap}>
                <button onClick={() => setShowDeepDive(!showDeepDive)} className={s.deepDiveToggle}>
                    <span>{showDeepDive ? '▼' : '▶'} 한 걸음 더: 코사인 유사도 수식</span>
                    <span className={s.deepDiveHint}>{showDeepDive ? '접기' : '펼치기'}</span>
                </button>
                {showDeepDive && (
                    <div onClick={(e) => e.stopPropagation()} className={s.deepDiveContent}>
                        <div className={s.formulaBox}>
                            <code className={s.formulaCode}>
                                cos(θ) = (A · B) / (|A| × |B|)
                            </code>
                        </div>
                        <ul className={s.formulaList}>
                            <li><strong>A · B (내적)</strong> = 같은 위치의 숫자끼리 곱해서 전부 더한 값</li>
                            <li><strong>|A| (크기)</strong> = 벡터의 길이 = √(각 숫자를 제곱해서 더한 값)</li>
                            <li><strong>나누기</strong> = 크기의 영향을 제거하고 <strong>방향만</strong> 비교</li>
                        </ul>
                        <div className={s.exampleCalc}>
                            <strong className={s.exampleCalcTitle}>계산 예시 (2D)</strong><br />
                            A = [3, 4], B = [4, 1]<br />
                            내적 = 3×4 + 4×1 = 16<br />
                            |A| = √(9+16) = 5, |B| = √(16+1) ≈ 4.12<br />
                            cos(θ) = 16 / (5 × 4.12) ≈ 0.776
                        </div>
                    </div>
                )}
            </div>

            {/* 출처 */}
            <div className={s.dataCredit}>
                데이터: GloVe (Stanford NLP) — 60억 단어 학습, 300차원, 51개 단어 추출
            </div>
        </div>
    );
}

// ── 메인 페이지 ──
export default function Week4Practice() {
    const router = useRouter();

    return (
        <div className={s.container}>
            <div className={s.header}>
                <button
                    onClick={() => router.push('/week4/intro')}
                    className={s.backBtn}
                >
                    ← 개념 복습
                </button>
                <h1 className={s.pageTitle}>📐 코사인 유사도 & 벡터 연산 실습</h1>
                <p className={s.pageSubtitle}>
                    &quot;비슷한 의미의 단어는 비슷한 방향을 가리킨다&quot; — 이 아이디어를 직접 체험해봅시다!
                </p>
            </div>

            {/* 왜 이걸 배우는지 */}
            <div className={s.whyImportantBox}>
                <strong className={s.whyImportantTitle}>🤔 왜 코사인 유사도가 중요한가요?</strong>
                <p className={s.whyImportantText}>
                    AI가 &quot;고양이와 강아지는 비슷하고, 자동차와는 다르다&quot;를 <strong>숫자로</strong> 판단하는 방법이
                    바로 코사인 유사도입니다. 검색 엔진, 추천 시스템, 챗봇 등 모든 AI 서비스의 핵심 기술이에요!
                </p>
            </div>

            <Vector2DPanel />
            <Vector3DPanel />
            <VectorArithmeticFullPanel />

            {/* 다음 단계 */}
            <div className={s.footerWrap}>
                <div className={s.footerText}>
                    코사인 유사도를 이해했다면, 이제 <strong>3D 은하수</strong>에서<br />
                    클래스 친구들과 함께 단어 별을 만들어 보세요!
                </div>
                <button
                    className={`btn-nova ${s.novaBtn}`}
                    onClick={() => router.push('/week4')}
                >
                    <span>🌌 3D 임베딩 은하수로 이동 →</span>
                </button>
            </div>
        </div>
    );
}
