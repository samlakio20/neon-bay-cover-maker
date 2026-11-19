// Draws the Neon Bay cover: comic-book panels of the crew's photos over a
// sunset title band with big hand-styled lettering. Everything is canvas 2D
// and system fonts — no image, font file or network is loaded by the app.
// A cover is: panels on top, a gradient sky with a sun disc at the bottom,
// and one huge title with a one-line subtitle.

/** Colour grades: sky gradient, sun, panel tint, title stroke, subtitle. */
export const GRADES = {
  sunset: {
    sky: ['#ff9a3d', '#ff5e7a', '#a32e7d'],
    sun: '#ffd23f',
    tint: 'rgba(255, 94, 122, 0.22)',
    band: '#2a0a3d',
    titleStroke: '#ff2e88',
    subtitle: '#ffd23f',
  },
  neon: {
    sky: ['#7b2ff7', '#2f7bff', '#00b3a7'],
    sun: '#7df9ff',
    tint: 'rgba(47, 123, 255, 0.22)',
    band: '#12063a',
    titleStroke: '#00e5c7',
    subtitle: '#7df9ff',
  },
  noir: {
    sky: ['#0f766e', '#155e63', '#0b1526'],
    sun: '#f59e0b',
    tint: 'rgba(15, 118, 110, 0.25)',
    band: '#071022',
    titleStroke: '#f59e0b',
    subtitle: '#fbbf24',
  },
};

/** Export sizes the app offers, in the order the editor lists them. */
export const SIZES = {
  wide: { w: 1920, h: 1080 },
  square: { w: 1080, h: 1080 },
  portrait: { w: 1080, h: 1350 },
};

/** Panel layouts: each names the rectangles (fractions of the panel area). */
export const LAYOUTS = {
  comic: 'Comic strip — hero + two panels',
  duo: 'Duo split — two tall panels',
  hero: 'Hero + strip — big photo, two small',
};

/**
 * Rectangles for a layout, in pixels, inside the panel area above the title
 * band. `area` is {x, y, w, h} of that area; `g` is the gutter in pixels.
 */
export function panelRects(layout, area, g) {
  const { x, y, w, h } = area;
  if (layout === 'duo') {
    const half = (w - g) / 2;
    return [
      { x, y, w: half, h },
      { x: x + half + g, y, w: half, h },
    ];
  }
  if (layout === 'hero') {
    const top = h * 0.66 - g / 2;
    const bottom = h - top - g;
    const half = (w - g) / 2;
    return [
      { x, y, w, h: top },
      { x, y: y + top + g, w: half, h: bottom },
      { x: x + half + g, y: y + top + g, w: half, h: bottom },
    ];
  }
  // comic (default): a big hero on the left, two stacked panels on the right.
  const heroW = w * 0.6 - g / 2;
  const colX = x + heroW + g;
  const colW = w - heroW - g;
  const half = (h - g) / 2;
  return [
    { x, y, w: heroW, h },
    { x: colX, y, w: colW, h: half },
    { x: colX, y: y + half + g, w: colW, h: half },
  ];
}

/** How many panels a layout has. */
export function panelCount(layout) {
  return panelRects(layout, { x: 0, y: 0, w: 100, h: 100 }, 0).length;
}

/** Default per-panel crop state: photo key, zoom, and pan offsets.
 *  The small downward pans favour the top of each photo, where faces are,
 *  so the default scene shows June's and Milo's faces instead of torsos. */
export function defaultPanels(layout) {
  const count = panelCount(layout);
  const photos = ['a', 'b', 'a'];
  const dys = [0.22, 0.2, 0.45];
  return Array.from({ length: count }, (_, i) => ({
    photo: photos[i % photos.length],
    zoom: 1,
    dx: 0,
    dy: dys[i % dys.length],
  }));
}

/** Draws one photo into a panel rect, cover-fit, with zoom and pan.
 *  The pan is clamped to the slack the cover-fit leaves, so the photo can
 *  never slide off and leave the panel's background showing. */
