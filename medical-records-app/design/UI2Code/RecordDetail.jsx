import React, { useState, useRef } from 'react';

function RecordDetail({ isOpen, onClose }) {
  const [isRecording, setIsRecording] = useState(false);
  const pressTimer = useRef(null);

  const handlePressStart = () => {
    pressTimer.current = setTimeout(() => {
      setIsRecording(true);
    }, 300);
  };

  const handlePressEnd = () => {
    clearTimeout(pressTimer.current);
    if (isRecording) {
      setIsRecording(false);
    }
  };

  return (
    <>
      <div 
        className={`absolute top-0 left-0 w-full h-full bg-[#131720] z-[60] transform transition-all duration-400 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* 头部导航 */}
        <div className="flex-none h-16 flex items-center px-5 z-10 sticky top-0">
          <button 
            onClick={onClose}
            className="text-slate-400 w-10 h-10 flex items-center justify-start transition-colors"
            data-ai-alt="返回菜单"
          >
            <i className="fas fa-bars text-xl"></i>
          </button>
          <h2 className="text-[17px] font-semibold tracking-tight flex-1 text-center pr-10 text-white">
            医疗档案
          </h2>
        </div>

        {/* 聊天内容区 */}
        <div className="flex-1 overflow-y-auto p-5 pb-[200px] flex flex-col" data-ai-list="true">
          <div className="text-center text-[12px] text-slate-400 mb-8 mt-2">今天 2026/4/9</div>

          {/* 用户消息 */}
          <div className="flex justify-end mb-8">
            <div className="max-w-[85%] bg-[#F59E0B] text-slate-900 rounded-[24px] rounded-tr-sm px-5 py-4 shadow-sm">
              <p className="text-[16px] font-medium leading-relaxed">我今天感冒去了华西医院</p>
              <span className="text-[11px] mt-2 block font-medium opacity-70 text-right text-slate-800">
                17:58
              </span>
            </div>
          </div>

          {/* 系统消息 */}
          <div className="flex justify-start">
            <div className="w-10 h-10 rounded-full bg-[#1E2532] flex items-center justify-center mr-3 flex-shrink-0 border border-slate-700/30 shadow-sm">
              <i className="fas fa-robot text-[#F59E0B] text-lg"></i>
            </div>
            <div className="max-w-[85%] bg-[#1E2532] text-slate-100 rounded-[24px] rounded-tl-sm px-5 py-4 shadow-sm">
              <p className="text-[16px] leading-relaxed mb-4">好的，我已经为您记录下本次就诊信息：</p>
              
              {/* 内嵌记录卡片 */}
              <div className="bg-[#2A313E] rounded-[20px] p-4 border border-slate-700/50 shadow-inner">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center">
                    <i className="fas fa-hospital text-lg"></i>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-[16px]">市第一人民医院</h4>
                    <span className="text-[12px] font-medium text-slate-400">2026-04-01 · 呼吸内科</span>
                  </div>
                </div>
                <div className="bg-[#1E2532] rounded-2xl p-3.5">
                  <p className="text-[15px] text-slate-300 font-medium">上呼吸道感染</p>
                </div>
              </div>

              <span className="text-[11px] mt-2 block font-medium opacity-70 text-right text-slate-400">
                17:58
              </span>
            </div>
          </div>
        </div>

        {/* 底部悬浮语音按钮 */}
        <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
          {isRecording && (
            <span className="mb-4 text-[13px] text-slate-900 font-bold bg-[#F59E0B]/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg animate-bounce whitespace-nowrap">
              正在聆听...
            </span>
          )}
          <button 
            className={`pointer-events-auto w-[80px] h-[80px] rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ease-out ${isRecording ? 'bg-[#F59E0B] text-slate-900 scale-110 shadow-amber-500/30' : 'bg-[#F59E0B] text-slate-900 active:scale-95 shadow-amber-500/20'}`}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            data-ai-alt="语音记录"
          >
            <i className={`fas fa-microphone ${isRecording ? 'text-3xl animate-pulse' : 'text-3xl'}`}></i>
          </button>
          {!isRecording && (
            <span className="mt-4 text-[12px] text-slate-400 font-medium px-3 py-1 pointer-events-auto whitespace-nowrap">
              长按语音记录
            </span>
          )}
        </div>

        {/* 底部输入框 */}
        <div className="absolute bottom-6 left-4 right-4 z-10">
          <div className="bg-[#1E2532] p-2.5 rounded-full flex items-center border border-slate-700/50">
            <button className="text-slate-400 w-10 h-10 flex items-center justify-center flex-shrink-0 ml-1" data-ai-alt="添加附件">
              <i className="fas fa-plus text-[18px]"></i>
            </button>
            <input 
              type="text"
              disabled
              placeholder="输入问题或记录..."
              className="flex-1 bg-transparent h-10 px-3 text-[15px] text-slate-200 focus:outline-none placeholder-slate-500 border-none ring-0"
            />
            <button className="w-10 h-10 mr-1 rounded-full flex items-center justify-center flex-shrink-0 bg-[#2A313E] text-slate-500" data-ai-alt="发送">
              <i className="fas fa-arrow-up text-[16px]"></i>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default RecordDetail;
