# DouZero AI 快速开始

## 🎯 5 分钟快速体验

### 1. 启动开发服务器

```bash
cd xiangqi
npm run dev
```

### 2. 访问应用

浏览器自动打开：`http://localhost:5176/`

### 3. 进入斗地主

点击主菜单中的 **"斗地主"** 按钮

### 4. 开始游戏

1. 选择难度（简单/普通/困难）
2. 点击"开始游戏"
3. 等待模型加载（首次加载约 10-30 秒）
4. 观察控制台日志：
   ```
   开始加载 DouZero 模型...
   加载 landlord 模型...
   ✓ landlord 加载成功
   加载 landlord_up 模型...
   ✓ landlord_up 加载成功
   加载 landlord_down 模型...
   ✓ landlord_down 加量成功
   ✓ 所有模型加载完成
   ```

### 5. 测试 AI

- 观察电脑玩家的出牌决策
- 检查推理速度（控制台会显示推理时间）
- 测试不同难度级别

## 🔧 故障排除

### 问题：模型加载失败

**解决方案：**

1. 检查控制台错误信息
2. 确认 `public/models/douzero/` 目录存在
3. 验证模型文件完整性：
   ```bash
   ls -lh public/models/douzero/
   # 应该看到 6 个文件（每个模型 2 个文件）
   ```

### 问题：推理时间过长

**解决方案：**

1. 检查是否使用 WebGL 加速
2. 关闭浏览器其他标签页
3. 使用 Chrome/Edge 等现代浏览器

### 问题：内存不足

**解决方案：**

1. 刷新页面释放内存
2. 使用更低的难度级别
3. 关闭其他应用程序

## 📊 性能基准

### 正常性能指标

- **模型加载时间：** 5-15 秒
- **首次推理时间：** 100-300 ms
- **后续推理时间：** 50-150 ms
- **内存占用：** 100-200 MB

### 异常情况

- 加载时间 > 30 秒：网络或文件问题
- 推理时间 > 1000 ms：性能问题
- 内存占用 > 300 MB：内存泄漏

## 🎮 游戏控制

### 快捷键

- `空格` - 自动出牌
- `R` - 重新开始
- `ESC` - 返回菜单

### AI 级别

- **简单：** 基础启发式算法
- **普通：** 中等强度 AI
- **困难：** DouZero 深度学习模型

## 📱 移动端测试

### Android

```bash
npm run build:android
# APK 位置：android/app/build/outputs/apk/debug/app-debug.apk
```

### iOS

```bash
npm run build
npx cap sync ios
npx cap open ios
# 在 Xcode 中运行
```

## 📸 验证截图

### 应该看到的界面

1. **主菜单：** 显示"斗地主"选项
2. **游戏界面：** 显示三个玩家、手牌、出牌区
3. **模型加载：** 显示加载进度
4. **AI 决策：** 电脑玩家正常出牌

### 控制台日志

打开浏览器开发者工具（F12），查看：

```
✓ ONNX Runtime Web 加载成功
✓ 所有模型加载完成
AI 推理时间: 85ms
```

## 🚀 下一步

1. 阅读 [完整部署指南](./full-platform-deployment-guide.md)
2. 了解 [模型架构](./douzero-model-architecture.md)
3. 尝试 [TensorFlow.js 方案](./tfjs-conversion-guide.md)

---

**祝游戏愉快！** 🎉