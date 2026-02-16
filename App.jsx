import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Square, Circle, Diamond, MousePointer, Minus, Palette, ZoomIn, ZoomOut, Trash2, Copy, Undo2, Redo2, ArrowUpRight, Layers } from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);
const distance = (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

const distanceToLineSegment = (x, y, x1, y1, x2, y2) => {
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;
  let xx, yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  return distance(x, y, xx, yy);
};

const isPointInElement = (x, y, element) => {
  const { type, x1, y1, x2, y2 } = element;
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  
  if (type === 'pencil') {
    for (let i = 0; i < element.points.length - 1; i++) {
      const [px1, py1] = element.points[i];
      const [px2, py2] = element.points[i + 1];
      if (distanceToLineSegment(x, y, px1, py1, px2, py2) < 5) {
        return true;
      }
    }
    return false;
  }
  
  if (type === 'circle') {
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const radius = distance(x1, y1, x2, y2) / 2;
    return distance(x, y, centerX, centerY) <= radius;
  }
  
  if (type === 'arrow' || type === 'line') {
    return distanceToLineSegment(x, y, x1, y1, x2, y2) < 8;
  }
  
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
};

const getResizeHandle = (x, y, element) => {
  const { x1, y1, x2, y2 } = element;
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  const handleSize = 8;
  
  const handles = [
    { position: 'nw', x: minX, y: minY },
    { position: 'n', x: (minX + maxX) / 2, y: minY },
    { position: 'ne', x: maxX, y: minY },
    { position: 'e', x: maxX, y: (minY + maxY) / 2 },
    { position: 'se', x: maxX, y: maxY },
    { position: 's', x: (minX + maxX) / 2, y: maxY },
    { position: 'sw', x: minX, y: maxY },
    { position: 'w', x: minX, y: (minY + maxY) / 2 }
  ];
  
  for (const handle of handles) {
    if (Math.abs(x - handle.x) <= handleSize && Math.abs(y - handle.y) <= handleSize) {
      return handle.position;
    }
  }
  
  return null;
};

const drawArrow = (ctx, x1, y1, x2, y2, color, strokeWidth) => {
  const headLength = 15;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth;
  
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLength * Math.cos(angle - Math.PI / 6),
    y2 - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - headLength * Math.cos(angle + Math.PI / 6),
    y2 - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
};


const drawElement = (ctx, element, isSelected = false) => {
  const { type, x1, y1, x2, y2, color, points, strokeWidth = 2, fillColor, opacity = 1 } = element;
  
  ctx.save();
  ctx.globalAlpha = opacity;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.fillStyle = fillColor || 'transparent';
  
  const roughness = 0.5;
  
  if (type === 'pencil') {
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  } else if (type === 'line') {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  } else if (type === 'arrow') {
    drawArrow(ctx, x1, y1, x2, y2, color, strokeWidth);
  } else if (type === 'rectangle') {
    ctx.beginPath();
    ctx.moveTo(x1 + Math.random() * roughness, y1 + Math.random() * roughness);
    ctx.lineTo(x2 + Math.random() * roughness, y1 + Math.random() * roughness);
    ctx.lineTo(x2 + Math.random() * roughness, y2 + Math.random() * roughness);
    ctx.lineTo(x1 + Math.random() * roughness, y2 + Math.random() * roughness);
    ctx.closePath();
    if (fillColor) ctx.fill();
    ctx.stroke();
  } else if (type === 'circle') {
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const radius = distance(x1, y1, x2, y2) / 2;
    
    ctx.beginPath();
    for (let i = 0; i <= 360; i += 10) {
      const angle = (i * Math.PI) / 180;
      const r = radius + (Math.random() - 0.5) * roughness;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    if (fillColor) ctx.fill();
    ctx.stroke();
  } else if (type === 'diamond') {
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    
    ctx.beginPath();
    ctx.moveTo(centerX + Math.random() * roughness, y1 + Math.random() * roughness);
    ctx.lineTo(x2 + Math.random() * roughness, centerY + Math.random() * roughness);
    ctx.lineTo(centerX + Math.random() * roughness, y2 + Math.random() * roughness);
    ctx.lineTo(x1 + Math.random() * roughness, centerY + Math.random() * roughness);
    ctx.closePath();
    if (fillColor) ctx.fill();
    ctx.stroke();
  }
  
  ctx.restore();
  
  if (isSelected) {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const padding = 8;
    ctx.strokeRect(minX - padding, minY - padding, maxX - minX + padding * 2, maxY - minY + padding * 2);
    
    ctx.fillStyle = '#3b82f6';
    ctx.setLineDash([]);
    const handleSize = 8;
    const handles = [
      [minX, minY], [(minX + maxX) / 2, minY], [maxX, minY],
      [maxX, (minY + maxY) / 2], [maxX, maxY], [(minX + maxX) / 2, maxY],
      [minX, maxY], [minX, (minY + maxY) / 2]
    ];
    handles.forEach(([hx, hy]) => {
      ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
    });
  }
};

function Sketchboard() {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('select');
  const [elements, setElements] = useState([]);
  const [history, setHistory] = useState([[]]);
  const [historyStep, setHistoryStep] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [action, setAction] = useState('none');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPoint, setStartPanPoint] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState(null);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [selectionBox, setSelectionBox] = useState(null);
  
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - panOffset.x) / scale,
      y: (e.clientY - rect.top - panOffset.y) / scale
    };
  };
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(scale, scale);
    
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    const gridSize = 20;
    for (let x = 0; x < canvas.width / scale; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height / scale);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height / scale; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width / scale, y);
      ctx.stroke();
    }
    
    elements.forEach(element => {
      drawElement(ctx, element, selectedIds.includes(element.id));
    });
    
    if (selectionBox) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        selectionBox.x1,
        selectionBox.y1,
        selectionBox.x2 - selectionBox.x1,
        selectionBox.y2 - selectionBox.y1
      );
      ctx.setLineDash([]);
    }
    
    ctx.restore();
  }, [elements, selectedIds, panOffset, scale, selectionBox]);
  
  const updateHistory = (newElements) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
    setElements(newElements);
  };
  
  const undo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      setElements(history[historyStep - 1]);
    }
  };
  
  const redo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      setElements(history[historyStep + 1]);
    }
  };
  
  const handleMouseDown = (e) => {
    const { x, y } = getMousePos(e);
    
    if (e.button === 1 || (e.button === 0 && e.shiftKey && tool === 'select')) {
      setIsPanning(true);
      setStartPanPoint({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }
    
    if (tool === 'select') {
      const selectedElement = [...elements].reverse().find(el => isPointInElement(x, y, el));
      
      if (selectedElement) {
        const handle = getResizeHandle(x, y, selectedElement);
        
        if (handle) {
          setAction('resizing');
          setResizeHandle(handle);
          setSelectedIds([selectedElement.id]);
        } else {
          setAction('moving');
          setDragStart({ x, y });
          
          if (e.ctrlKey || e.metaKey) {
            setSelectedIds(prev => 
              prev.includes(selectedElement.id) 
                ? prev.filter(id => id !== selectedElement.id)
                : [...prev, selectedElement.id]
            );
          } else if (!selectedIds.includes(selectedElement.id)) {
            setSelectedIds([selectedElement.id]);
          }
        }
      } else {
        if (!e.ctrlKey && !e.metaKey) {
          setSelectedIds([]);
        }
        setAction('selecting');
        setSelectionBox({ x1: x, y1: y, x2: x, y2: y });
      }
    } else {
      setIsDrawing(true);
      const newElement = {
        id: generateId(),
        type: tool,
        x1: x,
        y1: y,
        x2: x,
        y2: y,
        color: currentColor,
        fillColor: fillColor === 'transparent' ? null : fillColor,
        strokeWidth,
        opacity: 1,
        points: tool === 'pencil' ? [[x, y]] : []
      };
      updateHistory([...elements, newElement]);
      setSelectedIds([newElement.id]);
    }
  };
  
  const handleMouseMove = (e) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - startPanPoint.x,
        y: e.clientY - startPanPoint.y
      });
      return;
    }
    
    const { x, y } = getMousePos(e);
    
    if (action === 'selecting') {
      setSelectionBox(prev => ({ ...prev, x2: x, y2: y }));
    } else if (action === 'moving' && dragStart) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      
      const newElements = elements.map(el => {
        if (selectedIds.includes(el.id)) {
          return {
            ...el,
            x1: el.x1 + dx,
            y1: el.y1 + dy,
            x2: el.x2 + dx,
            y2: el.y2 + dy,
            points: el.points?.map(([px, py]) => [px + dx, py + dy])
          };
        }
        return el;
      });
      
      setElements(newElements);
      setDragStart({ x, y });
    } else if (action === 'resizing' && selectedIds.length === 1) {
      const newElements = elements.map(el => {
        if (el.id === selectedIds[0]) {
          const { x1, y1, x2, y2 } = el;
          let newX1 = x1, newY1 = y1, newX2 = x2, newY2 = y2;
          
          if (resizeHandle.includes('n')) newY1 = y;
          if (resizeHandle.includes('s')) newY2 = y;
          if (resizeHandle.includes('e')) newX2 = x;
          if (resizeHandle.includes('w')) newX1 = x;
          
          return { ...el, x1: newX1, y1: newY1, x2: newX2, y2: newY2 };
        }
        return el;
      });
      
      setElements(newElements);
    } else if (isDrawing) {
      const newElements = [...elements];
      const current = newElements[newElements.length - 1];
      
      if (current.type === 'pencil') {
        current.points.push([x, y]);
      } else {
        current.x2 = x;
        current.y2 = y;
      }
      
      setElements(newElements);
    }
  };
  
  const handleMouseUp = () => {
    if (action === 'selecting' && selectionBox) {
      const { x1, y1, x2, y2 } = selectionBox;
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      
      const selected = elements.filter(el => {
        const elMinX = Math.min(el.x1, el.x2);
        const elMaxX = Math.max(el.x1, el.x2);
        const elMinY = Math.min(el.y1, el.y2);
        const elMaxY = Math.max(el.y1, el.y2);
        
        return elMinX >= minX && elMaxX <= maxX && elMinY >= minY && elMaxY <= maxY;
      }).map(el => el.id);
      
      setSelectedIds(selected);
      setSelectionBox(null);
    }
    
    if (action === 'moving' || action === 'resizing') {
      updateHistory(elements);
    }
    
    if (isDrawing) {
      updateHistory(elements);
    }
    
    setIsDrawing(false);
    setIsPanning(false);
    setAction('none');
    setDragStart(null);
    setResizeHandle(null);
  };
  
  const handleDelete = () => {
    if (selectedIds.length > 0) {
      updateHistory(elements.filter(el => !selectedIds.includes(el.id)));
      setSelectedIds([]);
    }
  };
  
  const handleCopy = () => {
    if (selectedIds.length > 0) {
      const copiedElements = elements
        .filter(el => selectedIds.includes(el.id))
        .map(el => ({
          ...el,
          id: generateId(),
          x1: el.x1 + 20,
          y1: el.y1 + 20,
          x2: el.x2 + 20,
          y2: el.y2 + 20,
          points: el.points?.map(([x, y]) => [x + 20, y + 20])
        }));
      
      updateHistory([...elements, ...copiedElements]);
      setSelectedIds(copiedElements.map(el => el.id));
    }
  };
  
  const bringToFront = () => {
    if (selectedIds.length > 0) {
      const selected = elements.filter(el => selectedIds.includes(el.id));
      const others = elements.filter(el => !selectedIds.includes(el.id));
      updateHistory([...others, ...selected]);
    }
  };
  
  const sendToBack = () => {
    if (selectedIds.length > 0) {
      const selected = elements.filter(el => selectedIds.includes(el.id));
      const others = elements.filter(el => !selectedIds.includes(el.id));
      updateHistory([...selected, ...others]);
    }
  };
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        handleCopy();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, elements, historyStep]);
  
  const tools = [
    { name: 'select', icon: MousePointer, label: 'Select (V)' },
    { name: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { name: 'circle', icon: Circle, label: 'Circle (C)' },
    { name: 'diamond', icon: Diamond, label: 'Diamond (D)' },
    { name: 'line', icon: Minus, label: 'Line (L)' },
    { name: 'arrow', icon: ArrowUpRight, label: 'Arrow (A)' },
    { name: 'pencil', icon: Pencil, label: 'Pencil (P)' }
  ];
  
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Sketchboard</h1>
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">Phase 2</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={historyStep === 0} className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-30" title="Undo (Ctrl+Z)">
            <Undo2 size={20} />
          </button>
          <button onClick={redo} disabled={historyStep === history.length - 1} className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-30" title="Redo (Ctrl+Y)">
            <Redo2 size={20} />
          </button>
          
          <div className="h-6 w-px bg-gray-300 mx-2" />
          
          <button onClick={() => setScale(prev => Math.max(prev / 1.2, 0.1))} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ZoomOut size={20} />
          </button>
          <span className="text-sm font-medium text-gray-600 min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(prev => Math.min(prev * 1.2, 5))} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ZoomIn size={20} />
          </button>
        </div>
      </header>
      
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 shadow-sm flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {tools.map(({ name, icon: Icon, label }) => (
            <button key={name} onClick={() => setTool(name)} className={`p-2 rounded-lg transition ${tool === name ? 'bg-blue-500 text-white shadow-md' : 'hover:bg-gray-200 text-gray-700'}`} title={label}>
              <Icon size={20} />
            </button>
          ))}
        </div>
        
        <div className="h-8 w-px bg-gray-300" />
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Palette size={20} className="text-gray-600" />
            <input type="color" value={currentColor} onChange={(e) => setCurrentColor(e.target.value)} className="w-10 h-8 rounded cursor-pointer border-2 border-gray-300" title="Stroke Color" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Fill:</span>
            <input type="color" value={fillColor === 'transparent' ? '#ffffff' : fillColor} onChange={(e) => setFillColor(e.target.value)} className="w-10 h-8 rounded cursor-pointer border-2 border-gray-300" title="Fill Color" />
            <button onClick={() => setFillColor('transparent')} className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">None</button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Width:</span>
            <input type="range" min="1" max="10" value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} className="w-20" />
            <span className="text-sm font-medium w-6">{strokeWidth}</span>
          </div>
        </div>
        
        <div className="h-8 w-px bg-gray-300" />
        
        <div className="flex gap-2">
          <button onClick={handleCopy} disabled={selectedIds.length === 0} className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-30" title="Duplicate (Ctrl+D)">
            <Copy size={20} />
          </button>
          <button onClick={handleDelete} disabled={selectedIds.length === 0} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition disabled:opacity-30 disabled:text-gray-400" title="Delete (Del)">
            <Trash2 size={20} />
          </button>
        </div>
        
        <div className="h-8 w-px bg-gray-300" />
        
        <div className="flex gap-2">
          <button onClick={bringToFront} disabled={selectedIds.length === 0} className="text-xs px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-30" title="Bring to Front">
            <Layers size={16} className="inline mr-1" /> Front
          </button>
          <button onClick={sendToBack} disabled={selectedIds.length === 0} className="text-xs px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-30" title="Send to Back">
            <Layers size={16} className="inline mr-1" /> Back
          </button>
        </div>
        
        <div className="flex-1" />
        
        <div className="text-sm text-gray-500">
          {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select or draw'} • {elements.length} elements
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={window.innerWidth}
          height={window.innerHeight - 140}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="cursor-crosshair bg-white"
          style={{ cursor: isPanning ? 'grabbing' : 'crosshair' }}
        />
      </div>
      
      <div className="bg-gray-800 text-white px-4 py-2 text-sm flex items-center justify-center gap-6">
        <span>⌨️ <strong>Ctrl+Z/Y:</strong> Undo/Redo</span>
        <span>📋 <strong>Ctrl+D:</strong> Duplicate</span>
        <span>🎯 <strong>Ctrl+Click:</strong> Multi-select</span>
        <span>↔️ <strong>Drag handles:</strong> Resize</span>
        <span>🖱️ <strong>Shift+Drag:</strong> Pan</span>
      </div>
    </div>
  );
}

export default Sketchboard;