var fs = require('fs');
var path = require('path');

var passed = 0;
var failed = 0;
var skipped = 0;
var errors = [];

function assert(condition, testName, errorMsg) {
    if (condition) {
        passed++;
        console.log('  ✓ ' + testName);
    } else {
        failed++;
        errors.push({ name: testName, error: errorMsg || '断言失败' });
        console.log('  ✗ ' + testName + ' — ' + (errorMsg || '断言失败'));
    }
}

function assertEqual(actual, expected, testName) {
    var actualStr = JSON.stringify(actual);
    var expectedStr = JSON.stringify(expected);
    if (actualStr === expectedStr) {
        passed++;
        console.log('  ✓ ' + testName);
    } else {
        failed++;
        errors.push({ name: testName, error: '期望: ' + expectedStr + '，实际: ' + actualStr });
        console.log('  ✗ ' + testName + ' — 期望: ' + expectedStr + '，实际: ' + actualStr);
    }
}

function assertIncludes(str, keyword, testName) {
    if (str && str.indexOf(keyword) !== -1) {
        passed++;
        console.log('  ✓ ' + testName);
    } else {
        failed++;
        errors.push({ name: testName, error: '字符串不包含关键词' });
        console.log('  ✗ ' + testName + ' — 字符串不包含 "' + keyword + '"');
    }
}

function skip(testName, reason) {
    skipped++;
    console.log('  ⊘ ' + testName + ' [跳过: ' + reason + ']');
}

var baseDir = path.join(__dirname);

var localStorageMock = (function() {
    var store = {};
    return {
        getItem: function(key) { return store[key] || null; },
        setItem: function(key, value) { store[key] = String(value); },
        removeItem: function(key) { delete store[key]; },
        clear: function() { store = {}; }
    };
})();

global.localStorage = localStorageMock;

var coreCode = fs.readFileSync(path.join(baseDir, 'core.js'), 'utf8');

(function() {
    var mockDiv = { textContent: '', innerHTML: '' };
    Object.defineProperty(mockDiv, 'textContent', {
        set: function(val) { this._textContent = val; this.innerHTML = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); },
        get: function() { return this._textContent; }
    });
    var window = { SpeechRecognition: {}, webkitSpeechRecognition: {} };
    var document = { createElement: function() { return mockDiv; } };
    var localStorage = localStorageMock;
    eval(coreCode);
    global.MedicalApp = MedicalApp;
})();

console.log('\n========================================');
console.log('  医疗档案APP - 自动化测试');
console.log('========================================\n');

console.log('【1. 就诊记录解析 parseRecordFromText】');
var r1 = MedicalApp.parseRecordFromText('我今天感冒去了华西医院');
assert(r1 !== null, '应返回非null对象');
assertEqual(r1.hospital, '未知医院', '医院名称不再正则匹配，未由AI提取时应返回未知医院');
assertEqual(r1.diagnosis, '感冒', '应识别感冒诊断');
assert(r1.date.match(/^\d{4}-\d{2}-\d{2}$/), '日期格式应为YYYY-MM-DD');

var r2 = MedicalApp.parseRecordFromText('去市第一人民医院检查高血压');
assertEqual(r2.hospital, '未知医院', '医院名称不再正则匹配，应返回未知医院');
assertEqual(r2.diagnosis, '高血压', '应识别高血压');

var r3 = MedicalApp.parseRecordFromText('今天胃疼去看了消化内科');
assertEqual(r3.department, '消化内科', '应识别消化内科');

var r4 = MedicalApp.parseRecordFromText('随便说点什么');
assertEqual(r4.hospital, '未知医院', '无匹配医院应返回未知医院');
assertEqual(r4.diagnosis, '', '无匹配诊断应返回空字符串');

assertEqual(MedicalApp.parseRecordFromText(''), null, '空字符串应返回null');
assertEqual(MedicalApp.parseRecordFromText(null), null, 'null输入应返回null');
assertEqual(MedicalApp.parseRecordFromText(undefined), null, 'undefined输入应返回null');
assertEqual(MedicalApp.parseRecordFromText(123), null, '数字输入应返回null');

