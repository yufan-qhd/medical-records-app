var AIService = (function() {
    'use strict';

    var conversationHistory = [];

    function getSystemPrompt(records) {
        var recordsSummary = '';
        if (records && records.length > 0) {
            recordsSummary = '\n\n## 用户现有医疗记录\n';
            records.forEach(function(r, i) {
                recordsSummary += '\n### 记录' + (i + 1) + '\n';
                recordsSummary += '- 日期: ' + (r.date || '未知') + '\n';
                recordsSummary += '- 医院: ' + (r.hospital || '未知') + '\n';
                recordsSummary += '- 科室: ' + (r.department || '未知') + '\n';
                recordsSummary += '- 医生: ' + (r.doctor || '未知') + '\n';
                recordsSummary += '- 主诉: ' + (r.complaint || '未知') + '\n';
                recordsSummary += '- 诊断: ' + (r.diagnosis || '未知') + '\n';
                if (r.notes) recordsSummary += '- 备注: ' + r.notes + '\n';
            });
        } else {
            recordsSummary = '\n\n## 用户现有医疗记录\n暂无记录。';
        }

        return '你是「医疗档案助手」，一位贴心专业的个人健康管家。\n\n' +
            '## 你的身份\n' +
            '- 你帮助用户记录和管理个人医疗档案\n' +
            '- 你不是医生，不提供诊断，但可以给出健康建议\n' +
            '- 涉及严重症状时，务必提醒用户及时就医\n\n' +
            '## 回复风格\n' +
            '- 用亲切自然的口语交流，像朋友一样\n' +
            '- 回复简洁，不要列出字段名，而是自然地说"您去了xxx医院"\n' +
            '- 不要使用markdown格式、不要用代码块、不要输出JSON\n' +
            '- 绝对不要在回复中包含任何结构化数据或特殊标记\n\n' +
            '## 场景处理\n' +
            '- 用户描述就诊经历时：用自然语言确认记录，如"好的，已为您记录下这次在华西医院的就诊信息~"\n' +
            '- 用户查询历史记录时：根据已有记录用自然语言回答\n' +
            '- 用户要求删除记录时：确认删除，如"好的，已为您删除该条记录~"\n' +
            '- 用户询问健康问题时：给出专业但通俗的建议\n' +
            '- 用户描述含糊时：主动追问关键信息\n' +
            '- 不要编造不存在的记录' +
            recordsSummary;
    }

    function getExtractionPrompt(userText, currentRecord) {
        var currentInfo = '';
        if (currentRecord) {
            currentInfo = '\n\n## 当前正在记录的就诊信息\n' +
                '- 医院: ' + (currentRecord.hospital || '未知') + '\n' +
                '- 科室: ' + (currentRecord.department || '未知') + '\n' +
                '- 诊断: ' + (currentRecord.diagnosis || '未知') + '\n' +
                '- 主诉: ' + (currentRecord.complaint || '未知') + '\n' +
                '- 用药: ' + (currentRecord.medication || '未知') + '\n' +
                '- 检查: ' + (currentRecord.examination || '未知') + '\n';
        }

        return '你是一个医疗信息提取助手。从用户的描述中提取就诊记录的结构化数据。\n\n' +
            '提取以下字段：\n' +
            '- action: 用户意图，取值为 "add"（新增/补充记录）、"delete"（删除记录）、"query"（查询记录）或 null（无关操作）\n' +
            '- delete_target: 当action为delete时，标识要删除的记录。取值为 "latest"（最近一条）、"current"（当前正在编辑的记录）或具体记录的医院名/日期\n' +
            '- hospital: 医院名称（必须从原文提取完整名称，如"华西医院"、"市第一人民医院"）\n' +
            '- department: 科室（如"内科"、"骨科"）\n' +
            '- doctor: 医生姓名（未提及则为空字符串）\n' +
            '- complaint: 主诉/症状总结（用简洁医学术语概括用户描述的症状，不要照搬原话，如用户说"我肚子一直疼还拉肚子"应总结为"腹痛伴腹泻"）\n' +
            '- diagnosis: 诊断结果（未明确则为空字符串）\n' +
            '- medication: 用药信息（如"阿莫西林、布洛芬"，未提及则为空字符串）\n' +
            '- examination: 检查项目（如"血常规、CT"，未提及则为空字符串）\n' +
            '- notes: 其他备注信息\n' +
            '- is_new_visit: 布尔值，判断用户本次描述的是否是一次新的就诊\n\n' +
            '## action 判断规则：\n' +
            '- 用户说"删除"、"删掉"、"去掉"、"移除"、"不要这条"等 → action: "delete"\n' +
            '- 用户说"查询"、"查看"、"最近记录"等 → action: "query"\n' +
            '- 用户描述就诊经历 → action: "add"\n' +
            '- 其他无关对话 → action: null\n\n' +
            '## is_new_visit 判断规则（非常重要，默认为false）：\n' +
            '只有以下情况设为 true：\n' +
            '- 用户明确说"又去"、"上次"、"之前"、"还有一次"等表示另一次就诊的词语\n' +
            '- 用户描述的症状与当前就诊完全无关，且明确是另一次看病\n\n' +
            '以下情况必须设为 false：\n' +
            '- 用户在补充当前就诊的细节（科室、医生、诊断、用药、检查等）\n' +
            '- 用户在回答关于当前就诊的追问\n' +
            '- 用户描述的内容与当前就诊相关（即使提到了新症状，只要属于同一次就诊）\n' +
            '- 不确定时，默认设为 false\n\n' +
            '规则：\n' +
            '1. 只输出一个JSON对象，不要输出任何其他文字\n' +
            '2. hospital字段必须从用户原文中提取完整医院名称，不要填"未知"\n' +
            '3. 如果用户描述的不是就诊经历，输出null' +
            currentInfo +
            '\n\n用户描述：' + userText;
    }

    function buildMessages(userText, records) {
        if (conversationHistory.length === 0) {
            conversationHistory.push({
                role: 'system',
                content: getSystemPrompt(records)
            });
        } else {
            conversationHistory[0] = {
                role: 'system',
                content: getSystemPrompt(records)
            };
        }

        conversationHistory.push({
            role: 'user',
            content: userText
        });

        var trimmed = conversationHistory.slice(-20);
        if (trimmed[0].role !== 'system' && conversationHistory.length > 20) {
            trimmed.unshift(conversationHistory[0]);
        }

        return trimmed;
    }

    function chat(userText, records, onChunk, onComplete, onError) {
        var messages = buildMessages(userText, records);

        var requestBody = {
            model: AppConfig.MODEL,
            messages: messages,
            max_tokens: AppConfig.MAX_TOKENS,
            temperature: AppConfig.TEMPERATURE,
            stream: AppConfig.STREAM
        };

        var fullResponse = '';
        var apiUrl = AppConfig.API_BASE_URL + '/chat';

        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })
        .then(function(response) {
            if (!response.ok) {
                return response.text().then(function(errText) {
                    throw new Error('API请求失败: ' + response.status);
                });
            }

            if (AppConfig.STREAM) {
                var reader = response.body.getReader();
                var decoder = new TextDecoder();
                var buffer = '';
                var streamDone = false;

                function read() {
                    reader.read().then(function(result) {
                        if (streamDone) return;
                        if (result.done) {
                            streamDone = true;
                            conversationHistory.push({
                                role: 'assistant',
                                content: fullResponse
                            });
                            if (onComplete) onComplete(fullResponse);
                            return;
                        }

                        buffer += decoder.decode(result.value, { stream: true });
                        var lines = buffer.split('\n');
                        buffer = lines.pop();

                        for (var i = 0; i < lines.length; i++) {
                            var line = lines[i].trim();
                            if (line.indexOf('data: ') !== 0) continue;
                            var data = line.slice(6);
                            if (data === '[DONE]') {
                                streamDone = true;
                                conversationHistory.push({
                                    role: 'assistant',
                                    content: fullResponse
                                });
                                if (onComplete) onComplete(fullResponse);
                                return;
                            }

                            try {
                                var parsed = JSON.parse(data);
                                var content = parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content;
                                if (content) {
                                    fullResponse += content;
                                    if (onChunk) onChunk(content);
                                }
                            } catch (e) {}
                        }

                        read();
                    }).catch(function(err) {
                        if (streamDone) return;
                        streamDone = true;
                        if (fullResponse && onComplete) {
                            conversationHistory.push({
                                role: 'assistant',
                                content: fullResponse
                            });
                            onComplete(fullResponse);
                        } else if (onError) {
                            onError(err.message);
                        }
                    });
                }

                read();
            } else {
                response.json().then(function(data) {
                    fullResponse = data.choices[0].message.content;
                    conversationHistory.push({
                        role: 'assistant',
                        content: fullResponse
                    });
                    if (onComplete) onComplete(fullResponse);
                }).catch(function(err) {
                    if (onError) onError(err.message);
                });
            }
        })
        .catch(function(err) {
            if (onError) onError('网络错误: ' + err.message);
        });
    }

    function extractRecord(userText, currentRecord, callback) {
        var requestBody = {
            model: AppConfig.MODEL,
            messages: [
                { role: 'system', content: getExtractionPrompt(userText, currentRecord) },
                { role: 'user', content: userText }
            ],
            max_tokens: 300,
            temperature: 0.1,
            stream: false
        };

        var apiUrl = AppConfig.API_BASE_URL + '/extract';

        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })
        .then(function(response) {
            if (!response.ok) throw new Error('Extraction API failed');
            return response.json();
        })
        .then(function(data) {
            var text = data.choices[0].message.content.trim();

            if (text === 'null' || text === 'NULL') {
                callback(null);
                return;
            }

            try {
                var parsed = JSON.parse(text);
                if (parsed === null) {
                    callback(null);
                } else if (parsed.action === 'delete' || parsed.action === 'query') {
                    callback(parsed);
                } else if (parsed.hospital || parsed.diagnosis || parsed.complaint) {
                    callback(parsed);
                } else {
                    callback(null);
                }
            } catch (e) {
                var braceStart = text.indexOf('{');
                var braceEnd = text.lastIndexOf('}');
                if (braceStart !== -1 && braceEnd !== -1) {
                    try {
                        var parsed2 = JSON.parse(text.substring(braceStart, braceEnd + 1));
                        if (parsed2.action === 'delete' || parsed2.action === 'query') {
                            callback(parsed2);
                        } else if (parsed2.hospital || parsed2.diagnosis || parsed2.complaint) {
                            callback(parsed2);
                        } else {
                            callback(null);
                        }
                    } catch (e2) {
                        callback(null);
                    }
                } else {
                    callback(null);
                }
            }
        })
        .catch(function() {
            callback(null);
        });
    }

    function clearHistory() {
        conversationHistory = [];
    }

    function getHistory() {
        return conversationHistory.slice();
    }

    return {
        chat: chat,
        extractRecord: extractRecord,
        clearHistory: clearHistory,
        getHistory: getHistory
    };
})();
