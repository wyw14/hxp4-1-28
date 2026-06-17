type Color = 'red' | 'yellow' | 'blue' | 'green';

const COLORS: Color[] = ['red', 'yellow', 'blue', 'green'];

interface HighScoreResponse {
  highScore: number;
  isNewRecord?: boolean;
}

class ColorMemoryGame {
  private sequence: Color[] = [];
  private playerIndex: number = 0;
  private isPlaying: boolean = false;
  private isShowingSequence: boolean = false;
  private level: number = 0;
  private highScore: number = 0;

  private readonly buttons: NodeListOf<HTMLButtonElement>;
  private readonly startBtn: HTMLButtonElement;
  private readonly currentLevelEl: HTMLElement;
  private readonly highScoreEl: HTMLElement;
  private readonly gameStatusEl: HTMLElement;

  private readonly lightOnDuration: number = 600;
  private readonly lightOffDuration: number = 300;

  private isTrainingMode: boolean = false;
  private trainingDuration: number = 3;
  private trainingRemaining: number = 0;
  private trainingTimerId: number | null = null;
  private trainingAttempts: number = 0;
  private trainingMaxLevel: number = 0;
  private trainingLevelSum: number = 0;
  private trainingActive: boolean = false;

  private readonly timerDisplay: HTMLElement;
  private readonly timerContainer: HTMLElement;
  private readonly trainingStartBtn: HTMLButtonElement;
  private readonly trainingStopBtn: HTMLButtonElement;
  private readonly trainingStatsEl: HTMLElement;
  private readonly trainingAttemptsEl: HTMLElement;
  private readonly durationBtns: NodeListOf<HTMLButtonElement>;
  private readonly summaryOverlay: HTMLElement;
  private readonly summaryDuration: HTMLElement;
  private readonly summaryMaxLevel: HTMLElement;
  private readonly summaryAttempts: HTMLElement;
  private readonly summaryAvgLevel: HTMLElement;
  private readonly summaryCloseBtn: HTMLButtonElement;

  constructor() {
    this.buttons = document.querySelectorAll('.color-btn');
    this.startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    this.currentLevelEl = document.getElementById('current-level') as HTMLElement;
    this.highScoreEl = document.getElementById('high-score') as HTMLElement;
    this.gameStatusEl = document.getElementById('game-status') as HTMLElement;

    this.timerDisplay = document.getElementById('timer-display') as HTMLElement;
    this.timerContainer = document.getElementById('training-timer') as HTMLElement;
    this.trainingStartBtn = document.getElementById('training-start-btn') as HTMLButtonElement;
    this.trainingStopBtn = document.getElementById('training-stop-btn') as HTMLButtonElement;
    this.trainingStatsEl = document.getElementById('training-stats') as HTMLElement;
    this.trainingAttemptsEl = document.getElementById('training-attempts') as HTMLElement;
    this.durationBtns = document.querySelectorAll('.duration-btn');
    this.summaryOverlay = document.getElementById('training-summary-overlay') as HTMLElement;
    this.summaryDuration = document.getElementById('summary-duration') as HTMLElement;
    this.summaryMaxLevel = document.getElementById('summary-max-level') as HTMLElement;
    this.summaryAttempts = document.getElementById('summary-attempts') as HTMLElement;
    this.summaryAvgLevel = document.getElementById('summary-avg-level') as HTMLElement;
    this.summaryCloseBtn = document.getElementById('summary-close-btn') as HTMLButtonElement;

    this.init();
  }

  private async init(): Promise<void> {
    this.setupEventListeners();
    await this.fetchHighScore();
  }

