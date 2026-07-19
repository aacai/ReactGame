/**
 * DouZero 模型加载进度条组件
 *
 * 功能:
 * - 显示模型加载进度
 * - 支持三个模型独立进度显示
 * - 提供错误提示和重试功能
 */

import React, { useEffect, useState } from 'react';
import { initializeDouZeroAI } from '../game/ai';
import type { AIState } from '../onnx';
import type { ModelType, LoadProgress } from '../onnx';

interface ModelLoadStatus {
  landlord: number;
  landlord_up: number;
  landlord_down: number;
}

interface Props {
  onLoadComplete?: () => void;
  onLoadError?: (error: Error) => void;
  onStateChange?: (state: AIState) => void;
}

export const ModelLoadingIndicator: React.FC<Props> = ({
  onLoadComplete,
  onLoadError,
  onStateChange,
}) => {
  const [aiState, setAiState] = useState<AIState>('idle');
  const [progress, setProgress] = useState<ModelLoadStatus>({
    landlord: 0,
    landlord_up: 0,
    landlord_down: 0,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      console.log('[ModelLoadingIndicator] 开始加载模型...');
      setError(null);
      setAiState('loading');
      onStateChange?.('loading');

      // 使用简单版本的加载器
      const { loadAllModels } = await import('../onnx/model-loader-simple');
      await loadAllModels();

      console.log('[ModelLoadingIndicator] ✓ 所有模型加载完成');
      setAiState('ready');
      onStateChange?.('ready');
      onLoadComplete?.();
    } catch (err) {
      console.error('[ModelLoadingIndicator] 模型加载失败:', err);
      const errorMsg = err instanceof Error ? err.message : '模型加载失败';
      setError(errorMsg);
      setAiState('error');
      onStateChange?.('error');
      onLoadError?.(err instanceof Error ? err : new Error(errorMsg));
    }
  };

  const handleRetry = () => {
    loadModels();
  };

  const modelNames: Record<ModelType, string> = {
    landlord: '地主模型',
    landlord_up: '农民(上家)模型',
    landlord_down: '农民(下家)模型',
  };

  if (aiState === 'idle' || aiState === 'ready') {
    return null;
  }

  if (aiState === 'error') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md mx-4">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠</div>
            <h3 className="text-lg font-bold mb-2">模型加载失败</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500 mb-4">
              将使用启发式 AI 继续游戏
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                重新加载
              </button>
              <button
                onClick={onLoadComplete}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                继续游戏
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const overallProgress = Math.round(
    (progress.landlord + progress.landlord_up + progress.landlord_down) / 3
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="animate-spin text-4xl mb-4">⚙</div>
          <h3 className="text-lg font-bold">正在加载 AI 模型</h3>
          <p className="text-gray-500 text-sm mt-2">
            首次加载需要下载模型文件 (约 5MB)
          </p>
        </div>

        <div className="space-y-4">
          {(['landlord', 'landlord_up', 'landlord_down'] as ModelType[]).map(
            (modelType) => (
              <div key={modelType}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{modelNames[modelType]}</span>
                  <span className="text-gray-500">
                    {progress[modelType]}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${progress[modelType]}%` }}
                  />
                </div>
              </div>
            )
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold">总体进度</span>
            <span className="text-blue-600 font-semibold">
              {overallProgress}%
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          模型将被缓存,下次启动更快
        </p>
      </div>
    </div>
  );
};