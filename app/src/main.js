// Wires the page: pick photos, crop panels, write the caption, export the
// cover as a PNG in 1920 x 1080, 1080 x 1080 or 1080 x 1350. A `?shot=`
// query sets up a fixed scene for a screenshot instead (./shots.js).

import { drawCover, GRADES, LAYOUTS, SIZES } from './cover.js';
import { createState, redraw, setPreviewSize, syncPanels, wireCanvasDrag } from './editor.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = createState();

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

const $ = (id) => document.getElementById(id);
const zoom = $('zoom');
const panX = $('panX');
const panY = $('panY');

/** Copies the picked panel's crop into the sliders. */
function syncSliders() {
  const panel = state.panels[state.selected];
  if (!panel) return;
  zoom.value = String(panel.zoom);
  panX.value = String(panel.dx);
  panY.value = String(panel.dy);
}

/** Redraws the preview and keeps the sliders in step with the picked panel. */
function refresh() {
  syncPanels(state);
  redraw(canvas, state);
  syncSliders();
}

/** Renders the cover at W x H and downloads it as a PNG. */
function exportPNG(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), w, h, state);
  off.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed — try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-bay-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved neon-bay-cover-${w}x${h}.png`;
  }, 'image/png');
}

/** Loads a photo file into slot A or B, then redraws. */
async function loadPhotoFile(slot, file) {
  if (!file) return;
  try {
    state.photos[slot] = await loadImage(URL.createObjectURL(file));
    status.textContent = `Photo ${slot.toUpperCase()} loaded.`;
  } catch {
    status.textContent = `Could not read that photo — try another file.`;
  }
  refresh();
}

/** Loads both bundled sample photos (made with an image model, free to use). */
async function loadSamples() {
  try {
    const [a, b] = await Promise.all([
      loadImage('samples/boulevard.jpg'),
      loadImage('samples/pier.jpg'),
    ]);
    state.photos.a = a;
    state.photos.b = b;
    status.textContent = 'Sample photos loaded — June on the boulevard, Milo on the pier.';
  } catch {
    status.textContent = 'Could not load the sample photos.';
  }
  refresh();
}

$('photoA').addEventListener('change', (e) => loadPhotoFile('a', e.target.files[0]));
$('photoB').addEventListener('change', (e) => loadPhotoFile('b', e.target.files[0]));
$('samples').addEventListener('click', loadSamples);

$('layout').addEventListener('change', (e) => {
  state.layout = e.target.value;
  state.selected = 0;
  refresh();
});
$('grade').addEventListener('change', (e) => {
  state.grade = e.target.value;
  refresh();
});
$('caption').addEventListener('input', (e) => { state.title = e.target.value; refresh(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; refresh(); });

$('fillA').addEventListener('click', () => {
  state.panels.forEach((p) => { p.photo = 'a'; });
  refresh();
});
$('fillB').addEventListener('click', () => {
  state.panels.forEach((p) => { p.photo = 'b'; });
  refresh();
});
$('assignA').addEventListener('click', () => {
  state.panels[state.selected].photo = 'a';
  refresh();
});
$('assignB').addEventListener('click', () => {
  state.panels[state.selected].photo = 'b';
  refresh();
});

zoom.addEventListener('input', () => {
  state.panels[state.selected].zoom = Number(zoom.value);
  refresh();
});
panX.addEventListener('input', () => {
  state.panels[state.selected].dx = Number(panX.value);
  refresh();
});
panY.addEventListener('input', () => {
  state.panels[state.selected].dy = Number(panY.value);
  refresh();
});

$('exportWide').addEventListener('click', () => { setPreviewSize(canvas, state, 'wide'); exportPNG(1920, 1080); });
$('exportSquare').addEventListener('click', () => { setPreviewSize(canvas, state, 'square'); exportPNG(1080, 1080); });
$('exportPortrait').addEventListener('click', () => { setPreviewSize(canvas, state, 'portrait'); exportPNG(1080, 1350); });

wireCanvasDrag(canvas, state, refresh);

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot === 'cover' || shot === 'editor') {
  runShot(shot, query, async ({ size, layout, grade, caption, subtitle, photoA, photoB }) => {
    state.layout = layout in LAYOUTS ? layout : 'comic';
    state.grade = grade in GRADES ? grade : 'sunset';
    state.title = caption;
    state.subtitle = subtitle;
    $('layout').value = state.layout;
    $('grade').value = state.grade;
    $('caption').value = caption;
    $('subtitle').value = subtitle;
    setPreviewSize(canvas, state, size in SIZES ? size : 'wide');
    const [a, b] = await Promise.all([
      loadImage(`samples/${photoA}.jpg`),
      loadImage(`samples/${photoB}.jpg`),
    ]);
    state.photos.a = a;
    state.photos.b = b;
    refresh();
  });
} else {
  refresh();
}
