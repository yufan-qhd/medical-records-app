import React, { useState, useRef, useEffect } from 'react';

function Home({ records, setRecords, onViewDetail, isLoggedIn }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const containerRef = useRef(null);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    
    const newUserMsg = {
      id: Date.now(),
      type: 'user',
      content: inputText,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setInputText('');

    // 模拟系统回复并附带卡片
    setTimeout(() => {
      const sysMsg = {
        id: Date.now() + 1,
        type: 'system',
        content: '好的，我已经为您记录下本次就诊信息：',
        record: records[0], // 演示用，取第一条记录
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
      setMessages(prev => [...prev, sysMsg]);
    }, 800);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 relative">
      {/* 消息区域 */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-5 space-y-6 pb-[200px]" 
        data-ai-list="true"
      >
        {messages.length > 0 && (
          <div className="text-center text-xs text-slate-400 mb-6">今天 {new Date().toLocaleDateString()}</div>
        )}
        
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 mt-10">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-slate-900/50">
              <i className="fas fa-robot text-amber-500 text-4xl"></i>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3 tracking-tight">欢迎使用医疗档案助手</h3>
            <p className="text-[14px] text-center max-w-[85%] mb-10 leading-relaxed text-slate-400">
              您可以直接向我发送语音或文字，我会为您智能整理就诊记录、分析健康趋势。
            </p>
            <div className="grid grid-cols-1 gap-3 w-full px-4">
              <button 
                onClick={() => setInputText("帮我记录今天的感冒症状")}
                className="bg-[#1E2532] border border-slate-700/50 py-3.5 px-5 rounded-[20px] text-[15px] text-slate-300 transition-all hover:bg-slate-800 active:scale-[0.98] text-left flex items-center"
                data-ai-alt="快捷输入选项"
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mr-3">
                  <i className="fas fa-thermometer-half"></i>
                </div>
                <span className="font-medium">帮我记录今天的感冒症状</span>
              </button>
              <button 
                onClick={() => setInputText("查询最近一次就诊记录")}
                className="bg-[#1E2532] border border-slate-700/50 py-3.5 px-5 rounded-[20px] text-[15px] text-slate-300 transition-all hover:bg-slate-800 active:scale-[0.98] text-left flex items-center"
                data-ai-alt="快捷输入选项"
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mr-3">
                  <i className="fas fa-search"></i>
                </div>
                <span className="font-medium">查询最近一次就诊记录</span>
              </button>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.type === 'system' && (
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mr-3 flex-shrink-0">
                  <i className="fas fa-robot text-amber-500 text-lg"></i>
                </div>
              )}
              <div className={`max-w-[85%] rounded-[24px] px-5 py-3.5 ${msg.type === 'user' ? 'bg-amber-500 text-slate-900 font-medium rounded-tr-sm' : 'bg-slate-800 text-slate-100 rounded-tl-sm'}`}>
                <p className="text-[16px] leading-relaxed">{msg.content}</p>
                
                {/* 医疗记录卡片 */}
                {msg.record && (
                  <div 
                    onClick={() => onViewDetail(msg.record)}
                    className="mt-3 bg-slate-700/50 rounded-[20px] p-4 cursor-pointer active:scale-[0.98] transition-all border border-slate-600/50"
                    data-ai-alt="记录详情卡片"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center">
                        <i className="fas fa-hospital text-lg"></i>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-[16px]">{msg.record.hospital}</h4>
                        <span className="text-xs font-medium text-slate-400">{msg.record.date} · {msg.record.department}</span>
                      </div>
                    </div>
                    <div className="bg-slate-900/50 rounded-2xl p-3.5">
                      <p className="text-[15px] text-slate-300 font-medium">{msg.record.diagnosis}</p>
                    </div>
                  </div>
                )}

                <span className={`text-[11px] mt-2 block font-medium opacity-70 text-right ${msg.type === 'user' ? 'text-slate-800' : 'text-slate-400'}`}>
                  {msg.time}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 底部输入栏 */}
      <div className="absolute bottom-6 left-4 right-4 z-10">
        <div className="bg-slate-800 p-2.5 rounded-full flex items-center border border-slate-700/50 shadow-xl">
          <button className="text-slate-400 hover:text-amber-500 w-10 h-10 flex items-center justify-center flex-shrink-0 transition-colors ml-1" data-ai-alt="上传图片">
            <i className="fas fa-plus text-[18px]"></i>
          </button>
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入问题或记录..."
            className="flex-1 bg-transparent h-10 px-3 text-[15px] text-slate-200 focus:outline-none placeholder-slate-500 border-none ring-0"
          />
          <button 
            onClick={handleSend}
            className={`w-10 h-10 mr-1 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${inputText.trim() ? 'bg-amber-500 text-slate-900 shadow-md shadow-amber-500/20' : 'bg-slate-700 text-slate-500'}`}
            disabled={!inputText.trim()}
            data-ai-alt="发送消息"
          >
            <i className="fas fa-arrow-up text-[16px]"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
