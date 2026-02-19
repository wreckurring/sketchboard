import React, { useState } from 'react';
import { Link, Copy, Check, X } from 'lucide-react';
import { generateShareableLink } from '../utils/collaboration';

export default function ShareModal({ sessionId, isDark, onClose }) {
  const [copied, setCopied] = useState(false);
  const shareLink = generateShareableLink(sessionId);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className={`${isDark ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-2xl p-6 w-[500px] relative`}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1 rounded ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
            <Link size={24} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Share Sketchboard</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Collaborate in real-time
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`text-sm font-medium block mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Shareable Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className={`flex-1 px-3 py-2 rounded border text-sm font-mono ${
                  isDark 
                    ? 'bg-gray-900 border-gray-600 text-gray-200' 
                    : 'bg-gray-50 border-gray-300'
                }`}
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded flex items-center gap-2 transition ${
                  copied
                    ? `${isDark ? 'bg-green-600' : 'bg-green-500'} text-white`
                    : `${isDark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`
                }`}
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-900' : 'bg-blue-50'}`}>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <strong>💡 How it works:</strong> Share this link with others to collaborate in real-time. 
              All changes sync automatically. Your data is stored securely and only accessible to those with the link.
            </p>
          </div>

          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Session ID: <code className={`${isDark ? 'bg-gray-900' : 'bg-gray-100'} px-1 py-0.5 rounded`}>{sessionId}</code>
          </div>
        </div>

        <button
          onClick={onClose}
          className={`w-full mt-4 px-4 py-2 rounded-lg ${
            isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          Done
        </button>
      </div>
    </div>
  );
}
