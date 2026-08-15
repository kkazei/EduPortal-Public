import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export const useCommentNotifications = (announcementId, onLoadReplies) => {
  const [highlightedComment, setHighlightedComment] = useState(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event) => {
        if (event.data.type === 'COMMENT_REPLY_NOTIFICATION_CLICKED') {
          const { commentId } = event.data;
          
          if (commentId) {
            setHighlightedComment(commentId);
            
            setTimeout(() => {
              const element = document.getElementById(`comment-${commentId}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
            
            setTimeout(() => {
              setHighlightedComment(null);
            }, 3000);
          }
          
          toast.success('📬 You have a new reply!', {
            icon: '💬',
            duration: 4000
          });
        } else if (event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
          const notificationData = event.data.notification;
          
          if (notificationData.data?.type === 'comment_reply' && 
              notificationData.data?.announcementId === announcementId) {
            
            if (typeof onLoadReplies === 'function') {
              onLoadReplies();
            }
            
            toast.success(`💬 ${notificationData.data.replyAuthor} replied to your comment`, {
              duration: 5000,
              style: {
                background: '#3B82F6',
                color: 'white',
              },
            });
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, [announcementId, onLoadReplies]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#comment-')) {
      const commentId = hash.replace('#comment-', '');
      setHighlightedComment(parseInt(commentId));
      
      setTimeout(() => {
        const element = document.getElementById(`comment-${commentId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
      
      setTimeout(() => {
        setHighlightedComment(null);
      }, 5000);
    }
  }, []);

  return { highlightedComment };
};