# 多棋类博弈游戏平台

一个集成多种棋类和博弈游戏的现代化 Web 应用，支持 Web、Android 和 iOS 全端部署。
xattr -cr "/Applications/中国象棋.app" && open "/Applications/中国象棋.app"


## 🎮 支持的游戏

- **中国象棋** - 经典中国象棋，支持人机对战和在线对战
- **斗地主** - 集成 DouZero AI 的智能斗地主游戏
- **将棋** - 日本将棋
- **国际象棋** - 标准国际象棋
- **军棋** - 中国军棋
- **围棋** - 经典围棋
- **五子棋** - 连珠五子棋
- **黑白棋** - Othello/Reversi
- **四子棋** - Connect 4
- **Roguelike** - 卡牌 Roguelike 游戏

## 🤖 DouZero AI 技术

### 技术架构

本项目集成了完整的 DouZero 深度学习 AI，提供三级推理方案：

1. **ONNX Runtime Web** ⭐⭐⭐⭐⭐ （推荐）
   - ✅ 模型文件已存在
   - ✅ 性能最优
   - ✅ 内存占用低
   - ✅ 支持全端部署

2. **TensorFlow.js** ⭐⭐⭐⭐
   - ✅ 官方支持
   - ✅ 社区活跃
   - ⚠️ 需要模型转换

3. **启发式 AI** ⭐⭐⭐
   - ✅ 无需模型
   - ✅ 即时运行
   - ⚠️ AI 强度有限

### AI 性能指标

| 指标 | ONNX Runtime | TensorFlow.js | 启发式 AI |
|------|-------------|---------------|-----------|
| 加载时间 | 5-15 秒 | 3-8 秒 | 即时 |
| 推理时间 | 50-200 ms | 100-500 ms | 1-5 ms |
| 内存占用 | 100-150 MB | 150-250 MB | <1 MB |
| 准确率 | 95%+ | 95%+ | 70-80% |

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5176/`

### 构建生产版本

```bash
npm run build
```

### 类型检查

```bash
npm run check
```

## 📱 移动端打包

### Android

```bash
# 构建 Web 应用
npm run build

# 同步到 Android
npx cap sync android

# 打开 Android Studio
npx cap open android

# 或直接构建 APK
cd android && ./gradlew assembleDebug
```

APK 位置：`android/app/build/outputs/apk/debug/app-debug.apk`

### iOS

```bash
# 构建 Web 应用
npm run build

# 同步到 iOS
npx cap sync ios

# 打开 Xcode
npx cap open ios

# 在 Xcode 中构建和签名
```

## 📁 项目结构

```
xiangqi/
├── public/
│   ├── models/
│   │   ├── douzero/              # ONNX 模型文件
│   │   └── tfjs/                 # TensorFlow.js 模型（可选）
│   └── wasm/                     # ONNX Runtime WASM
├── src/
│   ├── doudizhu/
│   │   ├── onnx/                 # ONNX AI 实现
│   │   ├── tfjs/                 # TensorFlow.js 实现
│   │   ├── game/                 # 游戏逻辑
│   │   └── components/           # UI 组件
│   ├── games/                    # 其他棋类游戏
│   └── components/               # 共享组件
├── docs/                         # 详细文档
└── scripts/                      # 工具脚本
```

## 📚 文档

- [快速开始指南](./docs/QUICK-START.md) - 5 分钟快速体验
- [完整部署指南](./docs/full-platform-deployment-guide.md) - Web + Android + iOS 全端部署
- [验证测试指南](./docs/verification-guide.md) - 功能和性能测试
- [DouZero 集成指南](./docs/douzero-integration-guide.md) - AI 模型集成详解
- [TensorFlow.js 转换指南](./docs/tfjs-conversion-guide.md) - 模型转换步骤

## 🛠️ 技术栈

### 前端框架
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架

### AI 推理
- **ONNX Runtime Web** - 推荐的推理引擎
- **TensorFlow.js** - 备选推理引擎

### 移动端
- **Capacitor** - 跨平台移动应用框架
- **Capacitor Android/iOS** - 原生平台支持

### 状态管理
- **Zustand** - 轻量级状态管理

### 其他
- **Framer Motion** - 动画库
- **Lucide React** - 图标库

## 🔧 开发

### 代码风格

```bash
npm run lint
```

### 类型检查

```bash
npm run check
```

### 构建检查

```bash
npm run build
```

## 🧪 测试

### 手动测试

1. 启动开发服务器：`npm run dev`
2. 访问 `http://localhost:5176/`
3. 测试各个游戏功能
4. 检查控制台日志

### 性能测试

- 使用 Chrome DevTools Performance 标签
- 监控 FPS、CPU、内存使用
- 参考 [验证测试指南](./docs/verification-guide.md)

## 🐛 故障排除

### 模型加载失败

**症状：** 控制台显示 "Failed to load model"

**解决方案：**
```bash
# 检查模型文件
ls -lh public/models/douzero/

# 检查 WASM 文件
ls -lh public/wasm/
```

### Android 打包失败

**症状：** Gradle 构建错误

**解决方案：**
```bash
# 清理构建
cd android
./gradlew clean

# 重新同步
npx cap sync android
```

### 推理速度慢

**症状：** AI 思考时间 > 1 秒

**解决方案：**
- 关闭其他浏览器标签
- 检查是否使用 WebGL 加速
- 尝试降低难度级别

## 📊 性能优化

### 已实现的优化

- ✅ 模型懒加载
- ✅ WASM SIMD 加速
- ✅ 资源压缩
- ✅ 代码分割
- ✅ Tree shaking

### 建议的优化

- 使用 CDN 加速模型文件加载
- 实现 Service Worker 缓存
- 使用 Web Worker 进行 AI 推理
- 实现模型预加载策略

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

## 📄 许可证

本项目仅供学习和研究使用。

## 🙏 致谢

- [DouZero](https://github.com/kwai/DouZero) - 斗地主 AI 模型
- [ONNX Runtime](https://onnxruntime.ai/) - 高性能推理引擎
- [TensorFlow.js](https://www.tensorflow.org/js) - 机器学习框架
- [Capacitor](https://capacitorjs.com/) - 跨平台解决方案

---

**Made with ❤️ by the Xiangqi Team**