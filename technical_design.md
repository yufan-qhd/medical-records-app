# 医疗档案管理APP — 技术需求文档（TRD）

> 版本：v1.0  
> 更新日期：2026-04-09  
> 关联文档：feature_design.md（PRD & 功能设计）

---

## 一、系统架构

### 1.1 整体架构

```
┌──────────────────────────────────────────────────────────────┐
│                    浏览器 / Capacitor                           │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│ index.html│ styles.css│  app.js  │api-service│sync-service    │
│  页面结构  │  视觉样式  │ 业务逻辑  │ API服务层  │ 数据同步层      │
├──────────┴──────────┴──────────┼──────────┴─────────────────┤
│              Web Speech API     │    localStorage + IndexedDB │
├─────────────────────────────────┼────────────────────────────┤
│         ai-service.js          │      Node.js 后端            │
│     （调用后端API，不存Key）      │   server/src/app.js         │
│                                │   ├─ /api/auth (注册/登录)    │
│                                │   ├─ /api/records (CRUD)     │
│                                │   ├─ /api/sync (数据同步)     │
│                                │   ├─ /api/ai/chat, extract   │
│                                │   └─ /api/audit (审计日志)    │
│                                │   SQLite + JWT + bcrypt      │
└─────────────────────────────────┴────────────────────────────┘
```

### 1.2 文件职责

| 文件 | 职责 | 依赖 |
|------|------|------|
| `index.html` | 页面结构、DOM元素定义 | styles.css, app.js |
| `styles.css` | 视觉样式、动画、响应式 | CSS变量系统 |
| `config.js` | API配置，自动区分Web/App环境（不含API Key） | — |
| `core.js` | 核心业务逻辑（本地降级模式） | — |
| `image-store.js` | IndexedDB图片存储模块 | IndexedDB API |
| `api-service.js` | 后端API服务封装（认证/记录/同步） | config.js |
| `sync-service.js` | 数据同步服务（pull/push/自动同步/离线缓存） | api-service.js |
| `ai-service.js` | AI服务封装（对话+记录提取双调用，通过后端代理） | config.js |
| `app.js` | 主应用逻辑、事件处理、数据管理 | core.js, ai-service.js, api-service.js, sync-service.js, image-store.js |
| `server/src/app.js` | Node.js后端入口，静态文件+API路由 | express, cors, dotenv |
| `server/src/routes/auth.js` | 用户认证路由（手机号验证码登录/微信登录/个人信息） | user model |
| `server/src/routes/records.js` | 医疗记录CRUD路由 | record model, auth middleware |
| `server/src/routes/sync.js` | 数据同步路由（pull/push） | record model, auth middleware |
| `server/src/routes/ai.js` | AI代理路由（/api/ai/chat, /api/ai/extract） | deepseek service |
| `server/src/routes/audit.js` | 审计日志路由 | audit model, auth middleware |
| `server/src/models/database.js` | SQLite数据库初始化+表结构 | better-sqlite3 |
| `server/src/models/user.js` | 用户模型（手机号登录/微信登录/JWT） | bcryptjs, jsonwebtoken |
| `server/src/models/record.js` | 医疗记录模型（CRUD/upsert/同步查询） | database.js |
| `server/src/models/audit.js` | 审计日志模型 | database.js |
| `server/src/middleware/auth.js` | JWT认证中间件 | user model |
| `server/src/services/deepseek.js` | DeepSeek API调用封装（Key存后端.env） | https, dotenv |

### 1.3 技术约束

| 约束项 | 说明 |
|--------|------|
| 无框架 | 纯HTML/CSS/JS，不依赖React/Vue等 |
| 无构建 | 前端无需webpack/vite，直接浏览器运行 |
| 有后端 | Node.js后端，AI代理+用户认证+数据存储+同步 |
| 数据存储 | 前端localStorage + IndexedDB + 后端SQLite |
| 用户认证 | JWT令牌认证，手机号验证码+微信登录，7天有效期 |
| 数据同步 | 30秒间隔自动同步，push先于pull，版本号冲突解决 |
| 语音API | 依赖浏览器Web Speech API，Chrome支持最佳 |
| 运行环境 | 需要HTTP服务器（非file://协议），语音API要求HTTPS或localhost |

---

## 二、页面与组件结构

### 2.1 页面（Screen）体系

APP采用单页面多Screen模式，同一时刻只有一个Screen处于active状态。

