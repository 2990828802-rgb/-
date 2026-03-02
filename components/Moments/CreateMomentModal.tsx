import React, { useState } from 'react';
import { X, Image as ImageIcon, Camera } from 'lucide-react';
import { motion } from 'framer-motion';

interface CreateMomentModalProps {
  onClose: () => void;
  onPost: (content: string, images: string[]) => void;
}

const CreateMomentModal: React.FC<CreateMomentModalProps> = ({ onClose, onPost }) => {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);

  const handlePost = () => {
    if (!content.trim() && !image) return;
    onPost(content, image ? [image] : []);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Modal Content */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
            <X size={20} />
          </button>
          <h2 className="font-semibold text-base text-gray-800">发表动态</h2>
          <button 
            onClick={handlePost}
            disabled={!content.trim() && !image}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              content.trim() || image ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            发表
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="这一刻的想法..."
            className="w-full h-32 resize-none text-base placeholder-gray-400 focus:outline-none"
            autoFocus
          />

          {/* Image Preview */}
          {image && (
            <div className="relative mt-2 rounded-lg overflow-hidden group inline-block">
              <img src={image} alt="Preview" className="h-24 w-auto object-cover rounded-lg border border-gray-200" />
              <button 
                onClick={() => setImage(null)}
                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center gap-4">
          <button 
            onClick={() => {
              const url = prompt('请输入图片链接:');
              if (url) setImage(url);
            }}
            className="p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-600"
          >
            <ImageIcon size={22} />
          </button>
          <button 
            onClick={() => {
               const url = prompt('请输入图片链接:');
               if (url) setImage(url);
            }}
            className="p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-600"
          >
            <Camera size={22} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateMomentModal;
