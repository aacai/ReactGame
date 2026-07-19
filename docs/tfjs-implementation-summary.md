# TensorFlow.js 全端集成方案 - 实现总结

## 已完成的工作

### 1. 安装依赖
- ✅ 安装 `@tensorflow/tfjs`
- ✅ 类型检查通过

### 2. 创建转换脚本
- ✅ 创建 `scripts/convert_onnx_to_tfjs_simple.py`
- ✅ 自动化 ONNX → SavedModel → TensorFlow.js 转换流程
- ✅ 包含错误处理和进度显示

### 3. 实现 TensorFlow.js 模块
- ✅ `src/doudizhu/tfjs/model-loader.ts` - 模型加载器
- ✅ `src/doudizhu/tfjs/douzero-ai.ts` - AI 推理类
- ✅ `src/doudizhu/tfjs/index.ts` - 模块导出

### 4. 创建统一 AI 管理器
- ✅ `src/doudizhu/unified-ai.ts` - 自动选择 ONNX 或 TensorFlow.js
- ✅ 实现自动降级策略
- ✅ 统一接口设计

### 5. 创建测试和文档
- ✅ `public/tfjs-test.html` - 独立测试页面
- ✅ `docs/tfjs-conversion-guide.md` - 详细转换指南
- ✅ 提供多种转换方法（自动脚本、手动、Docker）

## 代码结构

```
xiangqi/
├── src/
│   └── doudizhu/
│       ├── onnx/              # ONNX Runtime 实现（已有）
│       │   ├── douzero-ai.ts
│       │   ├── model-loader.ts
│       │   └── ...
│       ├── tfjs/              # TensorFlow.js 实现（新增）
│       │   ├── douzero-ai.ts
│       │   ├── model-loader.ts
│       │   └── index.ts
│       └── unified-ai.ts      # 统一 AI 管理器
├── scripts/
│   └── convert_onnx_to_tfjs_simple.py  # 转换脚本
├── public/
│   └── tfjs-test.html         # 测试页面
└── docs/
    └── tfjs-conversion-guide.md  # 转换指南
```

## 使用方法

### 方法一：直接使用 TensorFlow.js

```typescript
import { createDouZeroTFJS } from './doudizhu/tfjs';

const ai = createDouZeroTFJS({
  difficulty: 'hard',
  onStateChange: (state) => console.log('状态:', state),
});

await ai.loadModels();
const cards = await ai.decidePlay(/* 参数 */);
```

### 方法二：使用统一 AI（推荐）

```typescript
import { createUnifiedAI } from './doudizhu/unified-ai';

const ai = createUnifiedAI({
  backend: 'auto',  // 自动选择
  difficulty: 'hard',
  onBackendChange: (backend) => console.log('使用:', backend),
});

await ai.loadModels();
const cards = await ai.decidePlay(/* 参数 */);
```

### 方法三：测试页面

1. 启动开发服务器: `npm run dev`
2. 访问: `http://localhost:5173/tfjs-test.html`
3. 点击"加载模型"测试

## 模型转换步骤

### 前置要求
- Python 3.8-3.11（Python 3.14 不支持 TensorFlow）

### 方法一：自动脚本（推荐）

```bash
cd xiangqi/scripts
python3.11 -m venv tfjs-env
source tfjs-env/bin/activate
pip install onnx onnx-tf tensorflow tensorflowjs
python convert_onnx_to_tfjs_simple.py
```

### 方法二：Docker（跨平台）

```bash
docker build -t tfjs-converter .
docker run -v $(pwd)/public:/app/public tfjs-converter
```

## 特性

### 1. 自动降级策略
- TensorFlow.js 加载失败 → 降级到启发式 AI
- 保证系统高可用性

### 2. 统一接口
- ONNX Runtime 和 TensorFlow.js 共享相同接口
- 无需修改业务代码

### 3. 灵活配置
- 可指定后端: `onnx`、`tfjs`、`auto`
- 运行时动态切换

### 4. 完整文档
- 详细转换指南
- 多种转换方法
- 常见问题解答

## 性能对比

| 后端 | 加载时间 | 推理速度 | 内存占用 | 兼容性 |
|------|---------|---------|---------|--------|
| ONNX Runtime Web | 快 | 快 | 低 | 好 |
| TensorFlow.js | 中 | 中 | 中 | 好 |
| 启发式 AI | 即时 | 即时 | 极低 | 完美 |

## 下一步

1. **转换模型**（必须）
   - 运行转换脚本生成 TensorFlow.js 模型文件
   - 参考 `docs/tfjs-conversion-guide.md`

2. **测试功能**
   - 使用测试页面验证加载和推理
   - 对比 ONNX 和 TensorFlow.js 性能

3. **选择后端**
   - 生产环境: ONNX Runtime（更快）
   - 开发/测试: TensorFlow.js（备选）
   - 自动模式: 优先 ONNX，自动降级

4. **优化配置**
   - 根据实际性能调整后端选择
   - 配置缓存策略
   - 监控内存使用

## 注意事项

1. **Python 版本**
   - TensorFlow 需要 Python 3.8-3.11
   - 当前环境 Python 3.14 不支持
   - 建议使用虚拟环境或 Docker

2. **模型文件**
   - ONNX 模型已存在: `public/models/douzero/*.onnx`
   - TensorFlow.js 模型需要转换: `public/models/tfjs/*/model.json`

3. **性能考虑**
   - TensorFlow.js 模型文件较大（~60-70MB）
   - 首次加载较慢，建议预加载
   - 可使用 Service Worker 缓存

## 相关文件

- 转换脚本: `xiangqi/scripts/convert_onnx_to_tfjs_simple.py`
- 转换指南: `xiangqi/docs/tfjs-conversion-guide.md`
- 测试页面: `xiangqi/public/tfjs-test.html`
- TensorFlow.js 模块: `xiangqi/src/doudizhu/tfjs/`
- 统一 AI: `xiangqi/src/doudizhu/unified-ai.ts`

## 总结

已成功实现 TensorFlow.js 全端集成方案：
- ✅ 完整的模型加载和推理代码
- ✅ 自动降级策略
- ✅ 统一接口设计
- ✅ 详细文档和测试工具

下一步需要转换模型文件并在浏览器中测试推理功能。