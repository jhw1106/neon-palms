// Neon Palms — everything that floats over the world: cash and health,
// wanted stars, the bust meter, the objective banner, the minimap, the
// dialogue box, toasts, and the full screens (title, pause, busted,
// knocked out). Buttons register their rectangles here so main.js can
// route mouse clicks to them.
window.NP = window.NP || {};

NP.hud = (function () {
  let buttons = [];

  function pill(ctx, x, y, w, h, fill) {
    ctx.fillStyle = fill;
    NP.render.roundRect(ctx, x, y, w, h, h / 2);
    ctx.fill();
  }

  function drawMinimap(ctx, vw, vh, t) {
    const mw = 198;
    const mh = 142;
    const x = vw - mw - 16;
    const y = vh - mh - 16;
    const s = Math.min(mw / NP.world.W, mh / NP.world.H);
    const ox = x + (mw - NP.world.W * s) / 2;
    const oy = y + (mh - NP.world.H * s) / 2;
    ctx.fillStyle = 'rgba(24,20,32,0.82)';
    NP.render.roundRect(ctx, x - 4, y - 4, mw + 8, mh + 8, 10);
    ctx.fill();
    ctx.fillStyle = '#236b84';
    ctx.fillRect(ox + NP.world.WATER_X * s, oy, (NP.world.W - NP.world.WATER_X) * s, NP.world.H * s);
    ctx.fillStyle = '#d9c08a';
    ctx.fillRect(ox + NP.world.SAND_X * s, oy, (NP.world.WATER_X - NP.world.SAND_X) * s, NP.world.H * s);
    ctx.fillStyle = '#a08e6f';
    ctx.fillRect(ox, oy, NP.world.SAND_X * s, NP.world.H * s);
    ctx.strokeStyle = '#574f57';
    ctx.lineWidth = 2.4;
    for (const ax of NP.world.AVENUES) {
      ctx.beginPath(); ctx.moveTo(ox + ax * s, oy); ctx.lineTo(ox + ax * s, oy + NP.world.H * s); ctx.stroke();
    }
    for (const sy of NP.world.STREETS) {
      ctx.beginPath(); ctx.moveTo(ox, oy + sy * s); ctx.lineTo(ox + NP.world.SAND_X * s, oy + sy * s); ctx.stroke();
    }
    const dot = (wx, wy, color, r) => {
      ctx.fillStyle = color;
      ctx.fillRect(ox + wx * s - r, oy + wy * s - r, r * 2, r * 2);
    };
    for (const ped of NP.peds.all) dot(ped.x, ped.y, 'rgba(255,255,255,0.35)', 1);
    for (const car of NP.vehicles.all) {
      if (car.driver === 'police') {
        dot(car.x, car.y, (t * 3.4 + car.id % 2) % 1 < 0.5 ? '#ff3b30' : '#3aa0ff', 2.6);
      } else if (car.marked) {
        dot(car.x, car.y, '#ffd94d', 2.6);
      } else {
        dot(car.x, car.y, 'rgba(255,255,255,0.75)', 1.6);
      }
    }
    const o = NP.game.objective;
    if (o) {
      const px = ox + o.x * s;
      const py = oy + o.y * s;
      ctx.fillStyle = '#ffd94d';
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.PI / 4);
      const r = 4 + Math.sin(t * 5) * 1.2;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.restore();
    }
    const p = NP.game.player;
    ctx.save();
    ctx.translate(ox + p.x * s, oy + p.y * s);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,217,77,0.5)';
    ctx.lineWidth = 1.5;
    NP.render.roundRect(ctx, x - 4, y - 4, mw + 8, mh + 8, 10);
    ctx.stroke();
  }

  function drawStars(ctx, vw, t) {
    const stars = NP.police.stars;
    ctx.font = '27px system-ui, sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i < 5; i++) {
      const on = i < stars;
      ctx.fillStyle = on ? '#ffd94d' : 'rgba(255,255,255,0.22)';
      if (on && stars >= 4) ctx.fillStyle = Math.sin(t * 9) > 0 ? '#ffd94d' : '#ff9d45';
      ctx.fillText('\u2605', vw - 18 - (4 - i) * 30, 40);
    }
  }

  function drawTopLeft(ctx, g) {
    const p = g.player;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(24,20,32,0.66)';
    NP.render.roundRect(ctx, 14, 14, 196, 58, 10);
    ctx.fill();
    ctx.fillStyle = '#8be08b';
    ctx.font = 'bold 21px system-ui, sans-serif';
    ctx.fillText('$' + p.cash.toLocaleString('en-US'), 26, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    NP.render.roundRect(ctx, 26, 50, 150, 9, 4);
    ctx.fill();
    ctx.fillStyle = p.hp > 30 ? '#e2574c' : '#ff3b30';
    NP.render.roundRect(ctx, 26, 50, 150 * Math.max(0, p.hp / p.maxHp), 9, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('LEO SANTOS', 26, 70);
    if (NP.audio.isMuted()) ctx.fillText('MUTED', 150, 70);
  }

  function drawObjective(ctx, vw, g) {
    const o = g.objective;
    if (!o || g.state !== 'playing') return;
    let text = o.text;
    if (o.timer != null) {
      const sec = Math.ceil(o.timer);
      text += '   ' + ((sec / 60) | 0) + ':' + ('0' + (sec % 60)).slice(-2);
    }
    ctx.font = 'bold 16px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 44;
    pill(ctx, (vw - w) / 2, 16, w, 34, 'rgba(24,20,32,0.72)');
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath(); ctx.arc((vw - w) / 2 + 20, 33, 5, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#fff6e0';
    ctx.textAlign = 'center';
    ctx.fillText(text, vw / 2 + 10, 39);
  }

  function drawDialogue(ctx, vw, vh, t) {
    const d = NP.game.dialogue;
    if (!d) return;
    const line = d.lines[d.i];
    const w = Math.min(780, vw - 60);
    const x = (vw - w) / 2;
    const y = vh - 118;
    ctx.fillStyle = 'rgba(20,16,28,0.88)';
    NP.render.roundRect(ctx, x, y, w, 86, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,217,77,0.4)';
    ctx.lineWidth = 1.5;
    NP.render.roundRect(ctx, x, y, w, 86, 12);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(line[0], x + 20, y + 24);
    ctx.fillStyle = '#fdf6e3';
    ctx.font = '16px system-ui, sans-serif';
    wrapText(ctx, line[1], x + 20, y + 48, w - 40, 20);
    if (Math.sin(t * 5) > -0.2) {
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('E \u25B8', x + w - 16, y + 76);
    }
  }

  function wrapText(ctx, text, x, y, maxW, lh) {
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, yy);
        line = word;
        yy += lh;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, yy);
  }

  function drawPrompt(ctx, vw, vh, g) {
    if (g.state !== 'playing' || g.dialogue) return;
    const p = g.player;
    let text = null;
    if (p.car) {
      text = 'E — get out';
    } else {
      const car = NP.player.nearestCar(p.x, p.y, 52);
      if (car) text = car.wrecked ? 'That car is wrecked' : 'E — steal the ' + car.type;
      if (!text) text = NP.missions.giverPrompt();
    }
    if (!text) return;
    ctx.font = 'bold 15px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 30;
    pill(ctx, (vw - w) / 2, vh - 148, w, 28, 'rgba(24,20,32,0.7)');
    ctx.fillStyle = '#fff6e0';
    ctx.textAlign = 'center';
    ctx.fillText(text, vw / 2, vh - 129);
  }

  function drawSpeed(ctx, vw, vh, g) {
    const p = g.player;
    if (!p.car) return;
    const kmh = Math.round(Math.abs(p.car.speed) * 0.24);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(24,20,32,0.66)';
    NP.render.roundRect(ctx, 14, vh - 84, 150, 68, 10);
    ctx.fill();
    ctx.fillStyle = '#fff6e0';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(String(kmh), 26, vh - 42);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('km/h — ' + p.car.type, 26, vh - 24);
  }

  function drawBust(ctx, vw, vh, g) {
    const b = NP.police.bust;
    if (b <= 0.02 || g.state !== 'playing') return;
    const w = 190;
    ctx.fillStyle = 'rgba(24,20,32,0.7)';
    NP.render.roundRect(ctx, (vw - w) / 2, vh - 190, w, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#ff3b30';
    NP.render.roundRect(ctx, (vw - w) / 2 + 4, vh - 186, (w - 8) * b, 22, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BUSTED', vw / 2, vh - 171);
  }

  function drawToasts(ctx, vw, g) {
    ctx.textAlign = 'center';
    let y = 66;
    for (const toast of g.toasts) {
      const a = Math.min(1, toast.t / 0.5, (3.4 - toast.t) / 0.5);
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = 'bold 15px system-ui, sans-serif';
      const w = ctx.measureText(toast.text).width + 32;
      pill(ctx, (vw - w) / 2, y, w, 28, 'rgba(24,20,32,0.72)');
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText(toast.text, vw / 2, y + 19);
      y += 34;
    }
    ctx.globalAlpha = 1;
    if (g.big) {
      const a = Math.min(1, g.big.t / 0.4, (3.6 - g.big.t) / 0.6);
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = '#ffd94d';
      ctx.font = 'bold 44px system-ui, sans-serif';
      ctx.fillText(g.big.title, vw / 2, 150);
      ctx.fillStyle = '#fff6e0';
      ctx.font = '17px system-ui, sans-serif';
      ctx.fillText(g.big.sub, vw / 2, 180);
      ctx.globalAlpha = 1;
    }
  }

  function button(ctx, id, x, y, w, h, label, primary) {
    buttons.push({ id, x, y, w, h });
    ctx.fillStyle = primary ? '#e2574c' : 'rgba(255,246,224,0.14)';
    NP.render.roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,217,77,0.55)';
    ctx.lineWidth = 1.5;
    NP.render.roundRect(ctx, x, y, w, h, 10);
    ctx.stroke();
    ctx.fillStyle = '#fff6e0';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 6);
  }

  function controlsText(ctx, cx, y) {
    ctx.fillStyle = 'rgba(255,246,224,0.85)';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const lines = [
      'WASD / arrows — walk and drive      Shift — sprint      Space — handbrake',
      'E — talk, steal, enter and exit cars      F or click — punch      Mouse — aim, click — shoot',
      'Esc / P — pause      M — mute',
    ];
    for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], cx, y + i * 21);
  }

  function drawTitle(ctx, vw, vh, g, t) {
    const grad = ctx.createLinearGradient(0, 0, 0, vh);
    grad.addColorStop(0, 'rgba(24,12,30,0.55)');
    grad.addColorStop(0.6, 'rgba(24,12,30,0.25)');
    grad.addColorStop(1, 'rgba(24,12,30,0.72)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vw, vh);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 84px system-ui, sans-serif';
    ctx.fillText('NEON PALMS', vw / 2, vh * 0.3);
    ctx.fillStyle = '#ff8c69';
    ctx.font = 'bold 21px system-ui, sans-serif';
    ctx.fillText('A  C O S T A   S E R E N A   C R I M E   S T O R Y', vw / 2, vh * 0.3 + 38);
    ctx.fillStyle = 'rgba(255,246,224,0.92)';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Leo Santos rolls into a sunlit coastal city with $120, a borrowed shirt,', vw / 2, vh * 0.3 + 74);
    ctx.fillText('and a talent for other people\u2019s cars. Four jobs stand between him and a life here.', vw / 2, vh * 0.3 + 96);
    const bw = 240;
    const bx = vw / 2 - bw / 2;
    let by = vh * 0.58;
    if (NP.save.has()) {
      button(ctx, 'continue', bx, by, bw, 46, 'CONTINUE', true);
      by += 58;
    }
    button(ctx, 'new', bx, by, bw, 46, NP.save.has() ? 'NEW GAME' : 'START', !NP.save.has());
    controlsText(ctx, vw / 2, vh * 0.58 + (NP.save.has() ? 132 : 74));
  }

  function drawPause(ctx, vw, vh) {
    ctx.fillStyle = 'rgba(18,12,26,0.62)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = '#fff6e0';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', vw / 2, vh * 0.34);
    const bw = 230;
    button(ctx, 'resume', vw / 2 - bw / 2, vh * 0.42, bw, 44, 'RESUME', true);
    button(ctx, 'restart', vw / 2 - bw / 2, vh * 0.42 + 56, bw, 44, 'RESTART STORY', false);
    controlsText(ctx, vw / 2, vh * 0.42 + 128);
  }

  function drawBusted(ctx, vw, vh, g) {
    ctx.fillStyle = 'rgba(120,16,20,0.45)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BUSTED', vw / 2, vh * 0.42);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('The Costa Serena PD fine you $' + g.lastFine + ' and drop you at the station.', vw / 2, vh * 0.42 + 40);
    ctx.fillText('Press Enter to walk out.', vw / 2, vh * 0.42 + 68);
  }

  function drawDown(ctx, vw, vh) {
    ctx.fillStyle = 'rgba(20,16,26,0.6)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = '#ff8c69';
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KNOCKED OUT', vw / 2, vh * 0.42);
    ctx.fillStyle = '#fff6e0';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('You wake up at Serena Clinic. The city kept your car keys and some dignity.', vw / 2, vh * 0.42 + 40);
    ctx.fillText('Press Enter to get up.', vw / 2, vh * 0.42 + 68);
  }

  function draw(ctx, vw, vh, t) {
    buttons = [];
    const g = NP.game;
    if (g.state === 'title') { drawTitle(ctx, vw, vh, g, t); return; }
    drawTopLeft(ctx, g);
    drawStars(ctx, vw, t);
    drawObjective(ctx, vw, g);
    drawMinimap(ctx, vw, vh, t);
    drawSpeed(ctx, vw, vh, g);
    drawPrompt(ctx, vw, vh, g);
    drawBust(ctx, vw, vh, g);
    drawDialogue(ctx, vw, vh, t);
    drawToasts(ctx, vw, g);
    if (g.state === 'pause') drawPause(ctx, vw, vh);
    if (g.state === 'busted') drawBusted(ctx, vw, vh, g);
    if (g.state === 'down') drawDown(ctx, vw, vh);
  }

  function handleClick(x, y) {
    for (const b of buttons) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id;
    }
    return null;
  }

  return { draw, handleClick };
})();
