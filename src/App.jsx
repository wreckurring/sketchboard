import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Toolbar from './components/Toolbar';
import TextEditor from './components/TextEditor';
import ExportMenu from './components/ExportMenu';
import ShareModal from './components/ShareModal';
import CollaborationPanel from './components/CollaborationPanel';
import { useHistory } from './hooks/useHistory';
import { useCollaboration } from './hooks/useCollaboration';
import { generateId, isPointInElement, getResizeHandle, drawElement, drawGrid, snapToGrid as snap } from './utils/drawing';
import { saveToLocalStorage, loadFromLocalStorage, savePreferences, loadPreferences, clearLocalStorage } from './utils/storage';
import { importFromJSON, exportToJSON, downloadFile } from './utils/export';
import { generateSessionId, getUserColor } from './utils/collaboration';

const GRID_SIZE = 20;
const KEY_TOOL_MAP = {
  v: 'select', h: 'hand', r: 'rectangle', c: 'circle', d: 'diamond',
  l: 'line', a: 'arrow', p: 'pencil', t: 'text', e: 'eraser',
};

export default function App() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const autosaveTimer = useRef(null);

  const [isDark, setIsDark] = useState(() => loadPreferences().theme === 'dark');
  const { state: elements, setState: setElements, undo, redo, canUndo, canRedo } = useHistory([]);

  const [sessionId, setSessionId] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('session') || generateSessionId();
  });

  const { isCollaborating, users, cursors, currentUserId, updateCursor } = useCollaboration(
    sessionId,
    elements,
    setElements
  );

  const [tool, setTool] = useState('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [action, setAction] = useState('none');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectionBox, setSelectionBox] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [currentColor, setCurrentColor] = useState('#1e1e1e');
  const [fillColor, setFillColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [lineStyle, setLineStyle] = useState('solid');
  const [fontSize, setFontSize] = useState(20);
  const [fontFamily, setFontFamily] = useState('Caveat');
  const [textAlign, setTextAlign] = useState('left');
  const [snapEnabled, setSnapEnabled] = useState(false);

  const [editingText, setEditingText] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (!isCollaborating) {
      const saved = loadFromLocalStorage();
      if (saved && saved.length > 0) setElements(saved);
    }
  }, [isCollaborating]);

  useEffect(() => {
    if (!isCollaborating && elements.length > 0) {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        saveToLocalStorage(elements);
      }, 2000);
    }
  }, [elements, isCollaborating]);

  useEffect(() => {
    document.body.className = isDark ? 'bg-gray-900' : 'bg-gray-50';
    savePreferences({ theme: isDark ? 'dark' : 'light' });
  }, [isDark]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }
  }, []);

  const getMousePos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    let x = (e.clientX - rect.left - panOffset.x) / scale;
    let y = (e.clientY - rect.top - panOffset.y) / scale;
    if (snapEnabled) {
      x = snap(x, GRID_SIZE);
      y = snap(y, GRID_SIZE);
    }
    return { x, y };
  }, [panOffset, scale, snapEnabled]);

  const newElementDefaults = () => ({
    id: generateId(),
    color: currentColor,
    fillColor: fillColor === 'transparent' ? null : fillColor,
    strokeWidth,
    lineStyle,
    fontSize,
    fontFamily,
    textAlign,
    opacity: 1,
  });

  const visibleElements = useMemo(() => {
    if (!canvasRef.current) return elements;
    const canvas = canvasRef.current;
    const viewportMinX = -panOffset.x / scale;
    const viewportMaxX = (canvas.width - panOffset.x) / scale;
    const viewportMinY = -panOffset.y / scale;
    const viewportMaxY = (canvas.height - panOffset.y) / scale;

    return elements.filter(el => {
      const minX = Math.min(el.x1, el.x2);
      const maxX = Math.max(el.x1, el.x2);
      const minY = Math.min(el.y1, el.y2);
      const maxY = Math.max(el.y1, el.y2);
      
      return !(maxX < viewportMinX || minX > viewportMaxX || maxY < viewportMinY || minY > viewportMaxY);
    });
  }, [elements, panOffset, scale]);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = isDark ? '#1e1e1e' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(panOffset.x, panOffset.y);
      ctx.scale(scale, scale);

      drawGrid(ctx, canvas.width, canvas.height, scale, panOffset, GRID_SIZE);
      visibleElements.forEach(el => drawElement(ctx, el, selectedIds.includes(el.id)));

      if (selectionBox) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1 / scale;
        ctx.setLineDash([5 / scale, 4 / scale]);
        ctx.fillStyle = 'rgba(59,130,246,0.05)';
        const { x1, y1, x2, y2 } = selectionBox;
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        ctx.setLineDash([]);
      }

      cursors.forEach(([userId, cursor]) => {
        if (userId !== currentUserId) {
          const user = users.find(u => u.id === userId);
          if (user) {
            ctx.fillStyle = user.color;
            ctx.beginPath();
            ctx.arc(cursor.x, cursor.y, 6 / scale, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = isDark ? '#fff' : '#000';
            ctx.font = `${12 / scale}px sans-serif`;
            ctx.fillText(user.name, cursor.x + 10 / scale, cursor.y - 10 / scale);
          }
        }
      });

      ctx.restore();
    });
  }, [visibleElements, selectedIds, panOffset, scale, selectionBox, isDark, cursors, users, currentUserId]);

  const handleMouseDown = (e) => {
    if (editingText) return;
    const { x, y } = getMousePos(e);

    if (e.button === 1 || tool === 'hand') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (tool === 'select') {
      const hit = [...elements].reverse().find(el => isPointInElement(x, y, el));
      if (hit) {
        const handle = getResizeHandle(x, y, hit);
        if (handle) {
          setAction('resizing');
          setResizeHandle(handle);
          setSelectedIds([hit.id]);
        } else {
          setAction('moving');
          setDragStart({ x, y });
          if (e.ctrlKey || e.metaKey) {
            setSelectedIds(prev => prev.includes(hit.id) ? prev.filter(id => id !== hit.id) : [...prev, hit.id]);
          } else {
            if (!selectedIds.includes(hit.id)) setSelectedIds([hit.id]);
          }
        }
      } else {
        setSelectedIds([]);
        setAction('selecting');
        setSelectionBox({ x1: x, y1: y, x2: x, y2: y });
      }
      return;
    }

    if (tool === 'text') {
      const el = { ...newElementDefaults(), type: 'text', x1: x, y1: y, x2: x + 200, y2: y + 30, text: '' };
      setElements(prev => [...prev, el]);
      setEditingText(el);
      return;
    }

    setIsDrawing(true);
    const el = {
      ...newElementDefaults(),
      type: tool,
      x1: x, y1: y, x2: x, y2: y,
      points: (tool === 'pencil' || tool === 'eraser') ? [[x, y]] : [],
    };
    setElements(prev => [...prev, el]);
    setSelectedIds([el.id]);
  };

  const handleMouseMove = (e) => {
    const { x, y } = getMousePos(e);
    
    if (isCollaborating) {
      updateCursor(x, y);
    }

    if (isPanning) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (action === 'selecting') {
      setSelectionBox(prev => prev ? { ...prev, x2: x, y2: y } : null);
    } else if (action === 'moving' && dragStart) {
      const dx = x - dragStart.x, dy = y - dragStart.y;
      setElements(prev =>
        prev.map(el =>
          selectedIds.includes(el.id)
            ? {
                ...el,
                x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy,
                points: el.points?.map(([px, py]) => [px + dx, py + dy]),
              }
            : el
        )
      );
      setDragStart({ x, y });
    } else if (action === 'resizing' && selectedIds.length === 1) {
      setElements(prev =>
        prev.map(el => {
          if (el.id !== selectedIds[0]) return el;
          let { x1, y1, x2, y2 } = el;
          if (resizeHandle.includes('n')) y1 = y;
          if (resizeHandle.includes('s')) y2 = y;
          if (resizeHandle.includes('e')) x2 = x;
          if (resizeHandle.includes('w')) x1 = x;
          return { ...el, x1, y1, x2, y2 };
        })
      );
    } else if (isDrawing) {
      setElements(prev => {
        const updated = [...prev];
        const current = updated[updated.length - 1];
        if (current.type === 'pencil' || current.type === 'eraser') {
          current.points = [...current.points, [x, y]];
        } else {
          current.x2 = x;
          current.y2 = y;
        }
        return updated;
      });
    }
  };

  const handleMouseUp = () => {
    if (action === 'selecting' && selectionBox) {
      const { x1, y1, x2, y2 } = selectionBox;
      const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
      const ids = elements
        .filter(el => {
          const eMinX = Math.min(el.x1, el.x2), eMaxX = Math.max(el.x1, el.x2);
          const eMinY = Math.min(el.y1, el.y2), eMaxY = Math.max(el.y1, el.y2);
          return eMinX >= minX && eMaxX <= maxX && eMinY >= minY && eMaxY <= maxY;
        })
        .map(el => el.id);
      setSelectedIds(ids);
      setSelectionBox(null);
    }

    setIsDrawing(false);
    setIsPanning(false);
    setAction('none');
    setDragStart(null);
    setResizeHandle(null);
  };

  const handleDoubleClick = (e) => {
    const { x, y } = getMousePos(e);
    const hit = [...elements].reverse().find(el => el.type === 'text' && isPointInElement(x, y, el));
    if (hit) setEditingText(hit);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    setScale(s => Math.max(0.1, Math.min(8, s * (e.deltaY > 0 ? 0.9 : 1.1))));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  const commitText = (value) => {
    if (!editingText) return;
    if (!value.trim()) {
      setElements(prev => prev.filter(el => el.id !== editingText.id));
    } else {
      setElements(prev => prev.map(el => el.id === editingText.id ? { ...el, text: value } : el));
    }
    setEditingText(null);
  };

  const cancelText = () => {
    setElements(prev => prev.filter(el => el.id !== editingText.id));
    setEditingText(null);
  };

  const handleDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    setElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
    setSelectedIds([]);
  }, [selectedIds]);

  const handleCopy = useCallback(() => {
    if (selectedIds.length === 0) return;
    const copies = elements
      .filter(el => selectedIds.includes(el.id))
      .map(el => ({
        ...el,
        id: generateId(),
        x1: el.x1 + 20, y1: el.y1 + 20, x2: el.x2 + 20, y2: el.y2 + 20,
        points: el.points?.map(([px, py]) => [px + 20, py + 20]),
      }));
    setElements(prev => [...prev, ...copies]);
    setSelectedIds(copies.map(el => el.id));
  }, [selectedIds, elements]);

  const bringToFront = useCallback(() => {
    const selected = elements.filter(el => selectedIds.includes(el.id));
    const rest = elements.filter(el => !selectedIds.includes(el.id));
    setElements([...rest, ...selected]);
  }, [selectedIds, elements]);

  const sendToBack = useCallback(() => {
    const selected = elements.filter(el => selectedIds.includes(el.id));
    const rest = elements.filter(el => !selectedIds.includes(el.id));
    setElements([...selected, ...rest]);
  }, [selectedIds, elements]);

  const handleSave = () => {
    const json = exportToJSON(elements);
    downloadFile(json, `sketchboard-${Date.now()}.sketchboard`, 'application/json');
  };

  const handleLoad = (jsonString) => {
    const loaded = importFromJSON(jsonString);
    if (loaded.length > 0) {
      setElements(loaded);
      setSelectedIds([]);
    }
  };

  const handleClear = () => {
    if (window.confirm('Clear entire canvas?')) {
      setElements([]);
      setSelectedIds([]);
      clearLocalStorage();
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z') { e.preventDefault(); setElements(undo()); }
      if (ctrl && e.key === 'y') { e.preventDefault(); setElements(redo()); }
      if (ctrl && e.key === 'd') { e.preventDefault(); handleCopy(); }
      if (ctrl && e.key === 's') { e.preventDefault(); handleSave(); }
      if (ctrl && e.key === 'a') {
        e.preventDefault();
        setSelectedIds(elements.map(el => el.id));
      }

      if (!ctrl) {
        if (KEY_TOOL_MAP[e.key]) setTool(KEY_TOOL_MAP[e.key]);
        if (e.key === 'Delete' || e.key === 'Backspace') handleDelete();
        if (e.key === 'Escape') setSelectedIds([]);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, elements, undo, redo, handleDelete, handleCopy]);

  const cursorStyle = () => {
    if (isPanning || tool === 'hand') return 'grab';
    if (tool === 'text') return 'text';
    if (tool === 'eraser') return 'cell';
    if (action === 'moving') return 'move';
    return 'crosshair';
  };

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden select-none ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Toolbar
        tool={tool} setTool={setTool}
        currentColor={currentColor} setCurrentColor={setCurrentColor}
        fillColor={fillColor} setFillColor={setFillColor}
        strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
        lineStyle={lineStyle} setLineStyle={setLineStyle}
        fontSize={fontSize} setFontSize={setFontSize}
        fontFamily={fontFamily} setFontFamily={setFontFamily}
        textAlign={textAlign} setTextAlign={setTextAlign}
        snapToGrid={snapEnabled} setSnapToGrid={setSnapEnabled}
        scale={scale} setScale={setScale}
        canUndo={canUndo} canRedo={canRedo}
        onUndo={() => setElements(undo())}
        onRedo={() => setElements(redo())}
        selectedCount={selectedIds.length} elementCount={elements.length}
        onDelete={handleDelete} onCopy={handleCopy}
        onBringToFront={bringToFront} onSendToBack={sendToBack}
        isDark={isDark} onToggleTheme={() => setIsDark(d => !d)}
        onExport={() => setShowExportMenu(true)}
        onSave={handleSave}
        onLoad={handleLoad}
        onClear={handleClear}
        onShare={() => setShowShareModal(true)}
        isCollaborating={isCollaborating}
      />

      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={window.innerWidth}
          height={window.innerHeight - 100}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          className="block"
          style={{ cursor: cursorStyle() }}
        />

        {editingText && (
          <TextEditor
            element={editingText}
            panOffset={panOffset}
            scale={scale}
            onCommit={commitText}
            onCancel={cancelText}
          />
        )}

        <CollaborationPanel
          users={users}
          currentUserId={currentUserId}
          isDark={isDark}
        />
      </div>

      {showExportMenu && (
        <ExportMenu
          elements={elements}
          isDark={isDark}
          onClose={() => setShowExportMenu(false)}
        />
      )}

      {showShareModal && (
        <ShareModal
          sessionId={sessionId}
          isDark={isDark}
          onClose={() => setShowShareModal(false)}
        />
      )}

      <div className={`${isDark ? 'bg-gray-950 text-gray-400' : 'bg-gray-900 text-gray-400'} px-4 py-1.5 text-xs flex items-center gap-6`}>
        <span><kbd className={`${isDark ? 'bg-gray-800' : 'bg-gray-700'} text-gray-200 px-1 rounded`}>V</kbd> Select</span>
        <span><kbd className={`${isDark ? 'bg-gray-800' : 'bg-gray-700'} text-gray-200 px-1 rounded`}>T</kbd> Text</span>
        <span><kbd className={`${isDark ? 'bg-gray-800' : 'bg-gray-700'} text-gray-200 px-1 rounded`}>E</kbd> Eraser</span>
        <span><kbd className={`${isDark ? 'bg-gray-800' : 'bg-gray-700'} text-gray-200 px-1 rounded`}>H</kbd> Hand</span>
        <span><kbd className={`${isDark ? 'bg-gray-800' : 'bg-gray-700'} text-gray-200 px-1 rounded`}>Ctrl+S</kbd> Save</span>
        <span><kbd className={`${isDark ? 'bg-gray-800' : 'bg-gray-700'} text-gray-200 px-1 rounded`}>Scroll</kbd> Zoom</span>
        <div className="flex-1" />
        {isCollaborating ? (
          <span className="text-blue-400">🔗 Collaborative session active</span>
        ) : (
          <span>💾 Auto-save enabled</span>
        )}
      </div>
    </div>
  );
}
