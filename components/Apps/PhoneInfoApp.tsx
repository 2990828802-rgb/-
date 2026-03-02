import React, { useState } from 'react';
import { AppRoute } from '../../types';
import { verifyAuthorCode } from '../../utils/security';

interface PhoneInfoAppProps {
  onNavigate: (route: AppRoute) => void;
  currentPin: string;
  onUpdatePin: (newPin: string) => void;
}

const PhoneInfoApp: React.FC<PhoneInfoAppProps> = ({ onNavigate, currentPin, onUpdatePin }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [authorCodeInput, setAuthorCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Security Form State
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [showChangeModal, setShowChangeModal] = useState(false);

  const handleVerify = async () => {
    setIsLoading(true);
    try {
        const isValid = await verifyAuthorCode(authorCodeInput);
        
        if (isValid) {
            setIsVerified(true);
        } else {
            alert("作者验证码错误！");
            setAuthorCodeInput('');
        }
    } catch (e) {
        alert("验证过程出错");
    } finally {
        setIsLoading(false);
    }
  };

  const handleChangePin = () => {
      // 1. Verify Old PIN (Basic Check)
      if (oldPinInput !== currentPin) {
          alert("旧激活码错误！");
          return;
      }
      
      // 2. Validate New PIN Format
      if (newPinInput.length !== 6 || isNaN(Number(newPinInput))) {
          alert("新激活码必须是6位数字！");
          return;
      }

      onUpdatePin(newPinInput);
      setShowChangeModal(false);
      alert("系统激活码已更新。");
      setOldPinInput('');
      setNewPinInput('');
  };

  // --- View: Login Screen ---
  if (!isVerified) {
    return (
      <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center animate-fade-in relative font-mono text-white">
          <div className="absolute top-14 left-4">
               <button onClick={() => onNavigate(AppRoute.HOME)} className="text-gray-400 text-sm">Cancel</button>
          </div>
          
          <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-red-500/50 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
             <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          </div>
          
          <h2 className="text-xl font-bold tracking-widest mb-2 text-red-500">SYSTEM LOCKED</h2>
          <p className="text-gray-500 text-xs mb-8 text-center px-8">
              This area contains sensitive system configuration.<br/>Author verification required.
          </p>

          <input 
             type="password"
             value={authorCodeInput}
             onChange={(e) => setAuthorCodeInput(e.target.value)}
             className="bg-gray-800 border border-gray-700 text-center text-white text-2xl tracking-[0.5em] w-48 py-2 rounded-md outline-none focus:border-red-500 transition-colors mb-6"
             placeholder="••••••"
             maxLength={6}
          />

          <button 
            onClick={handleVerify}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform active:scale-95 disabled:opacity-50"
          >
            {isLoading ? 'VERIFYING...' : 'VERIFY IDENTITY'}
          </button>
      </div>
    );
  }

  // --- View: Dashboard (Verified) ---
  return (
    <div className="w-full h-full bg-gray-100 flex flex-col pt-10 animate-slide-up font-sans">
      {/* Header */}
      <div className="px-4 pb-3 flex items-center justify-between border-b border-gray-200 bg-white sticky top-0 z-10 h-[44px]">
        <button 
          onClick={() => onNavigate(AppRoute.HOME)} 
          className="text-ios-blue flex items-center text-[17px] hover:opacity-70 transition-opacity font-medium"
        >
          <svg className="w-6 h-6 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
          主屏幕
        </button>
        <h1 className="text-[17px] font-semibold text-black absolute left-1/2 transform -translate-x-1/2">关于本机</h1>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
          
          {/* Device Header */}
          <div className="flex flex-col items-center py-8 bg-white mb-6 border-b border-gray-200">
               <div className="w-16 h-16 bg-gray-200 rounded-full mb-3 flex items-center justify-center">
                   <svg className="w-10 h-10 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
               </div>
               <h2 className="text-2xl font-semibold text-black">AI Phone 15 Pro</h2>
               <p className="text-gray-500 text-sm">Designed by Author</p>
          </div>

          <div className="px-4">
              <div className="uppercase text-gray-500 text-[13px] mb-2 pl-3 font-normal">系统权限</div>
              <div className="bg-white rounded-[10px] overflow-hidden border border-gray-200 shadow-sm mb-6">
                 <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                     <span className="text-[16px] text-black">管理员权限</span>
                     <span className="text-[16px] text-green-500">已获取</span>
                 </div>
                 <div className="px-4 py-3 flex justify-between items-center">
                     <span className="text-[16px] text-black">作者验证</span>
                     <span className="text-[16px] text-gray-500">通过</span>
                 </div>
              </div>

              <div className="uppercase text-gray-500 text-[13px] mb-2 pl-3 font-normal mt-6">分享应用</div>
              <div className="bg-white rounded-[10px] overflow-hidden border border-gray-200 shadow-sm p-4">
                  <div className="mb-3">
                      <p className="text-[12px] text-gray-400 mb-1">当前应用链接 (长按复制):</p>
                      <div className="bg-gray-100 p-2 rounded-lg break-all text-[13px] font-mono text-black select-all">
                          {window.location.href}
                      </div>
                  </div>
                  <div 
                    onClick={() => {
                        const url = window.location.href;
                        navigator.clipboard.writeText(url).then(() => {
                            alert("链接已复制！\n\n发给朋友：他们打开就是这个手机界面。\n添加到桌面：在Safari点击分享->添加到主屏幕。");
                        });
                    }}
                    className="flex justify-center items-center py-2 bg-ios-blue text-white rounded-lg active:scale-95 transition-transform font-medium text-[15px]"
                  >
                      复制链接
                  </div>
              </div>
              <p className="text-[12px] text-gray-400 mt-2 px-3">
                  注意：请确保复制的是以 .run.app 结尾的链接，而不是浏览器顶部的编辑器地址。
              </p>

              <div className="uppercase text-gray-500 text-[13px] mb-2 pl-3 font-normal mt-6">安全设置</div>
              <div className="bg-white rounded-[10px] overflow-hidden border border-gray-200 shadow-sm">
                  <div 
                    onClick={() => setShowChangeModal(true)}
                    className="px-4 py-3 flex justify-between items-center active:bg-gray-50 cursor-pointer"
                  >
                      <span className="text-[16px] text-black">修改手机激活码</span>
                      <div className="flex items-center">
                          <span className="text-gray-400 text-sm mr-2">******</span>
                          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      </div>
                  </div>
              </div>
              <p className="text-[12px] text-gray-400 mt-2 px-3">
                  您已通过作者验证，可在此修改开机锁屏密码。
              </p>
          </div>
      </div>

      {/* Change PIN Modal */}
      {showChangeModal && (
         <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in p-6">
            <div className="w-full bg-white rounded-[18px] overflow-hidden shadow-2xl animate-scale-in">
               <div className="p-5 flex flex-col items-center">
                   <h3 className="text-[18px] font-bold text-black mb-4">设置新激活码</h3>
                   
                   <input 
                      type="password"
                      placeholder="旧激活码"
                      value={oldPinInput}
                      onChange={(e) => setOldPinInput(e.target.value)}
                      className="w-full h-12 bg-gray-100 rounded-xl px-4 text-[16px] outline-none mb-3 border border-transparent focus:border-ios-blue transition-colors text-center tracking-widest"
                      maxLength={6}
                   />
                   
                   <input 
                      type="password"
                      placeholder="新激活码 (6位数字)"
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value)}
                      className="w-full h-12 bg-gray-100 rounded-xl px-4 text-[16px] outline-none mb-3 border border-transparent focus:border-ios-blue transition-colors text-center tracking-widest"
                      maxLength={6}
                   />
               </div>
               <div className="flex h-[50px] border-t border-gray-200">
                    <button 
                        onClick={() => {
                            setShowChangeModal(false);
                            setOldPinInput('');
                            setNewPinInput('');
                        }}
                        className="flex-1 text-[17px] text-gray-500 active:bg-gray-100 transition-colors border-r border-gray-200"
                    >
                        取消
                    </button>
                    <button 
                        onClick={handleChangePin}
                        className="flex-1 text-[17px] text-ios-blue font-semibold active:bg-gray-100 transition-colors"
                    >
                        确认
                    </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default PhoneInfoApp;