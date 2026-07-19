/**
 * TensorFlow.js 模型加载器
 *
 * 功能:
 * - 加载 TensorFlow.js GraphModel
 * - 使用 CacheStorage 缓存模型
 * - 提供加载进度回调
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
  useCache?: boolean;
}

const CACHE_NAME = 'douzero-tfjs-models-v1';
const MODEL_BASE_URL = '/models/tfjs';

/**
 * 获取模型 URL
 */
function getModelUrl(modelType: ModelType): string {
  return `${MODEL_BASE_URL}/${modelType}/model.json`;
}

/**
 * 加载 TensorFlow.js 模型
 *
 * @param modelType 模型类型
 * @param options 加载选项
 * @returns TensorFlow.js GraphModel
 */
export async function loadModel(
  modelType: ModelType,
  options: ModelLoadOptions = {}
): Promise<tf.GraphModel> {
  const { onProgress } = options;

  console.log(`\n加载 TensorFlow.js 模型: ${modelType}`);

  const url = getModelUrl(modelType);

  try {
    // 设置进度回调
    if (onProgress) {
      // TensorFlow.js 没有原生的进度回调，我们模拟一下
      onProgress({ loaded: 0, total: 100, percentage: 0 });
    }

    // 加载模型
    const model = await tf.loadGraphModel(url, {
      onProgress: (fraction) => {
        if (onProgress) {
          const percentage = Math.round(fraction * 100);
          onProgress({
            loaded: percentage,
            total: 100,
            percentage,
          });
        }
      },
    });

    console.log(`✓ TensorFlow.js 模型加载成功: ${modelType}`);
    console.log(`  输入节点数: ${model.inputs?.length || 'N/A'}`);
    console.log(`  输出节点数: ${model.outputs?.length || 'N/A'}`);

    return model;
  } catch (error) {
    console.error(`TensorFlow.js 模型加载失败 (${modelType}):`, error);
    throw new Error(
      `TensorFlow.js 模型加载失败。请确保已将模型转换为 TensorFlow.js 格式。\n` +
        `模型路径: ${url}\n` +
        `转换方法: 参考 scripts/convert_onnx_to_tfjs_simple.py`
    );
  }
}

/**
 * 预加载所有模型
 */
export async function preloadAllModels(
  onProgress?: (model: ModelType, progress: LoadProgress) => void
): Promise<Map<ModelType, tf.GraphModel>> {
  const models: ModelType[] = ['landlord', 'landlord_up', 'landlord_down'];
  const sessions = new Map<ModelType, tf.GraphModel>();

  for (const modelType of models) {
    const model = await loadModel(modelType, {
      onProgress: (progress) => onProgress?.(modelType, progress),
    });
    sessions.set(modelType, model);
  }

  return sessions;
}

/**
 * 清除所有缓存
 */
export async function clearModelCache(): Promise<void> {
  if (!('caches' in window)) {
    return;
  }

  try {
    await caches.delete(CACHE_NAME);
    console.log('✓ TensorFlow.js 模型缓存已清除');
  } catch (error) {
    console.warn(`缓存清除失败: ${error}`);
  }
}