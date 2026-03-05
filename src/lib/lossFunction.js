/**
 * 공용 Loss Surface 함수 (Week 5 경사하강법 레이싱에서 사용)
 * - 하나의 글로벌 최솟값 + 두 개의 로컬 최솟값 + 노이즈
 * - 동일한 함수가 LossSurface.jsx, week5/page.js, backend/server.js에서 사용됨
 */

export function lossFunction(x, z) {
    const bowl = 0.03 * (x * x + z * z);
    const globalMin = -2.5 * Math.exp(-(x * x + (z - 2) * (z - 2)) / 3);
    const localMin1 = -1.0 * Math.exp(-((x + 3) * (x + 3) + (z + 2) * (z + 2)) / 2);
    const localMin2 = -1.2 * Math.exp(-((x - 3) * (x - 3) + (z + 2) * (z + 2)) / 2);
    const noise = 0.2 * Math.sin(x) * Math.cos(z);
    return bowl + globalMin + localMin1 + localMin2 + noise + 3;
}

export function gradient(x, z) {
    let gx = 0.06 * x;
    let gz = 0.06 * z;

    const expGlobal = Math.exp(-(x * x + (z - 2) * (z - 2)) / 3);
    gx += -2.5 * expGlobal * (-2 * x / 3);
    gz += -2.5 * expGlobal * (-2 * (z - 2) / 3);

    const expL1 = Math.exp(-((x + 3) * (x + 3) + (z + 2) * (z + 2)) / 2);
    gx += -1.0 * expL1 * (-2 * (x + 3) / 2);
    gz += -1.0 * expL1 * (-2 * (z + 2) / 2);

    const expL2 = Math.exp(-((x - 3) * (x - 3) + (z + 2) * (z + 2)) / 2);
    gx += -1.2 * expL2 * (-2 * (x - 3) / 2);
    gz += -1.2 * expL2 * (-2 * (z + 2) / 2);

    gx += 0.2 * Math.cos(x) * Math.cos(z);
    gz += 0.2 * Math.sin(x) * -Math.sin(z);

    return { gx, gz };
}

// ── 3단계 레이스 맵 메타데이터 ──
export const MAP_LEVELS = [
    { level: 1, name: '완만한 언덕', emoji: '⛳', description: '경사를 따라 내려가면 최솟값 도착!', difficulty: '초급' },
    { level: 2, name: '함정 지형', emoji: '🏔️', description: '로컬 최솟값 함정을 피해 글로벌 최솟값으로!', difficulty: '중급' },
    { level: 3, name: '악마의 지형', emoji: '🌋', description: '안장점과 좁은 계곡... 실제 딥러닝의 세계!', difficulty: '고급' },
];

// ── Level 1: 완만한 포물면 (초급) ──
function lossLevel1(x, z) {
    return 0.15 * (x * x + z * z);
}

function gradientLevel1(x, z) {
    return { gx: 0.3 * x, gz: 0.3 * z };
}

// ── Level 3: 악마의 지형 (고급) ──
function lossLevel3(x, z) {
    const r2 = x * x + z * z;

    // 기본 포물면
    const bowl = 0.02 * r2;

    // 안장점 항: 중심 근처에서 x방향 볼록, z방향 오목
    const saddleExp = Math.exp(-r2 / 20);
    const saddle = 0.3 * (x * x - z * z) * saddleExp;

    // 글로벌 최솟값 (좁고 깊음)
    const globalMin = -3.0 * Math.exp(-((x - 1) * (x - 1) + (z - 2) * (z - 2)) / 1.5);

    // 로컬 최솟값 4개
    const local1 = -1.5 * Math.exp(-((x + 4) * (x + 4) + (z + 1) * (z + 1)) / 2);
    const local2 = -1.3 * Math.exp(-((x - 4) * (x - 4) + (z - 3) * (z - 3)) / 2);
    const local3 = -1.0 * Math.exp(-((x + 2) * (x + 2) + (z - 4) * (z - 4)) / 1.5);
    const local4 = -0.8 * Math.exp(-((x - 2) * (x - 2) + (z + 4) * (z + 4)) / 1.5);

    // 고주파 노이즈
    const noise = 0.3 * Math.sin(2 * x) * Math.cos(2 * z);

    return bowl + saddle + globalMin + local1 + local2 + local3 + local4 + noise + 4;
}

