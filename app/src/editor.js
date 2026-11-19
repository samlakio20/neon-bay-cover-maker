// The editor's state and the live preview: which panel is picked, how each
// photo is cropped inside it, and the drag-to-move interaction on the canvas.
// The cover itself is drawn by cover.js; this file only owns the state that
// feeds it and the controls that change it.

import { defaultPanels, drawCover, panelCount, panelRects, SIZES } from './cover.js';

/** Fresh editor state: no photos yet, comic layout, sunset grade. */
export function createState() {
  return {
    photos: { a: null, b: null },
    layout: 'comic',
    grade: 'sunset',
    title: 'Sunset Heist',
    subtitle: 'June & Milo · One last score · Neon Bay',
    panels: defaultPanels('comic'),
    size: 'wide',
    selected: 0,
  };
}

/**
 * Keeps the panel list in step with the layout: a layout with fewer panels
 * drops the extras, one with more gains fresh defaults.
 */
export function syncPanels(state) {
  const want = panelCount(state.layout);
  while (state.panels.length > want) state.panels.pop();
  while (state.panels.length < want) {
    state.panels.push({ photo: state.panels.length % 2 === 0 ? 'a' : 'b', zoom: 1, dx: 0, dy: 0 });
  }
  if (state.selected >= want) state.selected = 0;
}

/** The panel area and gutter for a preview canvas of this size. */
export function panelArea(canvas) {
  const W = canvas.width;
  const H = canvas.height;
  const pad = Math.round(W * 0.02);
  const g = Math.max(6, Math.round(W * 0.012));
  const titleH = Math.round(H * (W >= H ? 0.3 : 0.27));
  return { area: { x: pad, y: pad, w: W - pad * 2, h: H - titleH - pad * 2 }, g };
}

/** The panel the pointer (in canvas pixels) is over, or -1. */
export function panelAt(state, canvas, px, py) {
  const { area, g } = panelArea(canvas);
  const rects = panelRects(state.layout, area, g);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}

/** Redraws the preview canvas from the state, then outlines the picked panel. */
export function redraw(canvas, state) {
  const ctx = canvas.getContext('2d');
  drawCover(ctx, canvas.width, canvas.height, state);
  const picked = state.panels[state.selected];
  if (!picked) return;
  const W = canvas.width;
  const { area, g } = panelArea(canvas);
  const rect = panelRects(state.layout, area, g)[state.selected];
  if (!rect) return;
  ctx.save();
  ctx.lineWidth = Math.max(5, W * 0.006);
  ctx.strokeStyle = '#ffd23f';
  ctx.setLineDash([Math.max(10, W * 0.012), Math.max(8, W * 0.008)]);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.setLineDash([]);
  // A dark pill behind the label, so it reads over any photo.
  const label = `PANEL ${state.selected + 1} · PHOTO ${picked.photo.toUpperCase()}`;
  const fontSize = Math.max(14, Math.round(W * 0.02));
  ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
  const textW = ctx.measureText(label).width;
  const pillX = rect.x + 10;
  const pillY = rect.y + 10;
  const pillH = fontSize + 14;
  ctx.fillStyle = 'rgba(22, 10, 36, 0.85)';
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, textW + 20, pillH, 8);
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, pillX + 10, pillY + pillH / 2);
  ctx.restore();
}

/** Sizes the preview canvas to an export size and redraws. */
export function setPreviewSize(canvas, state, size) {
  state.size = size;
  const { w, h } = SIZES[size];
  canvas.width = w;
  canvas.height = h;
  redraw(canvas, state);
}

/**
 * Wires pointer dragging on the preview: click picks a panel, drag pans the
 * photo inside it. `onChange` runs after every move so sliders stay in step.
 */
export function wireCanvasDrag(canvas, state, onChange) {
  let drag = null;
  const toCanvas = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  };
  canvas.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e);
    const hit = panelAt(state, canvas, p.x, p.y);
    if (hit === -1) return;
    state.selected = hit;
    drag = { x: p.x, y: p.y, panel: state.panels[hit] };
    canvas.setPointerCapture(e.pointerId);
    onChange();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = toCanvas(e);
    const { area, g } = panelArea(canvas);
    const rect = panelRects(state.layout, area, g)[state.selected];
    if (!rect) return;
    drag.panel.dx = Math.max(-0.6, Math.min(0.6, drag.panel.dx + (p.x - drag.x) / rect.w));
    drag.panel.dy = Math.max(-0.6, Math.min(0.6, drag.panel.dy + (p.y - drag.y) / rect.h));
    drag.x = p.x;
    drag.y = p.y;
    onChange();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; });
}
