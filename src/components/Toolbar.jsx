import React from 'react';
import {
  MousePointer, Square, Circle, Diamond, Minus, ArrowUpRight,
  Pencil, Type, Eraser, Hand, Palette, Trash2, Copy,
  Undo2, Redo2, ZoomIn, ZoomOut, Layers, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';

const TOOLS = [
  { name: 'select',    icon: MousePointer, label: 'Select (V)' },
  { name: 'hand',      icon: Hand,         label: 'Hand / Pan (H)' },
  { name: 'rectangle', icon: Square,       label: 'Rectangle (R)' },
  { name: 'circle',    icon: Circle,       label: 'Circle (C)' },
  { name: 'diamond',   icon: Diamond,      label: 'Diamond (D)' },
  { name: 'line',      icon: Minus,        label: 'Line (L)' },
  { name: 'arrow',     icon: ArrowUpRight, label: 'Arrow (A)' },
  { name: 'pencil',    icon: Pencil,       label: 'Pencil (P)' },
  { name: 'text',      icon: Type,         label: 'Text (T)' },
  { name: 'eraser',    icon: Eraser,       label: 'Eraser (E)' },
];

const LINE_STYLES = ['solid', 'dashed', 'dotted'];
const FONT_FAMILIES = ['Caveat', 'Segoe UI', 'Georgia', 'Courier New'];
const FONT_SIZES = [14, 16, 20, 24, 32, 48];

export default function Toolbar({
  tool, setTool,
  currentColor, setCurrentColor,
  fillColor, setFillColor,
  strokeWidth, setStrokeWidth,
  lineStyle, setLineStyle,
  fontSize, setFontSize,
  fontFamily, setFontFamily,
  textAlign, setTextAlign,
  snapToGrid, setSnapToGrid,
  scale, setScale,
  canUndo, canRedo, onUndo, onRedo,
  selectedCount, elementCount,
  onDelete, onCopy, onBringToFront, onSendToBack,
}) {
  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      {/* Top bar: project name + undo/redo + zoom */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Sketchboard</h1>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Phase 3</span>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition">
            <Undo2 size={18} />
          </button>
          <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)"
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition">
            <Redo2 size={18} />
          </button>

          <div className="w-px h-5 bg-gray-200 mx-2" />

          <button onClick={() => setScale(s => Math.max(s / 1.2, 0.1))} title="Zoom Out"
            className="p-1.5 rounded hover:bg-gray-100 transition">
            <ZoomOut size={18} />
          </button>
          <span className="text-xs font-mono text-gray-500 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button onClick={() => setScale(s => Math.min(s * 1.2, 8))} title="Zoom In"
            className="p-1.5 rounded hover:bg-gray-100 transition">
            <ZoomIn size={18} />
          </button>

          <div className="w-px h-5 bg-gray-200 mx-2" />

          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={e => setSnapToGrid(e.target.checked)}
              className="accent-blue-500"
            />
            Snap
          </label>
        </div>
      </div>

      {/* Main toolbar */}
      <div className="px-4 py-2 flex items-center gap-3 flex-wrap">
        {/* Tools */}
        <div className="flex gap-0.5 bg-gray-100 p-1 rounded-lg">
          {TOOLS.map(({ name, icon: Icon, label }) => (
            <button
              key={name}
              onClick={() => setTool(name)}
              title={label}
              className={`p-2 rounded-md transition ${
                tool === name
                  ? 'bg-blue-500 text-white shadow'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>

        <div className="w-px h-8 bg-gray-200" />

        {/* Colors */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] text-gray-400">Stroke</span>
            <input type="color" value={currentColor}
              onChange={e => setCurrentColor(e.target.value)}
              className="w-8 h-7 rounded cursor-pointer border border-gray-300" />
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] text-gray-400">Fill</span>
            <div className="flex gap-1 items-center">
              <input type="color"
                value={fillColor === 'transparent' ? '#ffffff' : fillColor}
                onChange={e => setFillColor(e.target.value)}
                className="w-8 h-7 rounded cursor-pointer border border-gray-300" />
              <button onClick={() => setFillColor('transparent')}
                className="text-[10px] px-1.5 py-1 bg-gray-100 rounded border border-gray-200 hover:bg-gray-200 leading-none">
                ∅
              </button>
            </div>
          </div>
        </div>

        <div className="w-px h-8 bg-gray-200" />

        {/* Stroke width */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-400">Width {strokeWidth}px</span>
          <input type="range" min={1} max={12} value={strokeWidth}
            onChange={e => setStrokeWidth(Number(e.target.value))}
            className="w-24 accent-blue-500" />
        </div>

        {/* Line style */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-400">Line</span>
          <div className="flex gap-1">
            {LINE_STYLES.map(s => (
              <button key={s} onClick={() => setLineStyle(s)}
                title={s}
                className={`px-2 py-1 text-xs rounded border transition ${
                  lineStyle === s
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}>
                {s === 'solid' ? '—' : s === 'dashed' ? '╌' : '···'}
              </button>
            ))}
          </div>
        </div>

        {/* Text options (only when text tool active) */}
        {tool === 'text' && (
          <>
            <div className="w-px h-8 bg-gray-200" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400">Font</span>
              <select value={fontFamily} onChange={e => setFontFamily(e.target.value)}
                className="text-xs border border-gray-300 rounded px-1 py-1 bg-white">
                {FONT_FAMILIES.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400">Size</span>
              <select value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
                className="text-xs border border-gray-300 rounded px-1 py-1 bg-white w-16">
                {FONT_SIZES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400">Align</span>
              <div className="flex gap-1">
                {[['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]].map(([a, Icon]) => (
                  <button key={a} onClick={() => setTextAlign(a)}
                    className={`p-1 rounded border transition ${
                      textAlign === a
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}>
                    <Icon size={14} />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="w-px h-8 bg-gray-200" />

        {/* Element actions */}
        <div className="flex gap-1">
          <button onClick={onCopy} disabled={selectedCount === 0} title="Duplicate (Ctrl+D)"
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition">
            <Copy size={18} />
          </button>
          <button onClick={onDelete} disabled={selectedCount === 0} title="Delete (Del)"
            className="p-1.5 rounded hover:bg-red-50 text-red-500 disabled:opacity-30 disabled:text-gray-400 transition">
            <Trash2 size={18} />
          </button>
          <button onClick={onBringToFront} disabled={selectedCount === 0} title="Bring to Front"
            className="text-xs px-2 py-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition flex items-center gap-1">
            <Layers size={15} /> Front
          </button>
          <button onClick={onSendToBack} disabled={selectedCount === 0} title="Send to Back"
            className="text-xs px-2 py-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition flex items-center gap-1">
            <Layers size={15} /> Back
          </button>
        </div>

        <div className="flex-1" />

        <span className="text-xs text-gray-400">
          {selectedCount > 0 ? `${selectedCount} selected` : ''} {elementCount} elements
        </span>
      </div>
    </div>
  );
}
