'use client';

import { useMemo } from 'react';
import { buildSurfaceHeatmap, mapWorldToViewBox } from './simulation';
import styles from './page.module.css';

const VIEWBOX_WIDTH = 560;
const VIEWBOX_HEIGHT = 360;

export default function CourseMap({ runResult, frameIndex }) {
  const heatmap = useMemo(
    () => buildSurfaceHeatmap(runResult.level),
    [runResult.level]
  );

  const frames = runResult.frames;
  const cappedIndex = Math.min(frameIndex, frames.length - 1);
  const currentFrame = frames[cappedIndex];
  const visibleFrames = frames.slice(0, cappedIndex + 1);
  const pathPoints = visibleFrames
    .map((point) => {
      const position = mapWorldToViewBox(point, runResult.level, VIEWBOX_WIDTH, VIEWBOX_HEIGHT);
      return `${position.x},${position.y}`;
    })
    .join(' ');

  const startPoint = mapWorldToViewBox(runResult.start, runResult.level, VIEWBOX_WIDTH, VIEWBOX_HEIGHT);
  const goalPoint = mapWorldToViewBox(runResult.goal, runResult.level, VIEWBOX_WIDTH, VIEWBOX_HEIGHT);
  const currentPoint = mapWorldToViewBox(currentFrame, runResult.level, VIEWBOX_WIDTH, VIEWBOX_HEIGHT);

  return (
    <div className={styles.mapShell}>
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className={styles.mapSvg}
        role="img"
        aria-label="경사하강법 레이싱 경로 맵"
      >
        <rect
          x="0"
          y="0"
          width={VIEWBOX_WIDTH}
          height={VIEWBOX_HEIGHT}
          rx="28"
          className={styles.mapBackdrop}
        />

        {heatmap.map((cell) => (
          <rect
            key={`${cell.row}-${cell.column}`}
            x={cell.rectX}
            y={cell.rectY}
            width={cell.rectWidth + 0.6}
            height={cell.rectHeight + 0.6}
            fill={cell.fill}
            opacity={cell.opacity}
          />
        ))}

        <g className={styles.mapGrid}>
          {[0, 1, 2, 3, 4].map((index) => {
            const x = 24 + ((VIEWBOX_WIDTH - 48) / 4) * index;
            return <line key={`vx-${index}`} x1={x} y1="24" x2={x} y2={VIEWBOX_HEIGHT - 24} />;
          })}
          {[0, 1, 2, 3, 4].map((index) => {
            const y = 24 + ((VIEWBOX_HEIGHT - 48) / 4) * index;
            return <line key={`hz-${index}`} x1="24" y1={y} x2={VIEWBOX_WIDTH - 24} y2={y} />;
          })}
        </g>

        <polyline points={pathPoints} className={styles.routeGlow} />
        <polyline points={pathPoints} className={styles.routeLine} />

        <circle cx={startPoint.x} cy={startPoint.y} r="8" className={styles.startDot} />
        <circle cx={goalPoint.x} cy={goalPoint.y} r="10" className={styles.goalDot} />
        <circle cx={currentPoint.x} cy={currentPoint.y} r="7" className={styles.currentDot} />

        <text x={startPoint.x + 12} y={startPoint.y - 10} className={styles.mapLabel}>
          Start
        </text>
        <text x={goalPoint.x + 12} y={goalPoint.y - 10} className={styles.mapLabel}>
          Goal
        </text>
      </svg>

      <div className={styles.mapLegend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.legendLow}`} />
          낮은 손실
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.legendRoute}`} />
          이동 경로
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.legendHigh}`} />
          높은 손실
        </div>
      </div>
    </div>
  );
}
