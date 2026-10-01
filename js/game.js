import { GAME_CONFIG } from './config.js';
import { STATE } from './config.js';
import { playSound, isGameMuted } from './audio.js';
import { stopBGM, startBGM } from './bgm.js';
import { assets } from './assets.js';
import {
  createRuntimeConfig,
  drawCachedBackground,
  drawScrollingGround,
  drawPipeColumn,
  getGroundY,
  setRenderQuality,
  prewarmPipeSprites,
} from './rendering.js';
import { RewardAnimation } from './ui/RewardAnimation.js';
import { updateRuntimeDifficulty } from './difficultyProgression.js';
import { getDeviceProfile } from './deviceProfile.js';
import { getBirdSpriteBitmap, drawBirdImage, invalidateBirdSpriteCache } from './birdSprite.js';

class Bird {
  constructor(runtime) {
    this.runtime = runtime;
    this.flapUntil = 0;
    this.reset();
  }

  syncSize() {
    const baseW = GAME_CONFIG.birdWidth;
    if (assets.bird?.naturalWidth) {
      const aspect = assets.bird.naturalHeight / assets.bird.naturalWidth;
      this.width = baseW;
      this.height = Math.round(baseW * aspect);
    } else {
      this.width = baseW;
      this.height = GAME_CONFIG.birdHeight;
    }
  }

  reset() {
    this.x = GAME_CONFIG.birdStartX;
    this.y = this.runtime.height / 2 - 60;
    this.prevY = this.y;
    this.velocity = 0;
    this.rotation = 0;
    this.prevRotation = 0;
    this.flapUntil = 0;
    this.syncSize();
  }

  jump() {
    const force = this.runtime.jumpForce;
    const boost = this.runtime.softJumpBoost ?? 1.15;

    if (this.runtime.softJump && this.velocity < -0.6) {
      this.velocity = Math.max(force, this.velocity - boost);
    } else if (this.velocity < 0) {
      this.velocity = Math.max(force, this.velocity + force * 0.42);
    } else {
      this.velocity = force;
    }

    this.flapUntil = performance.now() + this.runtime.flapAnimMs;
    playSound('wing', true);
  }

  getFlapStrength() {
    if (!this.flapUntil) return 0;
    const left = this.flapUntil - performance.now();
    if (left <= 0) {
      this.flapUntil = 0;
      return 0;
    }
    const t = left / this.runtime.flapAnimMs;
    return Math.sin(t * Math.PI);
  }

  update(step = 1) {
    this.velocity += this.runtime.gravity * step;

    if (this.runtime.maxFallSpeed != null) {
      this.velocity = Math.min(this.velocity, this.runtime.maxFallSpeed);
    }
    if (this.runtime.maxRiseSpeed != null) {
      this.velocity = Math.max(this.velocity, this.runtime.maxRiseSpeed);
    }

    this.y += this.velocity * step;

    const targetRot = Math.min(Math.max(this.velocity * 2.4, -22), 52);
    const smooth = this.runtime.rotationSmooth ?? 1;
    if (smooth >= 1) {
      this.rotation = targetRot;
    } else {
      this.rotation += (targetRot - this.rotation) * smooth;
    }
  }

  getRenderY(alpha = 1) {
    return this.prevY + (this.y - this.prevY) * alpha;
  }

  getRenderRotation(alpha = 1) {
    return this.prevRotation + (this.rotation - this.prevRotation) * alpha;
  }

  draw(ctx, alpha = 1, dpr = 1) {
    if (!assets.bird) return;

    const renderY = this.getRenderY(alpha);
    const renderRot = this.getRenderRotation(alpha);
    const flap = this.getFlapStrength();
    const bitmap = getBirdSpriteBitmap(assets.bird, this.width, this.height, dpr);

    ctx.save();
    ctx.translate(this.x, renderY);
    ctx.rotate((renderRot * Math.PI) / 180);

    if (flap > 0) {
      ctx.translate(0, -flap * 5);
      ctx.rotate(-flap * 0.12);
    }

    const halfW = this.width / 2;
    const halfH = this.height / 2;
    if (bitmap) {
      ctx.drawImage(bitmap, -halfW, -halfH, this.width, this.height);
    } else {
      drawBirdImage(ctx, assets.bird, halfW, halfH, this.width, this.height);
    }
    ctx.restore();
  }

