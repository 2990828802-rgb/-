import React, { useEffect, useRef } from 'react';
import { Character, Moment, Comment, MomentsProfile } from '../types';
import { generateCharacterMoment, generateCharacterReaction, generateCharacterReply } from '../services/momentsService';

// Configuration
const REACTION_DELAY_MS = 5000; // Delay before character reacts to user post
const REPLY_DELAY_MS = 8000; // Delay before character replies to user comment
const AUTO_POST_INTERVAL_MS = 1000 * 60 * 60; // Check every hour (simulated) - for demo maybe shorter?
// For demo purposes, we won't auto-post on a timer to avoid spamming, 
// but we could trigger it manually or on specific events.

export const useMomentsSimulation = (
  moments: Moment[],
  setMoments: React.Dispatch<React.SetStateAction<Moment[]>>,
  characters: Character[],
  userProfile: MomentsProfile
) => {
  const processedMomentsRef = useRef<Set<string>>(new Set());
  const processedCommentsRef = useRef<Set<string>>(new Set());

  // 1. React to User's New Moments
  useEffect(() => {
    const userMoments = moments.filter(m => m.userId === 'me');
    
    userMoments.forEach(moment => {
      if (processedMomentsRef.current.has(moment.id)) return;
      
      // Mark as processed immediately to avoid double processing
      processedMomentsRef.current.add(moment.id);

      // Randomly select characters to react
      const potentialReactors = characters.filter(() => Math.random() > 0.3); // 70% chance to react

      potentialReactors.forEach((char, index) => {
        setTimeout(async () => {
          const reaction = await generateCharacterReaction(char, moment);
          
          if (reaction.action === 'like' || reaction.action === 'both') {
            setMoments(prev => prev.map(m => 
              m.id === moment.id ? { ...m, likes: m.likes + 1 } : m
            ));
          }

          if ((reaction.action === 'comment' || reaction.action === 'both') && reaction.comment) {
            const newComment: Comment = {
              id: Date.now().toString() + Math.random().toString(),
              userId: char.id,
              userName: char.name,
              content: reaction.comment,
              timestamp: Date.now()
            };

            setMoments(prev => prev.map(m => 
              m.id === moment.id ? { ...m, comments: [...m.comments, newComment] } : m
            ));
          }
        }, REACTION_DELAY_MS + (index * 2000)); // Stagger reactions
      });
    });
  }, [moments, characters, setMoments]);

  // 2. Reply to User's Comments on Character Posts
  useEffect(() => {
    const characterMoments = moments.filter(m => m.userId !== 'me');

    characterMoments.forEach(moment => {
      // Find comments by 'me' that haven't been replied to (simplified: just check if we processed this comment ID)
      const userComments = moment.comments.filter(c => c.userId === 'me');

      userComments.forEach(comment => {
        if (processedCommentsRef.current.has(comment.id)) return;
        
        processedCommentsRef.current.add(comment.id);

        // Find the character who owns this post
        const authorChar = characters.find(c => c.id === moment.userId);
        if (!authorChar) return;

        setTimeout(async () => {
          const replyText = await generateCharacterReply(authorChar, moment, comment);
          
          const replyComment: Comment = {
            id: Date.now().toString() + Math.random().toString(),
            userId: authorChar.id,
            userName: authorChar.name,
            content: `Reply to ${userProfile.name}: ${replyText}`, // Simple reply format
            timestamp: Date.now()
          };

          setMoments(prev => prev.map(m => 
            m.id === moment.id ? { ...m, comments: [...m.comments, replyComment] } : m
          ));
        }, REPLY_DELAY_MS);
      });
    });
  }, [moments, characters, userProfile, setMoments]);

  // 3. (Optional) Trigger random character posts
  const triggerRandomCharacterPost = async () => {
    const randomChar = characters[Math.floor(Math.random() * characters.length)];
    if (!randomChar) return;

    const postData = await generateCharacterMoment(randomChar);
    
    const newMoment: Moment = {
      id: Date.now().toString(),
      userId: randomChar.id,
      userName: randomChar.name,
      userAvatar: randomChar.avatar,
      content: postData.content,
      images: postData.images,
      timestamp: Date.now(),
      likes: 0,
      comments: []
    };

    setMoments(prev => [newMoment, ...prev]);
  };

  // 4. Auto-post simulation
  useEffect(() => {
    const interval = setInterval(() => {
      // 30% chance to post every minute, if there are characters
      if (characters.length > 0 && Math.random() < 0.3) {
        triggerRandomCharacterPost();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [characters]);

  return {
    triggerRandomCharacterPost
  };
};
