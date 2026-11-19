// Neon Palms — drawing the world, and the little effects that sell it:
// dust and sparks on impacts, smoke from hurt engines, skid marks,
// muzzle flashes and tracers. The renderer walks the camera's view only,
// and paints in layers: ground, roads, shadows, buildings, props, cars,
// people, then the golden-hour light over everything.
window.NP = window.NP || {};

NP.fx = (function () {
  const particles = [];
  const flashes = [];
  const skids = [];

  function burst(x, y, n, color, speed, life, size) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const s = speed * (0.3 + Math.random() * 0.7);
      particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: life * (0.6 + Math.random() * 0.7), maxLife: life,
        size: size * (0.6 + Math.random() * 0.8), color, grow: 0,
      });
    }
  }

  return {
    particles, flashes, skids,
    impact(car, speed) {
      burst(car.x, car.y, Math.min(16, 4 + speed / 22), '#ffb35c', 190, 0.4, 3);
      burst(car.x, car.y, 6, '#cbb59a', 90, 0.7, 5);
      if (NP.game.player.car === car) {
        NP.game.shake = Math.min(13, speed / 26);
        if (speed > 200) NP.police.reportCrime(7, car.x, car.y, false);
      }
      NP.audio.crash(speed > 240);
    },
    carCrash(a, b, rel) {
      burst((a.x + b.x) / 2, (a.y + b.y) / 2, 12, '#ffb35c', 170, 0.35, 3);
      if (NP.game.player.car === a || NP.game.player.car === b) {
        NP.game.shake = Math.min(12, rel / 22);
        NP.police.reportCrime(11, (a.x + b.x) / 2, (a.y + b.y) / 2, false);
      }
      const d = Math.hypot(a.x - NP.game.player.x, a.y - NP.game.player.y);
      if (d < 420) NP.audio.crash(rel > 200);
    },
    hitSpark(x, y) { burst(x, y, 5, '#ffd94d', 130, 0.25, 2.5); },
    muzzle(x, y, a) { flashes.push({ kind: 'muzzle', x, y, a, t: 0.05 }); },
    tracer(x1, y1, x2, y2) { flashes.push({ kind: 'tracer', x1, y1, x2, y2, t: 0.07 }); },
    wrecked(car) { burst(car.x, car.y, 22, '#5a5a5a', 120, 1.1, 6); },
    addSkid(x, y) {
      skids.push({ x, y, a: 1 });
      if (skids.length > 620) skids.splice(0, skids.length - 620);
    },
    update(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.life -= dt;
        if (pt.life <= 0) { particles.splice(i, 1); continue; }
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vx *= 1 - 2.4 * dt;
        pt.vy *= 1 - 2.4 * dt;
      }
      for (let i = flashes.length - 1; i >= 0; i--) {
        flashes[i].t -= dt;
        if (flashes[i].t <= 0) flashes.splice(i, 1);
      }
      for (const car of NP.vehicles.all) {
        if ((car.wrecked || car.hp < car.maxHp * 0.35) && Math.random() < dt * 9) {
          particles.push({
            x: car.x + (Math.random() * 14 - 7), y: car.y - 4,
            vx: Math.random() * 8 - 4, vy: -22 - Math.random() * 16,
            life: 1.15, maxLife: 1.15, size: 6 + Math.random() * 5,
            color: car.wrecked ? '#3d3d3d' : '#8a8a8a', grow: 9,
          });
        }
        if (Math.abs(car.lat) > 52 && Math.abs(car.speed) > 105) {
          const bx = Math.cos(car.angle);
          const by = Math.sin(car.angle);
          const sx = -by;
          const sy = bx;
          this.addSkid(car.x - bx * 14 + sx * 8, car.y - by * 14 + sy * 8);
          this.addSkid(car.x - bx * 14 - sx * 8, car.y - by * 14 - sy * 8);
        }
      }
    },
  };
})();

