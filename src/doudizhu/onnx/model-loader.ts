/**
 * DouZero ONNX 模型加载器
 *
 * 功能:
 * - 从远程服务器加载 ONNX 模型
 * - 使用 CacheStorage 缓存模型
 * - 提供加载进度回调
 */

import * as ort from 'onnxruntime-web';

// 让 onnxruntime-web 从 public/wasm 加载 wasm 运行时。
// Vite 打包后无法按 JS 模块路径定位 node_modules 内的 .wasm 文件，
// 不配置会导致首次 InferenceSession.create 失败（模型加载报错）。
/**
 * 配置 ONNX Runtime Web
 * 关键：使用最新版 onnxruntime-web (1.18+) 支持 opset 17-21
 */
ort.env.wasm.wasmPaths = 'wasm/';

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

const CACHE_NAME = 'douzero-models-v1';
const MODEL_BASE_URL = '/models/douzero';

/**
 * 获取模型 URL
 */
function getModelUrl(modelType: ModelType): string {
  return `${MODEL_BASE_URL}/${modelType}.onnx`;
}

/**
 * 获取缓存键名
 */
function getCacheKey(modelType: ModelType): string {
  return `douzero-${modelType}`;
}

/**
 * 从缓存加载模型
 */
async function loadFromCache(
  modelType: ModelType
): Promise<ArrayBuffer | null> {
  if (!('caches' in window)) {
    return null;
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(getCacheUrl(modelType));

    if (response) {
      const buffer = await response.arrayBuffer();
      console.log(`✓ 从缓存加载模型: ${modelType}`);
      return buffer;
    }
  } catch (error) {
    console.warn(`缓存读取失败: ${error}`);
  }

  return null;
}

/**
 * 缓存模型
 */
async function cacheModel(
  modelType: ModelType,
  buffer: ArrayBuffer
): Promise<void> {
  if (!('caches' in window)) {
    return;
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(buffer);
    await cache.put(getCacheUrl(modelType), response.clone());
    console.log(`✓ 模型已缓存: ${modelType}`);
  } catch (error) {
    console.warn(`缓存写入失败: ${error}`);
  }
}

function getCacheUrl(modelType: ModelType): string {
  return `/cached-models/${modelType}.onnx`;
}

/**
 * 从远程加载模型
 */
async function loadFromRemote(
  modelType: ModelType,
  onProgress?: (progress: LoadProgress) => void
): Promise<ArrayBuffer> {
  const url = getModelUrl(modelType);

  console.log(`开始下载模型: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`模型下载失败: ${response.status} ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body) {
    throw new Error('响应体为空');
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    chunks.push(value);
    loaded += value.length;

    if (onProgress && total > 0) {
      onProgress({
        loaded,
        total,
        percentage: Math.round((loaded / total) * 100),
      });
    }
  }

  const buffer = new Uint8Array(loaded);
  let offset = 0;

  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }

  console.log(`✓ 模型下载完成: ${loaded} 字节`);

  return buffer.buffer;
}

/**
 * 加载 ONNX 模型
 *
 * @param modelType 模型类型
 * @param options 加载选项
 * @returns ONNX 推理会话
 */
export async function loadModel(
  modelType: ModelType,
  options: ModelLoadOptions = {}
): Promise<ort.InferenceSession> {
  const { onProgress, useCache = true } = options;

  console.log(`\n加载模型: ${modelType}`);

  let buffer: ArrayBuffer;

  if (useCache) {
    const cachedBuffer = await loadFromCache(modelType);

    if (cachedBuffer) {
      buffer = cachedBuffer;

      if (onProgress) {
        onProgress({ loaded: buffer.byteLength, total: buffer.byteLength, percentage: 100 });
      }
    } else {
      buffer = await loadFromRemote(modelType, onProgress);
      await cacheModel(modelType, buffer);
    }
  } else {
    buffer = await loadFromRemote(modelType, onProgress);
  }

  console.log('创建推理会话...');

  // ONNX Runtime Web 配置（支持 opset 17-21）
  // 关键：指定 wasm 文件的完整路径
  ort.env.wasm.wasmPaths = '/wasm/';  // 使用绝对路径

  const sessionOptions: ort.InferenceSession.SessionOptions = {
    executionProviders: ['wasm'],  // 只用 WASM，避免 WebGPU 兼容性问题
    graphOptimizationLevel: 'all',
  };

  try {
    console.log(`[ModelLoader] 尝试加载模型: ${modelType}`);
    console.log(`[ModelLoader] 使用后端: webgpu (首选) -> wasm (降级)`);

    const session = await ort.InferenceSession.create(buffer, sessionOptions);

    console.log(`✓ 模型加载成功: ${modelType}`);
    console.log(`  输入: ${session.inputNames.join(', ')}`);
    console.log(`  输出: ${session.outputNames.join(', ')}`);

    return session;
  } catch (error) {
    console.error(`模型加载失败 (${modelType}):`, error);
    throw error;
  }
}

/**
 * 预加载所有模型
 */
export async function preloadAllModels(
  onProgress?: (model: ModelType, progress: LoadProgress) => void
): Promise<Map<ModelType, ort.InferenceSession>> {
  const models: ModelType[] = ['landlord', 'landlord_up', 'landlord_down'];
  const sessions = new Map<ModelType, ort.InferenceSession>();

  for (const modelType of models) {
    const session = await loadModel(modelType, {
      onProgress: (progress) => onProgress?.(modelType, progress),
    });
    sessions.set(modelType, session);
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
    console.log('✓ 模型缓存已清除');
  } catch (error) {
    console.warn(`缓存清除失败: ${error}`);
  }
}

/**
 * 获取缓存大小
 */
export async function getCacheSize(): Promise<number> {
  if (!('caches' in window)) {
    return 0;
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    let totalSize = 0;

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }

    return totalSize;
  } catch (error) {
    console.warn(`获取缓存大小失败: ${error}`);
    return 0;
  }
}