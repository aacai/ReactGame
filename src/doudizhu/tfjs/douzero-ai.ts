/**
 * DouZero TensorFlow.js AI 实现
 *
 * 功能:
 * - 加载和管理 TensorFlow.js 模型
 * - 执行推理并选择动作
 * - 提供降级策略
 */

import * as tf from '@tensorflow/tfjs';
import type { Card, PlayerPosition, Difficulty } from '../game/types';
import { decidePlay } from '../game/ai';
import { findAllPlays } from '../game/rules';
import { createDeck } from '../game/deck';
import { loadModel, preloadAllModels, type ModelType, type LoadProgress } from './model-loader';
import {
  encodeLandlordObservation,
  encodeFarmerObservation,
  type LandlordObservation,
  type FarmerObservation,
} from '../onnx/state-encoder';
import {
  selectBestAction,
  selectActionWithExploration,
  getTopKActions,
  type QValuePrediction,
} from '../onnx/action-decoder';

/**
 * AI 状态
 */
export type AIState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * 走子历史的最小结构
 */
interface PlayHistoryLike {
  player: PlayerPosition;
  cards: Card[];
  cardType: string;
}

/**
 * AI 配置
 */
export interface DouZeroTFJSConfig {
  difficulty?: Difficulty;
  explorationRate?: number;
  onStateChange?: (state: AIState) => void;
  onProgress?: (model: ModelType, progress: LoadProgress) => void;
  onError?: (error: Error) => void;
}

/**
 * DouZero TensorFlow.js AI 类
 */
export class DouZeroTFJS {
  private models: Map<ModelType, tf.GraphModel> = new Map();
  private state: AIState = 'idle';
  private config: DouZeroTFJSConfig;
  private loadingPromise: Promise<void> | null = null;