```
#app
  ├── #main-screen        (主操作区域，默认active)
  ├── #records-screen     (医疗记录列表)
  ├── #add-record-screen  (手动添加记录)
  ├── #stats-screen       (健康统计)
  ├── #drawer             (侧边抽屉，固定定位)
  └── #drawer-overlay     (抽屉遮罩，固定定位)
```

### 2.2 Screen切换机制

```javascript
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    closeDrawer();
}
```

**CSS规则**：
- `.screen` → `display: none`
- `.screen.active` → `display: flex; flex-direction: column`

**注意**：`display: flex` 而非 `display: block`，因为主界面需要flex纵向布局。

### 2.3 主界面DOM结构

```
#main-screen.screen.active
  ├── .header
  │   ├── #drawer-btn (☰)
  │   ├── h2
  │   └── #settings-btn (⚙️)
  ├── #main-chat-messages.chat-messages
  │   ├── #central-voice-container.central-voice-container
  │   │   ├── #main-voice-btn.central-voice-btn (🎤)
  │   │   └── .voice-hint ("长按语音输入")
  │   └── .message.user / .message.bot (动态添加)
  └── .main-input-area
      ├── #main-chat-input
      ├── #upload-image-btn (🖼️)
      └── #main-send-btn
```

### 2.4 关键DOM元素ID清单

| ID | 元素类型 | 所在Screen | 用途 |
|----|---------|-----------|------|
| `main-screen` | div | - | 主操作区域 |
| `main-chat-messages` | div | main | 聊天消息容器 |
| `central-voice-container` | div | main | 中央语音按钮容器 |
| `main-voice-btn` | button | main | 中央语音按钮 |
| `main-chat-input` | textarea | main | 文字输入框，支持多行换行 |
| `main-send-btn` | button | main | 发送按钮 |
| `upload-image-btn` | button | main | 图片上传按钮 |
| `drawer-btn` | button | main | 抽屉开关 |
| `drawer` | div | 全局 | 侧边抽屉 |
| `drawer-overlay` | div | 全局 | 抽屉遮罩 |
| `records-screen` | div | - | 记录列表页 |
| `all-records-list` | div | records | 记录列表容器 |
| `add-record-screen` | div | - | 添加记录页 |
| `visit-date` | input | add-record | 就诊日期 |
| `visit-hospital` | input | add-record | 医院名称 |
| `visit-department` | input | add-record | 科室 |
| `visit-doctor` | input | add-record | 医生 |
| `visit-complaint` | textarea | add-record | 主诉 |
| `visit-diagnosis` | input | add-record | 诊断 |
| `visit-notes` | textarea | add-record | 备注 |
| `save-record-btn` | button | add-record | 保存按钮 |
| `stats-screen` | div | - | 统计页 |
| `total-visits` | div | stats | 总就诊次数 |
| `month-visits` | div | stats | 本月就诊次数 |
| `top-hospital` | div | stats | 常用医院 |

---

## 三、数据模型与状态管理

### 3.1 核心数据模型（完整版）

以下是面向正式版设计的完整数据模型。原型阶段使用简化版本（见3.3节）。

#### 实体关系

```
User ──1:N──→ MedicalVisit ──1:N──→ MedicalRecord ──1:N──→ Medication
  │
  └──1:N──→ HealthStat
  └──1:N──→ QAHistory
```

#### 3.1.1 用户信息 (User)

| 字段 | 类型 | 说明 |
|------|------|------|
| `user_id` | string (主键) | 用户唯一标识 |
| `username` | string | 用户名 |
| `password_hash` | string | 密码哈希（正式版PBKDF2，原型明文） |
| `created_at` | datetime | 创建时间 |
| `last_login` | datetime | 最后登录时间 |

#### 3.1.2 就诊记录 (MedicalVisit)

| 字段 | 类型 | 说明 |
|------|------|------|
| `visit_id` | string (主键) | 记录唯一标识 |
| `user_id` | string (外键→User) | 所属用户 |
| `visit_date` | date | 就诊日期 |
| `hospital_name` | string | 医院名称 |
| `department` | string | 科室 |
| `doctor_name` | string | 医生姓名 |
| `chief_complaint` | string | 主诉 |
| `diagnosis` | string | 诊断结果 |
| `notes` | string | 备注 |
| `created_at` | datetime | 创建时间 |

#### 3.1.3 医疗资料 (MedicalRecord)