function drawPhotoInto(ctx, photo, rect, panel) {
  const iw = photo.naturalWidth;
  const ih = photo.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih) * panel.zoom;
  const dw = iw * base;
  const dh = ih * base;
  const ox = Math.max(-(dw - rect.w) / 2, Math.min((dw - rect.w) / 2, panel.dx * rect.w));
  const oy = Math.max(-(dh - rect.h) / 2, Math.min((dh - rect.h) / 2, panel.dy * rect.h));
  const dx = rect.x + (rect.w - dw) / 2 + ox;
  const dy = rect.y + (rect.h - dh) / 2 + oy;
  ctx.save();
  ctx.filter = 'saturate(1.28) contrast(1.07)';
  ctx.drawImage(photo, dx, dy, dw, dh);
  ctx.restore();
}

/** Fits the title on one line: shrinks the font until it fits the width. */
function titleFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  for (;;) {
    ctx.font = `italic 900 ${size}px "Arial Black", Arial, sans-serif`;
    try { ctx.letterSpacing = `${(size * 0.02).toFixed(1)}px`; } catch { /* older canvas */ }
    if (ctx.measureText(text).width <= maxWidth || size <= 16) return size;
    size = Math.max(16, size - 4);
  }
}

/**
 * Draws the whole cover onto `ctx` at W x H from `state`:
 * photos {a, b} (images or null), panels (crop state per panel),
 * layout, grade, title and subtitle strings.
 */
export function drawCover(ctx, W, H, state) {
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  const pad = Math.round(W * 0.02);
  const g = Math.max(6, Math.round(W * 0.012));
  const titleH = Math.round(H * (W >= H ? 0.3 : 0.27));
  const area = { x: pad, y: pad, w: W - pad * 2, h: H - titleH - pad * 2 };

  ctx.fillStyle = grade.band;
  ctx.fillRect(0, 0, W, H);

  // --- Panels -------------------------------------------------------------
  const rects = panelRects(state.layout, area, g);
  const border = Math.max(4, Math.round(W * 0.004));
  rects.forEach((rect, i) => {
    const panel = state.panels[i] ?? { photo: 'a', zoom: 1, dx: 0, dy: 0 };
    const photo = state.photos[panel.photo] ?? null;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (photo) {
      drawPhotoInto(ctx, photo, rect, panel);
      // Sunset tint over the photo, stronger toward the bottom.
      const tint = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
      tint.addColorStop(0, 'rgba(255, 120, 80, 0)');
      tint.addColorStop(1, grade.tint);
      ctx.fillStyle = tint;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    } else {
      const empty = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      empty.addColorStop(0, '#3a1c5c');
      empty.addColorStop(1, '#1c0b33');
      ctx.fillStyle = empty;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = '#c9b3de';
      ctx.font = `700 ${Math.max(14, Math.round(rect.w * 0.045))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`PHOTO ${panel.photo.toUpperCase()}`, rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
    ctx.restore();
    ctx.lineWidth = border;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  // --- Title band: sunset sky, sun disc, lettering ----------------------
  const bandY = H - titleH;
  const sky = ctx.createLinearGradient(0, bandY, 0, H);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.55, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, bandY, W, titleH);

  const sunR = titleH * 0.42;
  const sunX = W * 0.09;
  const sunY = bandY + titleH * 0.42;
  const sun = ctx.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR);
  sun.addColorStop(0, grade.sun);
  sun.addColorStop(1, 'rgba(255, 210, 63, 0)');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  if (title) {
    const size = titleFont(ctx, title, W * 0.92, titleH * 0.46);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = size * 0.08;
    ctx.shadowOffsetY = size * 0.03;
    const ty = bandY + titleH * 0.42;
    ctx.lineWidth = Math.max(3, size * 0.07);
    ctx.strokeStyle = grade.titleStroke;
    ctx.strokeText(title, W / 2, ty);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, W / 2, ty);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  if (subtitle) {
    // Shrink the font until the subtitle fits; never cut the words off.
    let subSize = Math.max(13, Math.round(titleH * 0.115));
    for (;;) {
      ctx.font = `700 ${subSize}px system-ui, sans-serif`;
      try { ctx.letterSpacing = `${(subSize * 0.28).toFixed(1)}px`; } catch { /* older canvas */ }
      if (ctx.measureText(subtitle).width <= W * 0.9 || subSize <= 10) break;
      subSize -= 1;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = grade.subtitle;
    ctx.fillText(subtitle, W / 2, bandY + titleH * 0.84);
  }
}
