// Fixed scenes for screenshots: ?shot=editor shows the page with the sample
// photos loaded; ?shot=cover shows the cover alone, at the size the query
// names. window.__shotReady is set once the scene has painted, so a
// screenshot tool can wait on it instead of guessing a delay.

/** Applies a shot scene to the app: loads samples, sets the fields, draws. */
export async function runShot(shot, query, setup) {
  const size = query.get('size') ?? 'wide';
  const layout = query.get('layout') ?? 'comic';
  const grade = query.get('grade') ?? 'sunset';
  const caption = query.get('caption') ?? 'Sunset Heist';
  const subtitle = query.get('subtitle') ?? 'June & Milo · One last score · Neon Bay';
  const photoA = query.get('photo') ?? 'boulevard';
  const photoB = query.get('photoB') ?? 'pier';
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await setup({ size, layout, grade, caption, subtitle, photoA, photoB });
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