| 字段 | 类型 | 说明 |
|------|------|------|
| `record_id` | string (主键) | 资料唯一标识 |
| `visit_id` | string (外键→MedicalVisit) | 关联就诊记录 |
| `record_type` | enum | 资料类型：病历/检查报告/处方/影像资料 |
| `title` | string | 资料标题 |
| `content` | text | 文本内容（病历、处方等） |
| `file_path` | string | 文件路径（影像、PDF等） |
| `mime_type` | string | 文件MIME类型 |
| `file_size` | number | 文件大小（字节） |
| `created_at` | datetime | 创建时间 |
| `updated_at` | datetime | 更新时间 |

#### 3.1.4 药品信息 (Medication)

| 字段 | 类型 | 说明 |
|------|------|------|
| `medication_id` | string (主键) | 药品记录唯一标识 |
| `record_id` | string (外键→MedicalRecord) | 关联医疗资料 |
| `drug_name` | string | 药品名称 |
| `dosage` | string | 剂量 |
| `frequency` | string | 服用频率 |
| `duration` | string | 服用时长 |
| `notes` | string | 用药说明 |

#### 3.1.5 健康统计数据 (HealthStat)

| 字段 | 类型 | 说明 |
|------|------|------|
| `stat_id` | string (主键) | 统计记录唯一标识 |
| `user_id` | string (外键→User) | 所属用户 |
| `stat_type` | enum | 统计类型：血压/血糖/体重等 |
| `value` | number | 数值 |
| `unit` | string | 单位 |
| `record_date` | date | 记录日期 |
| `notes` | string | 备注 |

#### 3.1.6 问答历史 (QAHistory)

| 字段 | 类型 | 说明 |
|------|------|------|
| `question_id` | string (主键) | 问答记录唯一标识 |
| `user_id` | string (外键→User) | 所属用户 |
| `question` | text | 用户问题 |
| `answer` | text | 系统回答 |
| `related_records` | array | 相关医疗记录ID列表 |
| `timestamp` | datetime | 时间戳 |

### 3.2 全局状态对象

```javascript
const appState = {
    currentUser: null,        // 当前登录用户对象 | null
    medicalRecords: [],       // 当前用户的医疗记录数组
    isRecording: false,       // 是否正在录音
    recordingStartTime: null, // 录音开始时间戳
    recognition: null,        // Web Speech API 实例
    chatHistory: []           // 对话历史（预留）
};
```

### 3.3 本地存储Schema（原型阶段）

原型阶段使用简化的数据模型，存储在localStorage中。

| Key | 类型 | 说明 |
|-----|------|------|
| `medical_records_users` | JSON Array | 所有注册用户列表 |
| `medical_records_data` | JSON Array | 所有医疗记录（跨用户） |
| `medical_records_current_user` | JSON Object | 当前登录用户 |

**原型用户数据结构**：
```json
{
    "id": 1712600000000,
    "username": "zhangsan",
    "password": "明文（原型阶段）",
    "createdAt": "2026-04-09T10:00:00.000Z"
}
```

**原型医疗记录数据结构**（简化版MedicalVisit，无MedicalRecord/Medication子表）：
```json
{
    "id": 1712600000000,
    "date": "2026-04-09",
    "hospital": "华西医院",
    "department": "消化内科",
    "doctor": "王医生",
    "complaint": "腹痛伴腹泻",
    "diagnosis": "急性胃肠炎",
    "medication": "阿莫西林、蒙脱石散",
    "examination": "血常规、大便常规",
    "notes": "注意饮食清淡",
    "images": ["img_001", "img_002"]
}
```

**字段说明**：
- `hospital`：AI提取，不使用正则匹配，未识别则为"未知医院"
- `complaint`：AI总结的医学术语，非用户原话
- `diagnosis`：未明确则为空字符串，不显示"待确认"
- `medication`：AI提取的用药信息
- `examination`：AI提取的检查项目
- `images`：IndexedDB图片ID列表

### 3.4 数据隔离策略

- 所有医疗记录存储在同一个localStorage key中
- 通过 `userId` 字段进行用户级数据过滤
- 查询时：`allRecords.filter(r => r.userId === currentUser.id)`
- 保存时：先过滤掉当前用户的旧记录，再合并新记录

### 3.5 存储方案演进

| 维度 | 原型阶段 | 正式版 |
|------|---------|--------|
| 数据库 | localStorage (JSON) | SQLite (结构化) |
| 文件存储 | 无（仅文件名引用） | 应用沙箱（图片/PDF） |
| 加密 | 无 | AES-256 |
| 密码存储 | 明文 | PBKDF2哈希 |
| 数据备份 | 无 | 本地备份 + 可选云端 |
| 数据同步 | 无 | 本地优先 + 可选云端同步 |
| 数据导出 | 无 | PDF / CSV / JSON |

