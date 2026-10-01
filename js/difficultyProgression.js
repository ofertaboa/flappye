import { GAME_CONFIG } from './config.js';
import { lerp } from './utils.js';

function smoothstep(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function globalSpeedMul(difficultyKey, motionScale = 1) {
  const globalMul = GAME_CONFIG.globalSpeedMultiplier ?? 1;
  const demoMul = difficultyKey === 'demo' ? (GAME_CONFIG.demoSpeedMultiplier ?? 1) : 1;
  return globalMul * demoMul * motionScale;
}

function pipeProgress(difficultyKey, pipesPassed) {
  const prog = GAME_CONFIG.progression[difficultyKey];
  if (!prog || pipesPassed < prog.startAfterPipes) return 0;

  const raw = Math.min(1, (pipesPassed - prog.startAfterPipes) / prog.rampPipes);

  if (difficultyKey === 'hard') {
    return Math.pow(raw, 1.25);
  }

  return smoothstep(raw);
}

function goalProgress(difficultyKey, session) {
  if (!session || session.unlimitedMode || session.goal <= 0) return 0;

  const raw = Math.min(1, session.balance / session.goal);

  if (difficultyKey === 'hard') {
    return Math.pow(raw, 1.6);
  }

  return smoothstep(raw);
}

function goalRatio(session) {
  if (!session || session.goal <= 0) return 0;
  return Math.min(1, session.balance / session.goal);
}

function hardMetaPressure(ratio) {
  if (ratio <= 0.2) return 0;
  return smoothstep((ratio - 0.2) / 0.8);
}

function applyEasyBaseline(runtime, easy, speedMul, motionScale, difficultyKey) {
  const speedNorm = speedMul / (motionScale || 1);
  const prog = GAME_CONFIG.progression[difficultyKey] ?? {};
  const warmupMul = prog.warmupSpeedMul ?? 1;

  runtime.pipeSpeed = easy.pipeSpeed * speedMul * warmupMul;
  runtime.gravity = easy.gravity * Math.sqrt(speedNorm * warmupMul);
  runtime.pipeGap = easy.pipeGap;
  runtime.pipeSpawnInterval = Math.max(
    55,
    Math.round(easy.pipeSpawnInterval / (speedNorm * Math.sqrt(warmupMul))),
  );
  runtime.jumpForce = easy.jumpForce;
  runtime.flapAnimMs = GAME_CONFIG.flapAnimMs;
  runtime.maxFallSpeed = easy.maxFallSpeed ?? null;
  runtime.maxRiseSpeed = easy.maxRiseSpeed ?? null;
  runtime.rotationSmooth = easy.rotationSmooth ?? 1;
  runtime.softJump = easy.softJump ?? false;
  runtime.softJumpBoost = easy.softJumpBoost ?? 2.0;
}

function applyProgressedRuntime(runtime, easy, target, t, speedMul, motionScale, difficultyKey, session) {
  const speedNorm = speedMul / (motionScale || 1);
  const ratio = goalRatio(session);
  const prog = GAME_CONFIG.progression[difficultyKey] ?? {};

  let spawnInterval = lerp(easy.pipeSpawnInterval, target.pipeSpawnInterval, t);
  let gap = lerp(easy.pipeGap, target.pipeGap, t);
  let speedT = t;
  let gravityT = t;
  let jumpT = t;

  if (difficultyKey === 'hard') {
    const meta = hardMetaPressure(ratio);

    speedT = Math.min(1, t + meta * 0.35);
    gravityT = Math.min(1, t + meta * 0.3);
    jumpT = Math.min(1, t + meta * 0.2);

    spawnInterval = lerp(spawnInterval, target.pipeSpawnInterval * 0.72, meta);
    gap = lerp(gap, target.pipeGap * 0.82, meta);

    if (ratio > 0.55) {
      const crush = smoothstep((ratio - 0.55) / 0.45);
      spawnInterval = lerp(spawnInterval, target.pipeSpawnInterval * 0.62, crush);
      gap = lerp(gap, target.pipeGap * 0.74, crush);
      speedT = Math.min(1, speedT + crush * 0.22);
      gravityT = Math.min(1, gravityT + crush * 0.18);
    }

    if (ratio > 0.78) {
      const finalCrush = smoothstep((ratio - 0.78) / 0.22);
      spawnInterval = lerp(spawnInterval, target.pipeSpawnInterval * 0.52, finalCrush);
      gap = lerp(gap, (prog.minGap ?? 112), finalCrush);
      speedT = 1;
      gravityT = Math.min(1, gravityT + finalCrush * 0.12);
    }
  } else if (difficultyKey === 'medium' && ratio > 0.6 && t > 0.35) {
    const metaPush = smoothstep((ratio - 0.6) / 0.4);
    spawnInterval = lerp(spawnInterval, target.pipeSpawnInterval * 0.86, metaPush * 0.45);
    gap = lerp(gap, target.pipeGap * 0.9, metaPush * 0.35);
    speedT = Math.min(1, t + metaPush * 0.1);
    gravityT = Math.min(1, t + metaPush * 0.08);
  }

  runtime.pipeSpeed = lerp(easy.pipeSpeed, target.pipeSpeed, speedT) * speedMul;
  runtime.gravity = lerp(easy.gravity, target.gravity, gravityT) * Math.sqrt(speedNorm);
  runtime.pipeGap = gap;

  if (difficultyKey === 'hard') {
    runtime.pipeGap = Math.max(prog.minGap ?? 112, runtime.pipeGap);
    const meta = hardMetaPressure(ratio);
    runtime.pipeSpeed *= 1 + meta * 0.18;
    runtime.gravity *= 1 + meta * 0.14;
  }

  runtime.pipeSpawnInterval = Math.max(
    difficultyKey === 'hard' ? (prog.minSpawn ?? 44) : 55,
    Math.round(spawnInterval / speedNorm),
  );

  runtime.jumpForce = lerp(
    easy.jumpForce,
    target.jumpForce ?? GAME_CONFIG.jumpForce,
    jumpT,
  );

  const baseFlap = GAME_CONFIG.flapAnimMs;
  const fastFlap = difficultyKey === 'hard' ? baseFlap * 0.62 : baseFlap * 0.85;
  runtime.flapAnimMs = Math.round(lerp(baseFlap, fastFlap, jumpT));

  if (t <= 0.01) {
    runtime.maxFallSpeed = easy.maxFallSpeed ?? null;
    runtime.maxRiseSpeed = easy.maxRiseSpeed ?? null;
    runtime.rotationSmooth = easy.rotationSmooth ?? 1;
    runtime.softJump = easy.softJump ?? false;
    runtime.softJumpBoost = easy.softJumpBoost ?? 2.0;
    return;
  }

  runtime.maxFallSpeed =
    easy.maxFallSpeed != null ? lerp(easy.maxFallSpeed, target.maxFallSpeed ?? 6, gravityT) : null;
  if (runtime.maxFallSpeed > 7) runtime.maxFallSpeed = null;

  runtime.maxRiseSpeed =
    easy.maxRiseSpeed != null
      ? lerp(easy.maxRiseSpeed, target.maxRiseSpeed ?? target.jumpForce, jumpT)
      : null;
  if (jumpT > 0.55) runtime.maxRiseSpeed = null;

  runtime.softJump = difficultyKey === 'hard' ? jumpT < 0.18 : jumpT < 0.35;
  runtime.softJumpBoost = lerp(easy.softJumpBoost ?? 1, 1.85, jumpT);
  runtime.rotationSmooth = lerp(
    easy.rotationSmooth ?? 0.22,
    difficultyKey === 'hard' ? 0.85 : 0.72,
    Math.min(1, jumpT * 1.15),
  );
}

export function updateRuntimeDifficulty(
  runtime,
  difficultyKey,
  pipesPassed,
  session = null,
  motionScale = 1,
) {
  if (difficultyKey === 'easy' || difficultyKey === 'demo') return;

  const cacheKey = `${pipesPassed}|${session?.balance ?? 0}|${Boolean(session?.unlimitedMode)}`;
  if (runtime._difficultyCacheKey === cacheKey) return;
  runtime._difficultyCacheKey = cacheKey;

  const prog = GAME_CONFIG.progression[difficultyKey];
  if (!prog) return;

  const easy = GAME_CONFIG.difficulties.easy;
  const target = GAME_CONFIG.difficulties[difficultyKey];
  const speedMul = globalSpeedMul(difficultyKey, motionScale);

  if (pipesPassed < prog.startAfterPipes) {
    applyEasyBaseline(runtime, easy, speedMul, motionScale, difficultyKey);
    return;
  }

  const pipeRamp = pipeProgress(difficultyKey, pipesPassed);
  const goalT = goalProgress(difficultyKey, session);
  const ratio = goalRatio(session);

  let goalWeight = prog.goalWeight ?? 0.45;

  if (difficultyKey === 'hard') {
    goalWeight = lerp(prog.goalWeight ?? 0.55, 0.92, hardMetaPressure(ratio));
    const pipeUnlock = smoothstep(Math.min(1, pipeRamp / 0.22));
    const effectiveGoalWeight = goalWeight * pipeUnlock;
    let t = pipeRamp * (1 - effectiveGoalWeight) + goalT * effectiveGoalWeight;
    t = Math.min(1, t + pipeRamp * 0.12);

    if (session?.unlimitedMode && pipeRamp > 0.5) {
      const start = prog.startAfterPipes + prog.rampPipes;
      if (pipesPassed > start) {
        const extraT = Math.min(0.22, (pipesPassed - start) / (prog.rampPipes * 1.8));
        t = Math.min(1, t + extraT);
      }
    }

    applyProgressedRuntime(runtime, easy, target, t, speedMul, motionScale, difficultyKey, session);
    return;
  }

  const pipeUnlock = smoothstep(Math.min(1, pipeRamp / 0.42));
  const effectiveGoalWeight = goalWeight * pipeUnlock;

  let t = pipeRamp * (1 - effectiveGoalWeight) + goalT * effectiveGoalWeight;
  t = smoothstep(t);

  if (session?.unlimitedMode && pipeRamp > 0.65) {
    const start = prog.startAfterPipes + prog.rampPipes;
    if (pipesPassed > start) {
      const extraT = Math.min(0.18, (pipesPassed - start) / (prog.rampPipes * 2.5));
      t = Math.min(1, t + smoothstep(extraT));
    }
  }

  applyProgressedRuntime(runtime, easy, target, t, speedMul, motionScale, difficultyKey, session);
}
