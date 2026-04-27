# 医疗档案管理APP - 项目规则

## 项目概述
医疗档案（com.medical.records）— Capacitor 壳应用，目标平台 iOS + Android

## 技术栈
前端：纯 HTML + CSS + JavaScript（无框架）| localStorage + IndexedDB | Capacitor 6+
后端：Node.js + Express | DeepSeek API（后端代理，Key不暴露前端）

## 开发规则

### 必须遵守
1. **代码修改后自动同步**：每次修改源码后，必须执行 `npm run sync` 同步到 www + iOS + Android
2. **源码编辑位置**：只编辑根目录的源码文件，不要直接编辑 www/、android/、ios/ 下的文件
3. **API 配置**：config.js 不含 API Key，前端通过后端代理调用 AI（Web 走 /api/ai，App 直连后端服务器），不要硬编码 API 地址和 Key
4. **代码风格**：不添加注释（除非用户要求）；使用 ES5 语法（var、function）兼容性
5. **测试**：test.html 为浏览器端测试页面，新增功能需同步更新测试用例
6. **语言**：所有用户可见文本（包括思考和推理过程）使用中文；代码变量名使用英文
7. **文档同步**：当产品功能交互发生新增、删除或修改时，必须同步更新以下文档：
   - `feature_design.md`（PRD - 产品需求文档）
   - `technical_design.md`（TRD - 技术设计文档）
   - `test.html`（测试用例）

### 功能修改标准流程
每次功能修改完成后，必须按以下流程逐项执行，不可跳过：

1. **代码修改** → 完成功能代码编写
2. **同步构建** → 执行 `npm run sync:www`（或 `npm run sync`）
3. **规则检查** → 逐条核对"必须遵守"规则是否全部满足：
   - [ ] 是否执行了同步命令？
   - [ ] 是否只编辑了根目录源码文件？
   - [ ] 是否遵守了代码风格（无注释、ES5语法）？
   - [ ] 是否使用中文（包括推理过程）？
   - [ ] 功能变更是否同步更新了 PRD / TRD / 测试用例？
4. **确认完成** → 所有检查项通过后，方可标记任务完成

### AI 服务架构
- 双调用架构：对话调用（自然语言回复）+ 记录提取调用（结构化 JSON）
- 前端通过后端代理调用 DeepSeek API，API Key 存储在后端 server/.env 中
- 对话使用流式响应（stream: true），实现打字机效果
- 记录提取使用非流式响应（stream: false, temperature: 0.1）
- AI 不可用时自动降级到本地模式（core.js 中的 MedicalApp 方法）
- 后端 API 路由：/api/ai/chat（对话）、/api/ai/extract（记录提取）
- 启动后端：`cd server && node src/app.js`（端口 3000）

### UI 设计规范
- 深色模式，琥珀黄强调色（#F59E0B）
- 背景色层级：#131720 → #1E2532 → #2A313E
- 圆角系统：2px / 16px / 20px / 24px / 9999px
- 字体颜色：#FFFFFF / #F1D5F9 / #94A3B8
- **禁止撞色**：修改任何元素的颜色（背景色/文字色/边框色）时，必须验证文字与背景的对比度。深色背景必须用浅色文字（#FFFFFF/#F1D5F9/#94A3B8），浅色/强调色背景必须用深色文字（#0F172A）。绝对禁止深色文字配深色背景