### 3.6 智能问答数据结构（正式版）

#### 索引数据
- 医疗资料全文索引
- 关键词提取和存储
- 语义索引（使用本地AI模型）

#### 问答历史
- 存储用户每次问答的完整记录
- 关联相关医疗记录ID，支持溯源
- 后续可基于问答历史优化回答质量

### 3.7 状态变更规则

| 状态 | 变更时机 | 副作用 |
|------|---------|--------|
| `currentUser` | 登录成功/注册成功/退出登录 | 触发loadMedicalRecords |
| `medicalRecords` | 添加记录/删除记录/修改记录/页面加载 | 触发saveMedicalRecords + refreshRecordsPanelIfOpen |
| `isRecording` | 长按语音开始/松开停止/出错停止 | 控制按钮样式和录音计时 |
| `recognition` | initSpeechRecognition | 全局只初始化一次 |

---

## 四、核心功能技术实现

### 4.1 语音识别

#### 双引擎架构

语音识别采用双引擎架构，优先使用 Web Speech API，在原生 App 环境中自动降级到 Capacitor 原生插件：

- **Web Speech API**（浏览器环境）：`webkitSpeechRecognition` / `SpeechRecognition`
- **Capacitor 原生插件**（App 环境）：`@capgo/capacitor-speech-recognition`

```javascript
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    // 使用 Web Speech API
} else if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechRecognition) {
    // 使用 Capacitor 原生语音识别
    useCapacitorVoice = true;
}
```

#### Web Speech API 初始化流程

```javascript
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        appState.recognition = new SpeechRecognition();
        appState.recognition.continuous = true;      // 连续识别
        appState.recognition.interimResults = true;   // 返回中间结果
        appState.recognition.lang = 'zh-CN';          // 中文
    }
}
```

#### Capacitor 原生语音识别流程

```javascript
function startCapacitorVoice() {
    var SpeechRecognition = window.Capacitor.Plugins.SpeechRecognition;
    SpeechRecognition.requestPermissions().then(function(result) {
        if (result.speechRecognition !== 'granted') { stopVoiceRecording(); return; }
        SpeechRecognition.available().then(function(availability) {
            if (!availability.available) { stopVoiceRecording(); return; }
            SpeechRecognition.addListener('partialResults', function(event) {
                var text = event.matches && event.matches[0] || '';
                if (text) { chatInput.value = text; }
            });
            SpeechRecognition.start({ language: 'zh-CN', maxResults: 1, partialResults: true, popup: false });
        });
    });
}
```

**原生权限配置**：
- iOS：Info.plist 添加 `NSSpeechRecognitionUsageDescription` + `NSMicrophoneUsageDescription`
- Android：AndroidManifest.xml 添加 `RECORD_AUDIO` + `ACCESS_NETWORK_STATE`

#### 录音控制流程

```
长按300ms → startVoiceRecording()
    → recognition.start()
    → 按钮添加 .recording 类（红色+脉冲）
    → 启动录音计时器（setInterval 1秒更新）
    → 语音按钮标签实时显示录制秒数（如"5"、"1:03"）
    → 识别文字实时显示在输入框中
    → 最长120秒自动停止

松开按钮 → stopVoiceRecording()
    → isStoppingVoice = true（防止onend重启）
    → isRecording = false
    → recognition.stop()
    → 清除计时器
    → 按钮移除 .recording 类
    → 恢复标签为"长按语音记录"
    → 若 isVoiceCancelled → 清空输入框
    → 若未取消 → 识别文字保留在输入框，不自动发送
```

#### 上划取消流程

```
录音中 → 监听 mousemove / touchmove
    → 计算 deltaY = voiceStartY - currentY
    → deltaY > 80px → cancelVoiceRecording()
        → isVoiceCancelled = true
        → 按钮添加 .cancelled 类（灰色）
        → 提示气泡文字改为"松手取消"
        → recognition.stop()
    → deltaY <= 80px 且 isVoiceCancelled → resumeVoiceRecording()
        → isVoiceCancelled = false
        → 按钮移除 .cancelled 类
        → 提示气泡文字恢复"正在聆听..."
        → recognition.start()
```

#### 连续识别机制

Web Speech API 在 `continuous=true` 模式下，`onend` 事件可能因浏览器静音检测而触发。处理方式：

```javascript
recognition.onend = function() {
    if (isRecording && !isStoppingVoice) {
        // 仍在录音状态，重新启动识别（无缝续接）
        recognition.start();
    }
    // 不再在onend中自动发送，发送逻辑由用户手动触发
};
```

