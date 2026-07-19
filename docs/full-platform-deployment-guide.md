# DouZero AI 全端部署指南

## 📋 概述

本项目提供完整的 DouZero AI 全端部署方案，支持 **Web + Android + iOS** 三端运行。

### 方案选择

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **ONNX Runtime Web** | ✅ 已有模型文件<br>✅ 性能最优<br>✅ 内存占用低<br>✅ 无需转换 | ❌ 需要配置 WASM | ⭐⭐⭐⭐⭐ |
| **TensorFlow.js** | ✅ 官方支持<br>✅ 社区活跃 | ❌ 需要转换模型<br>❌ Python 3.11 环境<br>❌ 内存占用较高 | ⭐⭐⭐⭐ |
| **启发式 AI** | ✅ 无需模型<br>✅ 即时运行<br>✅ 零依赖 | ❌ AI 强度有限 | ⭐⭐⭐ |

**推荐方案：ONNX Runtime Web（已实现并可用）**

---

## 🏗️ 项目架构

```
xiangqi/
├── public/
│   ├── models/
│   │   ├── douzero/              # ONNX 模型文件（已存在）
│   │   │   ├── landlord.onnx
│   │   │   ├── landlord.onnx.data
│   │   │   ├── landlord_up.onnx
│   │   │   ├── landlord_up.onnx.data
│   │   │   ├── landlord_down.onnx
│   │   │   └── landlord_down.onnx.data
│   │   └── tfjs/                 # TensorFlow.js 模型（需要转换）
│   │       ├── landlord/
│   │       ├── landlord_up/
│   │       └── landlord_down/
│   └── wasm/                     # ONNX Runtime WASM 文件
├── src/
│   └── doudizhu/
│       ├── onnx/                 # ONNX Runtime 实现
│       │   ├── douzero-ai.ts
│       │   ├── model-loader.ts
│       │   ├── state-encoder.ts
│       │   └── action-decoder.ts
│       ├── tfjs/                 # TensorFlow.js 实现
│       │   ├── douzero-ai.ts
│       │   ├── model-loader.ts
│       │   └── index.ts
│       └── unified-ai.ts         # 统一 AI 管理器
├── capacitor.config.ts           # Capacitor 配置
└── android/                      # Android 项目
```

---

## 🚀 方案一：ONNX Runtime Web（推荐）

### 1. 模型文件

✅ **已存在**，位于 `public/models/douzero/` 目录：

```bash
ls -lh public/models/douzero/
# landlord.onnx        (~15 MB)
# landlord.onnx.data   (~50 MB)
# landlord_up.onnx     (~15 MB)
# landlord_up.onnx.data (~50 MB)
# landlord_down.onnx   (~15 MB)
# landlord_down.onnx.data (~50 MB)
```

### 2. 依赖安装

```bash
npm install onnxruntime-web
```

已在 `package.json` 中安装：
```json
{
  "dependencies": {
    "onnxruntime-web": "^1.27.0"
  }
}
```

### 3. 使用方法

```typescript
import { createDouZeroAI } from './doudizhu/onnx';

// 创建 AI 实例
const ai = createDouZeroAI({
  difficulty: 'hard',
  useGPU: false,  // 移动端建议 false
  onStateChange: (state) => {
    console.log('AI 状态:', state);
  },
  onProgress: (model, progress) => {
    console.log(`加载 ${model}: ${progress.percentage}%`);
  },
});

// 加载模型
await ai.loadModels();

// AI 决策
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

### 4. 自动降级策略

系统已实现三级降级策略：

```
ONNX Runtime Web → TensorFlow.js → 启发式 AI
```

使用统一 AI 管理器：

```typescript
import { createUnifiedAI } from './doudizhu/unified-ai';

const ai = createUnifiedAI({
  backend: 'auto',  // 自动选择最佳后端
  difficulty: 'hard',
  onBackendChange: (backend) => {
    console.log('当前后端:', backend);
  },
});

await ai.loadModels();
```

---

## 🔧 方案二：TensorFlow.js

### 前置要求

⚠️ **重要：TensorFlow 不支持 Python 3.14，需要 Python 3.8-3.11**

### 方法 A：使用 Python 3.11 环境

```bash
# 创建虚拟环境
python3.11 -m venv tfjs-env

