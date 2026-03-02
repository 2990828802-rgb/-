import React, { useState, useRef } from 'react';
import { X, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import { MomentsProfile } from '../../types';

interface EditProfileModalProps {
  profile: MomentsProfile;
  onClose: () => void;
  onSave: (profile: MomentsProfile) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ profile, onClose, onSave }) => {
  const [name, setName] = useState(profile.name);
  const [signature, setSignature] = useState(profile.signature);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [coverImage, setCoverImage] = useState(profile.coverImage);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onSave({ name, signature, avatar, coverImage });
    onClose();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="fixed inset-0 z-50 bg-white flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <X size={24} />
        </button>
        <h2 className="font-semibold text-lg">Edit Profile</h2>
        <button 
          onClick={handleSave}
          className="px-4 py-1.5 rounded-full font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Save
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Hidden File Inputs */}
        <input 
          type="file" 
          ref={coverInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={(e) => handleFileChange(e, setCoverImage)}
        />
        <input 
          type="file" 
          ref={avatarInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={(e) => handleFileChange(e, setAvatar)}
        />

        {/* Cover Image */}
        <div className="relative h-48 rounded-xl overflow-hidden bg-gray-100 group">
          <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
               onClick={() => coverInputRef.current?.click()}
          >
            <Camera className="text-white" size={32} />
          </div>
        </div>

        {/* Avatar */}
        <div className="flex justify-center -mt-16 relative z-10">
          <div className="relative w-24 h-24 rounded-xl overflow-hidden border-4 border-white bg-gray-200 group">
            <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                 onClick={() => avatarInputRef.current?.click()}
            >
              <Camera className="text-white" size={24} />
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Signature</label>
            <textarea 
              value={signature} 
              onChange={(e) => setSignature(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EditProfileModal;