NP.render = (function () {
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawGround(ctx, view, t) {
    const W = NP.world;
    ctx.fillStyle = '#9a8668';
    ctx.fillRect(view.x, view.y, view.w, view.h);
    for (const b of W.blockTints) {
      if (!overlap(b, view)) continue;
      ctx.fillStyle = b.kind === 'park' ? '#79a95c'
        : b.kind === 'parking' || b.kind === 'garage' ? '#8f887c'
        : b.kind === 'plaza' ? '#b3a487' : '#a08e6f';
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
    // Sand and sea.
    ctx.fillStyle = '#eed9a3';
    ctx.fillRect(W.SAND_X, 0, W.WATER_X - W.SAND_X, W.H);
    const grad = ctx.createLinearGradient(W.WATER_X, 0, W.W, 0);
    grad.addColorStop(0, '#3ba7bd');
    grad.addColorStop(1, '#1f6f8e');
    ctx.fillStyle = grad;
    ctx.fillRect(W.WATER_X, 0, W.W - W.WATER_X, W.H);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = 30; y < W.H; y += 64) {
      const x = W.WATER_X + 26 + ((y * 7 + ((t * 26) % 64)) % 120);
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 16, y - 5, x + 34, y);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,252,230,0.65)';
    ctx.fillRect(W.WATER_X - 4, 0, 5, W.H);
  }

  function overlap(r, view) {
    return r.x + r.w > view.x && r.x < view.x + view.w && r.y + r.h > view.y && r.y < view.y + view.h;
  }

  function drawRoads(ctx, view) {
    const W = NP.world;
    const half = W.ROAD_HALF;
    ctx.fillStyle = '#c9bb9e';
    for (const ax of W.AVENUES) ctx.fillRect(ax - half - 15, 0, (half + 15) * 2, W.H);
    for (const sy of W.STREETS) ctx.fillRect(0, sy - half - 15, W.SAND_X, (half + 15) * 2);
    ctx.fillStyle = '#463f47';
    for (const ax of W.AVENUES) ctx.fillRect(ax - half, 0, half * 2, W.H);
    for (const sy of W.STREETS) ctx.fillRect(0, sy - half, W.SAND_X, half * 2);
    // Lane dashes.
    ctx.fillStyle = '#e8d9a0';
    for (const ax of W.AVENUES) {
      for (let y = 14; y < W.H; y += 44) {
        if (W.STREETS.some((sy) => Math.abs(y - sy) < half + 12)) continue;
        ctx.fillRect(ax - 2, y, 4, 24);
      }
    }
    for (const sy of W.STREETS) {
      for (let x = 14; x < W.SAND_X; x += 44) {
        if (W.AVENUES.some((ax) => Math.abs(x - ax) < half + 12)) continue;
        ctx.fillRect(x, sy - 2, 24, 4);
      }
    }
    // Crosswalks at intersections.
    ctx.fillStyle = 'rgba(240,238,228,0.75)';
    for (const ax of W.AVENUES) {
      for (const sy of W.STREETS) {
        if (ax - half < view.x - 100 || ax + half > view.x + view.w + 100) continue;
        for (let i = -2; i <= 2; i++) {
          ctx.fillRect(ax + i * 22 - 6, sy - half - 12, 12, 9);
          ctx.fillRect(ax + i * 22 - 6, sy + half + 3, 12, 9);
          ctx.fillRect(ax - half - 12, sy + i * 22 - 6, 9, 12);
          ctx.fillRect(ax + half + 3, sy + i * 22 - 6, 9, 12);
        }
      }
    }
    // Boardwalk along the beachfront avenue.
    ctx.fillStyle = '#d8c49a';
    ctx.fillRect(W.SAND_X - 26, 0, 26, W.H);
  }

  function drawBuilding(ctx, b) {
    ctx.fillStyle = 'rgba(58,28,48,0.30)';
    ctx.fillRect(b.x + 15, b.y + 11, b.w, b.h);
    ctx.fillStyle = b.wall;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 7, b.y + 7, b.w - 14, b.h - 14);
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.fillRect(b.x + 7, b.y + 7, b.w - 14, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(b.x + 15, b.y + 15, b.w - 30, b.h - 30);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 15.5, b.y + 15.5, b.w - 31, b.h - 31);
    ctx.fillStyle = 'rgba(70,50,40,0.35)';
    for (const c of b.clutter) ctx.fillRect(b.x + c.dx, b.y + c.dy, c.s * 1.6, c.s * 1.1);
    if (((b.x * 7 + b.y * 13) % 5) < 2) { // a rooftop water tank on some buildings
      const tx = b.x + b.w * 0.76, ty = b.y + b.h * 0.26;
      ctx.fillStyle = 'rgba(58,28,48,0.25)';
      ctx.beginPath(); ctx.arc(tx + 3, ty + 4, 13, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#9a8d80';
      ctx.beginPath(); ctx.arc(tx, ty, 12, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#877a6c';
      ctx.beginPath(); ctx.arc(tx, ty, 7, 0, 6.29); ctx.fill();
    }
    if (b.garage) {
      ctx.fillStyle = '#37414d';
      ctx.fillRect(b.x + b.w * 0.3, b.y + b.h - 34, b.w * 0.4, 34);
      ctx.fillStyle = '#ffd94d';
      ctx.fillRect(b.x + b.w * 0.3, b.y + b.h - 34, b.w * 0.4, 5);
    }
    if (b.name) {
      ctx.fillStyle = 'rgba(43,32,40,0.85)';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.name.toUpperCase(), b.x + b.w / 2, b.y + 26);
    }
  }

  function drawProp(ctx, pr, t) {
    if (pr.kind === 'palm') {
      ctx.fillStyle = 'rgba(58,28,48,0.25)';
      ctx.beginPath(); ctx.ellipse(pr.x + 10, pr.y + 7, 15, 6, 0.5, 0, 6.29); ctx.fill();
      ctx.strokeStyle = '#8a6844';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x + 2, pr.y - 3); ctx.stroke();
      ctx.strokeStyle = '#3f9e4d';
      ctx.lineWidth = 3;
      const sway = Math.sin(t * 1.3 + pr.sway) * 1.6;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * 6.283 + pr.sway;
        ctx.beginPath();
        ctx.moveTo(pr.x + 2, pr.y - 3);
        ctx.quadraticCurveTo(
          pr.x + 2 + Math.cos(a) * 11 + sway, pr.y - 9 + Math.sin(a) * 4,
          pr.x + 2 + Math.cos(a) * 17 + sway, pr.y - 2 + Math.sin(a) * 8);
        ctx.stroke();
      }
    } else if (pr.kind === 'lamp') {
      ctx.fillStyle = '#3a3f47';
      ctx.fillRect(pr.x - 2, pr.y - 2, 4, 4);
      ctx.fillStyle = NP.game.dusk ? '#ffd94d' : '#e8e2cc';
      ctx.beginPath(); ctx.arc(pr.x, pr.y, 3.4, 0, 6.29); ctx.fill();
    } else if (pr.kind === 'bench') {
      ctx.fillStyle = '#7a5a38';
      ctx.fillRect(pr.x - 10, pr.y - 3, 20, 6);
    } else if (pr.kind === 'crate') {
      ctx.fillStyle = 'rgba(58,28,48,0.25)';
      ctx.fillRect(pr.x - 10 + 5, pr.y - 8 + 5, 22, 18);
      ctx.fillStyle = '#b0824f';
      ctx.fillRect(pr.x - 11, pr.y - 9, 22, 18);
      ctx.strokeStyle = '#7d5a33';
      ctx.lineWidth = 2;
      ctx.strokeRect(pr.x - 11, pr.y - 9, 22, 18);
    } else if (pr.kind === 'umbrella') {
      ctx.fillStyle = '#e2574c';
      ctx.beginPath(); ctx.arc(pr.x, pr.y, 13, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#f5f0e6';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x, pr.y + 8); ctx.stroke();
    } else if (pr.kind === 'hut') {
      ctx.fillStyle = 'rgba(58,28,48,0.25)';
      ctx.fillRect(pr.x - 20 + 8, pr.y - 14 + 7, 44, 32);
      ctx.fillStyle = '#f5f0e6';
      ctx.fillRect(pr.x - 22, pr.y - 15, 44, 30);
      ctx.fillStyle = '#e2574c';
      ctx.fillRect(pr.x - 24, pr.y - 19, 48, 8);
    }
  }

  function drawCar(ctx, car, t) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.fillStyle = 'rgba(43,22,43,0.30)';
    roundRect(ctx, -car.len / 2 + 8, -car.wid / 2 + 6, car.len, car.wid, 7);
    ctx.fill();
    ctx.rotate(car.angle);
    const lights = NP.game.dusk || car.driver === 'police' || NP.game.player.car === car;
    if (lights) {
      const grad = ctx.createLinearGradient(car.len / 2, 0, car.len / 2 + 95, 0);
      grad.addColorStop(0, 'rgba(255,238,170,0.20)');
      grad.addColorStop(1, 'rgba(255,238,170,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(car.len / 2, -7);
      ctx.lineTo(car.len / 2 + 95, -24);
      ctx.lineTo(car.len / 2 + 95, 24);
      ctx.lineTo(car.len / 2, 7);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = car.wrecked ? '#4c4c4c' : car.color;
    roundRect(ctx, -car.len / 2, -car.wid / 2, car.len, car.wid, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,20,30,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (car.type === 'truck') {
      ctx.fillStyle = '#f8f4ea';
      roundRect(ctx, -car.len / 2 + 12, -car.wid / 2 + 1, car.len - 14, car.wid - 2, 3);
      ctx.fill();
      ctx.fillStyle = '#37414d';
      ctx.fillRect(car.len / 2 - 9, -car.wid / 2 + 2, 6, car.wid - 4);
      ctx.fillStyle = '#e2574c';
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("DANNY'S", -2, 3);
    } else if (car.type === 'convertible') {
      ctx.fillStyle = '#2e2a33';
      roundRect(ctx, -car.len * 0.22, -car.wid / 2 + 3, car.len * 0.42, car.wid - 6, 4);
      ctx.fill();
      ctx.fillStyle = '#57505f';
      ctx.fillRect(-car.len * 0.18, -car.wid / 2 + 5, 7, car.wid - 10);
      ctx.fillRect(car.len * 0.05, -car.wid / 2 + 5, 7, car.wid - 10);
      ctx.fillStyle = 'rgba(28,38,52,0.9)';
      ctx.fillRect(car.len * 0.2, -car.wid / 2 + 2, 5, car.wid - 4);
    } else {
      ctx.fillStyle = 'rgba(28,38,52,0.9)';
      ctx.fillRect(car.len * 0.14, -car.wid / 2 + 2, 6, car.wid - 4);
      ctx.fillRect(-car.len * 0.3, -car.wid / 2 + 2, 5, car.wid - 4);
      ctx.fillStyle = car.wrecked ? '#555' : shade(car.color);
      roundRect(ctx, -car.len * 0.24, -car.wid / 2 + 2.5, car.len * 0.34, car.wid - 5, 4);
      ctx.fill();
    }
    if (car.type === 'police') {
      ctx.fillStyle = '#23272e';
      ctx.fillRect(-car.len * 0.24, -car.wid / 2 + 2.5, car.len * 0.34, car.wid - 5);
      const phase = (t * 3.4 + car.id % 2) % 1 < 0.5;
      ctx.fillStyle = phase ? '#ff3b30' : '#5a0f0c';
      ctx.fillRect(-6, -car.wid / 2 + 3, 6, 5);
      ctx.fillStyle = phase ? '#1c4d8f' : '#3aa0ff';
      ctx.fillRect(0, -car.wid / 2 + 3, 6, 5);
    }
    if (car.type === 'taxi') {
      ctx.fillStyle = '#f5f0e6';
      ctx.fillRect(-4, -3, 8, 6);
    }
    // Headlights and tail lights.
    ctx.fillStyle = '#fff3b0';
    ctx.fillRect(car.len / 2 - 2, -car.wid / 2 + 2, 3, 4);
    ctx.fillRect(car.len / 2 - 2, car.wid / 2 - 6, 3, 4);
    ctx.fillStyle = '#ff4040';
    ctx.fillRect(-car.len / 2 - 1, -car.wid / 2 + 2, 3, 4);
    ctx.fillRect(-car.len / 2 - 1, car.wid / 2 - 6, 3, 4);
    if (car.marked) {
      ctx.strokeStyle = 'rgba(255,217,77,' + (0.65 + 0.35 * Math.sin(t * 5)) + ')';
      ctx.lineWidth = 2.5;
      roundRect(ctx, -car.len / 2 - 5, -car.wid / 2 - 5, car.len + 10, car.wid + 10, 9);
      ctx.stroke();
    }
    ctx.restore();
  }

  function shade(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) + 26);
    const g = Math.min(255, ((n >> 8) & 255) + 26);
    const b = Math.min(255, (n & 255) + 26);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function drawPerson(ctx, x, y, angle, shirt, skin, opts) {
    opts = opts || {};
    ctx.fillStyle = 'rgba(43,22,43,0.28)';
    ctx.beginPath(); ctx.ellipse(x + 5, y + 5, 9, 5, 0, 0, 6.29); ctx.fill();
    if (opts.down) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = shirt;
      roundRect(ctx, -11, -5, 22, 10, 5);
      ctx.fill();
      ctx.fillStyle = skin;
      ctx.beginPath(); ctx.arc(13, 0, 5, 0, 6.29); ctx.fill();
      ctx.restore();
      return;
    }
    const bob = opts.still ? 0 : Math.sin(opts.phase || 0) * 1.6;
    ctx.fillStyle = shirt;
    ctx.beginPath(); ctx.arc(x, y + bob * 0.3, 8.5, 0, 6.29); ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(x, y + bob * 0.3, 5.2, 0, 6.29); ctx.fill();
    ctx.fillStyle = 'rgba(30,22,20,0.85)';
    ctx.beginPath(); ctx.arc(x - Math.cos(angle) * 1.5, y - Math.sin(angle) * 1.5 + bob * 0.3, 5.2, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();
    if (opts.gun) {
      ctx.strokeStyle = '#1d1d22';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * 6, y + Math.sin(angle) * 6);
      ctx.lineTo(x + Math.cos(angle) * 19, y + Math.sin(angle) * 19);
      ctx.stroke();
    }
    if (opts.punch > 0) {
      ctx.strokeStyle = skin;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * 17, y + Math.sin(angle) * 17);
      ctx.stroke();
    }
  }

  function drawMarkers(ctx, t) {
    const g = NP.game;
    const o = g.objective;
    if (o && g.state === 'playing') {
      const bob = Math.sin(t * 3.2) * 6;
      const grad = ctx.createLinearGradient(0, o.y - 190, 0, o.y);
      grad.addColorStop(0, 'rgba(255,217,77,0)');
      grad.addColorStop(1, 'rgba(255,217,77,0.30)');
      ctx.fillStyle = grad;
      ctx.fillRect(o.x - 9, o.y - 190, 18, 190);
      ctx.strokeStyle = 'rgba(255,217,77,0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(o.x, o.y, 20 + Math.sin(t * 3.2) * 3, 0, 6.29); ctx.stroke();
      ctx.fillStyle = '#ffd94d';
      ctx.save();
      ctx.translate(o.x, o.y - 44 + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-8, -8, 16, 16);
      ctx.restore();
    }
    for (const key of Object.keys(NP.missions.GIVERS)) {
      const gv = NP.missions.GIVERS[key];
      drawPerson(ctx, gv.x, gv.y, Math.PI / 2, gv.color, '#d9a066', { still: true });
      ctx.fillStyle = 'rgba(30,20,34,0.8)';
      roundRect(ctx, gv.x - 34, gv.y - 40, 68, 15, 7);
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(gv.name.split(' ')[0], gv.x, gv.y - 29);
    }
  }

  function draw(ctx, vw, vh, t) {
    const g = NP.game;
    const cam = g.camera;
    const view = { x: cam.x - vw / 2, y: cam.y - vh / 2, w: vw, h: vh };
    ctx.save();
    let shX = 0;
    let shY = 0;
    if (g.shake > 0.2) {
      shX = (Math.random() - 0.5) * g.shake;
      shY = (Math.random() - 0.5) * g.shake;
    }
    ctx.translate(-view.x + shX, -view.y + shY);
    drawGround(ctx, view, t);
    drawRoads(ctx, view);
    // Skid marks under everything that moves.
    ctx.fillStyle = 'rgba(30,26,30,0.5)';
    for (const s of NP.fx.skids) {
      if (s.x < view.x - 10 || s.x > view.x + view.w + 10 || s.y < view.y - 10 || s.y > view.y + view.h + 10) continue;
      ctx.fillRect(s.x - 2.4, s.y - 2.4, 4.8, 4.8);
    }
    for (const b of NP.world.buildings) if (overlap(b, view)) drawBuilding(ctx, b);
    for (const pr of NP.world.props) {
      if (pr.x < view.x - 40 || pr.x > view.x + view.w + 40 || pr.y < view.y - 40 || pr.y > view.y + view.h + 40) continue;
      drawProp(ctx, pr, t);
    }
    // Pickups.
    for (const pk of g.pickups) {
      ctx.fillStyle = 'rgba(255,217,77,' + (0.35 + 0.2 * Math.sin(t * 4)) + ')';
      ctx.beginPath(); ctx.arc(pk.x, pk.y, 16, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#1d1d22';
      ctx.save();
      ctx.translate(pk.x, pk.y);
      ctx.rotate(-0.6);
      ctx.fillRect(-9, -2.5, 15, 5);
      ctx.fillRect(3, 0, 4, 6);
      ctx.restore();
    }
    for (const car of NP.vehicles.all) {
      if (car.x < view.x - 90 || car.x > view.x + view.w + 90 || car.y < view.y - 90 || car.y > view.y + view.h + 90) continue;
      drawCar(ctx, car, t);
    }
    for (const ped of NP.peds.all) {
      if (ped.x < view.x - 30 || ped.x > view.x + view.w + 30 || ped.y < view.y - 30 || ped.y > view.y + view.h + 30) continue;
      drawPerson(ctx, ped.x, ped.y, ped.angle, ped.shirt, ped.skin, { down: ped.state === 'down', phase: ped.stepPhase });
    }
    const p = g.player;
    if (!p.car && g.state !== 'title') {
      drawPerson(ctx, p.x, p.y, p.angle, '#ff7847', '#a06a35', { gun: p.hasPistol, punch: p.punchAnim });
    }
    drawMarkers(ctx, t);
    // Effects that live in the world.
    for (const pt of NP.fx.particles) {
      const a = Math.max(0, pt.life / pt.maxLife);
      ctx.globalAlpha = a * 0.8;
      ctx.fillStyle = pt.color;
      const s = pt.size + (pt.grow || 0) * (1 - a);
      ctx.beginPath(); ctx.arc(pt.x, pt.y, s, 0, 6.29); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const f of NP.fx.flashes) {
      if (f.kind === 'muzzle') {
        ctx.fillStyle = 'rgba(255,214,90,0.95)';
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.a);
        ctx.beginPath();
        ctx.moveTo(0, -4); ctx.lineTo(17, 0); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else {
        ctx.strokeStyle = 'rgba(255,230,150,0.55)';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
      }
    }
    ctx.restore();
    // Golden-hour light over the world.
    const lg = ctx.createLinearGradient(0, 0, vw, vh);
    if (g.dusk) {
      lg.addColorStop(0, 'rgba(38,30,74,0.34)');
      lg.addColorStop(0.55, 'rgba(90,40,80,0.13)');
      lg.addColorStop(1, 'rgba(255,120,60,0.16)');
    } else {
      lg.addColorStop(0, 'rgba(255,166,66,0.10)');
      lg.addColorStop(0.6, 'rgba(255,120,80,0.04)');
      lg.addColorStop(1, 'rgba(120,50,90,0.13)');
    }
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, vw, vh);
    const vg = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.45, vw / 2, vh / 2, vh * 0.95);
    vg.addColorStop(0, 'rgba(30,10,30,0)');
    vg.addColorStop(1, 'rgba(30,10,30,0.26)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, vw, vh);
  }

  return { draw, drawPerson, drawCar, roundRect };
})();
