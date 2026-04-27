var MedicalApp = (function() {
    'use strict';

    function parseRecordFromText(text) {
        if (!text || typeof text !== 'string') {
            return null;
        }

        var hospital = '未知医院';

        var diagnosis = '';
        var diagnoses = ['上呼吸道感染', '急性胃肠炎', '过敏性鼻炎', '高血压', '糖尿病', '急性上呼吸道感染', '感冒', '发烧', '咳嗽', '胃炎', '扁桃体炎', '支气管炎', '肺炎', '颈椎病', '腰椎间盘突出', '骨折', '阑尾炎', '荨麻疹', '湿疹', '结膜炎'];
        for (var j = 0; j < diagnoses.length; j++) {
            if (text.indexOf(diagnoses[j]) !== -1) {
                diagnosis = diagnoses[j];
                break;
            }
        }

        var diagPattern = /诊断[为是]?\s*([\u4e00-\u9fa5]{2,10})/;
        var diagMatch = diagPattern.exec(text);
        if (diagMatch) {
            diagnosis = diagMatch[1];
        }

        var departments = ['呼吸内科', '消化内科', '心内科', '心血管内科', '神经内科', '内分泌科', '肾内科', '血液科', '风湿免疫科', '骨科', '皮肤科', '眼科', '耳鼻喉科', '口腔科', '泌尿外科', '心胸外科', '神经外科', '普外科', '内科', '外科', '儿科', '妇科', '产科', '中医科', '康复科', '急诊科'];
        var department = '';
        for (var k = 0; k < departments.length; k++) {
            if (text.indexOf(departments[k]) !== -1) {
                department = departments[k];
                break;
            }
        }

        var doctorPattern = /(?:医生|大夫|教授|主任)[：:]\s*([\u4e00-\u9fa5]{2,4})/;
        var doctorMatch = doctorPattern.exec(text);
        var doctor = doctorMatch ? doctorMatch[1] : '';

        var complaint = '';

        return {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            hospital: hospital,
            department: department,
            doctor: doctor,
            complaint: complaint,
            diagnosis: diagnosis,
            medication: '',
            examination: '',
            notes: '',
            images: []
        };
    }

    function classifyMessage(text) {
        if (!text || typeof text !== 'string') {
            return 'unknown';
        }

        var deleteKeywords = ['删除', '删掉', '去掉', '移除', '不要这条', '取消记录', '删了'];
        var queryKeywords = ['查询', '查看', '最近', '上次', '历史', '记录', '什么'];
        var recordKeywords = ['去了', '看病', '就诊', '住院', '检查', '诊断', '感冒', '发烧', '咳嗽', '头疼', '胃疼', '腹泻'];

        var isDelete = deleteKeywords.some(function(kw) { return text.indexOf(kw) !== -1; });
        var isQuery = queryKeywords.some(function(kw) { return text.indexOf(kw) !== -1; });
        var isRecord = recordKeywords.some(function(kw) { return text.indexOf(kw) !== -1; });

        if (isDelete) return 'delete';
        if (isQuery) return 'query';
        if (isRecord) return 'record';
        return 'general';
    }

    function calculateStats(records) {
        if (!Array.isArray(records)) {
            return { total: 0, halfYear: 0, topDepartment: '', diagnosisCounts: {} };
        }

        var total = records.length;
        var sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
        var halfYear = records.filter(function(r) {
            return new Date(r.date) >= sixMonthsAgo;
        }).length;

        var deptCount = {};
        records.forEach(function(r) {
            if (r.department) {
                deptCount[r.department] = (deptCount[r.department] || 0) + 1;
            }
        });

        var topDepartment = '';
        var topCount = 0;
        for (var dept in deptCount) {
            if (deptCount[dept] > topCount) {
                topCount = deptCount[dept];
                topDepartment = dept;
            }
        }

        var diagCount = {};
        records.forEach(function(r) {
            if (r.diagnosis && r.diagnosis !== '待确认') {
                diagCount[r.diagnosis] = (diagCount[r.diagnosis] || 0) + 1;
            }
        });

        return {
            total: total,
            halfYear: halfYear,
            topDepartment: topDepartment,
            diagnosisCounts: diagCount
        };
    }

    function validatePhone(phone) {
        if (!phone || typeof phone !== 'string') return false;
        return /^1\d{10}$/.test(phone);
    }

    function validateCode(code) {
        if (!code || typeof code !== 'string') return false;
        return code.length >= 4;
    }

    function maskPhone(phone) {
        if (!phone || phone.length !== 11) return phone;
        return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    }

    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function saveRecords(records) {
        localStorage.setItem('medicalRecords', JSON.stringify(records));
    }

    function loadRecords() {
        try {
            return JSON.parse(localStorage.getItem('medicalRecords') || '[]');
        } catch (e) {
            return [];
        }
    }

    function generateSystemResponse(text, records) {
        var type = classifyMessage(text);

        if (type === 'delete') {
            if (records && records.length > 0) {
                return {
                    type: 'delete',
                    message: '好的，已为您删除该条就诊记录。',
                    record: records[0]
                };
            }
            return {
                type: 'delete',
                message: '您还没有就诊记录，无需删除。',
                record: null
            };
        }

        if (type === 'record') {
            var newRecord = parseRecordFromText(text);
            return {
                type: 'record',
                message: '好的，我已经为您记录下本次就诊信息：',
                record: newRecord
            };
        }

        if (type === 'query') {
            if (records && records.length > 0) {
                return {
                    type: 'query',
                    message: '根据您的记录，最近一次就诊信息如下：',
                    record: records[0]
                };
            }
            return {
                type: 'query',
                message: '您还没有就诊记录。告诉我您的就诊信息，我会为您自动整理记录。',
                record: null
            };
        }

        if (records && records.length > 0) {
            return {
                type: 'general',
                message: '我已收到您的消息。如需记录就诊信息，请告诉我医院和症状；如需查询历史记录，请说"查询最近记录"。',
                record: null
            };
        }

        return {
            type: 'general',
            message: '我已收到您的消息。您可以通过语音或文字告诉我就诊信息，我会为您自动整理记录。',
            record: null
        };
    }

    function mergeRecordData(target, source) {
        if (!source) return target;
        if (source.hospital && source.hospital !== '未知' && source.hospital !== '未知医院') {
            target.hospital = source.hospital;
        }
        if (source.department) target.department = source.department;
        if (source.doctor) target.doctor = source.doctor;
        if (source.complaint) {
            if (target.complaint) {
                if (target.complaint.indexOf(source.complaint) === -1 && source.complaint.indexOf(target.complaint) === -1) {
                    target.complaint = target.complaint + '；' + source.complaint;
                } else if (source.complaint.length > target.complaint.length) {
                    target.complaint = source.complaint;
                }
            } else {
                target.complaint = source.complaint;
            }
        }
        if (source.diagnosis && source.diagnosis !== '待确认' && source.diagnosis !== '未知') {
            target.diagnosis = source.diagnosis;
        }
        if (source.medication) target.medication = source.medication;
        if (source.examination) target.examination = source.examination;
        if (source.notes) target.notes = source.notes;
        return target;
    }

    return {
        parseRecordFromText: parseRecordFromText,
        classifyMessage: classifyMessage,
        calculateStats: calculateStats,
        validatePhone: validatePhone,
        validateCode: validateCode,
        maskPhone: maskPhone,
        escapeHtml: escapeHtml,
        saveRecords: saveRecords,
        loadRecords: loadRecords,
        generateSystemResponse: generateSystemResponse,
        mergeRecordData: mergeRecordData
    };
})();
