import React from 'react';
import { Users } from 'lucide-react';

export default function CollaborationPanel({ users, currentUserId, isDark }) {
  if (users.length <= 1) return null;

  return (
    <div className={`fixed top-20 right-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg p-3 z-40`}>
      <div className="flex items-center gap-2 mb-2">
        <Users size={16} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
        <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
          {users.length} Active
        </span>
      </div>
      
      <div className="space-y-1.5">
        {users.map(user => (
          <div key={user.id} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: user.color }}
            />
            <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {user.name} {user.id === currentUserId && '(You)'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