  getBounds() {
    const hw = this.width * 0.2;
    const hh = this.height * 0.2;
    if (!this._bounds) {
      this._bounds = { x: 0, y: 0, width: 0, height: 0 };
    }
    this._bounds.x = this.x - hw;
    this._bounds.y = this.y - hh;
    this._bounds.width = hw * 2;
    this._bounds.height = hh * 2;
    return this._bounds;
  }
}

class Pipe {
  static _pool = [];

  constructor(x, runtime) {
    this.runtime = runtime;
    this.init(x, runtime);
  }

  init(x, runtime) {
    this.runtime = runtime;
    this.x = x;
    this.width = runtime.pipeWidth;
    this.passed = false;
    this.prevX = x;
    const minTop = 60;
    const maxTop = Math.max(minTop + 30, getGroundY(runtime) - runtime.pipeGap - 40);
    this.topHeight = minTop + Math.random() * (maxTop - minTop);
  }

  static acquire(x, runtime) {
    const pipe = Pipe._pool.pop();
    if (pipe) {
      pipe.init(x, runtime);
      return pipe;
    }
    return new Pipe(x, runtime);
  }

  static release(pipe) {
    if (Pipe._pool.length < 6) {
      Pipe._pool.push(pipe);
    }
  }

  update(step = 1) {
    this.x -= this.runtime.pipeSpeed * step;
  }

  getRenderX(alpha = 1) {
    if (this.prevX === undefined) return this.x;
    return this.prevX + (this.x - this.prevX) * alpha;
  }

  draw(ctx, renderX = this.x) {
    const ix = renderX | 0;
    const bottomY = this.topHeight + this.runtime.pipeGap;
    // Estende o cano de baixo até a base da tela; o chão é desenhado por cima
    // e esconde o excesso, então o cano encosta na grama sem deixar espaço.
    const bottomHeight = this.runtime.height - bottomY;
    drawPipeColumn(ctx, this.runtime, ix, 0, this.topHeight, true);
    drawPipeColumn(ctx, this.runtime, ix, bottomY, bottomHeight, false);
  }

