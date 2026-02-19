import { useState, useEffect, useRef } from 'react';
import { CollaborationManager, generateUserId, subscribeToChanges, broadcastChange } from '../utils/collaboration';

export function useCollaboration(sessionId, elements, setElements) {
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [users, setUsers] = useState([]);
  const [cursors, setCursors] = useState([]);
  const managerRef = useRef(null);
  const lastTimestampRef = useRef(0);
  const userIdRef = useRef(generateUserId());
  const syncIntervalRef = useRef(null);

  useEffect(() => {
    if (!sessionId || !window.storage) return;

    setIsCollaborating(true);

    const manager = new CollaborationManager(
      sessionId,
      userIdRef.current,
      ({ users: newUsers, cursors: newCursors }) => {
        if (newUsers) setUsers(newUsers);
        if (newCursors) setCursors(newCursors);
      }
    );

    manager.init();
    managerRef.current = manager;

    syncIntervalRef.current = setInterval(async () => {
      await subscribeToChanges(sessionId, lastTimestampRef.current, (newElements, userId, timestamp) => {
        if (userId !== userIdRef.current) {
          setElements(newElements);
          lastTimestampRef.current = timestamp;
        }
      });
    }, 1000);

    return () => {
      manager.destroy();
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [sessionId]);

  useEffect(() => {
    if (isCollaborating && elements.length > 0) {
      const timeoutId = setTimeout(() => {
        broadcastChange(sessionId, elements, userIdRef.current);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [elements, isCollaborating, sessionId]);

  const updateCursor = (x, y) => {
    if (managerRef.current) {
      managerRef.current.updateCursor(x, y);
    }
  };

  return {
    isCollaborating,
    users,
    cursors,
    currentUserId: userIdRef.current,
    updateCursor,
  };
}
