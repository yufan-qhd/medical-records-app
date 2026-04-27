import React, { useState } from 'react';

function Login({ isOpen, onClose, onLoginSuccess }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  const handleSendCode = () => {
    if (phone.length !== 11) return;
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleLogin = () => {
    if (phone && code) {
      onLoginSuccess();
      onClose();
    }
  };

  return (
    <>
      {isOpen && (
        <div 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] transition-all duration-300"
          onClick={onClose}
          data-ai-alt="关闭登录遮罩"
        ></div>
      )}

      <div 
        className={`absolute top-0 left-0 h-full w-full bg-slate-900 z-[80] transform transition-all duration-400 flex flex-col ${isOpen ? 'translate-y-0 pointer-events-auto opacity-100' : 'translate-y-[150%] pointer-events-none opacity-0 shadow-none'}`}
      >
        {/* 头部 */}
        <div className="flex-none h-16 flex items-center px-4">
          <button 
            onClick={onClose}
            className="text-slate-400 w-10 h-10 flex items-center justify-center mr-2 rounded-full active:bg-slate-800 transition-colors border-0 focus:outline-none focus:ring-0"
            data-ai-alt="关闭登录页"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 px-8 pt-10">
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">欢迎登录</h2>
          <p className="text-slate-400 mb-10 text-[15px]">登录后管理您的专属医疗档案</p>

          <div className="space-y-5">
            {/* 手机号输入 */}
            <div className="bg-[#1E2532] rounded-2xl p-2 flex items-center">
              <div className="px-3 text-slate-400 font-medium border-r border-slate-700/50">+86</div>
              <input 
                type="tel" 
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="请输入手机号"
                className="flex-1 bg-transparent px-4 py-2 text-slate-200 border-0 outline-none focus:outline-none focus:ring-0 focus:border-0 shadow-none appearance-none placeholder-slate-500 text-[16px]"
              />
            </div>

            {/* 验证码输入 */}
            <div className="bg-[#1E2532] rounded-2xl p-2 flex items-center justify-between">
              <input 
                type="text" 
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="请输入验证码"
                className="flex-1 bg-transparent px-4 py-2 text-slate-200 border-0 outline-none focus:outline-none focus:ring-0 focus:border-0 shadow-none appearance-none placeholder-slate-500 text-[16px] w-[50%]"
              />
              <button 
                onClick={handleSendCode}
                disabled={countdown > 0 || phone.length !== 11}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-[14px] font-medium transition-colors border-0 focus:outline-none focus:ring-0 ${countdown > 0 ? 'text-slate-500 bg-slate-800/50' : phone.length === 11 ? 'text-amber-500 bg-amber-500/10' : 'text-slate-500 bg-slate-800/50'}`}
              >
                {countdown > 0 ? `${countdown}s 后重新获取` : '获取验证码'}
              </button>
            </div>

            {/* 登录按钮 */}
            <button 
              onClick={handleLogin}
              disabled={!phone || !code}
              className={`w-full mt-6 py-4 rounded-2xl text-[16px] font-bold transition-all border-0 focus:outline-none focus:ring-0 ${phone && code ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20 active:scale-[0.98]' : 'bg-slate-800 text-slate-500'}`}
            >
              登录
            </button>
          </div>

          {/* 第三方登录 */}
          <div className="mt-20">
            <div className="flex items-center justify-center space-x-4 mb-8">
              <div className="h-px bg-slate-800 flex-1"></div>
              <span className="text-slate-500 text-[13px]">其他登录方式</span>
              <div className="h-px bg-slate-800 flex-1"></div>
            </div>
            <div className="flex justify-center">
              <button 
                className="w-14 h-14 rounded-full bg-[#1E2532] flex items-center justify-center text-[#07C160] hover:bg-slate-800 transition-colors active:scale-[0.95] border-0 focus:outline-none focus:ring-0"
                data-ai-alt="微信登录"
              >
                <i className="fab fa-weixin text-3xl"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