#### 错误处理

```javascript
recognition.onerror = function(event) {
    // 仅致命错误才停止录音
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture') {
        stopVoiceRecording();
    }
    // no-speech / aborted / network 等非致命错误忽略，由onend自动重启
};
```

#### 语音结果处理

```javascript
recognition.onresult = function(event) {
    var interimTranscript = '';
    for (var i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
        } else {
            interimTranscript += event.results[i][0].transcript;
        }
    }
    // 最终结果 + 中间结果实时显示在输入框
    chatInput.value = finalTranscript + interimTranscript;
};
```

#### 语音命令解析

```javascript
function processMainVoiceInput(text) {
    addMainChatMessage(text, 'user');  // 显示用户消息，同时隐藏语音按钮
    
    if (text.includes('添加') || text.includes('记录')) {
        // 解析医疗信息 → 创建记录
    } else if (text.includes('查看') || text.includes('历史')) {
        // 跳转记录列表页
    } else if (text.includes('统计')) {
        // 跳转统计页
    } else {
        // 作为问题进行智能问答
    }
}
```

#### 医疗信息提取规则

采用AI（DeepSeek API）提取，不使用正则匹配。提取调用使用非流式响应（stream: false, temperature: 0.1）。

**提取字段**：

| 字段 | 提取规则 |
|------|---------|
| action | 用户意图：add（新增/补充）、delete（删除）、query（查询）、null（无关） |
| delete_target | 当action为delete时，标识删除目标：latest（最近一条）、current（当前编辑记录）、医院名/日期 |
| hospital | AI从原文提取完整医院名称，未识别则为"未知医院" |
| department | AI提取科室名称 |
| doctor | AI提取医生姓名，未提及则为空字符串 |
| complaint | AI用简洁医学术语总结症状，不照搬用户原话 |
| diagnosis | AI提取诊断结果，未明确则为空字符串 |
| medication | AI提取用药信息 |
| examination | AI提取检查项目 |
| notes | AI提取其他备注信息 |
| is_new_visit | AI判断是否为新就诊（默认false，只有明确提到另一次就诊才为true） |

**多轮对话合并机制**：
- 维护 `activeRecord` 变量，指向当前正在记录的就诊
- 新一轮对话时，AI判断 `is_new_visit`：
  - `false`：通过 `mergeRecordData()` 合并到 activeRecord，更新卡片DOM
  - `true`：创建新记录，activeRecord 指向新记录
- 合并规则：非空字段覆盖，complaint 不重复时用分号连接

**对话删除记录机制**：
- 用户在对话中说"删除"/"删掉"/"移除"等关键词时，AI提取 `action: "delete"` 及 `delete_target`
- `handleExtractedRecord` 检测到 `action === "delete"` 后执行删除流程：
  - 根据 `delete_target` 定位要删除的记录（latest=最近一条，current=当前编辑记录，或按医院名/日期匹配）
  - 从 `records` 数组中移除该记录
  - 若删除的是 `activeRecord`，清空 `activeRecord` 和 `activeCardEl`
  - 调用 `saveRecords()` 持久化 + 自动刷新已打开的记录面板
  - 调用 `updateStats()` 更新统计数据
- 本地降级模式：`classifyMessage` 识别 delete 类型，`generateSystemResponse` 返回 delete 响应，`onError` 回调中执行删除逻辑
- 记录面板同步：`saveRecords()` 内部调用 `refreshRecordsPanelIfOpen()`，当记录面板已打开时自动重新渲染列表

### 4.2 中央语音按钮显示/隐藏

**核心规则**：不能使用CSS `:not(:empty)` 选择器，因为语音按钮本身就是聊天区域的子元素，会导致永远被隐藏。

**正确实现**：通过JavaScript class控制。

```javascript
// 添加消息时隐藏语音按钮
function addMainChatMessage(message, type) {
    const voiceContainer = document.getElementById('central-voice-container');
    if (voiceContainer) {
        voiceContainer.classList.add('hidden');
    }
    // ... 添加消息到聊天区域
}

// CSS
.central-voice-container.hidden {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
}
```

**禁止操作**：
- ❌ `chatMessages.innerHTML = ''` — 会清空语音按钮
- ❌ `.chat-messages:not(:empty) .central-voice-container` — 永远匹配，按钮永远隐藏

### 4.3 智能问答

#### 问答匹配规则

