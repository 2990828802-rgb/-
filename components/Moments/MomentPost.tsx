import React from 'react';
import { Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import { Moment } from '../../types';
import { motion } from 'framer-motion';

interface MomentPostProps {
  moment: Moment;
  onLike: (id: string) => void;
  onComment: (id: string) => void;
}

const MomentPost: React.FC<MomentPostProps> = ({ moment, onLike, onComment }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 p-4 border-b border-gray-100 bg-white"
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <img 
          src={moment.userAvatar} 
          alt={moment.userName} 
          className="w-10 h-10 rounded-lg object-cover bg-gray-200"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h3 className="font-medium text-blue-900 text-base leading-tight mb-1">
            {moment.userName}
          </h3>
        </div>

        {/* Text Content */}
        {moment.content && (
          <p className="text-gray-800 text-base mb-2 whitespace-pre-wrap leading-relaxed">
            {moment.content}
          </p>
        )}

        {/* Image Grid */}
        {moment.images && moment.images.length > 0 && (
          <div className={`grid gap-1 mb-2 ${
            moment.images.length === 1 ? 'grid-cols-1 max-w-[70%]' : 
            moment.images.length === 2 ? 'grid-cols-2' : 
            'grid-cols-3'
          }`}>
            {moment.images.map((img, idx) => (
              <img 
                key={idx} 
                src={img} 
                alt={`Post image ${idx + 1}`} 
                className={`w-full h-full object-cover rounded-sm aspect-square bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity`}
              />
            ))}
          </div>
        )}

        {/* Footer: Time & Actions */}
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-400">
            {new Date(moment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          
          <div className="flex items-center gap-4">
            {/* Like Button */}
            <button 
              onClick={() => onLike(moment.id)}
              className="p-1 rounded hover:bg-gray-100 transition-colors group"
            >
              <Heart 
                size={18} 
                className={`transition-colors ${moment.likes > 0 ? 'fill-red-500 text-red-500' : 'text-blue-900 group-hover:text-blue-700'}`} 
              />
            </button>
            
            {/* Comment Button */}
            <button 
              onClick={() => onComment(moment.id)}
              className="p-1 rounded hover:bg-gray-100 transition-colors group"
            >
              <MessageCircle size={18} className="text-blue-900 group-hover:text-blue-700" />
            </button>
          </div>
        </div>

        {/* Likes & Comments Section (Simplified for now) */}
        {(moment.likes > 0 || moment.comments.length > 0) && (
          <div className="mt-3 bg-gray-50 rounded p-2 text-sm">
            {moment.likes > 0 && (
              <div className="flex items-center gap-1 text-blue-900 font-medium mb-1">
                <Heart size={12} className="fill-blue-900" />
                <span>{moment.likes} likes</span>
              </div>
            )}
            
            {moment.comments.map(comment => (
              <div key={comment.id} className="text-gray-800 leading-snug mb-1">
                <span className="font-medium text-blue-900">{comment.userName}: </span>
                {comment.content}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MomentPost;
