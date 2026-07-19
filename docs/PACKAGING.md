# 打包指南（APK 与桌面软件）

本项目是一个 **Vite + React + TypeScript** 的网页应用，已通过 **Capacitor** 集成 Android 支持，
并通过 **Electron** 支持桌面端（Windows / macOS / Linux）。

本指南说明如何把项目打包成 **Android APK** 和 **桌面软件**。

---

## 一、环境准备

| 工具 | 用途 | 版本建议 |
| --- | --- | --- |
| Node.js | 构建网页 & 桌面 | ≥ 18 LTS |
| npm | 依赖管理 | 随 Node 安装 |
| JDK | 编译 Android | **JDK 17**（Capacitor 6 要求） |
| Android SDK | 编译 APK | 通过 Android Studio 安装 |
| Android Studio | 调试 / 签名 APK | 最新稳定版 |
| Gradle | Android 构建 | 项目自带 `android/gradlew`，无需单独装 |

> 当前你是 macOS，可以打包 **macOS 应用**、**Android APK**。
> 打包 **Windows 安装包** 最好在 Windows 上运行，或用下方“跨平台说明”。

---

## 二、打包 Android APK

### 1. 安装依赖并构建网页
```bash
npm install
npm run build
```
`npm run build` 会执行 `tsc -b && vite build`，产物在 `dist/` 目录。

### 2. 同步到 Android 工程
```bash
npx cap sync android
```
这会把 `dist/` 拷贝进 `android/app/src/main/assets/public`。

### 3. 打包（一条命令完成上面 1+2+ 编译）
项目已内置脚本：
```bash
npm run build:android
```
它等价于：
```bash
npm run build && npx cap sync android && cd android && ./gradlew assembleDebug
```

### 4. 取 APK
- **调试版**：`android/app/build/outputs/apk/debug/app-debug.apk`
- 直接拷到手机安装即可（需开启“允许未知来源”）。

### 5. 打包发布版（带签名，可上架）
调试版不能上架，需要签名。一次性操作：

```bash
# 生成签名密钥（只做一次，妥善保存）
keytool -genkey -v -keystore my-release-key.keystore \
  -alias xiangqi -keyalg RSA -keysize 2048 -validity 10000
```

编辑 `android/app/build.gradle`，在 `android { ... }` 内加入签名配置：
```gradle
signingConfigs {
    release {
        storeFile file('../../my-release-key.keystore')
        storePassword System.getenv('KEYSTORE_PASSWORD')
        keyAlias 'xiangqi'
        keyPassword System.getenv('KEY_PASSWORD')
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

然后构建发布版：
```bash
cd android
export KEYSTORE_PASSWORD=你的密码
export KEY_PASSWORD=你的密码
./gradlew assembleRelease
```
产物：`android/app/build/outputs/apk/release/app-release.apk`

> 密钥文件（`*.keystore`）和 `local.properties` 已默认被 `.gitignore` 忽略，不要提交到仓库。

---

## 三、打包桌面软件（Electron）

桌面端使用 Electron，把 `dist/` 里的网页包成一个原生窗口应用。

### 1. 安装桌面构建依赖
```bash
npm install --save-dev electron electron-builder
```
（`package.json` 里已加入对应脚本与 `build` 配置。）

### 2. 本地预览桌面窗口
```bash
npm run electron:dev
```
会先 `vite build` 再启动 Electron 加载本地文件（无需起 Vite 开发服务器）。
如需热更新开发，可另开一个终端 `npm run dev`，再改脚本连 `http://localhost:5173`。

### 3. 打包成安装包
```bash
# macOS（当前系统，生成 .dmg）
npm run dist:mac

# Windows（生成 .exe 安装包，见下方跨平台说明）
npm run dist:win

# Linux（生成 .AppImage）
npm run dist:linux

# 一次性打包当前系统对应的平台
npm run dist:desktop
```
产物输出在 `release/` 目录。

### Electron 配置说明
`package.json` 中的 `build` 字段（electron-builder 读取）：
```json
"build": {
  "appId": "com.xiangqi.app",
  "productName": "中国象棋",
  "directories": { "output": "release" },
  "files": ["dist/**/*", "electron/**/*"],
  "mac":   { "target": "dmg",   "category": "public.app-category.games" },
  "win":   { "target": "nsis" },
  "linux": { "target": "AppImage", "category": "Game" }
}
```
主进程入口在 `electron/main.cjs`。

> 注意：`vite.config.ts` 已设置 `base: './'`，保证 Electron 用 `file://` 加载时
> 相对路径资源能正确解析（Android 端同样兼容）。