  constructor(config: DouZeroTFJSConfig = {}) {
    this.config = {
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
   * 设置状态
   */
  private setState(state: AIState): void {
    this.state = state;
    this.config.onStateChange?.(state);
  }

  /**
   * 加载所有模型
   */
  async loadModels(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    if (this.state === 'ready') {
      return;
    }

    this.loadingPromise = this._loadModels();
    return this.loadingPromise;
  }

  private async _loadModels(): Promise<void> {
    try {
      this.setState('loading');

      console.log('\n开始加载 TensorFlow.js 模型...');

      this.models = await preloadAllModels((model, progress) => {
        this.config.onProgress?.(model, progress);
      });

      this.setState('ready');
      console.log('✓ 所有 TensorFlow.js 模型加载完成');
    } catch (error) {
      this.setState('error');
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('TensorFlow.js 模型加载失败:', err);
      this.config.onError?.(err);
      throw err;
    } finally {
      this.loadingPromise = null;
    }
  }

  /**
   * 预测地主动作
   */
  async predictLandlord(obs: LandlordObservation): Promise<QValuePrediction> {
    const model = this.models.get('landlord');

    if (!model) {
      throw new Error('地主模型未加载');
    }

    const { z, x } = encodeLandlordObservation(obs);

    // 创建张量
    const zTensor = tf.tensor3d(this.flatten3D(z), [z.length, 5, 162]);
    const xTensor = tf.tensor2d(this.flatten2D(x), [x.length, x[0].length]);

    try {
      // 执行推理
      const predictions = model.predict([zTensor, xTensor]) as tf.Tensor;

      // 获取预测值
      const values = await predictions.data();

      return {
        values: Array.from(values),
        legalActions: obs.legalActions,
      };
    } finally {
      // 清理张量
      zTensor.dispose();
      xTensor.dispose();
    }
  }

  /**
   * 预测农民动作
   */
  async predictFarmer(
    obs: FarmerObservation,
    modelType: 'landlord_up' | 'landlord_down'
  ): Promise<QValuePrediction> {
    const model = this.models.get(modelType);

    if (!model) {
      throw new Error(`${modelType} 模型未加载`);
    }

    const { z, x } = encodeFarmerObservation(obs);

    // 创建张量
    const zTensor = tf.tensor3d(this.flatten3D(z), [z.length, 5, 162]);
    const xTensor = tf.tensor2d(this.flatten2D(x), [x.length, x[0].length]);

    try {
      // 执行推理
      const predictions = model.predict([zTensor, xTensor]) as tf.Tensor;

      // 获取预测值
      const values = await predictions.data();

      return {
        values: Array.from(values),
        legalActions: obs.legalActions,
      };
    } finally {
      // 清理张量
      zTensor.dispose();
      xTensor.dispose();
    }
  }

  /**
   * 选择动作
   */
  selectAction(prediction: QValuePrediction, useExploration: boolean = false): Card[] {
    if (useExploration && this.config.explorationRate! > 0) {
      return selectActionWithExploration(prediction, this.config.explorationRate!);
    }

    return selectBestAction(prediction);
  }

  /**
   * 组装观察并运行模型
   */
  private async buildPrediction(
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
  ): Promise<QValuePrediction | null> {
    if (this.state !== 'ready' || !landlordPosition) return null;

    try {
      const history = playHistory as PlayHistoryLike[];

      const beatingPlays = findAllPlays(hand, lastPlay);
      const legalActions: Card[][] = lastPlay ? [...beatingPlays, []] : beatingPlays;
      if (legalActions.length === 0) return null;

      const playedBy: Record<PlayerPosition, Card[]> = {
        bottom: [],
        left: [],
        right: [],
      };
      let bombNum = 0;
      const sequence: Card[][] = [];
      for (const e of history) {
        if (e.cardType !== 'pass' && e.cards && e.cards.length) {
          playedBy[e.player].push(...e.cards);
          sequence.push(e.cards);
          if (e.cardType === 'bomb' || e.cardType === 'rocket') bombNum++;
        }
      }

      const startCount = (p: PlayerPosition) => (p === landlordPosition ? 20 : 17);
      const remainingOf = (p: PlayerPosition) =>
        Math.max(0, startCount(p) - playedBy[p].length);

      const myIds = new Set(hand.map((c) => c.id));
      const playedIds = new Set<string>();
      for (const p of ['bottom', 'left', 'right'] as PlayerPosition[]) {
        for (const c of playedBy[p]) playedIds.add(c.id);
      }
      const otherHandCards = createDeck().filter(
        (c) => !myIds.has(c.id) && !playedIds.has(c.id)
      );

      const POS: PlayerPosition[] = ['bottom', 'left', 'right'];
      const seatOf = (p: PlayerPosition) => POS.indexOf(p);
      const llSeat = seatOf(landlordPosition);
      const upSeat = (llSeat - 1 + 3) % 3;
      const downSeat = (llSeat + 1) % 3;
      const upPos = POS[upSeat];
      const downPos = POS[downSeat];
      const mySeat = seatOf(position);

      let prediction: QValuePrediction;

      if (isLandlord) {
        const obs: LandlordObservation = {
          myHandCards: hand,
          otherHandCards,
          lastAction: lastPlay ? lastPlay.cards : [],
          landlordUpPlayedCards: playedBy[upPos],
          landlordDownPlayedCards: playedBy[downPos],
          landlordUpNumCardsLeft: remainingOf(upPos),
          landlordDownNumCardsLeft: remainingOf(downPos),
          bombNum,
          legalActions,
          actionHistory: sequence,
        };
        prediction = await this.predictLandlord(obs);
      } else {
        const teammatePos = mySeat === upSeat ? downPos : upPos;
        const lastOf = (p: PlayerPosition): Card[] => {
          for (let i = history.length - 1; i >= 0; i--) {
            const e = history[i];
            if (e.player === p && e.cardType !== 'pass' && e.cards?.length) return e.cards;
          }
          return [];
        };
        const obs: FarmerObservation = {
          myHandCards: hand,
          otherHandCards,
          landlordPlayedCards: playedBy[landlordPosition],
          teammatePlayedCards: playedBy[teammatePos],
          lastAction: lastPlay ? lastPlay.cards : [],
          lastLandlordAction: lastOf(landlordPosition),
          lastTeammateAction: lastOf(teammatePos),
          landlordNumCardsLeft: remainingOf(landlordPosition),
          teammateNumCardsLeft: remainingOf(teammatePos),
          bombNum,
          legalActions,
          actionHistory: sequence,
        };
        prediction = await this.predictFarmer(
          obs,
          mySeat === upSeat ? 'landlord_up' : 'landlord_down'
        );
      }

      return prediction;
    } catch {
      return null;
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
    const pred = await this.buildPrediction(
      hand,
      lastPlay,
      position,
      isLandlord,
      partnerRemaining,
      landlordRemaining,
      playHistory,
      landlordPosition
    );

    if (!pred) {
      return this.fallbackDecide(
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

    return this.selectAction(pred, this.config.explorationRate! > 0);
  }

  /**
   * 返回前 K 手推荐
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
    const pred = await this.buildPrediction(
      hand,
      lastPlay,
      position,
      isLandlord,
      partnerRemaining,
      landlordRemaining,
      playHistory,
      landlordPosition
    );

    if (!pred) return [];

    return getTopKActions(pred, k).map((a) => a.action);
  }

  /**
   * 降级策略
   */
  private fallbackDecide(
    hand: Card[],
    lastPlay: any,
    position: PlayerPosition,
    isLandlord: boolean,
    partnerRemaining: number,
    landlordRemaining: number,
    playHistory: any[],
    landlordPosition?: PlayerPosition
  ): Card[] | null {
    return decidePlay(
      hand,
      lastPlay,
      position,
      isLandlord,
      this.config.difficulty!,
      partnerRemaining,
      landlordRemaining,
      playHistory,
      landlordPosition
    );
  }

  /**
   * 释放资源
   */
  async dispose(): Promise<void> {
    for (const model of this.models.values()) {
      model.dispose();
    }
    this.models.clear();
    this.setState('idle');
    console.log('✓ 已释放所有 TensorFlow.js 模型资源');
  }

  /**
   * 辅助方法: 展平 3D 数组
   */
  private flatten3D(arr: number[][][]): number[] {
    const result: number[] = [];
    for (const matrix of arr) {
      for (const row of matrix) {
        result.push(...row);
      }
    }
    return result;
  }

  /**
   * 辅助方法: 展平 2D 数组
   */
  private flatten2D(arr: number[][]): number[] {
    const result: number[] = [];
    for (const row of arr) {
      result.push(...row);
    }
    return result;
  }
}

/**
 * 创建 TensorFlow.js AI 实例
 */
export function createDouZeroTFJS(config?: DouZeroTFJSConfig): DouZeroTFJS {
  return new DouZeroTFJS(config);
}