| 关键词匹配 | 返回内容 |
|-----------|---------|
| "上次"/"最近" | 最近一条记录的详情 |
| "次数"/"几次" | 总记录数统计 |
| "医院" | 去过的所有医院列表 |
| "诊断"/"病" | 所有诊断结果列表 |
| 其他 | 帮助引导文本 |

#### 实现方式

纯关键词匹配，无NLP/语义理解。后续迭代可接入大语言模型。

### 4.4 文字输入

输入框使用 `<textarea>` 元素，支持多行换行：

- **Enter**：发送消息
- **Shift+Enter**：换行
- 输入框根据内容自动增高（最大120px），发送后重置高度
- 通过 `input` 事件监听实时调整 `scrollHeight`，通过 `keydown` 事件区分 Enter/Shift+Enter

#### 中文输入法兼容处理

在移动端和桌面端使用中文输入法时，需要正确处理 IME 组合状态：

```javascript
var isComposing = false;
chatInput.addEventListener('compositionstart', function() { isComposing = true; });
chatInput.addEventListener('compositionend', function() { isComposing = false; });

chatInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !isComposing) {
        e.preventDefault();
        handleSend();
    }
});
```

关键点：
- `compositionstart` / `compositionend` 事件跟踪 IME 状态（兼容旧 WebView）
- `e.isComposing` 属性检测现代浏览器的 IME 状态
- 双重检查确保中文输入确认候选词时不触发发送

### 4.5 图片上传

```javascript
// 动态创建隐藏的file input
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.onchange = function(e) {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        addMainChatMessage('已选择图片：' + file.name, 'user');
        // 后续：OCR识别
    }
};
fileInput.click();
```

### 4.6 侧边抽屉

```javascript
function openDrawer() {
    document.getElementById('drawer').classList.add('open');
    document.getElementById('drawer-overlay').classList.add('active');
}

function closeDrawer() {
    document.getElementById('drawer').classList.remove('open');
    document.getElementById('drawer-overlay').classList.remove('active');
}
```

**CSS实现**：
- 抽屉：`transform: translateX(-100%);` → `.open { transform: translateX(0); }`
- 遮罩：`opacity: 0; visibility: hidden;` → `.active { opacity: 1; visibility: visible; }`
- 过渡：`transition: transform 0.4s ease`
- z-index：遮罩 50，抽屉 60（高于其他面板）

#### 移动端触摸事件处理

在 Capacitor WebView 中，`click` 事件可能有 300ms 延迟或被吞掉，需要额外处理 touch 事件：

```javascript
var touchStartX = 0, touchStartY = 0, touchMoved = false;
drawerBtn.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchMoved = false;
});
drawerBtn.addEventListener('touchmove', function() { touchMoved = true; });
drawerBtn.addEventListener('touchend', function(e) {
    if (!touchMoved) { e.preventDefault(); openDrawer(); }
});
drawerBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    e.preventDefault();
    openDrawer();
});
```

关键点：
- touch 事件优先处理，避免 300ms 延迟
- 通过 `touchMoved` 判断是否为滑动操作，避免误触
- click 事件中 `stopPropagation` 防止事件冒泡
- DOM 元素空值检查，避免不同 Screen 的元素不存在时报错

---

## 五、CSS架构

### 5.1 变量系统

```css
:root {
    --color-primary: #F59E0B;
    --color-primary-light: rgba(245, 158, 11, 0.2);

    --bg-base: #131720;
    --bg-surface: #1E2532;
    --bg-surface-elevated: #2A313E;

    --text-primary: #FFFFFF;
    --text-secondary: #F1F5F9;
    --text-tertiary: #94A3B8;
    --text-inverse: #0F172A;

    --radius-sm: 2px;
    --radius-md: 16px;
    --radius-lg: 20px;
    --radius-xl: 24px;
    --radius-full: 9999px;

    --spacing-xs: 4px;
    --spacing-sm: 12px;
    --spacing-md: 20px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;

    --nav-height: 64px;
    --input-height: 40px;
    --voice-btn-size: 80px;
    --voice-btn-bottom: 112px;

    --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    --shadow-lg: 0 8px 16px -1px rgba(0, 0, 0, 0.4);
    --transition: all 0.3s ease;
}
```

### 5.2 布局体系