function gradientLevel3(x, z) {
    const r2 = x * x + z * z;
    let gx = 0, gz = 0;

    // ∂/∂x, ∂/∂z of 0.02*(x²+z²)
    gx += 0.04 * x;
    gz += 0.04 * z;

    // 안장점 항: 0.3*(x²-z²)*exp(-r²/20)
    // 곱의 법칙: ∂/∂x = 0.3 * [2x*exp + (x²-z²)*exp*(-2x/20)]
    //          = 0.3 * exp * [2x - 0.1*x*(x²-z²)]
    //          = 0.3 * exp * x * [2 - 0.1*(x²-z²)]
    const saddleExp = Math.exp(-r2 / 20);
    const diff = x * x - z * z;
    gx += 0.3 * saddleExp * (2 * x - 0.1 * x * diff);
    // ∂/∂z = 0.3 * [-2z*exp + (x²-z²)*exp*(-2z/20)]
    //      = 0.3 * exp * [-2z - 0.1*z*(x²-z²)]
    gz += 0.3 * saddleExp * (-2 * z - 0.1 * z * diff);

    // 가우시안 항의 그래디언트 헬퍼
    // ∂/∂x of -A*exp(-((x-cx)²+(z-cz)²)/s) = -A*exp*(-2*(x-cx)/s) = A*2*(x-cx)/s * exp (부호 주의)
    // 즉: -A * exp(-f) 의 ∂/∂x = -A * exp(-f) * (-2*(x-cx)/s) = 2A*(x-cx)/s * exp(-f)

    // 글로벌 최솟값: -3.0 * exp(-((x-1)²+(z-2)²)/1.5)
    const expG = Math.exp(-((x - 1) * (x - 1) + (z - 2) * (z - 2)) / 1.5);
    gx += (2 * 3.0 / 1.5) * (x - 1) * expG;   // = 4.0*(x-1)*expG
    gz += (2 * 3.0 / 1.5) * (z - 2) * expG;   // = 4.0*(z-2)*expG

    // 로컬1: -1.5 * exp(-((x+4)²+(z+1)²)/2)
    const expL1 = Math.exp(-((x + 4) * (x + 4) + (z + 1) * (z + 1)) / 2);
    gx += (2 * 1.5 / 2) * (x + 4) * expL1;    // = 1.5*(x+4)*expL1
    gz += (2 * 1.5 / 2) * (z + 1) * expL1;    // = 1.5*(z+1)*expL1

    // 로컬2: -1.3 * exp(-((x-4)²+(z-3)²)/2)
    const expL2 = Math.exp(-((x - 4) * (x - 4) + (z - 3) * (z - 3)) / 2);
    gx += (2 * 1.3 / 2) * (x - 4) * expL2;    // = 1.3*(x-4)*expL2
    gz += (2 * 1.3 / 2) * (z - 3) * expL2;    // = 1.3*(z-3)*expL2

    // 로컬3: -1.0 * exp(-((x+2)²+(z-4)²)/1.5)
    const expL3 = Math.exp(-((x + 2) * (x + 2) + (z - 4) * (z - 4)) / 1.5);
    gx += (2 * 1.0 / 1.5) * (x + 2) * expL3;  // ≈ 1.333*(x+2)*expL3
    gz += (2 * 1.0 / 1.5) * (z - 4) * expL3;  // ≈ 1.333*(z-4)*expL3

    // 로컬4: -0.8 * exp(-((x-2)²+(z+4)²)/1.5)
    const expL4 = Math.exp(-((x - 2) * (x - 2) + (z + 4) * (z + 4)) / 1.5);
    gx += (2 * 0.8 / 1.5) * (x - 2) * expL4;  // ≈ 1.067*(x-2)*expL4
    gz += (2 * 0.8 / 1.5) * (z + 4) * expL4;  // ≈ 1.067*(z+4)*expL4

    // 고주파 노이즈: 0.3*sin(2x)*cos(2z)
    gx += 0.3 * 2 * Math.cos(2 * x) * Math.cos(2 * z);   // = 0.6*cos(2x)*cos(2z)
    gz += 0.3 * Math.sin(2 * x) * (-2 * Math.sin(2 * z)); // = -0.6*sin(2x)*sin(2z)

    return { gx, gz };
}

// ── 레벨별 손실함수 / 그래디언트 디스패치 ──
export function lossFunctionByLevel(x, z, level) {
    if (level === 1) return lossLevel1(x, z);
    if (level === 3) return lossLevel3(x, z);
    return lossFunction(x, z); // Level 2 = 기존 맵
}

export function gradientByLevel(x, z, level) {
    if (level === 1) return gradientLevel1(x, z);
    if (level === 3) return gradientLevel3(x, z);
    return gradient(x, z); // Level 2 = 기존 맵
}
