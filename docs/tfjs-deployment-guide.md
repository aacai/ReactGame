# TensorFlow.js 部署指南

## 已完成的工作

✅ 安装依赖: `@tensorflow/tfjs`
✅ 实现模型加载器: `src/doudizhu/tfjs/model-loader.ts`
✅ 实现 AI 推理类: `src/doudizhu/tfjs/douzero-ai.ts`
✅ 创建统一 AI 管理器: `src/doudizhu/unified-ai.ts`
✅ 创建转换脚本: `scripts/convert_onnx_to_tfjs_simple.py`
✅ 创建测试页面: `public/tfjs-test.html`
✅ 类型检查通过

## 需要完成的步骤

### 步骤 1: 模型转换（必须）

由于当前 Python 环境是 3.14（不支持 TensorFlow），需要使用其他环境转换模型。

#### 方法 A: 使用其他 Python 环境

```bash
# 使用 Python 3.11
python3.11 -m venv tfjs-env
source tfjs-env/bin/activate
pip install onnx onnx-tf tensorflow tensorflowjs
cd xiangqi/scripts
python convert_onnx_to_tfjs_simple.py
```

#### 方法 B: 使用 Docker

创建 `Dockerfile.tfjs`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN pip install onnx onnx-tf tensorflow tensorflowjs

COPY scripts/convert_onnx_to_tfjs_simple.py /app/
COPY public/models/douzero /app/public/models/douzero

CMD ["python", "convert_onnx_to_tfjs_simple.py"]
```

构建并运行:

```bash
cd xiangqi
docker build -f Dockerfile.tfjs -t tfjs-converter .
docker run -v $(pwd)/public/models:/app/public/models tfjs-converter
```

#### 方法 C: 在线转换（备用）

如果上述方法都失败，可以：
1. 在有 TensorFlow 环境的机器上转换
2. 使用云服务器（AWS/GCP/阿里云）临时转换
3. 使用 GitHub Actions 自动转换

### 步骤 2: 验证模型文件

转换完成后，检查文件结构:

```bash
ls -R public/models/tfjs/
```

应该看到:

```
public/models/tfjs/
├── landlord/
│   ├── model.json
│   └── group1-shard*.bin
├── landlord_up/
│   └── ...
└── landlord_down/
    └── ...
```

### 步骤 3: 测试加载

启动开发服务器:

```bash
npm run dev
```

访问测试页面:

```
http://localhost:5173/tfjs-test.html
```

点击"加载模型"，查看是否能成功加载。

### 步骤 4: 集成测试

在实际游戏中测试:

```typescript
// 在游戏代码中添加测试
import { createDouZeroTFJS } from './doudizhu/tfjs';

const ai = createDouZeroTFJS({
  difficulty: 'hard',
  onStateChange: (state) => console.log('TFJS AI 状态:', state),
  onError: (error) => console.error('TFJS AI 错误:', error),
});

try {
  await ai.loadModels();
  console.log('TensorFlow.js AI 加载成功');

  // 测试推理
  const cards = await ai.decidePlay(
    handCards,
    lastPlay,
    position,
    isLandlord,
    partnerRemaining,
    landlordRemaining,
    playHistory,
    landlordPosition
  );

  console.log('AI 推荐出牌:', cards);
} catch (error) {
  console.error('TensorFlow.js AI 测试失败:', error);
}
```

### 步骤 5: 性能对比

对比 ONNX 和 TensorFlow.js 的性能:

```typescript
import { createUnifiedAI } from './doudizhu/unified-ai';

// ONNX
const onnxAI = createUnifiedAI({
  backend: 'onnx',
  difficulty: 'hard',
});

await onnxAI.loadModels();
const startOnnx = performance.now();
const onnxResult = await onnxAI.decidePlay(/* ... */);
const onnxTime = performance.now() - startOnnx;

// TensorFlow.js
const tfjsAI = createUnifiedAI({
  backend: 'tfjs',
  difficulty: 'hard',
});

await tfjsAI.loadModels();
const startTfjs = performance.now();
const tfjsResult = await tfjsAI.decidePlay(/* ... */);
const tfjsTime = performance.now() - startTfjs;

console.log('ONNX 时间:', onnxTime, 'ms');
console.log('TensorFlow.js 时间:', tfjsTime, 'ms');
```

## 故障排除

### 问题 1: 模型加载失败

**原因**: 模型文件不存在或路径错误

**解决**:
1. 确认 `public/models/tfjs/*/model.json` 存在
2. 检查文件路径是否正确
3. 确认 Web 服务器正确提供文件

### 问题 2: 转换脚本失败

**原因**: Python 版本不兼容或缺少依赖

**解决**:
1. 使用 Python 3.8-3.11
2. 安装所有依赖: `pip install onnx onnx-tf tensorflow tensorflowjs`
3. 使用 Docker 容器

### 问题 3: 内存不足

**原因**: TensorFlow.js 模型较大（~60-70MB）

**解决**:
1. 增加浏览器内存限制
2. 使用模型分片加载
3. 考虑使用 ONNX Runtime（内存占用更低）

## 生产部署建议

### 1. 预加载模型

```typescript
// 在应用启动时预加载
const ai = createDouZeroTFJS();
await ai.loadModels();
```

### 2. 缓存策略

```typescript
// 使用 Service Worker 缓存模型文件
// 参考: public/sw.js
```

### 3. 错误处理

```typescript
const ai = createUnifiedAI({
  backend: 'auto',
  onError: (error) => {
    // 上报错误
    console.error('AI 错误:', error);
    // 显示用户友好的错误信息
    showToast('AI 暂时不可用，使用基础策略');
  },
});
```

### 4. 性能监控

```typescript
// 监控推理时间
const startTime = performance.now();
const result = await ai.decidePlay(/* ... */);
const duration = performance.now() - startTime;

if (duration > 1000) {
  console.warn('推理时间过长:', duration, 'ms');
}
```

## 文件清单

### 代码文件
- `src/doudizhu/tfjs/model-loader.ts` - 模型加载器
- `src/doudizhu/tfjs/douzero-ai.ts` - AI 推理类
- `src/doudizhu/tfjs/index.ts` - 模块导出
- `src/doudizhu/unified-ai.ts` - 统一 AI 管理器
- `src/components/TFJSTest.tsx` - 测试组件

### 工具文件
- `scripts/convert_onnx_to_tfjs_simple.py` - 转换脚本
- `public/tfjs-test.html` - 独立测试页面

### 文档文件
- `docs/tfjs-conversion-guide.md` - 转换指南
- `docs/tfjs-implementation-summary.md` - 实现总结
- `docs/tfjs-deployment-guide.md` - 部署指南（本文件）

## 下一步行动

1. **转换模型文件**（最优先）
   - 使用 Python 3.11 或 Docker
   - 运行转换脚本
   - 验证生成的文件

2. **测试功能**
   - 启动开发服务器
   - 访问测试页面
   - 验证加载和推理

3. **性能优化**
   - 对比 ONNX 和 TensorFlow.js
   - 选择最佳后端
   - 配置缓存策略

4. **集成到游戏**
   - 在游戏中使用统一 AI
   - 测试自动降级策略
   - 监控性能指标

## 联系支持

如有问题，请参考:
- 转换指南: `docs/tfjs-conversion-guide.md`
- 实现总结: `docs/tfjs-implementation-summary.md`
- TensorFlow.js 文档: https://www.tensorflow.org/js

祝顺利部署！