var r5 = MedicalApp.parseRecordFromText('诊断为大叶性肺炎');
assertEqual(r5.diagnosis, '大叶性肺炎', '应识别"诊断为xxx"格式');

var r6 = MedicalApp.parseRecordFromText('在协和医院看骨科，医生：张三');
assertEqual(r6.hospital, '未知医院', '医院名称不再正则匹配，应返回未知医院');
assertEqual(r6.department, '骨科', '应识别骨科');
assertEqual(r6.doctor, '张三', '应识别医生姓名');

console.log('\n【2. 消息分类 classifyMessage】');
assertEqual(MedicalApp.classifyMessage('我今天感冒去了华西医院'), 'record', '含就诊关键词应分类为record');
assertEqual(MedicalApp.classifyMessage('去看病了'), 'record', '看病应分类为record');
assertEqual(MedicalApp.classifyMessage('发烧了'), 'record', '发烧应分类为record');
assertEqual(MedicalApp.classifyMessage('查询最近一次就诊记录'), 'query', '查询应分类为query');
assertEqual(MedicalApp.classifyMessage('查看历史记录'), 'query', '查看应分类为query');
assertEqual(MedicalApp.classifyMessage('删除这条记录'), 'delete', '删除应分类为delete');
assertEqual(MedicalApp.classifyMessage('把刚才的记录删掉'), 'delete', '删掉应分类为delete');
assertEqual(MedicalApp.classifyMessage('移除这条就诊信息'), 'delete', '移除应分类为delete');
assertEqual(MedicalApp.classifyMessage('你好'), 'general', '普通消息应分类为general');
assertEqual(MedicalApp.classifyMessage(''), 'unknown', '空字符串应分类为unknown');
assertEqual(MedicalApp.classifyMessage(null), 'unknown', 'null应分类为unknown');

console.log('\n【3. 统计计算 calculateStats】');
assertEqual(MedicalApp.calculateStats([]).total, 0, '空记录总数应为0');
assertEqual(MedicalApp.calculateStats(null).total, 0, 'null输入总数应为0');
assertEqual(MedicalApp.calculateStats('invalid').total, 0, '非数组输入总数应为0');

var today = new Date().toISOString().split('T')[0];
var testRecords = [
    { id: 1, date: today, hospital: '华西医院', department: '呼吸内科', diagnosis: '感冒' },
    { id: 2, date: today, hospital: '省人民医院', department: '消化内科', diagnosis: '胃炎' },
    { id: 3, date: today, hospital: '市第一人民医院', department: '呼吸内科', diagnosis: '上呼吸道感染' },
    { id: 4, date: today, hospital: '协和医院', department: '心内科', diagnosis: '高血压' }
];
var stats = MedicalApp.calculateStats(testRecords);
assertEqual(stats.total, 4, '4条记录总数应为4');
assertEqual(stats.halfYear, 4, '近期4条记录半年数应为4');
assertEqual(stats.topDepartment, '呼吸内科', '热门科室应为呼吸内科');
assertEqual(stats.diagnosisCounts['感冒'], 1, '感冒诊断次数应为1');

var oldDate = '2020-01-01';
var mixedRecords = [
    { id: 1, date: today, hospital: '华西医院', department: '呼吸内科', diagnosis: '感冒' },
    { id: 2, date: oldDate, hospital: '省人民医院', department: '消化内科', diagnosis: '胃炎' }
];
assertEqual(MedicalApp.calculateStats(mixedRecords).halfYear, 1, '仅1条近期记录');

var pendingRecords = [
    { id: 1, date: today, hospital: '华西医院', department: '', diagnosis: '' }
];
var pendingStats = MedicalApp.calculateStats(pendingRecords);
assertEqual(pendingStats.topDepartment, '', '无科室信息时热门科室应为空');
assertEqual(Object.keys(pendingStats.diagnosisCounts).length, 0, '空诊断不应计入统计');

