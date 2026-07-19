# TensorFlow.js 模型转换指南

本文档详细说明如何将 DouZero ONNX 模型转换为 TensorFlow.js 格式，以便在浏览器中运行。

## 转换流程概述

```
ONNX (.onnx)
    ↓ [onnx-tf]
SavedModel (TensorFlow)
    ↓ [tensorflowjs_converter]
TensorFlow.js (model.json + weights)
```

## 方法一：使用自动化脚本（推荐）

### 前置要求

1. **Python 3.8-3.11**（Python 3.14 不支持 TensorFlow）
2. 安装依赖

### 安装步骤

#### macOS/Linux

```bash
# 创建 Python 虚拟环境（Python 3.8-3.11）
python3.11 -m venv tfjs-env

# 激活虚拟环境
source tfjs-env/bin/activate

# 安装依赖
pip install onnx onnx-tf tensorflow tensorflowjs
```

#### Windows

```cmd
rem 创建 Python 虚拟环境
python -m venv tfjs-env

rem 激活虚拟环境
tfjs-env\Scripts\activate

rem 安装依赖
pip install onnx onnx-tf tensorflow tensorflowjs
```

### 运行转换脚本

```bash
cd xiangqi/scripts
source venv/bin/activate  # 如果已有虚拟环境
python convert_onnx_to_tfjs_simple.py
```

转换完成后，模型文件将生成在 `public/models/tfjs/` 目录下：

```
public/models/tfjs/
├── landlord/
│   ├── model.json
│   └── group1-shard*.bin
├── landlord_up/
│   ├── model.json
│   └── group1-shard*.bin
└── landlord_down/
    ├── model.json
    └── group1-shard*.bin
```

## 方法二：手动转换（详细步骤）

如果自动脚本失败，可以手动执行以下步骤：

### 步骤 1: ONNX → SavedModel

```bash
# 安装依赖
pip install onnx onnx-tf tensorflow

# 转换每个模型
python -c "
import onnx
from onnx_tf.backend import prepare
import sys

model_name = 'landlord'  # 或 'landlord_up', 'landlord_down'
onnx_path = f'../public/models/douzero/{model_name}.onnx'
savedmodel_path = f'../public/models/savedmodel/{model_name}'

onnx_model = onnx.load(onnx_path)
tf_rep = prepare(onnx_model)
tf_rep.export_graph(savedmodel_path)
print(f'✓ {model_name} 转换完成')
"
```

### 步骤 2: SavedModel → TensorFlow.js

```bash
# 安装 tensorflowjs
pip install tensorflowjs

# 转换每个模型
tensorflowjs_converter \
  --input_format=tf_saved_model \
  --output_format=tfjs_graph_model \
  public/models/savedmodel/landlord \
  public/models/tfjs/landlord

# 对其他模型重复相同操作
tensorflowjs_converter \
  --input_format=tf_saved_model \
  --output_format=tfjs_graph_model \
  public/models/savedmodel/landlord_up \
  public/models/tfjs/landlord_up

tensorflowjs_converter \
  --input_format=tf_saved_model \
  --output_format=tfjs_graph_model \
  public/models/savedmodel/landlord_down \
  public/models/tfjs/landlord_down
```

## 方法三：使用 Docker（跨平台）

如果本地 Python 环境有问题，可以使用 Docker：

### 创建 Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN pip install onnx onnx-tf tensorflow tensorflowjs

COPY scripts/convert_onnx_to_tfjs_simple.py /app/

CMD ["python", "convert_onnx_to_tfjs_simple.py"]
```

### 构建并运行

```bash
# 构建镜像
docker build -t tfjs-converter .

# 运行转换
docker run -v $(pwd)/public:/app/public tfjs-converter
```

## 验证转换结果

### 1. 检查文件结构

```bash
ls -R public/models/tfjs/
```

应该看到：
- 每个模型目录下有 `model.json`
- 每个模型目录下有至少一个 `.bin` 文件（权重）

### 2. 检查模型大小

```bash
du -sh public/models/tfjs/*
```

预期大小：
- landlord: ~15-20 MB
- landlord_up: ~15-20 MB
- landlord_down: ~15-20 MB

### 3. 在浏览器中测试

打开浏览器控制台，运行：

```javascript
import * as tf from '@tensorflow/tfjs';

// 测试加载模型
const model = await tf.loadGraphModel('/models/tfjs/landlord/model.json');
console.log('✓ TensorFlow.js 模型加载成功');
console.log('输入:', model.inputs);
console.log('输出:', model.outputs);
```

## 使用 TensorFlow.js AI

转换完成后，可以在代码中使用 TensorFlow.js AI：

```typescript
import { createDouZeroTFJS } from './doudizhu/tfjs';

// 创建 TensorFlow.js AI
const ai = createDouZeroTFJS({
  difficulty: 'hard',
  onStateChange: (state) => {
    console.log('AI 状态:', state);
  },
});

// 加载模型
await ai.loadModels();

// 使用 AI 决策
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
```

## 使用统一 AI（自动选择后端）

```typescript
import { createUnifiedAI } from './doudizhu/unified-ai';

// 创建统一 AI（自动选择 ONNX 或 TensorFlow.js）
const ai = createUnifiedAI({
  backend: 'auto',  // 或 'onnx', 'tfjs'
  difficulty: 'hard',
  onBackendChange: (backend) => {
    console.log('使用后端:', backend);
  },
});

// 加载模型
await ai.loadModels();

// 使用 AI
const cards = await ai.decidePlay(/* 参数 */);
```

## 常见问题

### Q: Python 3.14 不支持 TensorFlow？

A: 是的，TensorFlow 目前最高支持 Python 3.11。请使用 Python 3.8-3.11。

### Q: 转换失败：`onnx-tf` 错误？

A: 确保：
1. ONNX 模型文件完整（包括 `.onnx.data`）
2. `onnx-tf` 版本与 TensorFlow 版本匹配

### Q: TensorFlow.js 加载失败？

A: 检查：
1. 模型文件路径是否正确
2. Web 服务器是否正确提供文件
3. 浏览器控制台是否有错误信息

### Q: 模型推理速度慢？

A: TensorFlow.js 会自动使用 WebGL 加速。如果仍然慢：
1. 确保使用支持 WebGL 的浏览器
2. 检查是否有 GPU 硬件加速
3. 尝试使用 ONNX Runtime Web（可能更快）

## 性能对比

| 后端 | 加载时间 | 推理时间 | 内存占用 | 兼容性 |
|------|---------|---------|---------|--------|
| ONNX Runtime Web | 快 | 快 | 低 | 好 |
| TensorFlow.js | 中 | 中 | 中 | 好 |
| 启发式 AI | 即时 | 即时 | 极低 | 完美 |

建议：
- 生产环境：优先使用 ONNX Runtime Web
- 开发环境：TensorFlow.js 作为备选
- 降级策略：启发式 AI 作为兜底

## 下一步

1. 转换模型
2. 测试 TensorFlow.js AI
3. 对比性能
4. 选择最佳后端

如有问题，请查看项目文档或提交 Issue。