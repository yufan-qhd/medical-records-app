import React, { useState, useRef } from 'react';

function VoiceButton() {
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
    <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
      {isRecording && (
        <span className="mb-4 text-[13px] text-slate-900 font-bold bg-amber-500/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg animate-bounce">
          正在聆听...
        </span>
      )}
      <button
        className={`pointer-events-auto w-[80px] h-[80px] rounded-full flex items-center justify-center transition-all duration-300 ease-out shadow-xl ${isRecording ? 'bg-amber-500 text-slate-900 scale-110 shadow-amber-500/30' : 'bg-amber-500 text-slate-900 hover:scale-105 shadow-amber-500/20'}`}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        data-ai-alt="长按语音输入"
      >
        <i className={`fas fa-microphone ${isRecording ? 'text-3xl animate-pulse' : 'text-3xl'}`}></i>
      </button>
      {!isRecording && (
        <span className="mt-4 text-[12px] text-slate-400 font-medium px-3 py-1 pointer-events-auto">
          长按语音记录
        </span>
      )}
    </div>
  );
}

export default VoiceButton;
