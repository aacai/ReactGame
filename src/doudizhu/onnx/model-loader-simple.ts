import * as ort from 'onnxruntime-web';

// 强制使用 WASM 后端，禁用 WebGPU
ort.env.wasm.wasmPaths = '/wasm/';
ort.env.wasm.numThreads = 4;  // 使用多线程加速
ort.env.wasm.simd = true;  // 启用 SIMD 优化

export type ModelType = 'landlord' | 'landlord_up' | 'landlord_down';

export async function loadModelSimple(
  modelPath: string,
  modelType: ModelType
): Promise<ort.InferenceSession> {
  console.log(`[loadModelSimple] 开始加载模型: ${modelType}`);
  console.log(`[loadModelSimple] 模型路径: ${modelPath}`);
  console.log(`[loadModelSimple] WASM 路径: ${ort.env.wasm.wasmPaths}`);

  try {
    // 简单直接的配置
    const session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });

    console.log(`[loadModelSimple] ✓ 模型加载成功: ${modelType}`);
    console.log(`[loadModelSimple] 输入: ${session.inputNames.join(', ')}`);
    console.log(`[loadModelSimple] 输出: ${session.outputNames.join(', ')}`);

    return session;
  } catch (error) {
    console.error(`[loadModelSimple] 模型加载失败:`, error);
    throw error;
  }
}

// 导出所有三个模型加载函数
export async function loadAllModels() {
  console.log('[loadAllModels] 开始加载所有模型...');

  const landlord = await loadModelSimple('/models/douzero/landlord.onnx', 'landlord');
  const landlord_up = await loadModelSimple('/models/douzero/landlord_up.onnx', 'landlord_up');
  const landlord_down = await loadModelSimple('/models/douzero/landlord_down.onnx', 'landlord_down');

  console.log('[loadAllModels] ✓ 所有模型加载完成');
  return { landlord, landlord_up, landlord_down };
}