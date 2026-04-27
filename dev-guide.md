# 医疗档案管理APP - 开发操作手册

## 同步命令

```bash
# 加载 nvm 环境（每次新终端需要）
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# 同步到所有平台
npm run sync

# 仅同步 Web
npm run sync:www

# 同步并打开 Xcode
npm run sync:ios && npm run open:ios

# 同步并打开 Android Studio
npm run sync:android && npm run open:android
```

## Web 调试

- 统一服务器：`python3 server.py`（端口 8090，同时提供静态文件和 API 代理）
- 访问地址：http://localhost:8090

## 图片上传规范

- 存储：IndexedDB（MedicalAppImages 数据库）
- 压缩：Canvas 压缩到 1200px 宽度，JPEG 质量 0.7
- 文件限制：仅 image/* 类型，单文件不超过 20MB
- 关联：图片 ID 存储在 record.images 数组中

## 项目结构

```
medical-records-app/
├── index.html, styles.css, app.js ...  ← 源码（编辑这些文件）
├── www/                                 ← Web 构建产物（自动同步，勿手动编辑）
├── android/                             ← Android 原生项目（自动同步）
├── ios/                                 ← iOS 原生项目（自动同步）
├── capacitor.config.json                ← Capacitor 配置
├── package.json                         ← 项目依赖和脚本
├── config.js                            ← API 配置（自动区分 Web/App 环境）
├── core.js                              ← 核心业务逻辑（可测试）
├── image-store.js                       ← IndexedDB 图片存储模块
├── ai-service.js                        ← AI 服务封装（双调用架构）
├── app.js                               ← 主应用逻辑
└── server.py                            ← Web 调试用代理服务器
```
