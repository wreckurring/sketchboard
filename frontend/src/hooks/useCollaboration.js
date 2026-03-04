import { useState, useEffect, useRef, useCallback } from 'react';
import { socket, generateUserId, getUserColor } from '../utils/collaboration';

export function useCollaboration(sessionId, elements, setElements) {
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [users, setUsers] = useState([]);
  const [cursors, setCursors] = useState([]);
  
  const userIdRef = useRef(generateUserId());
  const cursorsMap = useRef(new Map());
  const isRemoteUpdate = useRef(false);
  const lastCursorEmit = useRef(0);

  useEffect(() => {
    if (!sessionId) {
      setIsCollaborating(false);
      if (socket.connected) socket.disconnect();
      return;
    }

    setIsCollaborating(true);
    
    if (!socket.connected) {
      socket.connect();
    }
    
    socket.emit('join-session', { sessionId, userId: userIdRef.current });

    socket.on('canvas-update', (data) => {
      if (data.userId !== userIdRef.current) {
        isRemoteUpdate.current = true;
        setElements(data.elements || []);
      }
    });

    socket.on('cursor-update', (data) => {
      if (data.userId !== userIdRef.current) {
        cursorsMap.current.set(data.userId, { x: data.x, y: data.y });
        setCursors(Array.from(cursorsMap.current.entries()));
        
        setUsers(prev => {
          if (!prev.find(u => u.id === data.userId)) {
            return [...prev, { 
              id: data.userId, 
              color: getUserColor(data.userId), 
              name: `User ${data.userId.slice(-4)}` 
            }];
          }
          return prev;
        });
      }
    });

    socket.on('user-left', ({ userId }) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
      setCursors(prev => prev.filter(([id]) => id !== userId));
      cursorsMap.current.delete(userId);
    });

    return () => {
      socket.off('canvas-update');
      socket.off('cursor-update');
      socket.off('user-left');
    };
  }, [sessionId, setElements]);

  useEffect(() => {
    if (isCollaborating && elements.length > 0) {
      if (isRemoteUpdate.current) {
        isRemoteUpdate.current = false;
        return;
      }
      socket.emit('canvas-change', { elements, userId: userIdRef.current });
    }
  }, [elements, isCollaborating]);

  const updateCursor = useCallback((x, y) => {
    if (!isCollaborating) return;
    
    const now = Date.now();
    if (now - lastCursorEmit.current > 40) {
      socket.emit('cursor-move', { x, y, userId: userIdRef.current });
      lastCursorEmit.current = now;
    }
  }, [isCollaborating]);

  return {
    isCollaborating,
    users: [{ id: userIdRef.current, name: 'You', color: getUserColor(userIdRef.current) }, ...users],
    cursors,
    currentUserId: userIdRef.current,
    updateCursor,
  };
}