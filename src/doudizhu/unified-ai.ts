/**
 * 统一 AI 管理器 — 斗地主人机仅使用 TensorFlow.js
 */

import type { Card, PlayerPosition, Difficulty } from './game/types';
import { DouZeroTFJS, type AIState as TFJSAIState } from './tfjs/douzero-ai';

export type BackendType = 'tfjs';

export type AIState = TFJSAIState;

export interface UnifiedAIConfig {
  backend?: BackendType;
  difficulty?: Difficulty;
  explorationRate?: number;
  onStateChange?: (state: AIState) => void;
  onBackendChange?: (backend: 'tfjs') => void;
  onError?: (error: Error) => void;
}

export class UnifiedDouZeroAI {
  private tfjsAI: DouZeroTFJS | null = null;
  private activeBackend: 'tfjs' | null = null;
  private state: AIState = 'idle';
  private config: UnifiedAIConfig;

  constructor(config: UnifiedAIConfig = {}) {
    this.config = {
      backend: 'tfjs',
      difficulty: 'hard',
      explorationRate: 0.0,
      ...config,
    };
  }

  getState(): AIState {
    return this.state;
  }

  getActiveBackend(): 'tfjs' | null {
    return this.activeBackend;
  }

  private setState(state: AIState): void {
    this.state = state;
    this.config.onStateChange?.(state);
  }

  async loadModels(): Promise<void> {
    if (this.state === 'ready') {
      return;
    }

    this.setState('loading');
    await this.loadTFJS();
  }

  private async loadTFJS(): Promise<void> {
    try {
      console.log('\n加载 TensorFlow.js...');

      this.tfjsAI = new DouZeroTFJS({
        difficulty: this.config.difficulty,
        explorationRate: this.config.explorationRate,
        onStateChange: (state) => {
          if (state === 'ready') {
            this.activeBackend = 'tfjs';
            this.config.onBackendChange?.('tfjs');
          }
        },
        onError: this.config.onError,
      });

      await this.tfjsAI.loadModels();

      this.activeBackend = 'tfjs';
      this.setState('ready');
      this.config.onBackendChange?.('tfjs');

      console.log('✓ TensorFlow.js 加载成功');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('TensorFlow.js 加载失败:', err);
      this.setState('error');
      this.config.onError?.(err);
      throw err;
    }
  }

  async decidePlay(
    hand: Card[],
    lastPlay: {
      cards: Card[];
      cardType: any;
      mainRank: number;
      length: number;
    } | null,
    position: PlayerPosition,
    isLandlord: boolean,
    partnerRemaining: number,
    landlordRemaining: number,
    playHistory: any[],
    landlordPosition?: PlayerPosition
  ): Promise<Card[] | null> {
    if (this.activeBackend === 'tfjs' && this.tfjsAI) {
      return this.tfjsAI.decidePlay(
        hand,
        lastPlay,
        position,
        isLandlord,
        partnerRemaining,
        landlordRemaining,
        playHistory,
        landlordPosition
      );
    }
    return null;
  }

  async getTopK(
    hand: Card[],
    lastPlay: {
      cards: Card[];
      cardType: any;
      mainRank: number;
      length: number;
    } | null,
    position: PlayerPosition,
    isLandlord: boolean,
    partnerRemaining: number,
    landlordRemaining: number,
    playHistory: any[],
    landlordPosition?: PlayerPosition,
    k: number = 3
  ): Promise<Card[][]> {
    if (this.activeBackend === 'tfjs' && this.tfjsAI) {
      return this.tfjsAI.getTopK(
        hand,
        lastPlay,
        position,
        isLandlord,
        partnerRemaining,
        landlordRemaining,
        playHistory,
        landlordPosition,
        k
      );
    }
    return [];
  }

  async dispose(): Promise<void> {
    if (this.tfjsAI) {
      await this.tfjsAI.dispose();
      this.tfjsAI = null;
    }
    this.activeBackend = null;
    this.setState('idle');
    console.log('✓ 已释放 TensorFlow.js AI 资源');
  }
}

export function createUnifiedAI(config?: UnifiedAIConfig): UnifiedDouZeroAI {
  return new UnifiedDouZeroAI(config);
}
