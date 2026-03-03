import React, { useState } from 'react';
import { Link, Copy, Check, X } from 'lucide-react';
import { generateShareableLink } from '../utils/collaboration';

export default function ShareModal({ sessionId, isDark, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!sessionId) return null;

  const shareLink = generateShareableLink(sessionId);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" 
      onClick={onClose}
    >
      <div 
        className={`${isDark ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-2xl p-6 w-full max-w-[500px] relative animate-in fade-in zoom-in duration-200`}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1 rounded transition-colors ${
            isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
          }`}
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className={`p-2.5 rounded-lg ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
            <Link size={24} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Share Sketchboard</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Invite others to collaborate in real-time
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className={`text-sm font-semibold block mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Shareable Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className={`flex-1 px-3 py-2 rounded border text-sm font-mono focus:outline-none ${
                  isDark 
                    ? 'bg-gray-900 border-gray-600 text-gray-200' 
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all active:scale-95 ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check size={18} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${
            isDark ? 'bg-gray-900/50 border-gray-700' : 'bg-blue-50 border-blue-100'
          }`}>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <span className="font-bold">💡 How it works:</span> Anyone with this link can view and edit your canvas in real-time. Changes are synced instantly via WebSockets and Redis.
            </p>
          </div>

          <div className={`flex items-center gap-2 text-xs font-mono p-2 rounded ${
            isDark ? 'text-gray-500 bg-gray-900' : 'text-gray-400 bg-gray-50'
          }`}>
            <span className="opacity-70">SESSION_ID:</span>
            <span className="truncate">{sessionId}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className={`w-full mt-6 px-4 py-2.5 rounded-lg font-semibold transition-colors ${
            isDark 
              ? 'bg-gray-700 hover:bg-gray-600 text-white' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
          }`}
        >
          Done
        </button>
      </div>
    </div>
  );
}