---

## 四、跨平台构建说明

- **macOS 上打包 Windows 安装包**：electron-builder 需要 Wine，
  建议直接在 **Windows 机器** 上跑 `npm run dist:win` 最稳妥。
- **macOS 上打包 Linux**：需要 Docker，较麻烦，建议在 Linux 上构建。
- **通用做法**：在哪个系统发布，就在哪个系统打包对应产物，签名更方便。
- **Android** 不受平台限制，macOS 上即可产出 APK。

---

## 五、常见问题

1. **`npm run build:android` 报 JDK 版本错误**
   → 确认装的是 **JDK 17**，`java -version` 核对；Android Studio 自带的 JDK 可在
   `Android Studio > Settings > SDK Tools` 中安装。

2. **Android SDK 找不到**
   → 运行 `npx cap open android` 让 Android Studio 自动补全 SDK；
   或设置环境变量 `ANDROID_HOME` 指向 SDK 目录。

3. **Electron 打包后白屏**
   → 确认先执行了 `npm run build`（生成 `dist/`），且 `vite.config.ts` 的 `base` 为 `'./'`。

4. **APK 安装后闪退**
   → 用 `npx cap open android` 在 Android Studio 里连真机 / 模拟器查看 Logcat 报错。

---

## 六、使用 GitHub Actions 自动打包

仓库里已包含 `.github/workflows/build.yml`，推送代码后会**自动**在云端打出全部安装包，
无需本地装 Android SDK / 各平台编译环境。

### 工作流做了什么
| Job | 运行环境 | 产物 |
| --- | --- | --- |
| `android` | ubuntu-latest | `app-release.apk`（Android 14 / compileSdk 34） |
| `desktop-macos` | macos-latest | `release/*.dmg` |
| `desktop-windows` | windows-latest | `release/*.exe` |
| `desktop-linux` | ubuntu-latest | `release/*.AppImage` |

> 注意：macOS 包只能在 macOS runner 上构建，Windows 包只能在 Windows runner 上构建，
> 所以用了 4 个并行 job，不能合并到一台机器。

### 怎么用
1. 把代码推到 GitHub（确保含 `.github/workflows/build.yml`、`package.json`、`electron/`、`android/`）。
2. 打开仓库 **Actions** 标签页，工作流会自动运行；也可点 **Run workflow** 手动触发。
3. 在 **Actions → 某次运行 → Artifacts** 处下载对应安装包。

### 打带版本号的正式发布包
给代码打 tag 并推送，会自动创建 GitHub Release 并附上全部安装包：
```bash
git tag v1.0.0
git push origin v1.0.0
```
工作流的 `release` job（仅在 `v*` tag 时）会把 4 个 job 的产物汇总成一个 Release。

### Android 正式签名（上架 Play 商店才需要）
当前 CI 打的是**未签名 release APK**，可安装 / 内部分发，但不能上架。
要签名，请在仓库 **Settings → Secrets and variables → Actions** 添加：
- `ANDROID_KEYSTORE`：把 `my-release-key.keystore` 用 base64 编码后的内容
  （`base64 -i my-release-key.keystore`）
- `KEYSTORE_PASSWORD`、`KEY_PASSWORD`、`KEY_ALIAS`

然后在 `android/app/build.gradle` 里加入读取这些 secret 的签名配置（参考「二.5」），
并把 `build.yml` 的 `Build release APK` 步骤前加上导出环境变量：
```yaml
env:
  KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
  KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
```

### 桌面端代码签名（可选）
- **macOS**：要让用户免“无法验证开发者”提示，需要 Apple Developer 证书，
  作为 secret（`CSC_LINK` / `CSC_KEY_PASSWORD`）注入，electron-builder 会自动签名 + 公证。
- **Windows**：同理用 `CSC_LINK` 注入 EV 代码签名证书，去掉 SmartScreen 警告。
未签名也能正常构建和安装，仅会有系统安全提示。

---

## 七、快速命令速查

| 目标 | 命令 |
| --- | --- |
| 构建网页 | `npm run build` |
| 打包 Android 调试 APK | `npm run build:android` |
| 打包 Android 发布 APK | `cd android && ./gradlew assembleRelease` |
| 桌面本地预览 | `npm run electron:dev` |
| 桌面 macOS 包 | `npm run dist:mac` |
| 桌面 Windows 包 | `npm run dist:win` |
| 桌面 Linux 包 | `npm run dist:linux` |
