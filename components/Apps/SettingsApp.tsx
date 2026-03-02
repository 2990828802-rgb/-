import React, { useState } from 'react';
import { ApiSettings, AppRoute } from '../../types';

interface SettingsAppProps {
  settings: ApiSettings;
  onSave: (newSettings: ApiSettings) => void;
  onNavigate: (route: AppRoute) => void;
  // Removed PIN props, they are now in PhoneInfoApp
}

const SettingsApp: React.FC<SettingsAppProps> = ({ settings, onSave, onNavigate }) => {
  const [formData, setFormData] = useState<ApiSettings>(settings);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  const handleChange = (field: keyof ApiSettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    onNavigate(AppRoute.HOME);
  };

  const handleFetchModels = async () => {
    if (!formData.apiKey || !formData.baseUrl) {
      alert('请先填写 Base URL 和 API 密钥');
      return;
    }

    setIsFetching(true);
    try {
      const baseUrl = formData.baseUrl.replace(/\/$/, '');
      const url = `${baseUrl}/models`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${formData.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      // OpenAI format: { data: [{ id: "model-name", ... }, ...] }
      if (data && Array.isArray(data.data)) {
        const models = data.data.map((m: any) => m.id).sort();
        setAvailableModels(models);
        if (models.length > 0 && !models.includes(formData.model)) {
             setFormData(prev => ({...prev, model: models[0]}));
        }
        alert(`成功拉取 ${models.length} 个模型`);
      } else {
        throw new Error('无法识别返回格式');
      }
    } catch (error) {
      alert(`拉取模型失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col pt-10 animate-slide-up font-sans relative">
      {/* Header */}
      <div className="px-4 pb-3 flex items-center justify-between border-b border-white/20 bg-white/30 backdrop-blur-md sticky top-0 z-10 h-[44px]">
        <button 
          onClick={() => onNavigate(AppRoute.HOME)} 
          className="text-ios-blue flex items-center text-[17px] hover:opacity-70 transition-opacity font-medium"
        >
          <svg className="w-6 h-6 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
          返回
        </button>
        <h1 className="text-[17px] font-semibold text-black/90 absolute left-1/2 transform -translate-x-1/2">配置中心</h1>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 pb-28">

        {/* Info Note */}
        <div className="bg-blue-100/50 rounded-[10px] p-4 border border-blue-200 text-blue-800 text-[13px] leading-relaxed">
            此处仅用于配置 AI 连接服务。如需修改手机激活码或查看本机信息，请返回主屏幕点击 <b>“本机”</b> 图标。
        </div>
        
        {/* API Provider Section */}
        <div>
           <div className="uppercase text-gray-600 text-[13px] mb-2 pl-3 font-medium">连接设置</div>
           <div className="bg-white/40 backdrop-blur-md rounded-[10px] overflow-hidden shadow-sm border border-white/30">
              
              {/* Provider Select */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100/50">
                <span className="text-black font-medium text-[17px]">服务商</span>
                <div className="relative">
                  <select 
                    value={formData.provider}
                    onChange={(e) => handleChange('provider', e.target.value as any)}
                    className="appearance-none bg-transparent text-gray-600 text-[17px] text-right pr-6 outline-none cursor-pointer"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="custom">自定义 (OpenAI)</option>
                  </select>
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                  </div>
                </div>
              </div>

              {/* Dynamic Fields */}
              {formData.provider === 'gemini' ? (
                 <div className="p-4 flex items-center justify-between border-b border-gray-100/50">
                  <span className="text-black font-medium text-[17px]">模型选择</span>
                  <div className="relative">
                     <select 
                        value={formData.model}
                        onChange={(e) => handleChange('model', e.target.value)}
                        className="appearance-none bg-transparent text-gray-600 text-[17px] text-right pr-6 outline-none cursor-pointer max-w-[180px] truncate"
                      >
                        <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                        <option value="gemini-3-pro-preview">Gemini 3 Pro</option>
                      </select>
                      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 border-b border-gray-100/50 flex items-center justify-between">
                    <span className="text-black font-medium text-[17px] w-24">Base URL</span>
                    <input 
                      type="text" 
                      value={formData.baseUrl}
                      onChange={(e) => handleChange('baseUrl', e.target.value)}
                      placeholder="https://api.openai.com/v1"
                      className="flex-1 text-right text-gray-600 outline-none text-[17px] placeholder-gray-500 font-normal bg-transparent"
                    />
                  </div>
                  
                  {/* API Key */}
                  <div className="p-4 border-b border-gray-100/50 flex items-center justify-between">
                     <span className="text-black font-medium text-[17px] w-24">API 密钥</span>
                     <input 
                      type="password" 
                      value={formData.apiKey}
                      onChange={(e) => handleChange('apiKey', e.target.value)}
                      placeholder="sk-..."
                      className="flex-1 text-right text-gray-600 outline-none text-[17px] placeholder-gray-500 font-normal bg-transparent"
                    />
                  </div>

                   <div className="p-4 flex items-center justify-between">
                    <span className="text-black font-medium text-[17px] w-20">模型</span>
                    <div className="flex-1 flex items-center justify-end gap-2">
                        {availableModels.length > 0 ? (
                             <div className="relative flex-1 max-w-[160px]">
                                <select 
                                    value={formData.model}
                                    onChange={(e) => handleChange('model', e.target.value)}
                                    className="w-full appearance-none bg-transparent text-gray-600 text-[17px] text-right pr-5 outline-none cursor-pointer truncate"
                                >
                                    {availableModels.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                                </div>
                             </div>
                        ) : (
                            <input 
                                type="text" 
                                value={formData.model}
                                onChange={(e) => handleChange('model', e.target.value)}
                                placeholder="gpt-3.5-turbo"
                                className="flex-1 text-right text-gray-600 outline-none text-[17px] placeholder-gray-500 font-normal bg-transparent min-w-0"
                            />
                        )}
                        <button 
                            onClick={handleFetchModels}
                            disabled={isFetching}
                            className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors flex-shrink-0 shadow-sm ${isFetching ? 'bg-gray-100/50 text-gray-400' : 'bg-ios-blue text-white active:bg-blue-600'}`}
                        >
                            {isFetching ? '...' : '拉取'}
                        </button>
                    </div>
                  </div>
                </>
              )}
              
              {formData.provider === 'gemini' && (
                  <div className="p-4 flex items-center justify-between">
                     <span className="text-black font-medium text-[17px] w-24">API 密钥</span>
                     <input 
                      type="password" 
                      value={formData.apiKey}
                      onChange={(e) => handleChange('apiKey', e.target.value)}
                      placeholder="默认 (环境变量)"
                      className="flex-1 text-right text-gray-600 outline-none text-[17px] placeholder-gray-500 font-normal bg-transparent"
                    />
                  </div>
              )}

           </div>
           
           <p className="text-[13px] text-gray-500 mt-2 px-3 leading-normal">
             {formData.provider === 'gemini' 
               ? "Gemini 模式下，如未填写将使用默认的环境变量 Key。" 
               : "填写完 Base URL 和 Key 后，点击“拉取”可自动获取模型列表。"}
           </p>
        </div>

        {/* Display Settings */}
        <div>
            <div className="uppercase text-gray-600 text-[13px] mb-2 pl-3 font-medium">显示</div>
            <div className="bg-white/40 backdrop-blur-md rounded-[10px] overflow-hidden shadow-sm p-4 flex items-center justify-between border border-white/30">
                <span className="text-black font-medium text-[17px]">深色模式</span>
                <div className="w-[50px] h-[30px] bg-green-500 rounded-full relative shadow-inner cursor-pointer">
                    <div className="absolute top-0.5 right-0.5 w-[26px] h-[26px] bg-white rounded-full shadow-md"></div>
                </div>
            </div>
        </div>

      </div>

      {/* Bottom Save Button */}
      <div className="absolute bottom-6 right-4 left-4 z-20">
         <button 
           onClick={handleSave}
           className="w-full bg-ios-blue text-white font-semibold text-[17px] py-3.5 rounded-[14px] shadow-lg active:scale-95 transition-transform hover:bg-blue-600 border border-white/20"
         >
           保存配置
         </button>
      </div>

    </div>
  );
};

export default SettingsApp;