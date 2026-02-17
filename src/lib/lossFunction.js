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