# 激活虚拟环境
source tfjs-env/bin/activate  # macOS/Linux
# 或
tfjs-env\Scripts\activate     # Windows

# 安装依赖
pip install onnx==1.15.0 \
            onnx-tf==1.10.0 \
            tensorflow==2.15.0 \
            tensorflowjs==4.22.0 \
            protobuf==3.20.3

# 运行转换脚本
cd xiangqi/scripts
python convert_onnx_to_tfjs_simple.py
```

### 方法 B：使用 Docker（推荐）

如果本地 Python 版本不兼容，使用 Docker：

```bash
# 构建镜像
cd xiangqi
docker build -f Dockerfile.tfjs-converter -t douzero-tfjs-converter .

# 运行转换
docker run -v $(pwd)/public/models:/app/public/models douzero-tfjs-converter
```

### 验证转换结果

```bash
# 检查生成的文件
ls -R public/models/tfjs/

# 应该看到：
# public/models/tfjs/
# ├── landlord/
# │   ├── model.json
# │   └── group1-shard*.bin
# ├── landlord_up/
# └── landlord_down/
```

### 使用方法

```typescript
import { createDouZeroTFJS } from './doudizhu/tfjs';

const ai = createDouZeroTFJS({
  difficulty: 'hard',
  onStateChange: (state) => {
    console.log('TFJS AI 状态:', state);
  },
});

await ai.loadModels();
```

---

## 📱 移动端打包（Capacitor）

### 1. 安装依赖

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios
```

### 2. 初始化 Capacitor（已配置）

配置文件：`capacitor.config.ts`

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xiangqi.app',
  appName: '中国象棋',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
```

### 3. 构建 Web 应用

```bash
npm run build
```

### 4. Android 打包

```bash
# 同步 Android 项目
npx cap sync android

# 打开 Android Studio
npx cap open android

# 或直接构建 APK
cd android
./gradlew assembleDebug

# APK 位置
# android/app/build/outputs/apk/debug/app-debug.apk
```

### 5. iOS 打包（需要 macOS）

```bash
# 添加 iOS 平台
npx cap add ios

# 同步 iOS 项目
npx cap sync ios

# 打开 Xcode
npx cap open ios

# 在 Xcode 中构建和签名
```

### 6. 模型文件处理

#### ONNX 模型

将模型文件复制到 Android/iOS 资源目录：

```bash
# Android
cp -r public/models/douzero android/app/src/main/assets/models/

# iOS
# 在 Xcode 中添加模型文件到项目
```

#### TensorFlow.js 模型

```bash
# 构建时会自动包含
npm run build
npx cap sync
```

---

## 🧪 测试验证

### 1. Web 端测试

启动开发服务器：

```bash
npm run dev
```

访问：
- 主应用：`http://localhost:5176/`
- 斗地主：点击菜单中的"斗地主"
- TensorFlow.js 测试：`http://localhost:5176/tfjs-test.html`

### 2. 检查模型加载

打开浏览器控制台，查看日志：

```
开始加载 DouZero 模型...
加载 landlord 模型...
✓ landlord 加载成功 (15.2 MB)
加载 landlord_up 模型...
✓ landlord_up 加载成功 (15.1 MB)
加载 landlord_down 模型...
✓ landlord_down 加载成功 (15.3 MB)
✓ 所有模型加载完成
```

### 3. AI 推理测试

在斗地主游戏中：
1. 开始游戏
2. 观察 AI 是否能正常决策
3. 检查推理时间（应该在 100-500ms）

### 4. 性能对比

| 后端 | 加载时间 | 推理时间 | 内存占用 |
|------|---------|---------|---------|
| ONNX Runtime Web | 2-5 秒 | 50-200 ms | 100-150 MB |
| TensorFlow.js | 3-8 秒 | 100-500 ms | 150-250 MB |
| 启发式 AI | 即时 | 1-5 ms | <1 MB |

---

## 📊 性能优化建议

### Web 端

1. **预加载模型**：在应用启动时加载
2. **缓存策略**：使用 Service Worker 缓存模型文件
3. **CDN 加速**：将模型文件部署到 CDN

