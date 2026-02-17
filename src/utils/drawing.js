export const generateId = () => Math.random().toString(36).substr(2, 9);

export const distance = (x1, y1, x2, y2) =>
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

export const distanceToLineSegment = (x, y, x1, y1, x2, y2) => {
  const A = x - x1, B = y - y1, C = x2 - x1, D = y2 - y1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = lenSq !== 0 ? dot / lenSq : -1;
  let xx, yy;
  if (param < 0) { xx = x1; yy = y1; }
  else if (param > 1) { xx = x2; yy = y2; }
  else { xx = x1 + param * C; yy = y1 + param * D; }
  return distance(x, y, xx, yy);
};

// Snap a value to the nearest grid point
export const snapToGrid = (value, gridSize = 20) =>
  Math.round(value / gridSize) * gridSize;


export const isPointInElement = (x, y, element) => {
  const { type, x1, y1, x2, y2 } = element;
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);

  if (type === 'pencil') {
    for (let i = 0; i < element.points.length - 1; i++) {
      const [px1, py1] = element.points[i];
      const [px2, py2] = element.points[i + 1];
      if (distanceToLineSegment(x, y, px1, py1, px2, py2) < 6) return true;
    }
    return false;
  }

  if (type === 'text') {
    return x >= minX && x <= minX + 200 && y >= minY - 20 && y <= minY + 10;
  }

  if (type === 'circle') {
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    return distance(x, y, cx, cy) <= distance(x1, y1, x2, y2) / 2;
  }

  if (type === 'arrow' || type === 'line') {
    return distanceToLineSegment(x, y, x1, y1, x2, y2) < 8;
  }

  return x >= minX && x <= maxX && y >= minY && y <= maxY;
};

export const getResizeHandle = (x, y, element) => {
  const { x1, y1, x2, y2 } = element;
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
  const S = 8;

  const handles = [
    { position: 'nw', x: minX, y: minY },
    { position: 'n',  x: (minX + maxX) / 2, y: minY },
    { position: 'ne', x: maxX, y: minY },
    { position: 'e',  x: maxX, y: (minY + maxY) / 2 },
    { position: 'se', x: maxX, y: maxY },
    { position: 's',  x: (minX + maxX) / 2, y: maxY },
    { position: 'sw', x: minX, y: maxY },
    { position: 'w',  x: minX, y: (minY + maxY) / 2 },
  ];

  return handles.find(h => Math.abs(x - h.x) <= S && Math.abs(y - h.y) <= S)?.position ?? null;
};


const applyStrokeStyle = (ctx, lineStyle = 'solid', strokeWidth = 2) => {
  if (lineStyle === 'dashed') ctx.setLineDash([strokeWidth * 4, strokeWidth * 2]);
  else if (lineStyle === 'dotted') ctx.setLineDash([strokeWidth, strokeWidth * 2]);
  else ctx.setLineDash([]);
};

const drawArrowHead = (ctx, x1, y1, x2, y2) => {
  const headLength = 14;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
};

const ROUGHNESS = 0.6;
const jitter = () => (Math.random() - 0.5) * ROUGHNESS;

export const drawElement = (ctx, element, isSelected = false) => {
  const { type, x1, y1, x2, y2, color = '#000', points, strokeWidth = 2,
          fillColor, opacity = 1, lineStyle = 'solid',
          text, fontSize = 20, fontFamily = 'Caveat', textAlign = 'left' } = element;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.fillStyle = fillColor || 'transparent';
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  applyStrokeStyle(ctx, lineStyle, strokeWidth);

  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;

  if (type === 'pencil') {
    ctx.beginPath();
    points.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
    ctx.stroke();

  } else if (type === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = strokeWidth * 6;
    ctx.beginPath();
    points.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';

  } else if (type === 'line') {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

  } else if (type === 'arrow') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    drawArrowHead(ctx, x1, y1, x2, y2);

  } else if (type === 'rectangle') {
    ctx.beginPath();
    ctx.moveTo(x1 + jitter(), y1 + jitter());
    ctx.lineTo(x2 + jitter(), y1 + jitter());
    ctx.lineTo(x2 + jitter(), y2 + jitter());
    ctx.lineTo(x1 + jitter(), y2 + jitter());
    ctx.closePath();
    if (fillColor) ctx.fill();
    ctx.stroke();

  } else if (type === 'circle') {
    const r = distance(x1, y1, x2, y2) / 2;
    ctx.beginPath();
    for (let i = 0; i <= 360; i += 8) {
      const a = (i * Math.PI) / 180;
      const rj = r + jitter();
      const px = cx + rj * Math.cos(a);
      const py = cy + rj * Math.sin(a);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    if (fillColor) ctx.fill();
    ctx.stroke();

  } else if (type === 'diamond') {
    ctx.beginPath();
    ctx.moveTo(cx + jitter(), y1 + jitter());
    ctx.lineTo(x2 + jitter(), cy + jitter());
    ctx.lineTo(cx + jitter(), y2 + jitter());
    ctx.lineTo(x1 + jitter(), cy + jitter());
    ctx.closePath();
    if (fillColor) ctx.fill();
    ctx.stroke();

  } else if (type === 'text') {
    ctx.setLineDash([]);
    ctx.font = `${fontSize}px '${fontFamily}', cursive`;
    ctx.fillStyle = color;
    ctx.textAlign = textAlign;
    const lines = (text || '').split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, x1, y1 + i * (fontSize + 4));
    });
  }

  ctx.restore();

  // Selection box
  if (isSelected) {
    ctx.save();
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const pad = 8;

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2);
    ctx.setLineDash([]);

    // Resize handles
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    const HS = 8;
    const handles = [
      [minX, minY], [cx, minY], [maxX, minY],
      [maxX, cy], [maxX, maxY], [cx, maxY],
      [minX, maxY], [minX, cy],
    ];
    handles.forEach(([hx, hy]) => {
      ctx.beginPath();
      ctx.arc(hx, hy, HS / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }
};


export const drawGrid = (ctx, width, height, scale, panOffset, gridSize = 20) => {
  ctx.save();
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 0.5;

  const startX = (-panOffset.x / scale) % gridSize;
  const startY = (-panOffset.y / scale) % gridSize;

  for (let x = -startX; x < width / scale; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, -panOffset.y / scale);
    ctx.lineTo(x, height / scale - panOffset.y / scale);
    ctx.stroke();
  }
  for (let y = -startY; y < height / scale; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(-panOffset.x / scale, y);
    ctx.lineTo(width / scale - panOffset.x / scale, y);
    ctx.stroke();
  }
  ctx.restore();
};
