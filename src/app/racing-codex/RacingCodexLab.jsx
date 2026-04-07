'use client';

import { useEffect, useMemo, useState } from 'react';
import Breadcrumb from '@/components/layout/Breadcrumb';
import {
  RACING_CODEX_ARC,
  RACING_CODEX_LEVELS,
  RACING_PRESETS,
  getLevelGuide,
  getPresetById,
} from './courseData';
import CourseMap from './CourseMap';
import { simulateRaceJourney } from './simulation';
import styles from './page.module.css';

const DEFAULT_LEVEL = 3;
const DEFAULT_PRESET = 'balanced';

function formatNumber(value, digits = 2) {
  return Number(value).toFixed(digits);
}

export default function RacingCodexLab() {
  const initialPreset = getPresetById(DEFAULT_PRESET);
  const [selectedLevel, setSelectedLevel] = useState(DEFAULT_LEVEL);
  const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_PRESET);
  const [learningRate, setLearningRate] = useState(initialPreset.learningRate);
  const [momentum, setMomentum] = useState(initialPreset.momentum);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [runResult, setRunResult] = useState(() =>
    simulateRaceJourney({
      level: DEFAULT_LEVEL,
      learningRate: initialPreset.learningRate,
      momentum: initialPreset.momentum,
    })
  );

  useEffect(() => {
    if (!isPlaying) return undefined;

    const intervalId = window.setInterval(() => {
      setFrameIndex((previous) => {
        const lastFrame = runResult.frames.length - 1;

        if (previous >= lastFrame) {
          window.clearInterval(intervalId);
          setIsPlaying(false);
          return previous;
        }

        return previous + 1;
      });
    }, 70);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, runResult]);

  const levelGuide = useMemo(() => getLevelGuide(selectedLevel), [selectedLevel]);
  const currentFrame = runResult.frames[Math.min(frameIndex, runResult.frames.length - 1)];
  const progressPercent = Math.round(
    (Math.min(frameIndex, runResult.frames.length - 1) / Math.max(runResult.frames.length - 1, 1)) * 100
  );
  const recommendedPresets = useMemo(
    () =>
      RACING_PRESETS.filter((preset) => preset.fitLevels.includes(selectedLevel)),
    [selectedLevel]
  );

  const runSimulation = (nextLevel, nextLearningRate, nextMomentum, autoplay = true) => {
    const result = simulateRaceJourney({
      level: nextLevel,
      learningRate: nextLearningRate,
      momentum: nextMomentum,
    });

    setRunResult(result);
    setFrameIndex(0);
    setIsPlaying(autoplay);
  };

  const handleSelectLevel = (level) => {
    const recommendedPreset =
      RACING_PRESETS.find((preset) => preset.fitLevels.includes(level)) || getPresetById(DEFAULT_PRESET);

    setSelectedLevel(level);
    setSelectedPresetId(recommendedPreset.id);
    setLearningRate(recommendedPreset.learningRate);
    setMomentum(recommendedPreset.momentum);
    runSimulation(level, recommendedPreset.learningRate, recommendedPreset.momentum, false);
  };

  const handleApplyPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setLearningRate(preset.learningRate);
    setMomentum(preset.momentum);
    runSimulation(selectedLevel, preset.learningRate, preset.momentum, false);
  };

  const architectureCards = [
    {
      title: 'courseData.js',
      copy: '학습 목표, 교사용 질문, 추천 프리셋을 분리했습니다.',
    },
    {
      title: 'simulation.js',
      copy: '레이싱 물리와 해설 로직을 재현 가능한 순수 함수로 뽑았습니다.',
    },
    {
      title: 'CourseMap.jsx',
      copy: '경로 시각화는 입력 데이터만 받아 그리는 전용 컴포넌트로 정리했습니다.',
    },
    {
      title: 'RacingCodexLab.jsx',
      copy: '페이지는 오케스트레이션만 담당하도록 역할을 좁혔습니다.',
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <Breadcrumb
          items={[{ label: 'Week 5', href: '/week5' }]}
          current="Racing Codex"
        />

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.kicker}>Refactored Learning Lab</div>
            <h1 className={styles.title}>Racing Codex</h1>
            <p className={styles.lead}>
              경사하강법 레이싱을 교육 설명, 파라미터 조절, 경로 시각화, 회고 질문으로 분리한 새 실험실입니다.
              같은 출발점에서 항상 같은 결과가 나오도록 재현 가능한 시뮬레이터로 구성해 기술적 안정성도 높였습니다.
            </p>
          </div>

          <div className={styles.heroPanel}>
            <div className={styles.heroStat}>
              <span className={styles.heroLabel}>현재 개념</span>
              <strong>{levelGuide.concept}</strong>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroLabel}>선택 맵</span>
              <strong>
                {levelGuide.emoji} {levelGuide.name}
              </strong>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroLabel}>진행률</span>
              <strong>{progressPercent}%</strong>
            </div>
          </div>
        </section>

        <section className={styles.arcGrid}>
          {RACING_CODEX_ARC.map((item) => (
            <article key={item.title} className={`glass-card ${styles.arcCard}`}>
              <span className={styles.arcTitle}>{item.title}</span>
              <p className={styles.arcCopy}>{item.copy}</p>
            </article>
          ))}
        </section>

        <div className={styles.contentGrid}>
          <section className={`glass-card ${styles.panel}`}>
            <div className={styles.sectionHeader}>
              <h2>1. 수업 목표와 맵 선택</h2>
              <p>{levelGuide.learningGoal}</p>
            </div>

            <div className={styles.levelGrid}>
              {RACING_CODEX_LEVELS.map((item) => (
                <button
                  key={item.level}
                  type="button"
                  className={`${styles.levelCard} ${item.level === selectedLevel ? styles.levelCardActive : ''}`}
                  onClick={() => handleSelectLevel(item.level)}
                >
                  <div className={styles.levelTop}>
                    <span className={styles.levelEmoji}>{item.emoji}</span>
                    <span className={styles.levelBadge}>{item.difficulty}</span>
                  </div>
                  <strong>{item.name}</strong>
                  <span>{item.coachingFocus}</span>
                </button>
              ))}
            </div>

            <div className={styles.noteGrid}>
              <div className={styles.noteCard}>
                <span className={styles.noteLabel}>Teacher Cue</span>
                <p>{levelGuide.teacherCue}</p>
              </div>
              <div className={styles.noteCard}>
                <span className={styles.noteLabel}>Reflection Prompt</span>
                <p>{levelGuide.reflectionPrompt}</p>
              </div>
            </div>
          </section>

          <section className={`glass-card ${styles.panel}`}>
            <div className={styles.sectionHeader}>
              <h2>2. 파라미터 조율</h2>
              <p>추천 프리셋으로 시작한 뒤, 왜 달라지는지 설명할 수 있을 정도로만 조금씩 조정해 보세요.</p>
            </div>

            <div className={styles.presetRow}>
              {recommendedPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`${styles.presetChip} ${selectedPresetId === preset.id ? styles.presetChipActive : ''}`}
                  onClick={() => handleApplyPreset(preset)}
                >
                  <strong>{preset.label}</strong>
                  <span>{preset.summary}</span>
                </button>
              ))}
            </div>

            <div className={styles.sliderGroup}>
              <label className={styles.sliderLabel} htmlFor="learning-rate">
                Learning Rate
                <span>{formatNumber(learningRate, 3)}</span>
              </label>
              <input
                id="learning-rate"
                className={styles.slider}
                type="range"
                min="0.001"
                max="0.6"
                step="0.001"
                value={learningRate}
                onChange={(event) => {
                  setSelectedPresetId('custom');
                  setLearningRate(Number(event.target.value));
                }}
              />
              <p className={styles.sliderHint}>
                높을수록 빠르지만, 좁은 골짜기에서는 목표를 지나쳐 버릴 수 있습니다.
              </p>
            </div>

            <div className={styles.sliderGroup}>
              <label className={styles.sliderLabel} htmlFor="momentum">
                Momentum
                <span>{formatNumber(momentum, 2)}</span>
              </label>
              <input
                id="momentum"
                className={styles.slider}
                type="range"
                min="0"
                max="0.99"
                step="0.01"
                value={momentum}
                onChange={(event) => {
                  setSelectedPresetId('custom');
                  setMomentum(Number(event.target.value));
                }}
              />
              <p className={styles.sliderHint}>
                높을수록 관성이 커져 얕은 함정을 넘기 쉬워지지만, 과하면 제어가 어려워집니다.
              </p>
            </div>

            <div className={styles.actionRow}>
              <button
                type="button"
                className="btn-nova"
                onClick={() => runSimulation(selectedLevel, learningRate, momentum, true)}
              >
                <span>새 주행 시작</span>
              </button>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => {
                  setFrameIndex(0);
                  setIsPlaying((previous) => !previous);
                }}
              >
                {isPlaying ? '일시정지' : '재생'}
              </button>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => {
                  setFrameIndex(0);
                  setIsPlaying(false);
                }}
              >
                처음으로
              </button>
            </div>
          </section>

          <section className={`glass-card ${styles.panel} ${styles.mapPanel}`}>
            <div className={styles.sectionHeader}>
              <h2>3. 경로 읽기</h2>
              <p>손실의 높낮이와 실제 이동 경로를 동시에 보며, 결과보다 과정의 차이를 읽습니다.</p>
            </div>

            <CourseMap runResult={runResult} frameIndex={frameIndex} />

            <div className={styles.telemetryGrid}>
              <div className={styles.metricCard}>
                <span>현재 Loss</span>
                <strong>{formatNumber(currentFrame.loss, 3)}</strong>
              </div>
              <div className={styles.metricCard}>
                <span>현재 속도</span>
                <strong>{formatNumber(currentFrame.speed, 3)}</strong>
              </div>
              <div className={styles.metricCard}>
                <span>목표까지 거리</span>
                <strong>{formatNumber(currentFrame.distToGoal, 2)}</strong>
              </div>
              <div className={styles.metricCard}>
                <span>기울기 크기</span>
                <strong>{formatNumber(currentFrame.gradientMagnitude, 2)}</strong>
              </div>
            </div>

            <label className={styles.scrubberLabel} htmlFor="race-progress">
              프레임 탐색
              <span>
                {frameIndex + 1} / {runResult.frames.length}
              </span>
            </label>
            <input
              id="race-progress"
              className={styles.slider}
              type="range"
              min="0"
              max={Math.max(runResult.frames.length - 1, 0)}
              step="1"
              value={frameIndex}
              onChange={(event) => {
                setIsPlaying(false);
                setFrameIndex(Number(event.target.value));
              }}
            />
          </section>

          <section className={`glass-card ${styles.panel}`}>
            <div className={styles.sectionHeader}>
              <h2>4. 해설 리포트</h2>
              <p>기술적 수치와 교육적 메시지를 한 장의 결과 카드로 묶었습니다.</p>
            </div>

            <div className={styles.reportBanner}>
              <span className={styles.reportStatus}>{runResult.outcome.status}</span>
              <h3>{runResult.summary.headline}</h3>
              <p>{runResult.summary.verdict}</p>
            </div>

            <div className={styles.reportBody}>
              <div className={styles.reportBlock}>
                <span className={styles.noteLabel}>What Happened</span>
                <p>{runResult.summary.lesson}</p>
              </div>
              <div className={styles.reportBlock}>
                <span className={styles.noteLabel}>Next Move</span>
                <p>{runResult.summary.nextMove}</p>
              </div>
              <div className={styles.reportBlock}>
                <span className={styles.noteLabel}>Student Question</span>
                <p>{runResult.summary.studentQuestion}</p>
              </div>
            </div>

            <div className={styles.tableGrid}>
              <div className={styles.tableCell}>
                <span>시작 Loss</span>
                <strong>{formatNumber(runResult.metrics.startLoss, 3)}</strong>
              </div>
              <div className={styles.tableCell}>
                <span>최종 Loss</span>
                <strong>{formatNumber(runResult.metrics.finalLoss, 3)}</strong>
              </div>
              <div className={styles.tableCell}>
                <span>최저 Loss</span>
                <strong>{formatNumber(runResult.metrics.bestLoss, 3)}</strong>
              </div>
              <div className={styles.tableCell}>
                <span>최고 속도</span>
                <strong>{formatNumber(runResult.metrics.peakSpeed, 3)}</strong>
              </div>
              <div className={styles.tableCell}>
                <span>경로 길이</span>
                <strong>{formatNumber(runResult.metrics.pathLength, 2)}</strong>
              </div>
              <div className={styles.tableCell}>
                <span>방향 전환 수</span>
                <strong>{runResult.metrics.oscillations}</strong>
              </div>
            </div>
          </section>

          <section className={`glass-card ${styles.panel}`}>
            <div className={styles.sectionHeader}>
              <h2>5. 리팩터링 메모</h2>
              <p>이번 폴더는 교육 가치와 기술 구조를 함께 분리하는 출발점입니다.</p>
            </div>

            <div className={styles.architectureGrid}>
              {architectureCards.map((card) => (
                <article key={card.title} className={styles.architectureCard}>
                  <strong>{card.title}</strong>
                  <p>{card.copy}</p>
                </article>
              ))}
            </div>

            <div className={styles.teacherLens}>
              <span className={styles.noteLabel}>Teacher Lens</span>
              <p>{runResult.summary.teacherLens}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