### 移动端

1. **资源压缩**：使用 Android Asset Compression 或 iOS Asset Catalog
2. **懒加载**：仅在需要时加载模型
3. **内存管理**：及时释放不用的模型

### 通用优化

```typescript
// 使用 Web Worker 进行推理
const worker = new Worker('ai-worker.js');
worker.postMessage({ type: 'predict', data: observation });
worker.onmessage = (e) => {
  const result = e.data;
  // 使用结果
};

// 批量推理
const results = await Promise.all([
  ai.decidePlay(obs1),
  ai.decidePlay(obs2),
  ai.decidePlay(obs3),
]);
```

---

## 🐛 故障排除

### 问题 1：模型加载失败

**症状**：控制台显示 "Failed to load model"

**解决**：
```bash
# 检查文件是否存在
ls -R public/models/douzero/

# 检查文件大小
du -sh public/models/douzero/*.onnx

# 检查 Web 服务器配置
# vite.config.ts 中确保正确配置：
export default defineConfig({
  publicDir: 'public',
  // ...
});
```

### 问题 2：TensorFlow.js 转换失败

**症状**：Python 错误 `ModuleNotFoundError: No module named 'tensorflow'`

**解决**：
```bash
# 确认 Python 版本
python --version  # 应该是 3.8-3.11

# 使用虚拟环境
python3.11 -m venv tfjs-env
source tfjs-env/bin/activate

# 重新安装依赖
pip install tensorflow==2.15.0
```

### 问题 3：Android 打包失败

**症状**：Gradle 错误

**解决**：
```bash
# 清理构建
cd android
./gradlew clean

# 检查 SDK 路径
echo $ANDROID_HOME

# 重新同步
npx cap sync android
```

### 问题 4：iOS 打包失败

**症状**：Xcode 签名错误

**解决**：
1. 在 Xcode 中选择正确的 Team
2. 确保开发者证书有效
3. 检查 Bundle ID 是否冲突

---

## 📚 相关文档

- [ONNX Runtime Web 官方文档](https://onnxruntime.ai/docs/)
- [TensorFlow.js 官方文档](https://www.tensorflow.org/js)
- [Capacitor 官方文档](https://capacitorjs.com/)

### 项目内部文档

- `docs/douzero-quickstart.md` - DouZero 快速开始
- `docs/douzero-model-architecture.md` - 模型架构说明
- `docs/tfjs-conversion-guide.md` - TensorFlow.js 转换指南

---

## ✅ 完成清单

### Web 端
- [x] ONNX 模型文件已存在
- [x] ONNX Runtime Web 代码已实现
- [x] TensorFlow.js 代码已实现
- [x] 统一 AI 管理器已实现
- [x] 开发服务器正常运行

### 移动端
- [x] Capacitor 已配置
- [ ] Android 项目已构建（需在 Android Studio 中完成）
- [ ] iOS 项目已构建（需在 Xcode 中完成）

### 转换
- [ ] TensorFlow.js 模型已转换（可选，当前使用 ONNX）

---

## 🎯 推荐实施步骤

### 立即可用方案（推荐）

1. **使用 ONNX Runtime Web**
   ```bash
   npm run dev
   # 访问 http://localhost:5176/
   # 点击"斗地主"开始游戏
   ```

2. **打包 Android**
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   # 在 Android Studio 中构建 APK
   ```

3. **打包 iOS**
   ```bash
   npm run build
   npx cap sync ios
   npx cap open ios
   # 在 Xcode 中构建 IPA
   ```

### TensorFlow.js 方案（可选）

1. **转换模型**（需要 Python 3.11 环境）
   ```bash
   python3.11 -m venv tfjs-env
   source tfjs-env/bin/activate
   pip install -r requirements.txt
   python scripts/convert_onnx_to_tfjs_simple.py
   ```

2. **测试 TensorFlow.js**
   ```bash
   npm run dev
   # 访问 http://localhost:5176/tfjs-test.html
   ```

---

## 📞 技术支持

如有问题，请检查：
1. 浏览器控制台日志
2. 模型文件是否完整
3. 依赖版本是否匹配

---

**版本：** v1.0.0
**最后更新：** 2026-07-19
**维护者：** 项目团队