  private setupEventListeners(): void {
    this.startBtn.addEventListener('click', () => this.startGame());

    this.buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const color = (e.target as HTMLButtonElement).dataset.color as Color;
        this.handlePlayerInput(color);
      });
    });

    this.durationBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.trainingActive) return;
        this.durationBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.trainingDuration = parseInt(btn.dataset.duration!);
      });
    });

    this.trainingStartBtn.addEventListener('click', () => this.startTraining());
    this.trainingStopBtn.addEventListener('click', () => this.stopTraining());
    this.summaryCloseBtn.addEventListener('click', () => this.closeSummary());
  }

  private startTraining(): void {
    this.isTrainingMode = true;
    this.trainingActive = true;
    this.trainingAttempts = 0;
    this.trainingMaxLevel = 0;
    this.trainingLevelSum = 0;
    this.trainingRemaining = this.trainingDuration * 60;

    this.trainingStatsEl.style.display = '';
    this.trainingAttemptsEl.textContent = '0';

    this.trainingStartBtn.style.display = 'none';
    this.trainingStopBtn.style.display = '';
    this.startBtn.disabled = true;

    this.durationBtns.forEach(b => b.disabled = true);

    this.updateTimerDisplay();
    this.timerContainer.className = 'training-timer running';

    this.trainingTimerId = window.setInterval(() => {
      this.trainingRemaining--;
      this.updateTimerDisplay();

      if (this.trainingRemaining <= 10) {
        this.timerContainer.className = 'training-timer critical';
      } else if (this.trainingRemaining <= 30) {
        this.timerContainer.className = 'training-timer warning';
      }

      if (this.trainingRemaining <= 0) {
        this.endTraining();
      }
    }, 1000);

    this.startGame();
  }

  private stopTraining(): void {
    this.endTraining();
  }

  private endTraining(): void {
    if (this.trainingTimerId !== null) {
      clearInterval(this.trainingTimerId);
      this.trainingTimerId = null;
    }

    this.trainingActive = false;
    this.isTrainingMode = false;
    this.isPlaying = false;

    this.trainingStartBtn.style.display = '';
    this.trainingStopBtn.style.display = 'none';
    this.startBtn.disabled = false;
    this.durationBtns.forEach(b => b.disabled = false);
    this.timerContainer.className = 'training-timer';
    this.setButtonsDisabled(true);

    this.showTrainingSummary();
  }

  private showTrainingSummary(): void {
    const avgLevel = this.trainingAttempts > 0
      ? (this.trainingLevelSum / this.trainingAttempts).toFixed(1)
      : '0';

    this.summaryDuration.textContent = `${this.trainingDuration} 分钟`;
    this.summaryMaxLevel.textContent = this.trainingMaxLevel.toString();
    this.summaryAttempts.textContent = this.trainingAttempts.toString();
    this.summaryAvgLevel.textContent = avgLevel;

    this.summaryOverlay.style.display = 'flex';
  }

  private closeSummary(): void {
    this.summaryOverlay.style.display = 'none';
    this.showStatus('训练结束！点击开始按钮重新开始', '');
  }

  private updateTimerDisplay(): void {
    const mins = Math.floor(this.trainingRemaining / 60);
    const secs = this.trainingRemaining % 60;
    this.timerDisplay.textContent =
      `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private async fetchHighScore(): Promise<void> {
    try {
      const response = await fetch('/api/highscore');
      const data = await response.json() as HighScoreResponse;
      this.highScore = data.highScore;
      this.highScoreEl.textContent = this.highScore.toString();
    } catch (error) {
      console.error('获取最高分失败:', error);
    }
  }

  private async saveHighScore(score: number): Promise<void> {
    try {
      const response = await fetch('/api/highscore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ score }),
      });
      const data = await response.json() as HighScoreResponse;
      this.highScore = data.highScore;
      this.highScoreEl.textContent = this.highScore.toString();

      if (data.isNewRecord) {
        this.showStatus('🎉 新纪录！', 'success');
      }
    } catch (error) {
      console.error('保存最高分失败:', error);
    }
  }

  private startGame(): void {
    this.sequence = [];
    this.playerIndex = 0;
    this.level = 0;
    this.isPlaying = true;
    this.currentLevelEl.textContent = '0';

    this.setButtonsDisabled(true);
    this.startBtn.disabled = true;

    if (this.isTrainingMode) {
      this.showStatus('训练中 - 加油！', 'playing');
    } else {
      this.showStatus('游戏开始！', 'playing');
    }
    this.nextRound();
  }

  private nextRound(): void {
    this.level++;
    this.currentLevelEl.textContent = this.level.toString();
    this.playerIndex = 0;

    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.sequence.push(randomColor);

    this.showStatus(`第 ${this.level} 关 - 记住序列`, 'playing');
    this.showSequence();
  }

  private async showSequence(): Promise<void> {
    this.isShowingSequence = true;
    this.setButtonsDisabled(true);

    await this.delay(500);

    for (let i = 0; i < this.sequence.length; i++) {
      const color = this.sequence[i];
      await this.lightUpButton(color);

      if (i < this.sequence.length - 1) {
        await this.delay(this.lightOffDuration);
      }
    }

    this.isShowingSequence = false;
    this.setButtonsDisabled(false);
    this.showStatus('请按顺序点击按钮', 'playing');
  }

  private async lightUpButton(color: Color): Promise<void> {
    const button = this.getButtonByColor(color);
    if (!button) return;

    button.classList.add('active');
    await this.delay(this.lightOnDuration);
    button.classList.remove('active');
  }

  private getButtonByColor(color: Color): HTMLButtonElement | null {
    return document.querySelector(`.color-btn[data-color="${color}"]`);
  }

  private async handlePlayerInput(color: Color): Promise<void> {
    if (!this.isPlaying || this.isShowingSequence) return;

    const expectedColor = this.sequence[this.playerIndex];
    const button = this.getButtonByColor(color);

    if (color === expectedColor) {
      button?.classList.add('correct');
      await this.delay(200);
      button?.classList.remove('correct');

      this.playerIndex++;

      if (this.playerIndex === this.sequence.length) {
        this.showStatus('正确！准备下一关...', 'success');
        this.setButtonsDisabled(true);
        await this.delay(1000);
        this.nextRound();
      }
    } else {
      button?.classList.add('wrong');
      await this.delay(500);
      button?.classList.remove('wrong');

      this.gameOver();
    }
  }

  private async gameOver(): Promise<void> {
    const finalScore = this.level - 1;

    if (this.isTrainingMode) {
      this.trainingAttempts++;
      this.trainingLevelSum += finalScore;
      if (finalScore > this.trainingMaxLevel) {
        this.trainingMaxLevel = finalScore;
      }
      this.trainingAttemptsEl.textContent = this.trainingAttempts.toString();
    }

    if (finalScore > this.highScore) {
      await this.saveHighScore(finalScore);
    }

    if (this.isTrainingMode && this.trainingActive) {
      this.isPlaying = false;
      this.showStatus(`本局 ${finalScore} 关，继续！`, 'gameover');
      await this.delay(1200);
      this.startGame();
    } else {
      this.isPlaying = false;
      this.setButtonsDisabled(true);
      this.startBtn.disabled = false;
      this.showStatus(`游戏结束！你完成了 ${finalScore} 关`, 'gameover');
    }
  }

  private setButtonsDisabled(disabled: boolean): void {
    this.buttons.forEach(btn => {
      btn.disabled = disabled;
    });
  }

  private showStatus(message: string, type: 'playing' | 'gameover' | 'success' | '' = ''): void {
    this.gameStatusEl.textContent = message;
    this.gameStatusEl.className = 'game-status';
    if (type) {
      this.gameStatusEl.classList.add(type);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

new ColorMemoryGame();
