/**
 * TensorFlow.js DouZero 模型加载器
 *
 * 用 tf.layers 重建 LSTM+Dense 网络，从 public/models/tfjs 加载权重。
 * 路径使用 Vite BASE_URL，兼容开发 / 打包 / Capacitor / Electron。
 */

import * as tf from '@tensorflow/tfjs';

export type ModelType = 'landlord' | 'landlord_up' | 'landlord_down';

export interface LoadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface ModelLoadOptions {
  onProgress?: (progress: LoadProgress) => void;
}

interface WeightEntry {
  name: string;
  shape: number[];
  dtype: string;
}

interface Manifest {
  format: string;
  xDim: number;
  zShape: number[];
  lstmUnits: number;
  weights: WeightEntry[];
}

const CACHE_NAME = 'douzero-tfjs-models-v3';

function assetUrl(relativePath: string): string {
  const rel = relativePath.replace(/^\//, '');
  // document.baseURI 在 Vite base:'./'、Capacitor、Electron file:// 下都能正确解析
  if (typeof document !== 'undefined' && document.baseURI) {
    return new URL(rel, document.baseURI).href.replace(/\/$/, '');
  }
  const base = import.meta.env.BASE_URL || './';
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `${normalized}${rel}`.replace(/\/$/, '');
}

export function getModelBaseUrl(modelType: ModelType): string {
  return assetUrl(`models/tfjs/${modelType}`);
}

/**
 * 构建与 DouZero PyTorch 一致的 Keras 风格网络。
 * 权重会立刻 setWeights，因此用 zeros 初始化避免 Orthogonal 在大矩阵上极慢。
 */
function buildModel(xDim: number, name: string): tf.LayersModel {
  const zIn = tf.input({ shape: [5, 162], name: 'z' });
  const xIn = tf.input({ shape: [xDim], name: 'x' });

  const lstmOut = tf.layers
    .lstm({
      units: 128,
      returnSequences: false,
      name: 'lstm',
      kernelInitializer: 'zeros',
      recurrentInitializer: 'zeros',
      biasInitializer: 'zeros',
    })
    .apply(zIn) as tf.SymbolicTensor;

  let h = tf.layers.concatenate({ name: 'concat' }).apply([lstmOut, xIn]) as tf.SymbolicTensor;
  h = tf.layers
    .dense({ units: 512, activation: 'relu', name: 'dense1', kernelInitializer: 'zeros', biasInitializer: 'zeros' })
    .apply(h) as tf.SymbolicTensor;
  h = tf.layers
    .dense({ units: 512, activation: 'relu', name: 'dense2', kernelInitializer: 'zeros', biasInitializer: 'zeros' })
    .apply(h) as tf.SymbolicTensor;
  h = tf.layers
    .dense({ units: 512, activation: 'relu', name: 'dense3', kernelInitializer: 'zeros', biasInitializer: 'zeros' })
    .apply(h) as tf.SymbolicTensor;
  h = tf.layers
    .dense({ units: 512, activation: 'relu', name: 'dense4', kernelInitializer: 'zeros', biasInitializer: 'zeros' })
    .apply(h) as tf.SymbolicTensor;
  h = tf.layers
    .dense({ units: 512, activation: 'relu', name: 'dense5', kernelInitializer: 'zeros', biasInitializer: 'zeros' })
    .apply(h) as tf.SymbolicTensor;
  const out = tf.layers
    .dense({ units: 1, name: 'values', kernelInitializer: 'zeros', biasInitializer: 'zeros' })
    .apply(h) as tf.SymbolicTensor;

  return tf.model({ inputs: [zIn, xIn], outputs: out, name });
}

function layerNameFromWeight(weightName: string): string {
  // "lstm/kernel" → "lstm", "dense1/bias" → "dense1", "values/kernel" → "values"
  return weightName.split('/')[0];
}

async function loadWeightsIntoModel(
  model: tf.LayersModel,
  baseUrl: string,
  onProgress?: (progress: LoadProgress) => void
): Promise<void> {
  onProgress?.({ loaded: 0, total: 100, percentage: 0 });

  const manifestRes = await fetch(`${baseUrl}/manifest.json`);
  if (!manifestRes.ok) {
    throw new Error(`无法读取 manifest.json (${manifestRes.status}): ${baseUrl}/manifest.json`);
  }
  const manifest = (await manifestRes.json()) as Manifest;

  if (manifest.format !== 'douzero-tfjs-weights-v1') {
    throw new Error(`不支持的权重格式: ${manifest.format}`);
  }

  onProgress?.({ loaded: 20, total: 100, percentage: 20 });

  const binRes = await fetch(`${baseUrl}/weights.bin`);
  if (!binRes.ok) {
    throw new Error(`无法读取 weights.bin (${binRes.status}): ${baseUrl}/weights.bin`);
  }
  const buffer = await binRes.arrayBuffer();
  const f32 = new Float32Array(buffer);

  onProgress?.({ loaded: 60, total: 100, percentage: 60 });

  // 按层聚合权重
  const byLayer = new Map<string, { shapes: number[][]; data: Float32Array[] }>();
  let offset = 0;
  for (const entry of manifest.weights) {
    const count = entry.shape.reduce((a, b) => a * b, 1);
    const slice = f32.subarray(offset, offset + count);
    offset += count;
    if (offset > f32.length) {
      throw new Error(`权重文件长度不足: need ${offset}, got ${f32.length}`);
    }
    const layer = layerNameFromWeight(entry.name);
    const bucket = byLayer.get(layer) ?? { shapes: [], data: [] };
    bucket.shapes.push(entry.shape);
    bucket.data.push(slice);
    byLayer.set(layer, bucket);
  }

  for (const [layerName, bucket] of byLayer) {
    const layer = model.getLayer(layerName);
    const tensors = bucket.data.map((data, i) => tf.tensor(data, bucket.shapes[i]));
    try {
      layer.setWeights(tensors);
    } finally {
      tensors.forEach((t) => t.dispose());
    }
  }

  onProgress?.({ loaded: 100, total: 100, percentage: 100 });
}

/**
 * 加载单个角色模型
 */
export async function loadModel(
  modelType: ModelType,
  options: ModelLoadOptions = {}
): Promise<tf.LayersModel> {
  const { onProgress } = options;
  const baseUrl = getModelBaseUrl(modelType);

  console.log(`[TFJS] 加载模型: ${modelType}`);
  console.log(`[TFJS] 路径: ${baseUrl}`);

  try {
    await tf.ready();

    const xDim = modelType === 'landlord' ? 373 : 484;
    const model = buildModel(xDim, modelType);
    await loadWeightsIntoModel(model, baseUrl, onProgress);

    console.log(`[TFJS] ✓ TensorFlow.js 模型加载成功: ${modelType}`);
    console.log(
      `[TFJS]   输入: ${model.inputs.map((i) => `${i.name}:${JSON.stringify(i.shape)}`).join(', ')}`
    );

    return model;
  } catch (error) {
    console.error(`[TFJS] 模型加载失败 (${modelType}):`, error);
    throw new Error(
      `TensorFlow.js 模型加载失败: ${modelType}\n路径: ${baseUrl}\n` +
        `请先运行: scripts/venv/bin/python scripts/export_douzero_tfjs_weights.py`
    );
  }
}

/**
 * 预加载三个模型
 */
export async function preloadAllModels(
  onProgress?: (model: ModelType, progress: LoadProgress) => void
): Promise<Map<ModelType, tf.LayersModel>> {
  const models: ModelType[] = ['landlord', 'landlord_up', 'landlord_down'];
  const sessions = new Map<ModelType, tf.LayersModel>();

  console.log('[TFJS] 开始加载全部 DouZero TensorFlow.js 模型...');

  for (const modelType of models) {
    const model = await loadModel(modelType, {
      onProgress: (progress) => onProgress?.(modelType, progress),
    });
    sessions.set(modelType, model);
  }

  console.log('[TFJS] ✓ 所有 TensorFlow.js 模型加载完成');
  return sessions;
}

export async function clearModelCache(): Promise<void> {
  if (!('caches' in window)) return;
  try {
    await caches.delete(CACHE_NAME);
    console.log('[TFJS] ✓ 模型缓存已清除');
  } catch (error) {
    console.warn(`[TFJS] 缓存清除失败: ${error}`);
  }
}