  collides(b) {
    const inX = b.x + b.width > this.x && b.x < this.x + this.width;
    if (!inX) return false;
    return b.y < this.topHeight || b.y + b.height > this.topHeight + this.runtime.pipeGap;
  }
}

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    const profile = getDeviceProfile();
    this.ctx = canvas.getContext('2d', {
      alpha: !profile.mobile,
      desynchronized: true,
    }) || canvas.getContext('2d');
    this.ui = ui;
    this.rewardAnimation = new RewardAnimation();
    this._lastHudScore = -1;
    this._lastHudBalance = -1;
    this._ctxSmoothingSet = false;
    this.renderDpr = 1;
    this.device = getDeviceProfile();

    this.applyCanvasDpr();

    this.state = STATE.LOADING;
    this.runtime = createRuntimeConfig(GAME_CONFIG.defaultDifficulty);
    this.session = this.createEmptySession();
    this.bird = null;
    this.pipes = [];
    this.frame = 0;
    this.scrollX = 0;
    this.lastTimestamp = 0;
    this.hudProgress = 0;
    this.motionScale = 1;
    this.simulationTime = 0;
    this.realClockStart = 0;
    this.renderAlpha = 0;
    this.prevScrollX = 0;
    this._rafId = 0;
    this._flapQueued = false;
    this._lastFlapInputAt = 0;
    this._hudNeedsUpdate = false;
    this._hudProgressTarget = 0;
  }

  resetSimulationClock(now = performance.now()) {
    this.realClockStart = now;
    this.simulationTime = 0;
    this.renderAlpha = 0;
    this.prevScrollX = this.scrollX;
  }

  getMotionScale() {
    return 1;
  }

  applyMotionScaleToRuntime() {
    this.motionScale = 1;
  }

  createEmptySession() {
    return {
      betAmount: GAME_CONFIG.defaultBetAmount,
      rewardPerObstacle: GAME_CONFIG.defaultRewardPerObstacle,
      goal: GAME_CONFIG.defaultBetAmount * GAME_CONFIG.metaMultiplier,
      difficulty: GAME_CONFIG.defaultDifficulty,
      balance: 0,
      score: 0,
      goalReached: false,
      unlimitedMode: false,
      startTime: 0,
      dbSessionId: null,
      isFreeRound: false,
      settled: false,
    };
  }

  onAssetsReady() {
    this.state = STATE.BET_MENU;
    this.ui.showBetMenu();
  }

  applyCanvasDpr() {
    this.device = getDeviceProfile(true);
    const dpr = Math.min(window.devicePixelRatio || 1, this.device.dprCap);
    const w = GAME_CONFIG.width;
    const h = GAME_CONFIG.height;

    if (dpr !== this.renderDpr) {
      invalidateBirdSpriteCache();
    }
    this.renderDpr = dpr;

    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this._ctxSmoothingSet = false;

    if (this.runtime) {
      this.runtime.renderDpr = dpr;
    }

    setRenderQuality();
  }

  ensureCtxQuality() {
    if (this._ctxSmoothingSet) return;
    this._ctxSmoothingSet = true;
    this.ctx.imageSmoothingEnabled = true;
    if (this.device.lowEnd && typeof this.ctx.imageSmoothingQuality === 'string') {
      this.ctx.imageSmoothingQuality = 'medium';
    } else if (typeof this.ctx.imageSmoothingQuality === 'string') {
      this.ctx.imageSmoothingQuality = 'high';
    }
  }

  syncRenderQuality() {
    this.applyCanvasDpr();
  }

  prewarmAfterLoad() {
    const runtime = createRuntimeConfig(GAME_CONFIG.defaultDifficulty);
    runtime.renderDpr = this.renderDpr;
    prewarmPipeSprites(runtime);
    const warm = Pipe.acquire(runtime.width, runtime);
    Pipe.release(warm);

    if (assets.bird && this.ctx) {
      const bird = new Bird(runtime);
      bird.draw(this.ctx, 1, this.renderDpr);
    }

    drawCachedBackground(this.ctx, runtime);
  }

  startMatch(settings) {
    this.syncRenderQuality();
    this._lastHudScore = -1;
    this._lastHudBalance = -1;
    this.session = {
      ...this.createEmptySession(),
      ...settings,
      balance: 0,
      score: 0,
      goalReached: false,
      unlimitedMode: false,
      startTime: Date.now(),
    };
    this.runtime = createRuntimeConfig(settings.difficulty);
    this.runtime.renderDpr = this.renderDpr;
    this.applyMotionScaleToRuntime();
    prewarmPipeSprites(this.runtime);
    if (this.runtime.bakePipeSprites) {
      const warm = Pipe.acquire(this.runtime.width, this.runtime);
      Pipe.release(warm);
    }
    this.resetSimulationClock();
    this.lastTimestamp = 0;
    this.resetRound();
    this.state = STATE.READY;
    this.ui.showGameplayHUD(this.getHUDData());
    this.ui.showReadyHint();
  }

  resetRound() {
    for (let i = 0; i < this.pipes.length; i += 1) {
      Pipe.release(this.pipes[i]);
    }
    this.bird = new Bird(this.runtime);
    this.pipes = [];
    this.frame = 0;
    this.scrollX = 0;
    this.pipeSpawnCounter = 0;
    this.hudProgress = 0;
    this.rewardAnimation.items = [];
  }

  getHUDData() {
    const progress = this.session.goal > 0 ? this.session.balance / this.session.goal : 0;
    return {
      betAmount: this.session.betAmount,
      goal: this.session.goal,
      balance: this.session.balance,
      progress,
      showEndButton: this.session.unlimitedMode,
    };
  }

  getSessionDuration() {
    return this.session.startTime ? Date.now() - this.session.startTime : 0;
  }

  beginPlay() {
    this.resetSimulationClock();
    this.state = STATE.PLAYING;
    this.ui.hideReadyHint();
    if (!isGameMuted()) startBGM().catch(() => {});
    playSound('swooshing');
    this.bird.jump();
  }

  handleGoalReached() {
    if (this.session.goalReached || this.session.unlimitedMode) return;
    this.session.goalReached = true;
    this.state = STATE.GOAL_PAUSED;
    if (this.session.isDemo) {
      this.ui.showDemoWinModal({ balance: this.session.balance });
    } else {
      this.ui.showGoalModal({ balance: this.session.balance, goal: this.session.goal });
    }
  }

  onGoalContinue() {
    this.session.unlimitedMode = true;
    this.state = STATE.PLAYING_UNLIMITED;
    this.ui.updateHUD(this.getHUDData());
  }

  onGoalEnd() {
    this.finishSession();
  }

  onEndBet() {
    if (this.session.unlimitedMode) this.finishSession();
  }

  finishSession() {
    this.state = STATE.FINISHED;
    this.creditWinnings();
    this.ui.showFinish({
      betAmount: this.session.betAmount,
      balance: this.session.balance,
      score: this.session.score,
      durationMs: this.getSessionDuration(),
    });
  }

  gameOver() {
    if (this.state === STATE.GAME_OVER || this.state === STATE.FINISHED) return;
    this.state = STATE.GAME_OVER;
    stopBGM();
    playSound('hit');
    const continuedAfterGoal = this.session.unlimitedMode;
    // Só credita via finishSession (Encerrar / Encerrar aposta). Ao bater, perde tudo.
    const winnings = 0;
    this.settleSession(winnings).then((settleResult) => {
      this.ui.showGameOver({
        betAmount: this.session.betAmount,
        matchBalance: this.session.balance,
        goal: this.session.goal,
        score: this.session.score,
        credited: false,
        forfeitedAfterGoal: continuedAfterGoal,
        cashbackEarned: settleResult?.cashback_earned ?? 0,
      });
    });
  }

  /** Encerra partida no servidor — só credita carteira se atingiu a meta. */
  async settleSession(winnings) {
    if (this.session.settled || !this.session.dbSessionId || this.session.isDemo) return null;
    this.session.settled = true;
    if (!this.settleHandler) return null;
    return this.settleHandler(this.session, Math.max(0, winnings));
  }

  creditWinnings() {
    this.settleSession(this.session.balance);
  }

  returnToBetMenu() {
    this.state = STATE.BET_MENU;
    this.session = this.createEmptySession();
    this.resetRound();
    this.ui.showBetMenu();
  }

  checkCollisions() {
    const b = this.bird.getBounds();
    const groundY = getGroundY(this.runtime);

    if (this.bird.y + 16 > groundY || this.bird.y - 16 < 0) {
      this.gameOver();
      return;
    }

    const birdX = this.bird.x;
    for (let i = 0; i < this.pipes.length; i += 1) {
      const pipe = this.pipes[i];
      if (pipe.x + pipe.width < birdX - 24) continue;
      if (pipe.x > birdX + this.bird.width + 24) break;
      if (pipe.collides(b)) this.gameOver();
    }
  }

  checkScore() {
    const birdX = this.bird.x;
    for (let i = 0; i < this.pipes.length; i += 1) {
      const pipe = this.pipes[i];
      if (pipe.passed || pipe.x + pipe.width >= birdX) continue;
      pipe.passed = true;
      this.session.score++;
      this.session.balance += this.session.rewardPerObstacle;
      playSound('point');
      this.rewardAnimation.spawn(
        this.bird.x + 20,
        this.bird.y - 10,
        this.session.rewardPerObstacle,
      );
      this._hudNeedsUpdate = true;

      if (!this.session.unlimitedMode && this.session.balance >= this.session.goal) {
        this.handleGoalReached();
      }
    }
  }

  update(realNow = performance.now()) {
    const flapPending = this.device.instantFlap ? false : this._flapQueued;
    this._flapQueued = false;
    let flapApplied = false;

    if (this.rewardAnimation.items.length > 0) {
      this.rewardAnimation.update(
        this.lastFrameDeltaMs || (GAME_CONFIG.referenceFrameMs || 1000 / 60),
      );
    }

    if (
      this.state !== STATE.PLAYING
      && this.state !== STATE.PLAYING_UNLIMITED
      && this.state !== STATE.READY
    ) {
      this.realClockStart = 0;
      this.simulationTime = 0;
      this.renderAlpha = 0;
      return;
    }

    if (this.realClockStart === 0) {
      this.resetSimulationClock(realNow);
    }

    const stepMs = GAME_CONFIG.referenceFrameMs || (1000 / 60);
    const maxSteps = this.device.maxPhysicsSteps ?? GAME_CONFIG.maxPhysicsSteps ?? 5;
    const maxCatchUpMs = this.device.maxSimCatchUpMs ?? GAME_CONFIG.maxSimCatchUpMs ?? stepMs * maxSteps;
    const targetSimTime = Math.max(0, realNow - this.realClockStart);
    const skipInterp = this.device.skipInterpolation;

    if (!skipInterp) {
      this.prevScrollX = this.scrollX;
      for (let i = 0; i < this.pipes.length; i += 1) {
        this.pipes[i].prevX = this.pipes[i].x;
      }
      if (this.bird) {
        this.bird.prevY = this.bird.y;
        this.bird.prevRotation = this.bird.rotation;
      }
    }

    let steps = 0;
    while (
      this.simulationTime + stepMs <= targetSimTime
      && steps < maxSteps
    ) {
      const playing = this.state === STATE.PLAYING || this.state === STATE.PLAYING_UNLIMITED;
      if (playing && flapPending && !flapApplied) {
        this.bird.jump();
        flapApplied = true;
      }
      this.fixedUpdate();
      this.simulationTime += stepMs;
      steps += 1;
    }

    const lagMs = targetSimTime - this.simulationTime;
    if (lagMs > maxCatchUpMs) {
      this.simulationTime = targetSimTime - maxCatchUpMs;
    }

    this.renderAlpha = skipInterp ? 0 : Math.min(1, Math.max(0, lagMs / stepMs));

    if (steps > 0) {
      this._hudFrame = (this._hudFrame || 0) + 1;
      this.syncFramePresentation();
    }
  }

  fixedUpdate() {
    const playing = this.state === STATE.PLAYING || this.state === STATE.PLAYING_UNLIMITED;

    if (playing) {
      this.bird.update(1);
      this.frame++;
      this.scrollX += this.runtime.pipeSpeed;

      this.pipeSpawnCounter += 1;
      const spawnEvery = Math.max(55, this.runtime.pipeSpawnInterval || 175);
      if (this.pipeSpawnCounter >= spawnEvery) {
        this.pipes.push(Pipe.acquire(this.runtime.width, this.runtime));
        this.pipeSpawnCounter = 0;
        const maxPipes = this.runtime.maxPipes ?? 8;
        if (this.pipes.length > maxPipes) {
          const drop = this.pipes.length - maxPipes;
          for (let i = 0; i < drop; i += 1) {
            Pipe.release(this.pipes[i]);
          }
          this.pipes.splice(0, drop);
        }
      }

      for (let i = 0; i < this.pipes.length; i += 1) {
        this.pipes[i].update(1);
      }

      let write = 0;
      for (let i = 0; i < this.pipes.length; i += 1) {
        const pipe = this.pipes[i];
        if (pipe.x + pipe.width > -20) {
          this.pipes[write] = pipe;
          write += 1;
        } else {
          Pipe.release(pipe);
        }
      }
      this.pipes.length = write;

      this.checkCollisions();
      this.checkScore();

      const target = Math.min(1, this.session.balance / this.session.goal);
      this.hudProgress += (target - this.hudProgress) * 0.12;
    }

    if (this.state === STATE.READY) {
      this.frame++;
    }
  }

  syncFramePresentation() {
    const playing = this.state === STATE.PLAYING || this.state === STATE.PLAYING_UNLIMITED;
    if (!playing) return;

    updateRuntimeDifficulty(
      this.runtime,
      this.session.difficulty,
      this.session.score,
      this.session,
      this.motionScale,
    );

    const score = this.session.score;
    const balance = this.session.balance;
    if (score !== this._lastHudScore || balance !== this._lastHudBalance) {
      this._lastHudScore = score;
      this._lastHudBalance = balance;
      this._hudNeedsUpdate = true;
    } else {
      this._hudProgressTarget = this.hudProgress;
    }
  }

  flushPresentation() {
    if (this._hudNeedsUpdate) {
      this._hudNeedsUpdate = false;
      this.ui.updateHUD({ ...this.getHUDData(), progress: this.hudProgress });
      return;
    }

    const playing = this.state === STATE.PLAYING || this.state === STATE.PLAYING_UNLIMITED;
    if (!playing) return;

    const every = this.device.hudProgressEvery ?? 1;
    if ((this._hudFrame || 0) % every === 0) {
      this.ui.animateHUDProgress(this._hudProgressTarget || this.hudProgress);
    }
  }

  draw() {
    const { ctx, runtime } = this;
    this.ensureCtxQuality();

    if (this.state === STATE.LOADING) {
      ctx.fillStyle = '#1a472a';
      ctx.fillRect(0, 0, runtime.width, runtime.height);
      ctx.fillStyle = '#fff';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Carregando...', runtime.width / 2, runtime.height / 2);
      return;
    }

    if (this.state === STATE.BET_MENU) {
      drawCachedBackground(ctx, runtime);
      drawScrollingGround(ctx, runtime, 0);
      return;
    }

    drawCachedBackground(ctx, runtime);
    const alpha = this.renderAlpha;
    const viewRight = runtime.width + 20;
    const pipes = this.pipes;
    for (let i = 0; i < pipes.length; i += 1) {
      const p = pipes[i];
      const rx = p.getRenderX(alpha);
      if (rx + p.width < -20 || rx > viewRight) continue;
      p.draw(ctx, rx);
    }
    const renderScroll = this.device.skipInterpolation
      ? this.scrollX
      : this.prevScrollX + (this.scrollX - this.prevScrollX) * alpha;
    drawScrollingGround(ctx, runtime, renderScroll);
    if (this.bird) {
      this.bird.draw(ctx, alpha, this.renderDpr);
    }
    this.rewardAnimation.draw(ctx);
  }

  handleInput() {
    if (this.state === STATE.LOADING || this.state === STATE.BET_MENU) return;
    if (this.state === STATE.GOAL_PAUSED || this.state === STATE.GAME_OVER || this.state === STATE.FINISHED) return;

    const now = performance.now();
    const flapMinMs = this.device.flapInputMinMs ?? 110;
    if (now - this._lastFlapInputAt < flapMinMs) return;
    this._lastFlapInputAt = now;

    if (this.state === STATE.READY) {
      this.beginPlay();
      return;
    }

    if (this.state === STATE.PLAYING || this.state === STATE.PLAYING_UNLIMITED) {
      if (this.device.instantFlap) {
        this.bird.jump();
      } else {
        this._flapQueued = true;
      }
    }
  }

  acceptsInput() {
    return (
      this.state === STATE.READY
      || this.state === STATE.PLAYING
      || this.state === STATE.PLAYING_UNLIMITED
    );
  }

  loop(timestamp) {
    const now = timestamp || performance.now();
    const deltaMs = this.lastTimestamp ? now - this.lastTimestamp : (GAME_CONFIG.referenceFrameMs || 1000 / 60);
    this.lastTimestamp = now;
    this.lastFrameDeltaMs = Math.min(deltaMs, 100);
    this.update(now);
    this.draw();
    this.flushPresentation();
    this._rafId = requestAnimationFrame((t) => this.loop(t));
  }

  start() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = requestAnimationFrame((t) => this.loop(t));
  }

  stop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = 0;
    }
  }
}
