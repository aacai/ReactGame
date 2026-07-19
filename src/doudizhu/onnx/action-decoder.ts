/**
 * 动作解码器
 *
 * 功能:
 * - 将模型输出解码为动作
 * - 提供动作选择策略
 */

import type { Card } from '../game/types';

/**
 * Q值预测结果
 */
export interface QValuePrediction {
  values: number[];
  legalActions: Card[][];
}

/**
 * 选择最优动作 (贪婪策略)
 *
 * @param prediction 预测结果
 * @returns 最优动作
 */
export function selectBestAction(prediction: QValuePrediction): Card[] {
  if (prediction.legalActions.length === 0) {
    return [];
  }

  let maxIdx = 0;
  let maxValue = prediction.values[0];

  for (let i = 1; i < prediction.values.length; i++) {
    if (prediction.values[i] > maxValue) {
      maxValue = prediction.values[i];
      maxIdx = i;
    }
  }

  return prediction.legalActions[maxIdx];
}

/**
 * 选择动作 (带 epsilon-greedy 探索)
 *
 * @param prediction 预测结果
 * @param epsilon 探索概率 (0-1)
 * @returns 选择的动作
 */
export function selectActionWithExploration(
  prediction: QValuePrediction,
  epsilon: number
): Card[] {
  if (prediction.legalActions.length === 0) {
    return [];
  }

  if (Math.random() < epsilon) {
    const randomIdx = Math.floor(Math.random() * prediction.legalActions.length);
    return prediction.legalActions[randomIdx];
  }

  return selectBestAction(prediction);
}

/**
 * 获取动作排名
 *
 * @param prediction 预测结果
 * @returns 排名数组 (索引为动作索引,值为排名)
 */
export function getActionRankings(prediction: QValuePrediction): number[] {
  const rankings: number[] = new Array(prediction.values.length).fill(0);

  const indices = prediction.values
    .map((value, idx) => ({ value, idx }))
    .sort((a, b) => b.value - a.value);

  for (let rank = 0; rank < indices.length; rank++) {
    rankings[indices[rank].idx] = rank + 1;
  }

  return rankings;
}

/**
 * 获取 Top-K 动作
 *
 * @param prediction 预测结果
 * @param k 数量
 * @returns Top-K 动作及其 Q 值
 */
export function getTopKActions(
  prediction: QValuePrediction,
  k: number
): Array<{ action: Card[]; qValue: number; rank: number }> {
  const indices = prediction.values
    .map((value, idx) => ({ value, idx }))
    .sort((a, b) => b.value - a.value)
    .slice(0, Math.min(k, prediction.legalActions.length));

  return indices.map((item, rank) => ({
    action: prediction.legalActions[item.idx],
    qValue: item.value,
    rank: rank + 1,
  }));
}

/**
 * 动作概率分布 (使用 softmax)
 *
 * @param prediction 预测结果
 * @param temperature 温度参数 (越高越平滑)
 * @returns 概率分布
 */
export function getActionProbabilities(
  prediction: QValuePrediction,
  temperature: number = 1.0
): number[] {
  if (prediction.values.length === 0) {
    return [];
  }

  const maxQ = Math.max(...prediction.values);
  const expValues = prediction.values.map(v =>
    Math.exp((v - maxQ) / temperature)
  );

  const sum = expValues.reduce((a, b) => a + b, 0);

  return expValues.map(v => v / sum);
}

/**
 * 采样动作 (根据概率分布)
 *
 * @param prediction 预测结果
 * @param temperature 温度参数
 * @returns 采样的动作
 */
export function sampleAction(
  prediction: QValuePrediction,
  temperature: number = 1.0
): Card[] {
  if (prediction.legalActions.length === 0) {
    return [];
  }

  const probs = getActionProbabilities(prediction, temperature);

  let r = Math.random();
  for (let i = 0; i < probs.length; i++) {
    r -= probs[i];
    if (r <= 0) {
      return prediction.legalActions[i];
    }
  }

  return prediction.legalActions[prediction.legalActions.length - 1];
}

/**
 * 计算 Q 值统计信息
 */
export interface QValueStats {
  min: number;
  max: number;
  mean: number;
  std: number;
}

/**
 * 获取 Q 值统计信息
 *
 * @param values Q 值数组
 * @returns 统计信息
 */
export function getQValueStats(values: number[]): QValueStats {
  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0, std: 0 };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);

  return { min, max, mean, std };
}