| 容器 | 布局方式 | 说明 |
|------|---------|------|
| `.screen.active` | `display: flex; flex-direction: column` | 纵向flex布局 |
| `.header` | `display: flex; justify-content: space-between; height: var(--nav-height)` | 水平两端对齐，64px高 |
| `.chat-messages` | `display: flex; flex-direction: column; gap: var(--spacing-sm)` | 消息纵向排列，12px间距 |
| `.floating-voice-btn` | `position: fixed; right: var(--spacing-md); bottom: var(--voice-btn-bottom)` | 悬浮固定右下角 |
| `.main-input-area` | `display: flex; position: sticky; bottom: 0` | 底部固定输入栏 |

### 5.3 关键样式规则

#### 悬浮语音按钮
```css
.floating-voice-btn {
    width: var(--voice-btn-size);
    height: var(--voice-btn-size);
    border-radius: 50%;
    background: var(--color-primary);
    color: var(--text-inverse);
    font-size: 32px;
    box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4);
    position: fixed;
    right: var(--spacing-md);
    bottom: var(--voice-btn-bottom);
    z-index: 100;
}
.floating-voice-btn.recording {
    background: #EF4444;
    color: #FFFFFF;
    animation: pulse 1.5s infinite;
}
```

#### 消息气泡
```css
.message.user .message-content {
    background: var(--color-primary);
    color: var(--text-inverse);
    border-bottom-right-radius: var(--radius-sm);
}
.message.bot .message-content {
    background: var(--bg-surface);
    color: var(--text-secondary);
    border-bottom-left-radius: var(--radius-sm);
}
```

#### 底部输入栏
```css
#main-chat-input {
    height: var(--input-height);
    border-radius: var(--radius-full);
    background: var(--bg-surface);
    color: var(--text-secondary);
}
#main-chat-input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light);
}
```

### 5.4 响应式断点

| 断点 | 调整内容 |
|------|---------|
| ≤375px | 缩小padding、抽屉宽度240px |
| ≥768px | 限制#app最大宽度768px居中 |

---

## 六、错误处理

### 6.1 DOM元素空值检查

**规则**：所有 `getElementById` 调用必须进行空值检查，因为不同Screen的元素可能不存在于当前DOM。

```javascript
const element = document.getElementById('some-id');
if (element) {
    element.addEventListener('click', handler);
}
```

**已知的跨Screen引用问题**：
- `records-list`：旧版首页元素，已不存在
- `recording-time`：旧版录音计时元素，已不存在
- `visit-count`/`monthly-visits`：旧版统计元素，已改为 `total-visits`/`month-visits`

### 6.2 语音识别错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 浏览器不支持 | `initSpeechRecognition` 中检测，不初始化 |
| 录音启动失败 | try-catch包裹 `recognition.start()` |
| 识别过程出错 | `onerror` 回调中恢复状态 |
| 识别意外结束 | `onend` 回调中恢复状态 |
| 超时（2分钟） | `setTimeout` 自动调用 `recognition.stop()` |

### 6.3 数据操作错误处理

| 场景 | 处理方式 |
|------|---------|
| localStorage为空 | `JSON.parse(localStorage.getItem(key) \|\| '[]')` |
| 用户未登录 | `appState.currentUser` 为null时不执行数据操作 |
| 记录保存失败 | try-catch包裹 `localStorage.setItem` |

---

## 七、已知技术债务与注意事项

### 7.1 当前已知问题

| 编号 | 问题 | 风险等级 | 说明 |
|------|------|---------|------|
| T01 | ~~密码明文存储~~ | ~~高~~ | ✅ 已改用bcrypt加密 |
| T02 | 无数据加密 | 高 | localStorage数据可被浏览器开发者工具查看 |
| T03 | 语音API兼容性 | 中 | 仅Chrome完整支持Web Speech API |
| T04 | ~~无数据备份~~ | ~~中~~ | ✅ 已实现云端同步 |
| T05 | 单文件JS | 低 | app.js逐渐增大，后续需模块化 |

### 7.2 开发注意事项

1. **不要使用 `innerHTML = ''` 清空聊天区域**，会删除语音按钮DOM
2. **不要使用 CSS `:not(:empty)` 控制语音按钮**，语音按钮自身就是子元素
3. **Screen切换必须使用 `showScreen()` 函数**，不要直接操作class
4. **所有新增的DOM引用必须做空值检查**
5. **语音按钮的显示/隐藏通过 `classList.add/remove('hidden')` 控制**
6. **录音计时显示在 `.voice-hint` 元素中**，不是独立的 `#recording-time` 元素

### 7.3 后续技术演进方向

