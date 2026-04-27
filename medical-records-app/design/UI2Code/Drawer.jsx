import React from 'react';

function Drawer({ isOpen, onClose, navigateTo, currentPage, isLoggedIn }) {
  const menuItems = [
    { icon: 'fa-clipboard-list', label: '医疗记录', key: 'records' },
    { icon: 'fa-chart-pie', label: '健康统计', key: 'statistics' }
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-30 transition-all duration-300"
          onClick={onClose}
          data-ai-alt="关闭抽屉遮罩"
        ></div>
      )}
      
      <div 
        className={`absolute top-0 left-0 h-full w-[80%] max-w-[300px] bg-slate-900 z-40 transform transition-all duration-400 flex flex-col ${isOpen ? 'translate-x-0 shadow-[20px_0_50px_rgba(0,0,0,0.7)]' : '-translate-x-full shadow-none'}`}
      >
        <div className="pt-16 pb-8 px-8 relative overflow-hidden">
          {isLoggedIn ? (
            <div className="text-white relative z-10 flex flex-col items-start">
              <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-5 border border-amber-500/30">
                <i className="fas fa-user-check text-2xl text-amber-500"></i>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold tracking-tight text-white">健康用户</span>
              </div>
              <p className="text-slate-400 text-[14px] mt-1">数据已开启云端同步</p>
            </div>
          ) : (
            <div 
              className="text-white relative z-10 cursor-pointer flex flex-col items-start"
              onClick={() => navigateTo('login')}
              data-ai-alt="点击登录"
            >
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-5 border border-slate-700/50">
                <i className="fas fa-user text-2xl text-slate-500"></i>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold tracking-tight text-white">点击登录</span>
                <i className="fas fa-chevron-right text-slate-500 text-sm"></i>
              </div>
              <p className="text-slate-400 text-[14px] mt-1">登录后管理您的健康数据</p>
            </div>
          )}
        </div>

        <div className="flex-1 py-4 px-4 space-y-2" data-ai-list="true">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => navigateTo(item.key)}
              className={`w-full flex items-center px-5 py-4 rounded-[20px] transition-all duration-200 ${currentPage === item.key ? 'bg-slate-800 text-amber-500 font-semibold' : 'text-slate-400 active:bg-slate-800/50 font-medium'}`}
              data-ai-alt={`${item.label}菜单项`}
            >
              <i className={`fas ${item.icon} w-8 text-center text-xl`}></i>
              <span className="ml-3 text-[16px]">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default Drawer;
