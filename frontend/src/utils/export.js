import { drawElement } from './drawing';

export const exportToPNG = (elements, scale = 2, background = '#ffffff') => {
  if (elements.length === 0) return null;

  const bounds = getBounds(elements);
  const padding = 40;
  const width = (bounds.maxX - bounds.minX + padding * 2) * scale;
  const height = (bounds.maxY - bounds.minY + padding * 2) * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-bounds.minX + padding, -bounds.minY + padding);

  elements.forEach(el => drawElement(ctx, el, false));
  ctx.restore();

  return canvas.toDataURL('image/png');
};

export const exportToSVG = (elements, background = '#ffffff') => {
  if (elements.length === 0) return null;

  const bounds = getBounds(elements);
  const padding = 40;
  const width = bounds.maxX - bounds.minX + padding * 2;
  const height = bounds.maxY - bounds.minY + padding * 2;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('xmlns', svgNS);

  const rect = document.createElementNS(svgNS, 'rect');
  rect.setAttribute('width', width);
  rect.setAttribute('height', height);
  rect.setAttribute('fill', background);
  svg.appendChild(rect);

  const g = document.createElementNS(svgNS, 'g');
  g.setAttribute('transform', `translate(${-bounds.minX + padding}, ${-bounds.minY + padding})`);
  svg.appendChild(g);

  elements.forEach(el => {
    const svgEl = elementToSVG(el);
    if (svgEl) g.appendChild(svgEl);
  });

  return new XMLSerializer().serializeToString(svg);
};

export const exportToJSON = (elements) => {
  return JSON.stringify({
    type: 'sketchboard',
    version: 1,
    elements,
    appState: { exportedAt: new Date().toISOString() },
  }, null, 2);
};

export const importFromJSON = (jsonString) => {
  try {
    const data = JSON.parse(jsonString);
    if (data.type === 'sketchboard' || data.type === 'excalidraw') {
      return data.elements || [];
    }
    return [];
  } catch {
    return [];
  }
};

export const copyToClipboard = async (dataURL) => {
  try {
    const blob = await (await fetch(dataURL)).blob();
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
};

export const downloadFile = (data, filename, type = 'text/plain') => {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const getBounds = (elements) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  elements.forEach(el => {
    const x1 = Math.min(el.x1, el.x2);
    const x2 = Math.max(el.x1, el.x2);
    const y1 = Math.min(el.y1, el.y2);
    const y2 = Math.max(el.y1, el.y2);
    
    if (el.points?.length > 0) {
      el.points.forEach(([x, y]) => {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      });
    } else {
      minX = Math.min(minX, x1);
      maxX = Math.max(maxX, x2);
      minY = Math.min(minY, y1);
      maxY = Math.max(maxY, y2);
    }
  });

  return { minX, minY, maxX, maxY };
};

const elementToSVG = (el) => {
  const svgNS = 'http://www.w3.org/2000/svg';
  const { type, x1, y1, x2, y2, color, strokeWidth, fillColor, lineStyle, text, fontSize, fontFamily } = el;
  
  const element = document.createElementNS(svgNS, 
    type === 'text' ? 'text' : type === 'circle' ? 'ellipse' : 'path'
  );

  element.setAttribute('stroke', color || '#000');
  element.setAttribute('stroke-width', strokeWidth || 2);
  element.setAttribute('fill', fillColor || 'none');
  element.setAttribute('stroke-linecap', 'round');
  element.setAttribute('stroke-linejoin', 'round');

  if (lineStyle === 'dashed') element.setAttribute('stroke-dasharray', `${strokeWidth * 4} ${strokeWidth * 2}`);
  if (lineStyle === 'dotted') element.setAttribute('stroke-dasharray', `${strokeWidth} ${strokeWidth * 2}`);

  if (type === 'line') {
    element.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
  } else if (type === 'arrow') {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = 14;
    const path = `M ${x1} ${y1} L ${x2} ${y2} M ${x2} ${y2} L ${x2 - headLen * Math.cos(angle - Math.PI / 6)} ${y2 - headLen * Math.sin(angle - Math.PI / 6)} M ${x2} ${y2} L ${x2 - headLen * Math.cos(angle + Math.PI / 6)} ${y2 - headLen * Math.sin(angle + Math.PI / 6)}`;
    element.setAttribute('d', path);
  } else if (type === 'rectangle') {
    element.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2} L ${x1} ${y2} Z`);
  } else if (type === 'circle') {
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    const rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;
    element.setAttribute('cx', cx);
    element.setAttribute('cy', cy);
    element.setAttribute('rx', rx);
    element.setAttribute('ry', ry);
  } else if (type === 'diamond') {
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    element.setAttribute('d', `M ${cx} ${y1} L ${x2} ${cy} L ${cx} ${y2} L ${x1} ${cy} Z`);
  } else if (type === 'pencil' && el.points?.length > 0) {
    const pathData = el.points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
    element.setAttribute('d', pathData);
  } else if (type === 'text') {
    element.setAttribute('x', x1);
    element.setAttribute('y', y1);
    element.setAttribute('font-size', fontSize || 20);
    element.setAttribute('font-family', fontFamily || 'Caveat');
    element.setAttribute('fill', color || '#000');
    element.textContent = text || '';
  }

  return element;
};
