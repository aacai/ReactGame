/**
 * DouZero AI 主类
 *
 * 功能:
 * - 加载和管理 ONNX 模型
 * - 执行推理并选择动作
 * - 提供降级策略
 */

import * as ort from 'onnxruntime-web';
import type { Card, PlayerPosition, Difficulty } from '../game/types';
import { decidePlay } from '../game/ai';
import { findAllPlays } from '../game/rules';
import { createDeck } from '../game/deck';
import {
  loadModel,
  preloadAllModels,
  type ModelType,
  type LoadProgress,
} from './model-loader';
import {
  encodeLandlordObservation,
  encodeFarmerObservation,
  type LandlordObservation,
  type FarmerObservation,
} from './state-encoder';
import {
  selectBestAction,
  selectActionWithExploration,
  getTopKActions,
  type QValuePrediction,
} from './action-decoder';

/**
 * AI 状态
 */
export type AIState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * 走子历史的最小结构 (避免与 game/ai 循环依赖)
 */
interface PlayHistoryLike {
  player: PlayerPosition;
  cards: Card[];
  cardType: string;
}

/**
 * AI 配置
 */
export interface DouZeroAIConfig {
  difficulty?: Difficulty;
  useGPU?: boolean;
  explorationRate?: number;
  onStateChange?: (state: AIState) => void;
  onProgress?: (model: ModelType, progress: LoadProgress) => void;
  onError?: (error: Error) => void;
}

/**
 * DouZero AI 类
 */
export class DouZeroAI {
  private sessions: Map<ModelType, ort.InferenceSession> = new Map();
  private state: AIState = 'idle';
  private config: DouZeroAIConfig;
  private loadingPromise: Promise<void> | null = null;

  constructor(config: DouZeroAIConfig = {}) {
    this.config = {
      difficulty: 'hard',
      useGPU: false,
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
   * 更新状态回调（用于刷新后重新挂载的组件上报状态）
   */
  setOnStateChange(cb: (state: AIState) => void): void {
    this.config = { ...this.config, onStateChange: cb };
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

      console.log('\n开始加载 DouZero 模型...');

      this.sessions = await preloadAllModels((model, progress) => {
        this.config.onProgress?.(model, progress);
      });

      this.setState('ready');
      console.log('✓ 所有模型加载完成');
    } catch (error) {
      this.setState('error');
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('模型加载失败:', err);
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
    const session = this.sessions.get('landlord');

    if (!session) {
      throw new Error('地主模型未加载');
    }

    const { z, x } = encodeLandlordObservation(obs);

    const zTensor = new ort.Tensor('float32', this.flatten3D(z), [z.length, 5, 162]);
    const xTensor = new ort.Tensor('float32', this.flatten2D(x), [x.length, x[0].length]);

    const feeds = {
      z: zTensor,
      x: xTensor,
    };

    const results = await session.run(feeds);
    const values = Array.from(results.values.data as Float32Array);

    return {
      values,
      legalActions: obs.legalActions,
    };
  }

  /**
   * 预测农民动作
   */
  async predictFarmer(
    obs: FarmerObservation,
    modelType: 'landlord_up' | 'landlord_down'
  ): Promise<QValuePrediction> {
    const session = this.sessions.get(modelType);

    if (!session) {
      throw new Error(`${modelType} 模型未加载`);
    }

    const { z, x } = encodeFarmerObservation(obs);

    const zTensor = new ort.Tensor('float32', this.flatten3D(z), [z.length, 5, 162]);
    const xTensor = new ort.Tensor('float32', this.flatten2D(x), [x.length, x[0].length]);

    const feeds = {
      z: zTensor,
      x: xTensor,
    };

    const results = await session.run(feeds);
    const values = Array.from(results.values.data as Float32Array);

    return {
      values,
      legalActions: obs.legalActions,
    };
  }

  /**
   * 选择动作
   */
  selectAction(
    prediction: QValuePrediction,
    useExploration: boolean = false
  ): Card[] {
    if (useExploration && this.config.explorationRate! > 0) {
      return selectActionWithExploration(prediction, this.config.explorationRate!);
    }

    return selectBestAction(prediction);
  }

  /**
   * 决定出牌 (降级策略)
   *
   * 说明:
   * - 如果模型未加载或推理失败,使用启发式 AI
   * - 这确保了系统的高可用性
   */
  /**
   * 组装观察并运行模型,返回 Q 值预测;模型未就绪/异常时返回 null
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

      const playedBy: Record<PlayerPosition, Card[]> = { bottom: [], left: [], right: [] };
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
      const remainingOf = (p: PlayerPosition) => Math.max(0, startCount(p) - playedBy[p].length);

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
   * 返回模型给出的前 K 手推荐 (按 Q 值降序);模型不可用时返回空数组
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
   * 降级策略 (启发式 AI)
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
    for (const session of this.sessions.values()) {
      await session.release();
    }
    this.sessions.clear();
    this.setState('idle');
    console.log('✓ 已释放所有模型资源');
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
 * 创建 DouZero AI 实例
 */
export function createDouZeroAI(config?: DouZeroAIConfig): DouZeroAI {
  return new DouZeroAI(config);
}