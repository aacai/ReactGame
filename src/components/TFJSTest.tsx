/**
 * TensorFlow.js 测试组件
 *
 * 功能：
 * - 测试模型加载
 * - 显示加载状态
 * - 显示错误信息
 */

import { useState, useEffect } from 'react';
import { createDouZeroTFJS, type AIState } from '../doudizhu/tfjs';
import type { DouZeroTFJS } from '../doudizhu/tfjs';

export function TFJSTest() {
  const [ai, setAi] = useState<DouZeroTFJS | null>(null);
  const [state, setState] = useState<AIState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  const loadModels = async () => {
    setError(null);
    setLogs([]);

    try {
      addLog('创建 TensorFlow.js AI 实例...');

      const instance = createDouZeroTFJS({
        difficulty: 'hard',
        onStateChange: (newState) => {
          setState(newState);
          addLog(`状态变更: ${newState}`);
        },
        onError: (err) => {
          setError(err.message);
          addLog(`错误: ${err.message}`);
        },
      });

      setAi(instance);
      addLog('开始加载模型...');
      addLog('提示: 这可能需要几分钟时间');
      addLog('提示: 如果模型文件不存在，请先运行转换脚本');

      await instance.loadModels();

      addLog('✓ 模型加载成功！');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      addLog(`✗ 加载失败: ${errorMsg}`);
      addLog('请检查:');
      addLog('1. 模型文件是否已转换');
      addLog('2. public/models/tfjs/ 目录是否存在');
      addLog('3. 参考 docs/tfjs-conversion-guide.md');
    }
  };

  const disposeModels = async () => {
    if (ai) {
      await ai.dispose();
      setAi(null);
      setState('idle');
      addLog('已释放模型资源');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">TensorFlow.js 测试</h2>

      {/* 状态显示 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-gray-600">状态:</span>
          <span
            className={`px-3 py-1 rounded text-white ${
              state === 'ready'
                ? 'bg-green-500'
                : state === 'loading'
                  ? 'bg-blue-500'
                  : state === 'error'
                    ? 'bg-red-500'
                    : 'bg-gray-500'
            }`}
          >
            {state === 'ready'
              ? '就绪'
              : state === 'loading'
                ? '加载中...'
                : state === 'error'
                  ? '错误'
                  : '空闲'}
          </span>
        </div>

        {state === 'loading' && (
          <div className="text-sm text-gray-600">
            <p>正在加载模型，请稍候...</p>
            <p className="mt-2">
              注意: 如果是首次加载，需要先转换模型文件。
            </p>
          </div>
        )}
      </div>

      {/* 错误显示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="font-semibold text-red-800 mb-2">错误信息</h3>
          <p className="text-red-700">{error}</p>
          <div className="mt-4 text-sm text-red-600">
            <p>解决方法:</p>
            <ol className="list-decimal ml-4 mt-2 space-y-1">
              <li>检查模型文件是否已转换为 TensorFlow.js 格式</li>
              <li>
                参考{' '}
                <code className="bg-red-100 px-1 rounded">
                  docs/tfjs-conversion-guide.md
                </code>
              </li>
              <li>运行转换脚本: scripts/convert_onnx_to_tfjs_simple.py</li>
            </ol>
          </div>
        </div>
      )}

      {/* 控制按钮 */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={loadModels}
          disabled={state === 'loading'}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {state === 'loading' ? '加载中...' : '加载模型'}
        </button>

        <button
          onClick={disposeModels}
          disabled={state === 'idle' || state === 'loading'}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          释放资源
        </button>
      </div>

      {/* 日志显示 */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">日志</h3>
        <div className="bg-gray-900 text-green-400 p-4 rounded h-64 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <p className="text-gray-500">点击"加载模型"开始测试...</p>
          ) : (
            logs.map((log, index) => <div key={index}>{log}</div>)
          )}
        </div>
      </div>

      {/* 说明 */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold text-blue-800 mb-2">使用说明</h3>
        <ol className="list-decimal ml-4 text-sm text-blue-700 space-y-1">
          <li>确保已安装 TensorFlow.js 依赖: npm install @tensorflow/tfjs</li>
          <li>转换模型文件: python scripts/convert_onnx_to_tfjs_simple.py</li>
          <li>点击"加载模型"测试加载功能</li>
          <li>查看控制台日志了解详细过程</li>
        </ol>
      </div>
    </div>
  );
}