import React from 'react';

function Records({ isOpen, onClose, records, onViewDetail }) {
  return (
    <>
      {isOpen && (
        <div 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-30 transition-all duration-300"
          onClick={onClose}
          data-ai-alt="关闭医疗记录遮罩"
        ></div>
      )}

      <div 
        className={`absolute top-0 left-0 h-full w-[85%] max-w-[360px] bg-slate-900 z-40 transform transition-all duration-400 flex flex-col ${isOpen ? 'translate-x-0 shadow-[20px_0_50px_rgba(0,0,0,0.7)]' : '-translate-x-full shadow-none'}`}
      >
        {/* 头部 */}
        <div className="flex-none h-16 flex items-center px-4 z-10 sticky top-0 bg-slate-900/80 backdrop-blur-md">
          <button 
            onClick={onClose}
            className="text-slate-400 w-10 h-10 flex items-center justify-center mr-2 rounded-full active:bg-slate-800 transition-colors"
            data-ai-alt="返回主页"
          >
            <i className="fas fa-arrow-left text-lg"></i>
          </button>
          <h2 className="text-xl font-semibold tracking-tight text-white">医疗记录</h2>
        </div>

        {/* 内容 */}
        <div className="p-5 flex-1 overflow-y-auto pb-[140px]" data-ai-list="true">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <i className="fas fa-folder-open text-5xl mb-4 opacity-50"></i>
              <p className="text-[15px] font-medium">暂无医疗记录</p>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((record) => (
                <div key={record.id} 
                     onClick={() => onViewDetail(record)}
                     className="bg-slate-800 rounded-[24px] overflow-hidden active:scale-[0.98] transition-all cursor-pointer border border-slate-700/30">
                  <div className="px-5 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <i className="fas fa-stethoscope text-lg"></i>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-[16px]">{record.hospital}</h3>
                        <span className="text-xs font-medium text-slate-400">
                          {record.date} · {record.department}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-5 pb-5">
                    <div className="bg-slate-900/50 rounded-2xl p-3.5">
                      <div className="flex items-start">
                        <p className="text-[15px] font-medium text-slate-300">{record.diagnosis}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Records;
