import React, { useState } from 'react';
import { Download, FileJson, Image, FileCode, Copy, Check } from 'lucide-react';
import { exportToPNG, exportToSVG, exportToJSON, copyToClipboard, downloadFile } from '../utils/export';

export default function ExportMenu({ elements, isDark, onClose }) {
  const [copied, setCopied] = useState(false);
  const [bgColor, setBgColor] = useState(isDark ? '#1e1e1e' : '#ffffff');

  const handleExportPNG = () => {
    const dataURL = exportToPNG(elements, 2, bgColor);
    if (dataURL) {
      const link = document.createElement('a');
      link.download = `sketchboard-${Date.now()}.png`;
      link.href = dataURL;
      link.click();
    }
  };

  const handleExportSVG = () => {
    const svg = exportToSVG(elements, bgColor);
    if (svg) {
      downloadFile(svg, `sketchboard-${Date.now()}.svg`, 'image/svg+xml');
    }
  };

  const handleExportJSON = () => {
    const json = exportToJSON(elements);
    downloadFile(json, `sketchboard-${Date.now()}.json`, 'application/json');
  };

  const handleCopyClipboard = async () => {
    const dataURL = exportToPNG(elements, 2, bgColor);
    if (dataURL) {
      const success = await copyToClipboard(dataURL);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className={`${isDark ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-2xl p-6 w-96`}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-4">Export Drawing</h3>

        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium block">Background Color</label>
          <div className="flex gap-2 items-center">
            <input 
              type="color" 
              value={bgColor} 
              onChange={e => setBgColor(e.target.value)}
              className="w-12 h-10 rounded border"
            />
            <button 
              onClick={() => setBgColor('transparent')}
              className={`text-xs px-3 py-2 rounded border ${
                isDark ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
              }`}
            >
              Transparent
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleExportPNG}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isDark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
          >
            <Image size={20} />
            <span className="flex-1 text-left">Export as PNG</span>
            <Download size={18} />
          </button>

          <button
            onClick={handleExportSVG}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isDark ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'
            } text-white`}
          >
            <FileCode size={20} />
            <span className="flex-1 text-left">Export as SVG</span>
            <Download size={18} />
          </button>

          <button
            onClick={handleExportJSON}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isDark ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'
            } text-white`}
          >
            <FileJson size={20} />
            <span className="flex-1 text-left">Export as .sketchboard</span>
            <Download size={18} />
          </button>

          <button
            onClick={handleCopyClipboard}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isDark 
                ? 'bg-gray-700 hover:bg-gray-600 border border-gray-600' 
                : 'bg-gray-100 hover:bg-gray-200 border border-gray-300'
            }`}
          >
            {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
            <span className="flex-1 text-left">{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className={`w-full mt-4 px-4 py-2 rounded-lg ${
            isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          Close
        </button>
      </div>
    </div>
  );
}