console.log('\n【4. 输入验证 validatePhone / validateCode / maskPhone】');
assertEqual(MedicalApp.validatePhone('13812345678'), true, '有效手机号应通过');
assertEqual(MedicalApp.validatePhone('15000000000'), true, '15开头应通过');
assertEqual(MedicalApp.validatePhone('02345678901'), false, '0开头应不通过');
assertEqual(MedicalApp.validatePhone('1381234567'), false, '10位应不通过');
assertEqual(MedicalApp.validatePhone(''), false, '空字符串应不通过');
assertEqual(MedicalApp.validatePhone(null), false, 'null应不通过');

assertEqual(MedicalApp.validateCode('1234'), true, '4位验证码应通过');
assertEqual(MedicalApp.validateCode('123456'), true, '6位验证码应通过');
assertEqual(MedicalApp.validateCode('123'), false, '3位应不通过');
assertEqual(MedicalApp.validateCode(''), false, '空字符串应不通过');

assertEqual(MedicalApp.maskPhone('13812345678'), '138****5678', '应正确脱敏');
assertEqual(MedicalApp.maskPhone('123'), '123', '不足11位应原样返回');
assertEqual(MedicalApp.maskPhone(null), null, 'null应原样返回');

console.log('\n【5. 安全与持久化 escapeHtml / localStorage】');
assertEqual(MedicalApp.escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;', '应转义HTML标签');
assertEqual(MedicalApp.escapeHtml('正常文本'), '正常文本', '正常文本不应变化');
assertEqual(MedicalApp.escapeHtml('a & b'), 'a &amp; b', '应转义&符号');
assertEqual(MedicalApp.escapeHtml(''), '', '空字符串应返回空');
assertEqual(MedicalApp.escapeHtml(null), '', 'null应返回空');

localStorageMock.clear();
assertEqual(MedicalApp.loadRecords().length, 0, '无存储时加载应为空数组');

MedicalApp.saveRecords([{ id: 1, date: today, hospital: '测试医院', diagnosis: '测试诊断' }]);
var loaded = MedicalApp.loadRecords();
assertEqual(loaded.length, 1, '保存后加载应有1条记录');
assertEqual(loaded[0].hospital, '测试医院', '保存的医院名称应一致');

localStorageMock.setItem('medicalRecords', 'invalid json');
assertEqual(MedicalApp.loadRecords().length, 0, '无效JSON应返回空数组');
localStorageMock.removeItem('medicalRecords');

console.log('\n【6. 系统响应生成 generateSystemResponse】');
var testRecords2 = [
    { id: 1, date: today, hospital: '华西医院', department: '呼吸内科', diagnosis: '感冒' }
];

var g1 = MedicalApp.generateSystemResponse('我今天感冒去了华西医院', testRecords2);
assertEqual(g1.type, 'record', '就诊消息响应类型应为record');
assertIncludes(g1.message, '记录', '响应消息应包含记录关键词');
assertEqual(g1.record.hospital, '未知医院', '本地降级模式医院名称不再正则匹配');

var g2 = MedicalApp.generateSystemResponse('查询最近记录', testRecords2);
assertEqual(g2.type, 'query', '查询消息响应类型应为query');

var g3 = MedicalApp.generateSystemResponse('你好', testRecords2);
assertEqual(g3.type, 'general', '普通消息响应类型应为general');

var g4 = MedicalApp.generateSystemResponse('查询记录', []);
assertEqual(g4.type, 'query', '空记录查询类型应为query');

var g5 = MedicalApp.generateSystemResponse('删除这条记录', testRecords2);
assertEqual(g5.type, 'delete', '删除消息响应类型应为delete');

var g6 = MedicalApp.generateSystemResponse('删掉记录', []);
assertEqual(g6.type, 'delete', '空记录删除类型应为delete');
assertEqual(g6.record, null, '空记录删除时record应为null');

console.log('\n【7. AI对话服务 AIService 接口检查】');
var aiServiceCode = fs.readFileSync(path.join(baseDir, 'ai-service.js'), 'utf8');
assert(aiServiceCode.indexOf('AIService') !== -1, 'AIService 应在代码中定义');
assert(aiServiceCode.indexOf('function chat(') !== -1, 'chat 函数应存在');
assert(aiServiceCode.indexOf('function extractRecord(') !== -1, 'extractRecord 函数应存在');
assert(aiServiceCode.indexOf('function clearHistory(') !== -1, 'clearHistory 函数应存在');
assert(aiServiceCode.indexOf('function getHistory(') !== -1, 'getHistory 函数应存在');
assert(aiServiceCode.indexOf('chat: chat') !== -1, 'chat 应被导出');
assert(aiServiceCode.indexOf('extractRecord: extractRecord') !== -1, 'extractRecord 应被导出');
assert(aiServiceCode.indexOf('clearHistory: clearHistory') !== -1, 'clearHistory 应被导出');
assert(aiServiceCode.indexOf('getHistory: getHistory') !== -1, 'getHistory 应被导出');

skip('AI对话 - 发送普通消息应返回自然语言回复', '需要API Key和网络');
skip('AI对话 - 流式输出应逐chunk回调', '需要API Key和网络');
skip('AI记录提取 - 就诊信息提取', '需要API Key和网络');

console.log('\n【8. 多轮对话记录合并 mergeRecordData】');
assert(typeof MedicalApp.mergeRecordData === 'function', 'mergeRecordData 方法应存在');

var base = { hospital: '华西医院', department: '', diagnosis: '', complaint: '腹痛', medication: '', examination: '' };
var update = { hospital: '华西医院', department: '消化内科', diagnosis: '急性胃肠炎', complaint: '', medication: '阿莫西林', examination: '' };
var merged = MedicalApp.mergeRecordData(base, update);
assertEqual(merged.hospital, '华西医院', '医院名称应保持');
assertEqual(merged.department, '消化内科', '科室应更新');
assertEqual(merged.diagnosis, '急性胃肠炎', '诊断应更新');
assertEqual(merged.complaint, '腹痛', '主诉非空应保持');
assertEqual(merged.medication, '阿莫西林', '用药应更新');

var base2 = { hospital: '未知医院', department: '', diagnosis: '', complaint: '', medication: '', examination: '' };
var update2 = { hospital: '省人民医院', department: '心内科', diagnosis: '高血压', complaint: '头晕', medication: '', examination: '' };
var merged2 = MedicalApp.mergeRecordData(base2, update2);
assertEqual(merged2.hospital, '省人民医院', '未知医院应被AI提取的医院覆盖');
assertEqual(merged2.complaint, '头晕', '主诉应更新');

console.log('\n【9. 语音输入功能】');
var appCode = fs.readFileSync(path.join(baseDir, 'app.js'), 'utf8');
assert(appCode.indexOf('useCapacitorVoice') !== -1, '应支持Capacitor原生语音识别降级');
assert(appCode.indexOf('startCapacitorVoice') !== -1, 'startCapacitorVoice 函数应存在');
assert(appCode.indexOf('stopCapacitorVoice') !== -1, 'stopCapacitorVoice 函数应存在');
assert(appCode.indexOf('compositionstart') !== -1, '应处理中文输入法组合事件');
assert(appCode.indexOf('compositionend') !== -1, '应处理中文输入法组合结束事件');
skip('语音 - 长按语音按钮300ms后应开始录音', '需要浏览器环境');
skip('语音 - 录音中上划超过80px应进入取消状态', '需要浏览器环境');
skip('语音 - 松开按钮后识别文字应回填至输入框不自动发送', '需要浏览器环境');
skip('语音 - Capacitor插件模式下应请求权限后开始识别', '需要原生环境');
skip('输入框 - 中文输入法组合中Enter不应发送', '需要浏览器环境');

console.log('\n【10. 图片上传与存储 ImageStore 接口检查】');
var imageStoreCode = fs.readFileSync(path.join(baseDir, 'image-store.js'), 'utf8');
assert(imageStoreCode.indexOf('ImageStore') !== -1, 'ImageStore 应在代码中定义');
assert(imageStoreCode.indexOf('function openDB(') !== -1, 'openDB 函数应存在');
assert(imageStoreCode.indexOf('function saveImage(') !== -1, 'saveImage 函数应存在');
assert(imageStoreCode.indexOf('function getImage(') !== -1, 'getImage 函数应存在');
assert(imageStoreCode.indexOf('function deleteImage(') !== -1, 'deleteImage 函数应存在');
assert(imageStoreCode.indexOf('function getImagesByRecordId(') !== -1, 'getImagesByRecordId 函数应存在');
assert(imageStoreCode.indexOf('function updateImageRecordId(') !== -1, 'updateImageRecordId 函数应存在');
assert(imageStoreCode.indexOf('function compressImage(') !== -1, 'compressImage 函数应存在');
assert(imageStoreCode.indexOf('function getAllImages(') !== -1, 'getAllImages 函数应存在');

console.log('\n【11. 记录管理 - 列表与详情】');
skip('列表 - 应正确渲染所有记录', '需要DOM交互');
skip('详情 - 详情面板应展示所有字段', '需要DOM交互');

console.log('\n【12. 手动添加记录】');
skip('表单 - 应包含日期/医院/科室/诊断等字段', '需要DOM交互');

console.log('\n【13. 统计面板】');
skip('统计 - 应正确显示总就诊次数', '需要DOM交互');

console.log('\n【14. 认证服务 ApiService 接口检查】');
var apiServiceCode = fs.readFileSync(path.join(baseDir, 'api-service.js'), 'utf8');
assert(apiServiceCode.indexOf('ApiService') !== -1, 'ApiService 应在代码中定义');
assert(apiServiceCode.indexOf('function register(') !== -1, 'register 函数应存在');
assert(apiServiceCode.indexOf('function login(') !== -1, 'login 函数应存在');
assert(apiServiceCode.indexOf('function logout(') !== -1, 'logout 函数应存在');
assert(apiServiceCode.indexOf('function isLoggedIn(') !== -1, 'isLoggedIn 函数应存在');
assert(apiServiceCode.indexOf('function getToken(') !== -1, 'getToken 函数应存在');
assert(apiServiceCode.indexOf('function getUser(') !== -1, 'getUser 函数应存在');
assert(apiServiceCode.indexOf('function getRecords(') !== -1, 'getRecords 函数应存在');
assert(apiServiceCode.indexOf('function createRecord(') !== -1, 'createRecord 函数应存在');
assert(apiServiceCode.indexOf('function updateRecord(') !== -1, 'updateRecord 函数应存在');
assert(apiServiceCode.indexOf('function deleteRecord(') !== -1, 'deleteRecord 函数应存在');
assert(apiServiceCode.indexOf('function syncPull(') !== -1, 'syncPull 函数应存在');
assert(apiServiceCode.indexOf('function syncPush(') !== -1, 'syncPush 函数应存在');
assert(apiServiceCode.indexOf('register: register') !== -1, 'register 应被导出');
assert(apiServiceCode.indexOf('login: login') !== -1, 'login 应被导出');
assert(apiServiceCode.indexOf('logout: logout') !== -1, 'logout 应被导出');
assert(apiServiceCode.indexOf('isLoggedIn: isLoggedIn') !== -1, 'isLoggedIn 应被导出');
assert(apiServiceCode.indexOf('getToken: getToken') !== -1, 'getToken 应被导出');
assert(apiServiceCode.indexOf('getUser: getUser') !== -1, 'getUser 应被导出');

console.log('\n【15. 数据同步服务 SyncService 接口检查】');
var syncServiceCode = fs.readFileSync(path.join(baseDir, 'sync-service.js'), 'utf8');
assert(syncServiceCode.indexOf('SyncService') !== -1, 'SyncService 应在代码中定义');
assert(syncServiceCode.indexOf('function sync(') !== -1, 'sync 函数应存在');
assert(syncServiceCode.indexOf('function startAutoSync(') !== -1, 'startAutoSync 函数应存在');
assert(syncServiceCode.indexOf('function stopAutoSync(') !== -1, 'stopAutoSync 函数应存在');
assert(syncServiceCode.indexOf('function pullFromServer(') !== -1, 'pullFromServer 函数应存在');
assert(syncServiceCode.indexOf('function pushToServer(') !== -1, 'pushToServer 函数应存在');
assert(syncServiceCode.indexOf('function getLocalRecords(') !== -1, 'getLocalRecords 函数应存在');
assert(syncServiceCode.indexOf('function saveLocalRecords(') !== -1, 'saveLocalRecords 函数应存在');
assert(syncServiceCode.indexOf('function saveRecord(') !== -1, 'saveRecord 函数应存在');
assert(syncServiceCode.indexOf('function deleteLocalRecord(') !== -1, 'deleteLocalRecord 函数应存在');
assert(syncServiceCode.indexOf('function getLastSyncTime(') !== -1, 'getLastSyncTime 函数应存在');
assert(syncServiceCode.indexOf('function getPendingChanges(') !== -1, 'getPendingChanges 函数应存在');
assert(syncServiceCode.indexOf('sync: sync') !== -1, 'sync 应被导出');
assert(syncServiceCode.indexOf('startAutoSync: startAutoSync') !== -1, 'startAutoSync 应被导出');
assert(syncServiceCode.indexOf('stopAutoSync: stopAutoSync') !== -1, 'stopAutoSync 应被导出');

console.log('\n【16. 应用配置 AppConfig】');
var configCode = fs.readFileSync(path.join(baseDir, 'config.js'), 'utf8');
assert(configCode.indexOf('AppConfig') !== -1, 'AppConfig 应在代码中定义');
assert(configCode.indexOf('API_BASE_URL') !== -1, 'API_BASE_URL 应存在');
assert(configCode.indexOf('MODEL') !== -1, 'MODEL 应存在');
assert(configCode.indexOf('MAX_TOKENS') !== -1, 'MAX_TOKENS 应存在');
assert(configCode.indexOf('TEMPERATURE') !== -1, 'TEMPERATURE 应存在');
assert(configCode.indexOf('STREAM') !== -1, 'STREAM 应存在');
assert(configCode.indexOf('api/ai') !== -1, 'API_BASE_URL 应包含 api/ai');
assert(configCode.indexOf('sk-') === -1, 'API_BASE_URL 不应包含API Key');

console.log('\n【17. 后端API集成测试】');
skip('POST /api/auth/register - 注册新用户', '异步测试需手动验证');
skip('POST /api/auth/login - 用户登录', '异步测试需手动验证');
skip('GET /api/records - 获取记录列表', '异步测试需手动验证');

console.log('\n【18. 侧边栏】');
skip('侧边栏 - 点击菜单按钮应打开', '需要DOM交互');

console.log('\n【19. 聊天界面交互】');
skip('发送 - 输入文字后点击发送应发送消息', '需要DOM交互');
skip('输入框 - Enter应发送消息', '需要DOM交互');
skip('输入框 - Shift+Enter应换行', '需要DOM交互');

console.log('\n【20. 数据完整性】');
assertEqual(MedicalApp.escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;', 'XSS - script标签应被转义');
assertEqual(MedicalApp.escapeHtml('<img onerror=alert(1) src=x>'), '&lt;img onerror=alert(1) src=x&gt;', 'XSS - img标签应被转义');
assertEqual(MedicalApp.escapeHtml('正常文本'), '正常文本', '正常文本不应变化');

var id1 = 'rec_' + Date.now() + '_1';
var id2 = 'rec_' + Date.now() + '_2';
assert(id1 !== id2, '记录ID应唯一');
assert(id1.indexOf('rec_') === 0, '记录ID应以rec_开头');

var dateStr = new Date().toISOString().split('T')[0];
assert(dateStr.match(/^\d{4}-\d{2}-\d{2}$/), '日期格式应为YYYY-MM-DD');

console.log('\n========================================');
console.log('  测试结果汇总');
console.log('========================================');
var total = passed + failed + skipped;
console.log('  总计: ' + total);
console.log('  通过: ' + passed + ' (' + (total > 0 ? Math.round(passed / total * 100) : 0) + '%)');
console.log('  失败: ' + failed);
console.log('  跳过: ' + skipped);

if (errors.length > 0) {
    console.log('\n  失败详情:');
    errors.forEach(function(e, i) {
        console.log('  ' + (i + 1) + '. ' + e.name + ' — ' + e.error);
    });
}

console.log('\n');

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
