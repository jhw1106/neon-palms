// Neon Palms — keyboard and mouse state. Every other module reads input
// through NP.input: held keys by code, one-frame presses, and the mouse
// position in screen pixels plus its world position once the camera is known.
window.NP = window.NP || {};

NP.input = (function () {
  const held = Object.create(null);
  const pressed = Object.create(null);
  const mouse = { x: 0, y: 0, wx: 0, wy: 0, down: false, clicked: false };

  function bind(canvas) {
    window.addEventListener('keydown', (e) => {
      if (!held[e.code]) pressed[e.code] = true;
      held[e.code] = true;
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { held[e.code] = false; });
    window.addEventListener('blur', () => {
      for (const k in held) held[k] = false;
      mouse.down = false;
    });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { mouse.down = true; mouse.clicked = true; }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) mouse.down = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function endFrame() {
    for (const k in pressed) pressed[k] = false;
    mouse.clicked = false;
  }

  return {
    bind,
    endFrame,
    mouse,
    down: (code) => !!held[code],
    hit: (code) => !!pressed[code],
    axis: (neg, pos) => (held[pos] ? 1 : 0) - (held[neg] ? 1 : 0),
  };
})();
