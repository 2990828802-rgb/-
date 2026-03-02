import React, { useState, useRef } from 'react';
import { ArrowLeft, Camera, Image as ImageIcon } from 'lucide-react';
import { AppRoute, Moment, MomentsProfile } from '../../types';
import { AnimatePresence } from 'framer-motion';
import MomentPost from '../Moments/MomentPost';
import CreateMomentModal from '../Moments/CreateMomentModal';
import EditProfileModal from '../Moments/EditProfileModal';

interface MomentsAppProps {
  onNavigate: (route: AppRoute) => void;
  moments: Moment[];
  setMoments: React.Dispatch<React.SetStateAction<Moment[]>>;
  profile: MomentsProfile;
  setProfile: React.Dispatch<React.SetStateAction<MomentsProfile>>;
  onTriggerSimulation: () => void;
}

const MomentsApp: React.FC<MomentsAppProps> = ({ 
  onNavigate, 
  moments, 
  setMoments, 
  profile, 
  setProfile,
  onTriggerSimulation
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, field: 'avatar' | 'coverImage') => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handlers
  const handleCreatePost = (content: string, images: string[]) => {
    const newMoment: Moment = {
      id: Date.now().toString(),
      userId: 'me',
      userName: profile.name,
      userAvatar: profile.avatar,
      content,
      images,
      timestamp: Date.now(),
      likes: 0,
      comments: []
    };
    setMoments([newMoment, ...moments]);
  };

  const handleLike = (id: string) => {
    setMoments(moments.map(m => 
      m.id === id ? { ...m, likes: m.likes + 1 } : m
    ));
  };

  const handleComment = (id: string) => {
    // Placeholder for comment functionality
    const text = prompt('Add a comment:');
    if (text) {
      setMoments(moments.map(m => 
        m.id === id ? {
          ...m,
          comments: [...m.comments, {
            id: Date.now().toString(),
            userId: 'me',
            userName: profile.name,
            content: text,
            timestamp: Date.now()
          }]
        } : m
      ));
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-12 flex justify-between items-center text-white bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <button 
          onClick={() => onNavigate(AppRoute.HOME)} 
          className="pointer-events-auto p-2 rounded-full hover:bg-white/20 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex gap-2 pointer-events-auto">
          {/* Debug button to trigger random post */}
          {/* <button 
            onClick={onTriggerSimulation}
            className="p-2 rounded-full hover:bg-white/20 transition-colors opacity-50"
            title="Simulate Character Post"
          >
            <ImageIcon size={24} />
          </button> */}
          <button 
            onClick={() => setShowCreateModal(true)}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <Camera size={24} />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-20 no-scrollbar">
        {/* Profile Cover Area */}
        <div className="relative mb-16 group">
          <div 
            className="h-64 w-full bg-gray-300 cursor-pointer relative"
            onClick={() => coverInputRef.current?.click()}
          >
            <img 
              src={profile.coverImage} 
              alt="Cover" 
              className="w-full h-full object-cover transition-opacity group-hover:opacity-90"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-black/30 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">点击更换封面</span>
            </div>
          </div>
          
          {/* Profile Info Overlay */}
          <div className="absolute -bottom-12 right-4 flex items-end gap-3">
            <div className="text-right mb-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowEditProfileModal(true)}>
              <h2 className="text-white font-bold text-xl drop-shadow-md">{profile.name}</h2>
              <p className="text-gray-600 text-sm font-medium bg-white/80 px-2 py-0.5 rounded backdrop-blur-sm mt-1 max-w-[200px] truncate">
                {profile.signature || '点击编辑资料'}
              </p>
            </div>
            <div 
              className="relative cursor-pointer group/avatar"
              onClick={() => avatarInputRef.current?.click()}
            >
              <img 
                src={profile.avatar} 
                alt="Avatar" 
                className="w-20 h-20 rounded-xl border-2 border-white bg-gray-200 object-cover shadow-sm"
              />
              <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                <Camera className="text-white" size={20} />
              </div>
            </div>
          </div>
        </div>

        <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'coverImage')} />
        <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'avatar')} />

        {/* Moments List */}
        <div className="space-y-2 pt-4">
          {moments.map(moment => (
            <MomentPost 
              key={moment.id} 
              moment={moment} 
              onLike={handleLike}
              onComment={handleComment}
            />
          ))}
          
          {moments.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <p>No moments yet. Share your first one!</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateMomentModal 
            onClose={() => setShowCreateModal(false)} 
            onPost={handleCreatePost} 
          />
        )}
        {showEditProfileModal && (
          <EditProfileModal 
            profile={profile} 
            onClose={() => setShowEditProfileModal(false)} 
            onSave={setProfile} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MomentsApp;
