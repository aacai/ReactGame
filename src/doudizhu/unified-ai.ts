/**
 * 统一 AI 管理器
 *
 * 功能:
 * - 自动选择 ONNX Runtime 或 TensorFlow.js
 * - 提供自动降级策略
 * - 统一接口
 */

import type { Card, PlayerPosition, Difficulty } from './game/types';
import { DouZeroAI, type AIState as ONNXAIState } from './onnx/douzero-ai';
import { DouZeroTFJS, type AIState as TFJSAIState } from './tfjs/douzero-ai';

export type BackendType = 'onnx' | 'tfjs' | 'auto';

export type AIState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * 统一 AI 配置
 */
export interface UnifiedAIConfig {
  backend?: BackendType;
  difficulty?: Difficulty;
  explorationRate?: number;
  onStateChange?: (state: AIState) => void;
  onBackendChange?: (backend: 'onnx' | 'tfjs') => void;
  onError?: (error: Error) => void;
}

/**
 * 统一 AI 管理器
 */
export class UnifiedDouZeroAI {
  private onnxAI: DouZeroAI | null = null;
  private tfjsAI: DouZeroTFJS | null = null;
  private activeBackend: 'onnx' | 'tfjs' | null = null;
  private state: AIState = 'idle';
  private config: UnifiedAIConfig;

  constructor(config: UnifiedAIConfig = {}) {
    this.config = {
      backend: 'auto',
      difficulty: 'hard',
      explorationRate: 0.0,
      ...config,
    };
  }

  /**
   * 获取当前状态
   */
  getState(): AIState {
    return this.state;
  }

  /**
   * 获取当前后端
   */
  getActiveBackend(): 'onnx' | 'tfjs' | null {
    return this.activeBackend;
  }

  /**
   * 设置状态
   */
  private setState(state: AIState): void {
    this.state = state;
    this.config.onStateChange?.(state);
  }

  /**
   * 加载模型
   */
  async loadModels(): Promise<void> {
    if (this.state === 'ready') {
      return;
    }

    this.setState('loading');

    const backend = this.config.backend;

    if (backend === 'onnx') {
      await this.loadONNX();
    } else if (backend === 'tfjs') {
      await this.loadTFJS();
    } else {
      // 自动模式：优先尝试 ONNX，失败则降级到 TensorFlow.js
      await this.loadAuto();
    }
  }

  /**
   * 加载 ONNX Runtime
   */
  private async loadONNX(): Promise<void> {
    try {
      console.log('\n尝试加载 ONNX Runtime...');

      this.onnxAI = new DouZeroAI({
        difficulty: this.config.difficulty,
        explorationRate: this.config.explorationRate,
        onStateChange: (state) => {
          if (state === 'ready') {
            this.activeBackend = 'onnx';
            this.config.onBackendChange?.('onnx');
          }
        },
        onError: this.config.onError,
      });

      await this.onnxAI.loadModels();

      this.activeBackend = 'onnx';
      this.setState('ready');
      this.config.onBackendChange?.('onnx');

      console.log('✓ ONNX Runtime 加载成功');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('ONNX Runtime 加载失败:', err);

      if (this.config.backend === 'onnx') {
        // 指定使用 ONNX，但失败了
        this.setState('error');
        this.config.onError?.(err);
        throw err;
      }
    }
  }

  /**
   * 加载 TensorFlow.js
   */
  private async loadTFJS(): Promise<void> {
    try {
      console.log('\n尝试加载 TensorFlow.js...');

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

      if (this.config.backend === 'tfjs') {
        // 指定使用 TensorFlow.js，但失败了
        this.setState('error');
        this.config.onError?.(err);
        throw err;
      }
    }
  }

  /**
   * 自动加载（优先 ONNX，失败降级到 TensorFlow.js）
   */
  private async loadAuto(): Promise<void> {
    // 尝试 ONNX
    try {
      await this.loadONNX();
      return;
    } catch (error) {
      console.warn('ONNX 加载失败，尝试 TensorFlow.js...');
    }

    // 降级到 TensorFlow.js
    try {
      await this.loadTFJS();
      return;
    } catch (error) {
      console.error('所有后端都加载失败');
      this.setState('error');
      const err = new Error('ONNX 和 TensorFlow.js 都无法加载');
      this.config.onError?.(err);
      throw err;
    }
  }

  /**
   * 决定出牌
   */
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
    if (this.activeBackend === 'onnx' && this.onnxAI) {
      return this.onnxAI.decidePlay(
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

  /**
   * 获取前 K 手推荐
   */
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
    if (this.activeBackend === 'onnx' && this.onnxAI) {
      return this.onnxAI.getTopK(
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

  /**
   * 释放资源
   */
  async dispose(): Promise<void> {
    if (this.onnxAI) {
      await this.onnxAI.dispose();
      this.onnxAI = null;
    }

    if (this.tfjsAI) {
      await this.tfjsAI.dispose();
      this.tfjsAI = null;
    }

    this.activeBackend = null;
    this.setState('idle');
    console.log('✓ 已释放所有 AI 资源');
  }
}

/**
 * 创建统一 AI 实例
 */
export function createUnifiedAI(config?: UnifiedAIConfig): UnifiedDouZeroAI {
  return new UnifiedDouZeroAI(config);
}