| 阶段 | 技术变更 |
|------|---------|
| ~~原型→正式版~~ | ~~HTML/CSS/JS → React Native/Flutter~~ 暂保持纯JS |
| ~~localStorage → SQLite~~ | ✅ 已实现后端SQLite + 前端localStorage双存储 |
| Web Speech API → 原生API | 更高识别率、离线支持 |
| ~~关键词匹配 → LLM~~ | ✅ 已接入DeepSeek AI |
| ~~明文密码 → PBKDF2~~ | ✅ 已改用bcrypt |
| 无加密 → AES-256 | 本地数据加密（待实现） |

---

## 八、数据库设计

### 8.1 SQLite 表结构

```sql
-- 用户表
CREATE TABLE users (
    id TEXT PRIMARY KEY,           -- UUID
    email TEXT UNIQUE,             -- 邮箱
    password_hash TEXT,            -- bcrypt加密密码
    phone TEXT UNIQUE,             -- 手机号
    wechat_openid TEXT UNIQUE,     -- 微信OpenID
    nickname TEXT DEFAULT '',      -- 昵称
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 医疗记录表
CREATE TABLE medical_records (
    id TEXT PRIMARY KEY,           -- UUID
    user_id TEXT NOT NULL,         -- 所属用户
    date TEXT NOT NULL,            -- 就诊日期
    hospital TEXT DEFAULT '',      -- 医院
    department TEXT DEFAULT '',    -- 科室
    doctor TEXT DEFAULT '',        -- 医生
    complaint TEXT DEFAULT '',     -- 主诉
    diagnosis TEXT DEFAULT '',     -- 诊断
    medication TEXT DEFAULT '',    -- 用药
    examination TEXT DEFAULT '',   -- 检查
    notes TEXT DEFAULT '',         -- 备注
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT,               -- 软删除时间
    version INTEGER DEFAULT 1,    -- 版本号（同步用）
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 记录图片表
CREATE TABLE record_images (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    original_name TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (record_id) REFERENCES medical_records(id)
);

-- 对话消息表
CREATE TABLE chat_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,            -- user / assistant
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 审计日志表
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,          -- register/login_phone/login_wechat/create/update/delete/sync_pull/sync_push
    resource_type TEXT NOT NULL,   -- user/record
    resource_id TEXT,
    details TEXT DEFAULT '',
    ip_address TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);
```

### 8.2 索引

```sql
CREATE INDEX idx_records_user ON medical_records(user_id);
CREATE INDEX idx_records_updated ON medical_records(user_id, updated_at);
CREATE INDEX idx_records_deleted ON medical_records(deleted_at);
CREATE INDEX idx_chat_user ON chat_messages(user_id, created_at);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at);
```

---

## 九、API接口文档

### 9.1 认证接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/auth/send-code | 发送验证码（phone）→ 模拟模式固定123456 | 无 |
| POST | /api/auth/login-phone | 手机号验证码登录（phone, code）→ 返回JWT | 无 |
| POST | /api/auth/login-wechat | 微信登录（模拟模式）→ 返回JWT | 无 |
| GET | /api/auth/me | 获取当前用户信息 | JWT |

### 9.2 医疗记录接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/records | 获取记录列表（limit, offset） | JWT |
| GET | /api/records/:id | 获取单条记录 | JWT |
| POST | /api/records | 创建记录 | JWT |
| PUT | /api/records/:id | 更新记录 | JWT |
| DELETE | /api/records/:id | 删除记录（软删除） | JWT |

### 9.3 数据同步接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/sync/pull?since=ISO时间 | 拉取指定时间后的变更 | JWT |
| POST | /api/sync/push | 推送本地变更（changes数组） | JWT |

### 9.4 AI接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/ai/chat | AI对话（流式） | 无 |
| POST | /api/ai/extract | 记录提取（非流式） | 无 |

### 9.5 审计日志接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/audit | 获取操作日志（limit, offset） | JWT |

---

## 十、数据同步机制

### 10.1 同步流程

```
登录成功 → 启动30秒间隔定时器
  ↓
每次同步：
  1. Push：将本地 pending_changes 推送到服务端（upsert，版本号判断）
  2. Pull：拉取服务端 since 之后的变更，合并到本地
  3. 更新 last_sync_time
```

### 10.2 冲突解决

- 基于版本号（version字段）：服务端版本优先
- 客户端推送时，若服务端版本 ≥ 推送版本，则忽略推送
- 客户端拉取时，若服务端版本 > 本地版本，则覆盖本地

### 10.3 离线处理

- 离线操作正常写入 localStorage
- 变更记录存入 pending_changes 队列
- 联网后自动推送队列中的变更
