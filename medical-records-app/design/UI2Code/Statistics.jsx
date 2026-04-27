import React from 'react';

function Statistics({ isOpen, onClose, records }) {
  return (
    <>
      {isOpen && (
        <div 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-30 transition-all duration-300"
          onClick={onClose}
          data-ai-alt="关闭健康统计遮罩"
        ></div>
      )}

      <div 
        className={`absolute top-0 left-0 h-full w-[85%] max-w-[360px] bg-slate-900 z-40 transform transition-all duration-400 flex flex-col ${isOpen ? 'translate-x-0 shadow-[20px_0_50px_rgba(0,0,0,0.7)]' : '-translate-x-full shadow-none'}`}
      >
        {/* 头部 */}
        <div className="flex-none h-16 flex items-center px-4 sticky top-0 bg-slate-900/80 backdrop-blur-md z-10">
          <button 
            onClick={onClose}
            className="text-slate-400 w-10 h-10 flex items-center justify-center mr-2 rounded-full active:bg-slate-800 transition-colors"
            data-ai-alt="返回"
          >
            <i className="fas fa-arrow-left text-lg"></i>
          </button>
          <h2 className="text-xl font-semibold tracking-tight text-white">健康统计</h2>
        </div>

        {/* 抽屉内容 */}
        <div className="flex-1 overflow-y-auto p-5 pb-[140px]">
          {/* 核心指标看板 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[#1E2532] border border-slate-700/50 p-5 rounded-[24px]">
              <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 mb-3">
                 <i className="fas fa-notes-medical text-lg"></i>
              </div>
              <span className="text-slate-400 text-[13px] font-medium mb-1 block">总就诊次数</span>
              <div className="text-3xl font-bold text-white">
                {records.length}<span className="text-base font-normal ml-1 text-slate-500">次</span>
              </div>
            </div>
            <div className="bg-[#1E2532] border border-slate-700/50 p-5 rounded-[24px]">
              <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 mb-3">
                 <i className="fas fa-history text-lg"></i>
              </div>
              <span className="text-slate-400 text-[13px] font-medium mb-1 block">近半年就诊</span>
              <div className="text-3xl font-bold text-white">
                {records.filter(r => new Date(r.date) >= new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)).length}
                <span className="text-base font-normal ml-1 text-slate-500">次</span>
              </div>
            </div>
          </div>

          {/* 健康评估分析 */}
          <div className="bg-[#1E2532] border border-slate-700/50 p-6 rounded-[24px] mb-6">
            <h3 className="font-semibold text-white mb-4 text-[17px]">健康趋势分析</h3>
            <p className="text-[15px] text-slate-300 leading-relaxed">
              根据近期记录分析，您的主要就诊集中在<span className="text-amber-500 mx-1 font-medium">呼吸系统</span>。建议近期注意保暖，避免前往人群密集场所，增强免疫力。
            </p>
          </div>

          {/* 常见疾病标签 */}
          <div className="bg-[#1E2532] border border-slate-700/50 p-6 rounded-[24px]">
            <h3 className="font-semibold text-white mb-4 text-[17px]">历史诊断</h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-4 py-2 bg-slate-900 border border-slate-700/50 text-slate-300 rounded-full text-[14px]">上呼吸道感染 <span className="text-amber-500 ml-1">3</span></span>
              <span className="px-4 py-2 bg-slate-900 border border-slate-700/50 text-slate-300 rounded-full text-[14px]">急性胃肠炎 <span className="text-amber-500 ml-1">1</span></span>
              <span className="px-4 py-2 bg-slate-900 border border-slate-700/50 text-slate-300 rounded-full text-[14px]">过敏性鼻炎 <span className="text-amber-500 ml-1">2</span></span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Statistics;
