# DouZero ONNX 集成指南

本文档介绍如何将 DouZero 深度强化学习模型集成到斗地主游戏中。

## 目录

1. [概述](#概述)
2. [模型转换](#模型转换)
3. [部署步骤](#部署步骤)
4. [使用方法](#使用方法)
5. [API 参考](#api-参考)
6. [故障排查](#故障排查)

---

## 概述

### 什么是 DouZero?

DouZero 是快手团队开发的斗地主 AI,使用深度强化学习训练。它在 2021 年的斗地主比赛中取得了优异成绩。

### 为什么要转换为 ONNX?

- **浏览器推理**: ONNX.js 允许在浏览器中运行模型
- **跨平台**: ONNX 支持多种运行时环境
- **优化推理**: ONNX 提供了优化的推理引擎
- **模型压缩**: 支持 INT8 量化,减小模型体积

### 系统架构

```
┌─────────────────┐
│   PyTorch       │
│   Checkpoint    │
└────────┬────────┘
         │
         │ convert_douzero_to_onnx.py
         │
         ▼
┌─────────────────┐
│   ONNX 模型      │
│   (3个文件)      │
└────────┬────────┘
         │
         │ 部署到服务器
         │
         ▼
┌─────────────────┐
│   浏览器         │
│   ONNX.js       │
│   推理引擎       │
└─────────────────┘
```

---

## 模型转换

### 前置要求

```bash
pip install torch onnx onnxruntime numpy
```

### 获取 DouZero 模型

从官方仓库下载预训练模型:

```bash
git clone https://github.com/kwai/DouZero.git
cd DouZero

# 下载预训练权重
# landlord.pth, landlord_up.pth, landlord_down.pth
```

### 转换模型

使用提供的转换脚本:

```bash
cd xiangqi/scripts

# 转换所有模型
python convert_douzero_to_onnx.py \
    --checkpoint_path /path/to/DouZero/checkpoints \
    --output_dir ../public/models/douzero \
    --quantize

# 或转换单个模型
python convert_douzero_to_onnx.py \
    --checkpoint_path landlord.pth \
    --output_dir ../public/models/douzero \
    --model_type landlord
```

### 转换输出

转换完成后会生成以下文件:

```
public/models/douzero/
├── landlord.onnx          # 地主模型 (~1.1MB)
├── landlord_up.onnx       # 农民(上家)模型 (~1.1MB)
├── landlord_down.onnx     # 农民(下家)模型 (~1.1MB)
├── landlord_int8.onnx     # 量化后的地主模型 (~300KB)
├── landlord_up_int8.onnx  # 量化后的农民模型
└── landlord_down_int8.onnx
```

### 验证模型

转换脚本会自动验证输出一致性:

```bash
python convert_douzero_to_onnx.py \
    --checkpoint_path ./checkpoints \
    --output_dir ./onnx_models \
    --skip_validation false
```

---

## 部署步骤

### 1. 放置模型文件

将转换后的 ONNX 模型放到项目的 public 目录:

```bash
mkdir -p public/models/douzero
cp *.onnx public/models/douzero/
```

### 2. 配置模型路径

模型路径在 `model-loader.ts` 中配置:

```typescript
const MODEL_BASE_URL = '/models/douzero';
```

### 3. 安装依赖

```bash
npm install onnxruntime-web
```

### 4. 配置 Vite

在 `vite.config.ts` 中添加 ONNX 文件支持:

```typescript
export default defineConfig({
  assetsInclude: ['**/*.onnx'],
});
```

---

## 使用方法

### 基础用法

#### 1. 初始化 DouZero AI

```typescript
import { initializeDouZeroAI } from './doudizhu/game/ai';

// 初始化并加载模型
await initializeDouZeroAI((state) => {
  console.log('AI 状态:', state);
  // idle -> loading -> ready
});
```

#### 2. 使用异步决策函数

```typescript
import { decidePlayAsync } from './doudizhu/game/ai';

const play = await decidePlayAsync(
  hand,              // 手牌
  lastPlay,          // 上一次出牌
  position,          // 玩家位置
  isLandlord,        // 是否是地主
  'hard',            // 难度
  partnerRemaining,  // 队友剩余牌数
  landlordRemaining, // 地主剩余牌数
  playHistory,       // 出牌历史
  landlordPosition   // 地主位置
);
```

### UI 集成

#### 添加加载进度条

```tsx
import { ModelLoadingIndicator } from './doudizhu/components/ModelLoadingIndicator';

function GameScreen() {
  const [modelLoaded, setModelLoaded] = useState(false);

  return (
    <>
      {!modelLoaded && (
        <ModelLoadingIndicator
          onLoadComplete={() => setModelLoaded(true)}
          onLoadError={(error) => console.error(error)}
        />
      )}

      {/* 游戏界面 */}
    </>
  );
}
```

### 高级用法

#### 手动控制模型加载

```typescript
import { loadModel, selectBestAction } from './doudizhu/onnx';

// 加载单个模型
const session = await loadModel('landlord', {
  onProgress: (progress) => {
    console.log(`加载进度: ${progress.percentage}%`);
  },
  useCache: true,
});

// 手动推理
// ... (详见 API 参考)
```

---

## API 参考

### 初始化函数

#### `initializeDouZeroAI(onStateChange?)`

初始化 DouZero AI 实例。

**参数:**
- `onStateChange?: (state: AIState) => void` - 状态变化回调

**返回:**
- `Promise<DouZeroAI>` - AI 实例

**示例:**

```typescript
const ai = await initializeDouZeroAI((state) => {
  if (state === 'ready') {
    console.log('模型加载完成');
  }
});
```

### 决策函数

#### `decidePlayAsync(...)`

异步版本的出牌决策,支持 DouZero AI。

**参数:**
- `hand: Card[]` - 手牌
- `lastPlay: LastPlay` - 上一次出牌
- `position: PlayerPosition` - 玩家位置
- `isLandlord: boolean` - 是否是地主
- `difficulty: Difficulty` - 难度
- `partnerRemaining: number` - 队友剩余牌数
- `landlordRemaining: number` - 地主剩余牌数
- `playHistory: PlayHistoryEntry[]` - 出牌历史
- `landlordPosition?: PlayerPosition` - 地主位置

**返回:**
- `Promise<Card[] | null>` - 出牌决策

### 模型加载器

#### `loadModel(modelType, options?)`

加载单个 ONNX 模型。

**参数:**
- `modelType: 'landlord' | 'landlord_up' | 'landlord_down'` - 模型类型
- `options?: ModelLoadOptions` - 加载选项

**ModelLoadOptions:**
```typescript
interface ModelLoadOptions {
  onProgress?: (progress: LoadProgress) => void;
  useCache?: boolean;
}
```

**返回:**
- `Promise<ort.InferenceSession>` - ONNX 推理会话

#### `preloadAllModels(onProgress?)`

预加载所有模型。

**参数:**
- `onProgress?: (model, progress) => void` - 进度回调

**返回:**
- `Promise<Map<ModelType, ort.InferenceSession>>` - 会话映射表

#### `clearModelCache()`

清除所有缓存。

**返回:**
- `Promise<void>`

### 状态编码器

#### `encodeLandlordObservation(obs)`

编码地主观察。

**参数:**
- `obs: LandlordObservation` - 观察对象

**返回:**
- `{ z: number[][][], x: number[][] }` - 模型输入

#### `encodeFarmerObservation(obs)`

编码农民观察。

**参数:**
- `obs: FarmerObservation` - 观察对象

**返回:**
- `{ z: number[][][], x: number[][] }` - 模型输入

#### `cards2Array(cards)`

将牌列表编码为 54 维向量。

**参数:**
- `cards: Card[]` - 牌列表

**返回:**
- `number[]` - 54 维向量

### 动作解码器

#### `selectBestAction(prediction)`

选择最优动作。

**参数:**
- `prediction: QValuePrediction` - 预测结果

**返回:**
- `Card[]` - 最优动作

#### `selectActionWithExploration(prediction, epsilon)`

带探索的动作选择。

**参数:**
- `prediction: QValuePrediction` - 预测结果
- `epsilon: number` - 探索概率 (0-1)

**返回:**
- `Card[]` - 选择的动作

#### `getTopKActions(prediction, k)`

获取 Top-K 动作。

**参数:**
- `prediction: QValuePrediction` - 预测结果
- `k: number` - 数量

**返回:**
- `Array<{ action: Card[], qValue: number, rank: number }>` - Top-K 结果

---

## 故障排查

### 模型加载失败

**问题:** 控制台显示 "Failed to fetch model"

**解决方案:**

1. 检查模型文件是否存在于 `public/models/douzero/`
2. 检查文件路径是否正确
3. 检查文件权限

```bash
ls -la public/models/douzero/
```

### 内存不足

**问题:** 浏览器崩溃或内存警告

**解决方案:**

1. 使用量化模型减少内存占用:

```typescript
const session = await loadModel('landlord', {
  useCache: true,
});
// 使用 *_int8.onnx 模型
```

2. 只加载需要的模型:

```typescript
// 只加载地主模型
const session = await loadModel('landlord');
```

### 推理速度慢

**问题:** 每次推理耗时超过 1 秒

**解决方案:**

1. 启用 WASM 多线程:

```typescript
ort.env.wasm.numThreads = 4;
```

2. 使用缓存:

```typescript
const session = await loadModel('landlord', {
  useCache: true,
});
```

3. 使用 WebGPU (如果支持):

```typescript
const session = await ort.InferenceSession.create(buffer, {
  executionProviders: ['webgpu', 'wasm'],
});
```

### 类型错误

**问题:** TypeScript 编译错误

**解决方案:**

1. 安装类型定义:

```bash
npm install @types/onnxruntime-web
```

2. 检查导入路径:

```typescript
import * as ort from 'onnxruntime-web';
```

### 缓存问题

**问题:** 模型更新后仍使用旧版本

**解决方案:**

清除缓存:

```typescript
import { clearModelCache } from './doudizhu/onnx';

await clearModelCache();
location.reload();
```

或在浏览器中手动清除:
- Chrome: 开发者工具 -> Application -> Cache Storage
- Firefox: 开发者工具 -> 存储 -> 缓存

---

## 性能优化

### 模型压缩

使用 INT8 量化减小模型体积:

```bash
python convert_douzero_to_onnx.py \
    --checkpoint_path ./checkpoints \
    --output_dir ./onnx_models \
    --quantize
```

模型大小对比:
- 原始模型: ~1.1MB
- 量化模型: ~300KB

### 缓存策略

使用 CacheStorage 缓存模型:

```typescript
// 首次加载
const session = await loadModel('landlord', {
  useCache: true,
});

// 后续加载 (从缓存读取)
const session = await loadModel('landlord', {
  useCache: true,
});
```

### 并行加载

并行加载所有模型:

```typescript
const sessions = await preloadAllModels((model, progress) => {
  console.log(`${model}: ${progress.percentage}%`);
});
```

---

## 示例项目

完整的示例代码位于:

```
xiangqi/src/doudizhu/
├── onnx/
│   ├── model-loader.ts      # 模型加载器
│   ├── state-encoder.ts     # 状态编码器
│   ├── action-decoder.ts    # 动作解码器
│   ├── douzero-ai.ts        # AI 主类
│   └── index.ts             # 导出模块
├── game/
│   └── ai.ts                # AI 集成
└── components/
    └── ModelLoadingIndicator.tsx  # UI 组件
```

---

## 参考资料

- [DouZero 论文](https://arxiv.org/pdf/2106.06135.pdf)
- [DouZero GitHub](https://github.com/kwai/DouZero)
- [ONNX.js 文档](https://github.com/microsoft/onnxjs)
- [ONNX Runtime Web](https://github.com/microsoft/onnxruntime)

---

## 更新日志

### v1.0.0 (2024-01-XX)

- ✅ 完成 ONNX 转换脚本
- ✅ 实现浏览器推理引擎
- ✅ 添加模型缓存支持
- ✅ 实现 INT8 量化
- ✅ 添加降级策略
- ✅ 完成类型检查

---

## 贡献指南

欢迎提交 Issue 和 Pull Request!

在提交代码前,请确保:

1. 运行类型检查: `npm run check`
2. 运行代码风格检查: `npm run lint`
3. 测试所有功能正常

---

## 许可证

本项目采用 MIT 许可证。

DouZero 模型版权归快手团队所有。