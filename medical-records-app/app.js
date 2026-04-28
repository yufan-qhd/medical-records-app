(function() {
    'use strict';

    var records = [];
    var isLoggedIn = localStorage.getItem('isLoggedIn') === 'true' || ApiService.isLoggedIn();
    var messages = [];
    var isRecording = false;
    var pressTimer = null;
    var recognition = null;
    var isAiResponding = false;
    var pendingImages = [];
    var aiTimeout = null;
    var activeRecord = null;
    var activeCardEl = null;

    function init() {
        initLogin();
        initMainScreen();
        initVoiceButton();
        initDrawer();
        initRecordsPanel();
        initStatsPanel();
        initDetailPanel();
        initAddRecordPanel();
        initImageUpload();

        if (isLoggedIn) {
            loadRecordsFromLocal();
            showMainScreen();
            if (ApiService.isLoggedIn()) {
                SyncService.startAutoSync();
            }
        }

        updateStats();
    }

    var codeCountdown = 0;
    var codeTimer = null;

    function initLogin() {
        var loginBtn = document.getElementById('login-btn');
        var loginPhone = document.getElementById('login-phone');
        var loginCode = document.getElementById('login-code');
        var sendCodeBtn = document.getElementById('send-code-btn');
        var wechatLoginBtn = document.getElementById('wechat-login-btn');
        var loginCloseBtn = document.getElementById('login-close-btn');
        var drawerUserInfo = document.getElementById('drawer-user-info');

        loginBtn.addEventListener('click', function() {
            var phone = loginPhone.value.trim();
            var code = loginCode.value.trim();
            if (!phone) {
                alert('请输入手机号');
                return;
            }
            if (!/^1\d{10}$/.test(phone)) {
                alert('请输入正确的手机号');
                return;
            }
            if (!code) {
                alert('请输入验证码');
                return;
            }

            loginBtn.disabled = true;
            loginBtn.textContent = '登录中...';

            ApiService.loginWithPhone(phone, code, function(err, user) {
                loginBtn.disabled = false;
                loginBtn.textContent = '登录';

                if (err) {
                    alert(err);
                    return;
                }

                handleLoginSuccess(user);
            });
        });

        if (sendCodeBtn) {
            sendCodeBtn.addEventListener('click', function() {
                var phone = loginPhone.value.trim();
                if (!phone) {
                    alert('请输入手机号');
                    return;
                }
                if (!/^1\d{10}$/.test(phone)) {
                    alert('请输入正确的手机号');
                    return;
                }
                if (codeCountdown > 0) return;

                ApiService.sendVerifyCode(phone, function(err) {
                    if (err) {
                        alert(err);
                        return;
                    }
                    alert('验证码已发送（模拟模式：123456）');
                    startCodeCountdown(sendCodeBtn);
                });
            });
        }

        if (wechatLoginBtn) {
            wechatLoginBtn.addEventListener('click', function() {
                wechatLoginBtn.disabled = true;
                ApiService.loginWithWechat(function(err, user) {
                    wechatLoginBtn.disabled = false;
                    if (err) {
                        alert(err);
                        return;
                    }
                    handleLoginSuccess(user);
                });
            });
        }

        if (loginCloseBtn) {
            loginCloseBtn.addEventListener('click', function() {
                showMainScreen();
            });
        }

        if (drawerUserInfo) {
            drawerUserInfo.addEventListener('click', function() {
                if (!isLoggedIn) {
                    showLoginScreen();
                }
            });
        }

        if (isLoggedIn) {
            updateDrawerUser();
        }
    }

    function updateDrawerUser() {
        var drawerUsername = document.querySelector('.drawer-username');
        var drawerUserDesc = document.querySelector('.drawer-user-desc');
        var drawerAvatar = document.getElementById('drawer-user-avatar');

        if (isLoggedIn) {
            var apiUser = ApiService.getUser();
            if (apiUser) {
                drawerUsername.textContent = apiUser.nickname || apiUser.phone || apiUser.email || '已登录';
                drawerUserDesc.textContent = '您的健康数据已同步';
            } else {
                drawerUsername.textContent = '已登录';
                drawerUserDesc.textContent = '您的健康数据已同步';
            }
            drawerAvatar.className = 'drawer-avatar logged-in';
            drawerAvatar.innerHTML = '<i class="fas fa-user"></i>';
        } else {
            drawerUsername.textContent = '点击登录';
            drawerUserDesc.textContent = '登录后管理您的健康数据';
            drawerAvatar.className = 'drawer-avatar logged-out';
            drawerAvatar.innerHTML = '<i class="fas fa-user"></i>';
        }
    }

    function handleLoginSuccess(user) {
        isLoggedIn = true;
        localStorage.setItem('isLoggedIn', 'true');
        if (user && user.token) {
            localStorage.setItem('authToken', user.token);
        }
        if (user && user.phone) {
            localStorage.setItem('userPhone', user.phone);
        }
        loadRecordsFromLocal();
        showMainScreen();
        updateDrawerUser();
        if (ApiService.isLoggedIn()) {
            SyncService.startAutoSync();
        }
    }

    function startCodeCountdown(btn) {
        codeCountdown = 60;
        btn.disabled = true;
        btn.textContent = codeCountdown + 's';
        codeTimer = setInterval(function() {
            codeCountdown--;
            if (codeCountdown <= 0) {
                clearInterval(codeTimer);
                codeTimer = null;
                btn.disabled = false;
                btn.textContent = '获取验证码';
            } else {
                btn.textContent = codeCountdown + 's';
            }
        }, 1000);
    }

    function showLoginScreen() {
        var loginScreen = document.getElementById('login-screen');
        var drawerBtn = document.getElementById('drawer-btn');
        loginScreen.classList.remove('hidden');
        loginScreen.classList.add('active');
        if (drawerBtn) drawerBtn.style.display = 'none';
    }

    function showMainScreen() {
        var loginScreen = document.getElementById('login-screen');
        var mainScreen = document.getElementById('main-screen');
        var voiceBtn = document.getElementById('floating-voice-btn');
        var drawerBtn = document.getElementById('drawer-btn');

        loginScreen.classList.add('hidden');
        loginScreen.classList.remove('active');
        mainScreen.classList.add('active');
        voiceBtn.style.display = 'flex';
        if (drawerBtn) drawerBtn.style.display = 'flex';
    }

    function adjustVoiceBtnPosition() {
        var inputBar = document.querySelector('.input-bar-inner');
        var floatingVoiceBtn = document.querySelector('.floating-voice-btn');
        var recordingHintEl = document.querySelector('.recording-hint');
        if (!inputBar || !floatingVoiceBtn) return;
        var extraHeight = inputBar.offsetHeight - 60;
        if (extraHeight > 0) {
            floatingVoiceBtn.style.bottom = (112 + extraHeight) + 'px';
            if (recordingHintEl) {
                recordingHintEl.style.bottom = (112 + 80 + 24 + extraHeight) + 'px';
            }
        } else {
            floatingVoiceBtn.style.bottom = '';
            if (recordingHintEl) {
                recordingHintEl.style.bottom = '';
            }
        }
    }

    function initMainScreen() {
        var chatInput = document.getElementById('main-chat-input');
        var sendBtn = document.getElementById('main-send-btn');
        var isComposing = false;

        chatInput.addEventListener('compositionstart', function() {
            isComposing = true;
        });

        chatInput.addEventListener('compositionend', function() {
            isComposing = false;
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
            adjustVoiceBtnPosition();
        });

        chatInput.addEventListener('input', function() {
            if (chatInput.value.trim()) {
                sendBtn.classList.add('active');
            } else {
                sendBtn.classList.remove('active');
            }
            if (!isComposing) {
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
                adjustVoiceBtnPosition();
            }
        });

        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !isComposing) {
                e.preventDefault();
                if (chatInput.value.trim() || pendingImages.length > 0) {
                    handleSend();
                }
            }
        });

        sendBtn.addEventListener('click', function() {
            if (chatInput.value.trim() || pendingImages.length > 0) {
                handleSend();
            }
        });

        var quickBtns = document.querySelectorAll('.quick-action-btn');
        quickBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var text = btn.getAttribute('data-text');
                chatInput.value = text;
                sendBtn.classList.add('active');
                handleSend();
            });
        });
    }

    function handleSend() {
        var chatInput = document.getElementById('main-chat-input');
        var sendBtn = document.getElementById('main-send-btn');
        var text = chatInput.value.trim();
        if (!text && pendingImages.length === 0) return;

        if (!text) {
            text = '请帮我识别这些医疗图片的内容';
        }

        hideWelcome();

        addMessage('user', text);
        chatInput.value = '';
        chatInput.style.height = 'auto';
        adjustVoiceBtnPosition();
        sendBtn.classList.remove('active');

        processUserMessage(text);
    }

    function hideWelcome() {
        var welcome = document.getElementById('welcome-container');
        if (welcome) {
            welcome.style.display = 'none';
        }
    }

    function addMessage(type, content, recordData) {
        var chatMessages = document.getElementById('main-chat-messages');
        var now = new Date();
        var timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        var msgDiv = document.createElement('div');
        msgDiv.className = 'message ' + type;

        if (type === 'bot') {
            var avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            avatar.innerHTML = '<i class="fas fa-robot"></i>';
            msgDiv.appendChild(avatar);
        }

        var bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';

        var contentP = document.createElement('p');
        contentP.textContent = content;
        bubbleDiv.appendChild(contentP);

        if (recordData) {
            var card = createRecordCard(recordData);
            bubbleDiv.appendChild(card);
        }

        var timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        timeSpan.textContent = timeStr;
        bubbleDiv.appendChild(timeSpan);

        msgDiv.appendChild(bubbleDiv);
        chatMessages.appendChild(msgDiv);

        messages.push({ type: type, content: content, time: timeStr, record: recordData });
        scrollToBottom();
    }

    function addStreamingBotMessage() {
        var chatMessages = document.getElementById('main-chat-messages');
        var now = new Date();
        var timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        var msgDiv = document.createElement('div');
        msgDiv.className = 'message bot';
        msgDiv.id = 'streaming-msg';

        var avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<i class="fas fa-robot"></i>';
        msgDiv.appendChild(avatar);

        var bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';

        var contentP = document.createElement('p');
        contentP.id = 'streaming-content';
        contentP.innerHTML = '<span class="typing-cursor">|</span>';
        bubbleDiv.appendChild(contentP);

        var timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        timeSpan.textContent = timeStr;
        bubbleDiv.appendChild(timeSpan);

        msgDiv.appendChild(bubbleDiv);
        chatMessages.appendChild(msgDiv);

        scrollToBottom();
        return contentP;
    }

    function updateStreamingContent(contentEl, chunk) {
        var cursor = contentEl.querySelector('.typing-cursor');
        if (cursor) cursor.remove();

        contentEl.textContent += chunk;
        var newCursor = document.createElement('span');
        newCursor.className = 'typing-cursor';
        newCursor.textContent = '|';
        contentEl.appendChild(newCursor);

        scrollToBottom();
    }

    function finalizeStreamingMessage(contentEl, fullText, recordData) {
        var cursor = contentEl.querySelector('.typing-cursor');
        if (cursor) cursor.remove();

        contentEl.textContent = fullText;

        if (recordData) {
            var bubble = contentEl.parentElement;
            var card = createRecordCard(recordData);
            bubble.insertBefore(card, bubble.querySelector('.message-time'));
        }

        var msgDiv = document.getElementById('streaming-msg');
        if (msgDiv) msgDiv.removeAttribute('id');

        messages.push({
            type: 'bot',
            content: fullText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            record: recordData
        });
    }

    function updateCardElement(cardEl, record) {
        if (!cardEl) return;
        var titleEl = cardEl.querySelector('.record-card-title');
        var metaEl = cardEl.querySelector('.record-card-meta');
        if (titleEl) titleEl.textContent = record.hospital;
        if (metaEl) metaEl.textContent = record.date + (record.department ? ' \u00B7 ' + record.department : '');

        var oldComplaint = cardEl.querySelector('.record-card-diagnosis');
        if (oldComplaint) oldComplaint.remove();

        if (record.complaint) {
            var complaint = document.createElement('div');
            complaint.className = 'record-card-diagnosis';
            var complaintP = document.createElement('p');
            complaintP.textContent = record.complaint;
            complaint.appendChild(complaintP);
            var imageThumbsEl = cardEl.querySelector('.image-thumbs');
            if (imageThumbsEl) {
                cardEl.insertBefore(complaint, imageThumbsEl);
            } else {
                cardEl.appendChild(complaint);
            }
        }
    }

    function processUserMessage(text) {
        isAiResponding = true;

        if (aiTimeout) clearTimeout(aiTimeout);
        aiTimeout = setTimeout(function() {
            if (isAiResponding) {
                isAiResponding = false;
            }
        }, 30000);

        var hasImages = pendingImages.length > 0;
        var currentPendingImages = pendingImages.slice();

        if (hasImages) {
            pendingImages = [];
            renderImagePreviewBar();
        }

        var contentEl = addStreamingBotMessage();
        var fullText = '';

        if (hasImages) {
            var userMsgImages = document.createElement('div');
            userMsgImages.className = 'message-images';
            currentPendingImages.forEach(function(img) {
                var thumb = document.createElement('div');
                thumb.className = 'message-image-thumb';
                var imgEl = document.createElement('img');
                imgEl.src = img.preview;
                imgEl.alt = '上传图片';
                imgEl.addEventListener('click', function() {
                    openImageViewer(img.preview);
                });
                thumb.appendChild(imgEl);
                userMsgImages.appendChild(thumb);
            });
            var lastUserMsg = document.querySelector('.message.user:last-of-type .message-bubble');
            if (lastUserMsg) {
                lastUserMsg.insertBefore(userMsgImages, lastUserMsg.querySelector('.message-time'));
            }
        }

        function finishResponding() {
            if (aiTimeout) {
                clearTimeout(aiTimeout);
                aiTimeout = null;
            }
            isAiResponding = false;
        }

        function handleExtractedRecord(recordData) {
            var aiData = recordData || {};

            if (aiData.action === 'delete') {
                var deleteTarget = aiData.delete_target || 'latest';
                var deletedRecord = null;

                if (deleteTarget === 'current' && activeRecord) {
                    deletedRecord = activeRecord;
                } else if (records.length > 0) {
                    if (deleteTarget === 'latest') {
                        deletedRecord = records[0];
                    } else {
                        for (var d = 0; d < records.length; d++) {
                            if ((deleteTarget && records[d].hospital && records[d].hospital.indexOf(deleteTarget) !== -1) ||
                                (deleteTarget && records[d].date === deleteTarget)) {
                                deletedRecord = records[d];
                                break;
                            }
                        }
                        if (!deletedRecord) {
                            deletedRecord = records[0];
                        }
                    }
                }

                if (deletedRecord) {
                    var deleteIdx = records.indexOf(deletedRecord);
                    if (deleteIdx !== -1) {
                        records.splice(deleteIdx, 1);
                    }
                    if (activeRecord === deletedRecord) {
                        activeRecord = null;
                        activeCardEl = null;
                    }
                    saveRecords();
                    updateStats();
                }
                return;
            }

            var fallback = MedicalApp.parseRecordFromText(text);
            var fbData = fallback || {};

            var isNewVisit = false;
            if (!activeRecord) {
                isNewVisit = true;
            } else if (recordData && recordData.is_new_visit === true) {
                isNewVisit = true;
            }

            if (!isNewVisit && activeRecord) {
                MedicalApp.mergeRecordData(activeRecord, aiData);
                var fbDataNoHospital = fbData;
                if (fbDataNoHospital) {
                    delete fbDataNoHospital.hospital;
                }
                MedicalApp.mergeRecordData(activeRecord, fbDataNoHospital);

                if (hasImages) {
                    savePendingImagesToStore(activeRecord.id, function(imageIds) {
                        activeRecord.images = activeRecord.images.concat(imageIds);
                        saveRecords();
                        updateStats();
                        updateCardElement(activeCardEl, activeRecord);
                    });
                } else {
                    saveRecords();
                    updateStats();
                    updateCardElement(activeCardEl, activeRecord);
                }
            } else {
                var newRecord = {
                    id: Date.now(),
                    date: new Date().toISOString().split('T')[0],
                    hospital: '未知医院',
                    department: '',
                    doctor: '',
                    complaint: '',
                    diagnosis: '',
                    medication: '',
                    examination: '',
                    notes: '',
                    images: []
                };
                MedicalApp.mergeRecordData(newRecord, aiData);
                var fbDataNoHospital2 = fbData;
                if (fbDataNoHospital2) {
                    delete fbDataNoHospital2.hospital;
                }
                MedicalApp.mergeRecordData(newRecord, fbDataNoHospital2);

                activeRecord = newRecord;

                if (hasImages) {
                    savePendingImagesToStore(newRecord.id, function(imageIds) {
                        newRecord.images = imageIds;
                        records.unshift(newRecord);
                        saveRecords();
                        updateStats();

                        var lastBotBubble = contentEl.parentElement;
                        if (lastBotBubble) {
                            var card = createRecordCard(newRecord);
                            activeCardEl = card;
                            lastBotBubble.insertBefore(card, lastBotBubble.querySelector('.message-time'));
                        }

                        messages[messages.length - 1].record = newRecord;
                    });
                } else {
                    records.unshift(newRecord);
                    saveRecords();
                    updateStats();

                    var lastBotBubble = contentEl.parentElement;
                    if (lastBotBubble) {
                        var card = createRecordCard(newRecord);
                        activeCardEl = card;
                        lastBotBubble.insertBefore(card, lastBotBubble.querySelector('.message-time'));
                    }

                    messages[messages.length - 1].record = newRecord;
                }
            }
        }

        AIService.chat(
            text,
            records,
            function onChunk(chunk) {
                fullText += chunk;
                updateStreamingContent(contentEl, chunk);
            },
            function onComplete(responseText) {
                finalizeStreamingMessage(contentEl, responseText, null);

                finishResponding();

                AIService.extractRecord(text, activeRecord, function(recordData) {
                    if (recordData || hasImages) {
                        handleExtractedRecord(recordData);
                    }
                });
            },
            function onError(errorMsg) {
                var fallbackResponse = MedicalApp.generateSystemResponse(text, records);

                if (fallbackResponse.type === 'delete') {
                    if (records.length > 0) {
                        var delRecord = null;
                        if (activeRecord) {
                            delRecord = activeRecord;
                        } else {
                            delRecord = records[0];
                        }
                        var delIdx = records.indexOf(delRecord);
                        if (delIdx !== -1) {
                            records.splice(delIdx, 1);
                        }
                        if (activeRecord === delRecord) {
                            activeRecord = null;
                            activeCardEl = null;
                        }
                        saveRecords();
                        updateStats();
                    }
                } else if (fallbackResponse.type === 'record' || hasImages) {
                    var fallback = MedicalApp.parseRecordFromText(text);
                    if (fallback) {
                        handleExtractedRecord(null);
                    }
                }

                var errorText = fallbackResponse.message;
                if (errorMsg) {
                    errorText += '\n\n（AI服务暂时不可用，已使用本地模式回复）';
                }

                finalizeStreamingMessage(contentEl, errorText, null);

                finishResponding();
            }
        );
    }

    function createRecordCard(record) {
        var card = document.createElement('div');
        card.className = 'record-card';

        var header = document.createElement('div');
        header.className = 'record-card-header';

        var icon = document.createElement('div');
        icon.className = 'record-card-icon';
        icon.innerHTML = '<i class="fas fa-hospital"></i>';

        var info = document.createElement('div');
        var title = document.createElement('div');
        title.className = 'record-card-title';
        title.textContent = record.hospital;
        var meta = document.createElement('div');
        meta.className = 'record-card-meta';
        meta.textContent = record.date + (record.department ? ' \u00B7 ' + record.department : '');
        info.appendChild(title);
        info.appendChild(meta);

        header.appendChild(icon);
        header.appendChild(info);

        card.appendChild(header);

        if (record.complaint) {
            var complaint = document.createElement('div');
            complaint.className = 'record-card-diagnosis';
            var complaintP = document.createElement('p');
            complaintP.textContent = record.complaint;
            complaint.appendChild(complaintP);
            card.appendChild(complaint);
        }

        if (record.images && record.images.length > 0) {
            var imageThumbs = createImageThumbs(record.images, 'card');
            if (imageThumbs) card.appendChild(imageThumbs);
        }

        card.addEventListener('click', function() {
            showRecordDetail(record);
        });

        return card;
    }

    function scrollToBottom() {
        var chatMessages = document.getElementById('main-chat-messages');
        setTimeout(function() {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);
    }

    var recordingTimer = null;
    var recordingSeconds = 0;
    var MAX_RECORDING_SECONDS = 120;
    var voiceFinalTranscript = '';
    var isStoppingVoice = false;
    var isVoiceCancelled = false;
    var voiceStartY = 0;
    var CANCEL_THRESHOLD = 80;

    var useCapacitorVoice = false;
    var capacitorPartialListener = null;

    function initVoiceButton() {
        var voiceBtn = document.getElementById('floating-voice-btn');
        var recordingHint = document.getElementById('recording-hint');
        var voiceLabel = voiceBtn.querySelector('.voice-label');

        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.lang = 'zh-CN';
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;

            recognition.onresult = function(event) {
                console.log('[Voice] onresult, results length:', event.results.length);
                var interimTranscript = '';
                for (var i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        voiceFinalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                var fullText = voiceFinalTranscript + interimTranscript;
                console.log('[Voice] recognized text:', fullText);
                if (fullText) {
                    var chatInput = document.getElementById('main-chat-input');
                    chatInput.value = fullText;
                    var sendBtn = document.getElementById('main-send-btn');
                    sendBtn.classList.add('active');
                }
            };

            recognition.onerror = function(event) {
                console.log('[Voice] onerror:', event.error);
                if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture') {
                    stopVoiceRecording();
                }
            };

            recognition.onend = function() {
                console.log('[Voice] onend, isRecording:', isRecording, 'isStoppingVoice:', isStoppingVoice);
                if (isRecording && !isStoppingVoice) {
                    try {
                        recognition.start();
                        console.log('[Voice] restarted recognition');
                    } catch (e) {
                        console.log('[Voice] restart failed:', e.message);
                    }
                }
            };

            recognition.onstart = function() {
                console.log('[Voice] onstart - recognition started successfully');
            };

            recognition.onsoundstart = function() {
                console.log('[Voice] onsoundstart - sound detected');
            };

            recognition.onspeechstart = function() {
                console.log('[Voice] onspeechstart - speech detected');
            };
        } else if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechRecognition) {
            useCapacitorVoice = true;
            console.log('[Voice] Using Capacitor native speech recognition');
        } else {
            console.log('[Voice] Web Speech API not supported, trying Capacitor plugin');
            try {
                var capPlugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechRecognition;
                if (capPlugin) {
                    useCapacitorVoice = true;
                    console.log('[Voice] Using Capacitor native speech recognition');
                } else {
                    console.log('[Voice] No speech recognition available');
                }
            } catch (e) {
                console.log('[Voice] Capacitor plugin check failed:', e.message);
            }
        }

        function updateRecordingTime() {
            recordingSeconds++;
            var minutes = Math.floor(recordingSeconds / 60);
            var seconds = recordingSeconds % 60;
            var timeStr = (minutes > 0 ? minutes + ':' : '') + (seconds < 10 && minutes > 0 ? '0' : '') + seconds;
            voiceLabel.textContent = timeStr;
            if (recordingSeconds >= MAX_RECORDING_SECONDS) {
                stopVoiceRecording();
            }
        }

        function startVoiceRecording() {
            console.log('[Voice] startVoiceRecording called, useCapacitorVoice:', useCapacitorVoice, 'recognition:', !!recognition);
            isRecording = true;
            isStoppingVoice = false;
            isVoiceCancelled = false;
            recordingSeconds = 0;
            voiceFinalTranscript = '';
            voiceBtn.classList.add('recording');
            recordingHint.style.display = 'block';
            recordingHint.textContent = '正在聆听...';
            voiceLabel.textContent = '0';
            recordingTimer = setInterval(updateRecordingTime, 1000);

            if (useCapacitorVoice) {
                startCapacitorVoice();
            } else if (recognition) {
                try {
                    recognition.start();
                    console.log('[Voice] recognition.start() called');
                } catch (e) {
                    console.log('[Voice] recognition.start() error:', e.message);
                }
            }
        }

        function startCapacitorVoice() {
            var SpeechRecognition = window.Capacitor.Plugins.SpeechRecognition;

            SpeechRecognition.requestPermissions().then(function(result) {
                if (result.speechRecognition !== 'granted') {
                    console.log('[Voice] Permission denied');
                    stopVoiceRecording();
                    return;
                }

                SpeechRecognition.available().then(function(availability) {
                    if (!availability.available) {
                        console.log('[Voice] Speech recognition not available on device');
                        stopVoiceRecording();
                        return;
                    }

                    SpeechRecognition.addListener('partialResults', function(event) {
                        if (!isRecording) return;
                        var text = '';
                        if (event.matches && event.matches.length > 0) {
                            text = event.matches[0];
                        }
                        console.log('[Voice] Capacitor partial result:', text);
                        if (text) {
                            voiceFinalTranscript = text;
                            var chatInput = document.getElementById('main-chat-input');
                            chatInput.value = text;
                            var sendBtn = document.getElementById('main-send-btn');
                            sendBtn.classList.add('active');
                        }
                    }).then(function(listener) {
                        capacitorPartialListener = listener;
                    });

                    SpeechRecognition.start({
                        language: 'zh-CN',
                        maxResults: 1,
                        partialResults: true,
                        popup: false
                    }).then(function() {
                        console.log('[Voice] Capacitor speech recognition started');
                    }).catch(function(err) {
                        console.log('[Voice] Capacitor start error:', err);
                        stopVoiceRecording();
                    });
                });
            }).catch(function(err) {
                console.log('[Voice] Capacitor permission error:', err);
                stopVoiceRecording();
            });
        }

        function stopVoiceRecording() {
            console.log('[Voice] stopVoiceRecording called, isVoiceCancelled:', isVoiceCancelled);
            isStoppingVoice = true;
            isRecording = false;
            voiceBtn.classList.remove('recording');
            voiceBtn.classList.remove('cancelled');
            recordingHint.style.display = 'none';
            voiceLabel.textContent = '长按语音记录';
            if (recordingTimer) {
                clearInterval(recordingTimer);
                recordingTimer = null;
            }

            if (useCapacitorVoice) {
                stopCapacitorVoice();
            } else if (recognition) {
                try {
                    recognition.stop();
                    console.log('[Voice] recognition.stop() called');
                } catch (e) {
                    console.log('[Voice] recognition.stop() error:', e.message);
                }
            }

            if (isVoiceCancelled) {
                var chatInput = document.getElementById('main-chat-input');
                chatInput.value = '';
                var sendBtn = document.getElementById('main-send-btn');
                sendBtn.classList.remove('active');
                isVoiceCancelled = false;
            }
            isStoppingVoice = false;
        }

        function stopCapacitorVoice() {
            var SpeechRecognition = window.Capacitor.Plugins.SpeechRecognition;
            try {
                SpeechRecognition.stop().then(function() {
                    console.log('[Voice] Capacitor speech recognition stopped');
                }).catch(function(err) {
                    console.log('[Voice] Capacitor stop error:', err);
                });
            } catch (e) {
                console.log('[Voice] Capacitor stop exception:', e.message);
            }
            if (capacitorPartialListener) {
                try {
                    capacitorPartialListener.remove();
                } catch (e) {
                    console.log('[Voice] Listener remove error:', e.message);
                }
                capacitorPartialListener = null;
            }
        }

        function cancelVoiceRecording() {
            console.log('[Voice] cancelVoiceRecording called');
            isVoiceCancelled = true;
            voiceBtn.classList.add('cancelled');
            recordingHint.textContent = '松手取消';
        }

        function resumeVoiceRecording() {
            console.log('[Voice] resumeVoiceRecording called');
            isVoiceCancelled = false;
            voiceBtn.classList.remove('cancelled');
            recordingHint.textContent = '正在聆听...';
        }

        var isTouching = false;

        voiceBtn.addEventListener('mousedown', function(e) {
            if (isTouching) return;
            e.preventDefault();
            voiceStartY = e.clientY;
            pressTimer = setTimeout(function() {
                startVoiceRecording();
            }, 300);
        });

        document.addEventListener('mousemove', function(e) {
            if (!isRecording || isTouching) return;
            var deltaY = voiceStartY - e.clientY;
            if (deltaY > CANCEL_THRESHOLD && !isVoiceCancelled) {
                cancelVoiceRecording();
            } else if (deltaY <= CANCEL_THRESHOLD && isVoiceCancelled) {
                resumeVoiceRecording();
            }
        });

        document.addEventListener('mouseup', function(e) {
            if (isTouching) return;
            clearTimeout(pressTimer);
            if (isRecording) {
                stopVoiceRecording();
            }
        });

        voiceBtn.addEventListener('mouseleave', function() {
            if (!isRecording) {
                clearTimeout(pressTimer);
            }
        });

        voiceBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            isTouching = true;
            voiceStartY = e.touches[0].clientY;
            pressTimer = setTimeout(function() {
                startVoiceRecording();
            }, 300);
        });

        document.addEventListener('touchmove', function(e) {
            if (!isRecording || !isTouching) return;
            var deltaY = voiceStartY - e.touches[0].clientY;
            if (deltaY > CANCEL_THRESHOLD && !isVoiceCancelled) {
                cancelVoiceRecording();
            } else if (deltaY <= CANCEL_THRESHOLD && isVoiceCancelled) {
                resumeVoiceRecording();
            }
        });

        voiceBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            clearTimeout(pressTimer);
            if (isRecording) {
                stopVoiceRecording();
            }
            setTimeout(function() { isTouching = false; }, 300);
        });

        voiceBtn.addEventListener('touchcancel', function() {
            clearTimeout(pressTimer);
            if (isRecording) {
                stopVoiceRecording();
            }
            isTouching = false;
        });
    }

    function initDrawer() {
        var drawerBtn = document.getElementById('drawer-btn');
        var drawer = document.getElementById('drawer');
        var drawerOverlay = document.getElementById('drawer-overlay');
        var drawerHistory = document.getElementById('drawer-history');
        var drawerStats = document.getElementById('drawer-stats');

        if (!drawerBtn || !drawer || !drawerOverlay) {
            console.log('Drawer elements not found');
            return;
        }

        if (!isLoggedIn) {
            drawerBtn.style.display = 'none';
        }

        function openDrawer() {
            drawer.classList.add('open');
            drawerOverlay.classList.add('active');
        }

        function closeDrawer() {
            drawer.classList.remove('open');
            drawerOverlay.classList.remove('active');
        }

        var touchStartX = 0;
        var touchStartY = 0;
        var touchMoved = false;

        drawerBtn.addEventListener('touchstart', function(e) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchMoved = false;
        });

        drawerBtn.addEventListener('touchmove', function() {
            touchMoved = true;
        });

        drawerBtn.addEventListener('touchend', function(e) {
            if (!touchMoved) {
                e.preventDefault();
                openDrawer();
            }
        });

        drawerBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            openDrawer();
        });
        drawerOverlay.addEventListener('click', closeDrawer);

        if (drawerHistory) {
            drawerHistory.addEventListener('click', function() {
                closeDrawer();
                openRecordsPanel();
            });
        }

        if (drawerStats) {
            drawerStats.addEventListener('click', function() {
                closeDrawer();
                openStatsPanel();
            });
        }
    }

    function initRecordsPanel() {
        var recordsBackBtn = document.getElementById('records-back-btn');
        var recordsOverlay = document.getElementById('records-overlay');

        recordsBackBtn.addEventListener('click', closeRecordsPanel);
        recordsOverlay.addEventListener('click', closeRecordsPanel);
    }

    function openRecordsPanel() {
        var panel = document.getElementById('records-panel');
        var overlay = document.getElementById('records-overlay');
        panel.classList.add('open');
        overlay.classList.add('active');
        renderRecordsList();
    }

    function closeRecordsPanel() {
        var panel = document.getElementById('records-panel');
        var overlay = document.getElementById('records-overlay');
        panel.classList.remove('open');
        overlay.classList.remove('active');
    }

    function renderRecordsList() {
        var listContainer = document.getElementById('all-records-list');
        listContainer.innerHTML = '';

        if (records.length === 0) {
            listContainer.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>暂无医疗记录</p></div>';
            return;
        }

        records.forEach(function(record) {
            var item = document.createElement('div');
            item.className = 'record-item';

            var complaintHtml = '';
            if (record.complaint) {
                complaintHtml = '<div class="record-item-diagnosis"><p>' + MedicalApp.escapeHtml(record.complaint) + '</p></div>';
            }

            item.innerHTML =
                '<div class="record-item-header">' +
                    '<div class="record-item-icon"><i class="fas fa-hospital"></i></div>' +
                    '<div>' +
                        '<div class="record-item-title">' + MedicalApp.escapeHtml(record.hospital) + '</div>' +
                        '<div class="record-item-meta">' + record.date + (record.department ? ' \u00B7 ' + MedicalApp.escapeHtml(record.department) : '') + '</div>' +
                    '</div>' +
                '</div>' +
                (complaintHtml ? '<div class="record-item-body">' + complaintHtml + '</div>' : '');

            item.addEventListener('click', function() {
                closeRecordsPanel();
                showRecordDetail(record);
            });

            listContainer.appendChild(item);
        });
    }

    function initStatsPanel() {
        var statsBackBtn = document.getElementById('stats-back-btn');
        var statsOverlay = document.getElementById('stats-overlay');

        statsBackBtn.addEventListener('click', closeStatsPanel);
        statsOverlay.addEventListener('click', closeStatsPanel);
    }

    function openStatsPanel() {
        var panel = document.getElementById('stats-panel');
        var overlay = document.getElementById('stats-overlay');
        panel.classList.add('open');
        overlay.classList.add('active');
        updateStats();
    }

    function closeStatsPanel() {
        var panel = document.getElementById('stats-panel');
        var overlay = document.getElementById('stats-overlay');
        panel.classList.remove('open');
        overlay.classList.remove('active');
    }

    function updateStats() {
        var totalEl = document.getElementById('total-visits');
        var halfYearEl = document.getElementById('half-year-visits');
        var analysisEl = document.getElementById('health-analysis');
        var tagsEl = document.getElementById('diagnosis-tags');

        if (!totalEl) return;

        var stats = MedicalApp.calculateStats(records);

        totalEl.innerHTML = stats.total + '<span class="stat-unit">次</span>';
        halfYearEl.innerHTML = stats.halfYear + '<span class="stat-unit">次</span>';

        if (stats.topDepartment) {
            analysisEl.innerHTML = '根据近期记录分析，您的主要就诊集中在<span class="highlight">' + MedicalApp.escapeHtml(stats.topDepartment) + '</span>。建议关注相关健康问题，定期复查。';
        } else {
            analysisEl.textContent = '暂无足够数据进行分析，请先添加就诊记录。';
        }

        tagsEl.innerHTML = '';
        for (var diag in stats.diagnosisCounts) {
            var tag = document.createElement('span');
            tag.className = 'diagnosis-tag';
            tag.innerHTML = MedicalApp.escapeHtml(diag) + ' <span class="count">' + stats.diagnosisCounts[diag] + '</span>';
            tagsEl.appendChild(tag);
        }
    }

    function initDetailPanel() {
        var detailBackBtn = document.getElementById('detail-back-btn');
        var detailOverlay = document.getElementById('detail-overlay');

        detailBackBtn.addEventListener('click', closeDetailPanel);
        detailOverlay.addEventListener('click', closeDetailPanel);
    }

    function showRecordDetail(record) {
        var panel = document.getElementById('detail-panel');
        var overlay = document.getElementById('detail-overlay');
        var content = document.getElementById('detail-content');

        content.innerHTML = '';

        var headerDiv = document.createElement('div');
        headerDiv.style.textAlign = 'center';
        headerDiv.style.marginBottom = '24px';
        headerDiv.style.marginTop = '8px';
        var hospitalTitle = document.createElement('div');
        hospitalTitle.style.fontSize = '18px';
        hospitalTitle.style.fontWeight = '600';
        hospitalTitle.style.color = '#FFFFFF';
        hospitalTitle.textContent = record.hospital;
        var dateMeta = document.createElement('div');
        dateMeta.style.fontSize = '13px';
        dateMeta.style.color = '#94A3B8';
        dateMeta.style.marginTop = '4px';
        dateMeta.textContent = record.date + (record.department ? ' \u00B7 ' + record.department : '');
        headerDiv.appendChild(hospitalTitle);
        headerDiv.appendChild(dateMeta);
        content.appendChild(headerDiv);

        var fields = [
            { label: '主诉/症状', value: record.complaint, icon: 'fa-stethoscope' },
            { label: '诊断结果', value: record.diagnosis, icon: 'fa-file-medical' },
            { label: '医生', value: record.doctor, icon: 'fa-user-doctor' },
            { label: '用药信息', value: record.medication, icon: 'fa-pills' },
            { label: '检查项目', value: record.examination, icon: 'fa-vial' },
            { label: '备注', value: record.notes, icon: 'fa-note-sticky' }
        ];

        fields.forEach(function(field) {
            if (!field.value) return;
            var row = document.createElement('div');
            row.className = 'detail-field';
            row.style.display = 'flex';
            row.style.alignItems = 'flex-start';
            row.style.padding = '12px 0';
            row.style.borderBottom = '1px solid #2A313E';

            var iconDiv = document.createElement('div');
            iconDiv.style.width = '32px';
            iconDiv.style.height = '32px';
            iconDiv.style.borderRadius = '8px';
            iconDiv.style.background = '#2A313E';
            iconDiv.style.display = 'flex';
            iconDiv.style.alignItems = 'center';
            iconDiv.style.justifyContent = 'center';
            iconDiv.style.marginRight = '12px';
            iconDiv.style.flexShrink = '0';
            iconDiv.innerHTML = '<i class="fas ' + field.icon + '" style="font-size:14px;color:#F59E0B;"></i>';

            var textDiv = document.createElement('div');
            textDiv.style.flex = '1';
            var labelDiv = document.createElement('div');
            labelDiv.style.fontSize = '12px';
            labelDiv.style.color = '#94A3B8';
            labelDiv.style.marginBottom = '2px';
            labelDiv.textContent = field.label;
            var valueDiv = document.createElement('div');
            valueDiv.style.fontSize = '15px';
            valueDiv.style.color = '#F1F5F9';
            valueDiv.style.lineHeight = '1.5';
            valueDiv.textContent = field.value;
            textDiv.appendChild(labelDiv);
            textDiv.appendChild(valueDiv);

            row.appendChild(iconDiv);
            row.appendChild(textDiv);
            content.appendChild(row);
        });

        if (record.images && record.images.length > 0) {
            var imageSection = document.createElement('div');
            imageSection.style.marginTop = '16px';
            var imageLabel = document.createElement('div');
            imageLabel.style.fontSize = '12px';
            imageLabel.style.color = '#94A3B8';
            imageLabel.style.marginBottom = '8px';
            imageLabel.textContent = '就诊图片';
            imageSection.appendChild(imageLabel);
            var detailImages = createImageThumbs(record.images, 'detail');
            if (detailImages) imageSection.appendChild(detailImages);
            content.appendChild(imageSection);
        }

        panel.classList.add('open');
        overlay.classList.add('active');
    }

    function closeDetailPanel() {
        var panel = document.getElementById('detail-panel');
        var overlay = document.getElementById('detail-overlay');
        panel.classList.remove('open');
        overlay.classList.remove('active');
    }

    function initAddRecordPanel() {
        var backBtn = document.getElementById('add-record-back-btn');
        var overlay = document.getElementById('add-record-overlay');
        var saveBtn = document.getElementById('save-record-btn');
        var dateInput = document.getElementById('visit-date');

        dateInput.value = new Date().toISOString().split('T')[0];

        backBtn.addEventListener('click', closeAddRecordPanel);
        overlay.addEventListener('click', closeAddRecordPanel);

        saveBtn.addEventListener('click', function() {
            var hospital = document.getElementById('visit-hospital').value.trim();
            var diagnosis = document.getElementById('visit-diagnosis').value.trim();

            if (!hospital || !diagnosis) return;

            var newRecord = {
                id: Date.now(),
                date: document.getElementById('visit-date').value,
                hospital: hospital,
                department: document.getElementById('visit-department').value.trim(),
                doctor: document.getElementById('visit-doctor').value.trim(),
                complaint: document.getElementById('visit-complaint').value.trim(),
                diagnosis: diagnosis,
                notes: document.getElementById('visit-notes').value.trim(),
                images: []
            };

            records.unshift(newRecord);
            saveRecords();
            updateStats();
            closeAddRecordPanel();
            resetAddRecordForm();

            hideWelcome();
            addMessage('user', '我今天去了' + hospital + '，诊断为' + diagnosis);
            setTimeout(function() {
                addMessage('bot', '好的，我已经为您记录下本次就诊信息：', newRecord);
            }, 800);
        });
    }

    function openAddRecordPanel() {
        var panel = document.getElementById('add-record-panel');
        var overlay = document.getElementById('add-record-overlay');
        panel.classList.add('open');
        overlay.classList.add('active');
    }

    function closeAddRecordPanel() {
        var panel = document.getElementById('add-record-panel');
        var overlay = document.getElementById('add-record-overlay');
        panel.classList.remove('open');
        overlay.classList.remove('active');
    }

    function resetAddRecordForm() {
        document.getElementById('visit-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('visit-hospital').value = '';
        document.getElementById('visit-department').value = '';
        document.getElementById('visit-doctor').value = '';
        document.getElementById('visit-complaint').value = '';
        document.getElementById('visit-diagnosis').value = '';
        document.getElementById('visit-notes').value = '';
    }

    function initImageUpload() {
        var uploadBtn = document.getElementById('upload-image-btn');
        var uploadMenu = document.getElementById('upload-menu');
        var menuOverlay = document.getElementById('upload-menu-overlay');
        var menuCancel = document.getElementById('menu-cancel-btn');
        var menuCamera = document.getElementById('menu-camera-btn');
        var menuAlbum = document.getElementById('menu-album-btn');
        var menuManual = document.getElementById('menu-manual-btn');
        var fileInputCamera = document.getElementById('file-input-camera');
        var fileInputAlbum = document.getElementById('file-input-album');
        var previewBar = document.getElementById('image-preview-bar');
        var viewerClose = document.getElementById('image-viewer-close');

        uploadBtn.addEventListener('click', function() {
            uploadMenu.style.display = 'flex';
        });

        menuOverlay.addEventListener('click', function() {
            uploadMenu.style.display = 'none';
        });

        menuCancel.addEventListener('click', function() {
            uploadMenu.style.display = 'none';
        });

        menuCamera.addEventListener('click', function() {
            uploadMenu.style.display = 'none';
            fileInputCamera.click();
        });

        menuAlbum.addEventListener('click', function() {
            uploadMenu.style.display = 'none';
            fileInputAlbum.click();
        });

        menuManual.addEventListener('click', function() {
            uploadMenu.style.display = 'none';
            openAddRecordPanel();
        });

        fileInputCamera.addEventListener('change', function(e) {
            handleFiles(e.target.files);
            fileInputCamera.value = '';
        });

        fileInputAlbum.addEventListener('change', function(e) {
            handleFiles(e.target.files);
            fileInputAlbum.value = '';
        });

        viewerClose.addEventListener('click', function() {
            document.getElementById('image-viewer').style.display = 'none';
        });
    }

    function handleFiles(files) {
        if (!files || files.length === 0) return;

        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            if (!file.type.startsWith('image/')) {
                continue;
            }
            if (file.size > 20 * 1024 * 1024) {
                continue;
            }
            addPendingImage(file);
        }
    }

    function addPendingImage(file) {
        var tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
        var reader = new FileReader();
        reader.onload = function(e) {
            pendingImages.push({
                tempId: tempId,
                file: file,
                preview: e.target.result
            });
            renderImagePreviewBar();
        };
        reader.readAsDataURL(file);
    }

    function removePendingImage(tempId) {
        pendingImages = pendingImages.filter(function(img) {
            return img.tempId !== tempId;
        });
        renderImagePreviewBar();
    }

    function renderImagePreviewBar() {
        var previewBar = document.getElementById('image-preview-bar');
        if (pendingImages.length === 0) {
            previewBar.style.display = 'none';
            previewBar.innerHTML = '';
            return;
        }

        previewBar.style.display = 'flex';
        previewBar.innerHTML = '';

        pendingImages.forEach(function(img) {
            var item = document.createElement('div');
            item.className = 'image-preview-item';

            var imgEl = document.createElement('img');
            imgEl.src = img.preview;
            imgEl.alt = '预览';
            item.appendChild(imgEl);

            var removeBtn = document.createElement('button');
            removeBtn.className = 'image-preview-remove';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.setAttribute('data-temp-id', img.tempId);
            removeBtn.addEventListener('click', function() {
                removePendingImage(img.tempId);
            });
            item.appendChild(removeBtn);

            previewBar.appendChild(item);
        });
    }

    function clearPendingImages() {
        pendingImages = [];
        renderImagePreviewBar();
    }

    function savePendingImagesToStore(recordId, callback) {
        if (pendingImages.length === 0) {
            callback([]);
            return;
        }

        var imageIds = [];
        var remaining = pendingImages.length;

        pendingImages.forEach(function(img) {
            ImageStore.compressImage(img.file, 1200, 0.7, function(err, compressedData) {
                if (err) {
                    remaining--;
                    if (remaining === 0) callback(imageIds);
                    return;
                }

                ImageStore.saveImage(compressedData, recordId, function(err2, imageId) {
                    if (!err2 && imageId) {
                        imageIds.push(imageId);
                    }
                    remaining--;
                    if (remaining === 0) callback(imageIds);
                });
            });
        });
    }

    function openImageViewer(imageSrc) {
        var viewer = document.getElementById('image-viewer');
        var img = document.getElementById('image-viewer-img');
        img.src = imageSrc;
        viewer.style.display = 'flex';
    }

    function createImageThumbs(imageIds, size) {
        size = size || 'message';
        var container = document.createElement('div');
        container.className = size === 'card' ? 'record-card-images' : 'message-images';

        if (!imageIds || imageIds.length === 0) return null;

        imageIds.forEach(function(imageId) {
            var thumb = document.createElement('div');
            thumb.className = size === 'card' ? 'record-card-image' : (size === 'detail' ? 'detail-image' : 'message-image-thumb');

            var img = document.createElement('img');
            img.alt = '医疗图片';
            img.loading = 'lazy';

            ImageStore.getImage(imageId, function(err, data) {
                if (!err && data && data.data) {
                    img.src = data.data;
                }
            });

            img.addEventListener('click', function() {
                if (img.src) openImageViewer(img.src);
            });

            thumb.appendChild(img);
            container.appendChild(thumb);
        });

        return container;
    }

    function refreshRecordsPanelIfOpen() {
        var panel = document.getElementById('records-panel');
        if (panel && panel.classList.contains('open')) {
            renderRecordsList();
        }
    }

    function loadRecordsFromLocal() {
        records = SyncService.getLocalRecords();
    }

    function saveRecords() {
        SyncService.saveLocalRecords(records);
        if (activeRecord) {
            SyncService.saveRecord(activeRecord);
        }
        refreshRecordsPanelIfOpen();
    }

    function getTimeStr() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
