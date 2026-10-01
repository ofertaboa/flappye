/** Multiplicador da meta: Meta = Valor Apostado × MetaMultiplier */
export const MetaMultiplier = 5;

export const PipeSpeedEasy = 1.95;
export const PipeSpeedDemo = 3.0;
export const PipeSpeedMedium = 3.2;
export const PipeSpeedHard = 4.65;

export const GravityEasy = 0.08;
export const GravityMedium = 0.30;
export const GravityHard = 0.42;

export const PipeSpacingEasy = 235;
export const PipeSpacingDemo = 285;
export const PipeSpacingMedium = 165;
export const PipeSpacingHard = 132;

export const PipeSpawnEasy = 150;
export const PipeSpawnDemo = 76;
export const PipeSpawnMedium = 80;
export const PipeSpawnHard = 54;

export const JumpForceEasy = -3.2;
export const JumpForceDemo = -2.55;
export const JumpForceMedium = -5.0;
export const JumpForceHard = -5.6;

export const MaxFallSpeedEasy = 3.2;
export const MaxRiseSpeedEasy = -3.4;
export const SoftJumpBoostEasy = 1.15;
export const RotationSmoothEasy = 0.22;

export const MaxFallSpeedMedium = 4.2;
export const MaxRiseSpeedMedium = -4.8;
export const MaxFallSpeedHard = 5.0;
export const MaxRiseSpeedHard = -5.4;

export const RewardAnimationDuration = 1200;

export const GAME_CONFIG = {
  width: 400,
  height: 600,
  groundHeight: 88,
  stadiumBgOpacity: 0.92,
  pipeWidth: 58,
  pipeLipH: 24,
  pipeBodyH: 32,
  flapDuration: 12,
  flapAnimMs: 320,
  jumpForce: -5.0,

  birdWidth: 96,
  birdHeight: 84,
  /** Posição horizontal do pássaro (centro do sprite) */
  birdStartX: 138,

  /** Simulação fixa 60 FPS — mesma velocidade em PC, mobile e telas 90/120Hz */
  referenceFrameMs: 1000 / 60,
  /** Máximo de passos de física por frame (menos = menos micro-travadas em telas rápidas) */
  maxPhysicsSteps: 5,
  /** Máximo de ms simulados por frame de desenho (evita spiral of death) */
  maxSimCatchUpMs: 100,
  /** Multiplicador global de scroll / canos */
  globalSpeedMultiplier: 1.4,
  demoSpeedMultiplier: 1,
  mobileSpeedBoost: 1,
  rewardAnimationDuration: RewardAnimationDuration,

  defaultBetAmount: 5,
  defaultRewardPerObstacle: 1,
  defaultDifficulty: 'medium',

  progression: {
    medium: { startAfterPipes: 7, rampPipes: 44, goalWeight: 0.48, warmupSpeedMul: 1.1 },
    hard: {
      startAfterPipes: 7,
      rampPipes: 24,
      goalWeight: 0.55,
      minGap: 112,
      minSpawn: 42,
      warmupSpeedMul: 1.12,
    },
  },

  difficulties: {
    demo: {
      label: 'Demo',
      pipeSpeed: PipeSpeedDemo,
      gravity: 0.12,
      pipeGap: PipeSpacingDemo,
      pipeSpawnInterval: PipeSpawnDemo,
      jumpForce: JumpForceDemo,
      maxFallSpeed: 3.6,
      maxRiseSpeed: -2.6,
      softJumpBoost: 0.65,
      rotationSmooth: 0.24,
      softJump: false,
    },
    easy: {
      label: 'Fácil',
      pipeSpeed: PipeSpeedEasy,
      gravity: GravityEasy,
      pipeGap: PipeSpacingEasy,
      pipeSpawnInterval: PipeSpawnEasy,
      jumpForce: JumpForceEasy,
      maxFallSpeed: MaxFallSpeedEasy,
      maxRiseSpeed: MaxRiseSpeedEasy,
      softJumpBoost: SoftJumpBoostEasy,
      rotationSmooth: RotationSmoothEasy,
      softJump: true,
    },
    medium: {
      label: 'Médio',
      pipeSpeed: PipeSpeedMedium,
      gravity: GravityMedium,
      pipeGap: PipeSpacingMedium,
      pipeSpawnInterval: PipeSpawnMedium,
      jumpForce: JumpForceMedium,
      maxFallSpeed: MaxFallSpeedMedium,
      maxRiseSpeed: MaxRiseSpeedMedium,
      softJumpBoost: 1.2,
      rotationSmooth: 0.28,
      softJump: true,
    },
    hard: {
      label: 'Difícil',
      pipeSpeed: PipeSpeedHard,
      gravity: GravityHard,
      pipeGap: PipeSpacingHard,
      pipeSpawnInterval: PipeSpawnHard,
      jumpForce: JumpForceHard,
      maxFallSpeed: MaxFallSpeedHard,
      maxRiseSpeed: MaxRiseSpeedHard,
      softJumpBoost: 1.25,
      rotationSmooth: 0.32,
      softJump: true,
    },
  },
};

/** Configuração do modo demonstração — partida fácil para vitória rápida */
export const DEMO_MATCH_SETTINGS = {
  betAmount: 2,
  rewardPerObstacle: 5,
  difficulty: 'demo',
  goal: 50,
  isDemo: true,
};

export const STATE = {
  LOADING: 'loading',
  BET_MENU: 'bet_menu',
  READY: 'ready',
  PLAYING: 'playing',
  GOAL_PAUSED: 'goal_paused',
  PLAYING_UNLIMITED: 'playing_unlimited',
  GAME_OVER: 'game_over',
  FINISHED: 'finished',
};
