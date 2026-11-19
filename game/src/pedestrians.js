// Neon Palms — pedestrians: neighbours strolling the sidewalks of Costa
// Serena. They walk between waypoints, and they run from trouble — a car
// mounting the kerb, a punch, a gunshot, a siren — and fall if a car
// actually hits them. A bailed-out driver joins them, sprinting away.
window.NP = window.NP || {};

NP.peds = (function () {
  const SHIRTS = ['#ff8c69', '#ffe066', '#6bcbef', '#f7f7f7', '#95d5b2', '#e5989b', '#ffd6a5', '#a0c4ff'];
  const SKIN = ['#f2c9a0', '#d9a066', '#a06a35', '#6e4420', '#ffe0bd'];
  let peds = [];
  let rng = null;

  function makePed(x, y) {
    return {
      x, y, angle: rng() * 6.28, speed: 0,
      shirt: SHIRTS[(rng() * SHIRTS.length) | 0],
      skin: SKIN[(rng() * SKIN.length) | 0],
      state: 'walk', wp: null, fleeT: 0, fleeX: 0, fleeY: 0, downT: 0,
      stepPhase: rng() * 6.28, id: (Math.random() * 1e9) | 0,
    };
  }

  function sidewalkPointNear(x, y, minD, maxD) {
    for (let tries = 0; tries < 40; tries++) {
      let px;
      let py;
      if (rng() < 0.55) {
        const ax = NP.world.AVENUES[(rng() * NP.world.AVENUES.length) | 0];
        px = ax + (rng() < 0.5 ? -1 : 1) * (NP.world.ROAD_HALF + 16);
        py = y + (rng() * 700 - 350);
      } else {
        const sy = NP.world.STREETS[(rng() * NP.world.STREETS.length) | 0];
        px = x + (rng() * 700 - 350);
        py = sy + (rng() < 0.5 ? -1 : 1) * (NP.world.ROAD_HALF + 16);
      }
      if (px < 20 || py < 20 || px > NP.world.W - 20 || py > NP.world.H - 20) continue;
      if (px > NP.world.SAND_X - 10) continue;
      const d = Math.hypot(px - x, py - y);
      if (d >= minD && d <= maxD && !NP.world.buildingAt(px, py)) return { x: px, y: py };
    }
    return { x: NP.world.PLACES.spawn.x, y: NP.world.PLACES.spawn.y };
  }

  function init(seed) {
    rng = NP.world.rng(seed * 31 + 7);
    peds = [];
    const s = NP.world.PLACES.spawn;
    for (let i = 0; i < 26; i++) {
      const pt = sidewalkPointNear(s.x, s.y, 60, 900);
      peds.push(makePed(pt.x, pt.y));
    }
  }

  function spawnFleeing(x, y) {
    const ped = makePed(x, y);
    ped.state = 'flee';
    ped.fleeT = 3;
    ped.fleeX = x + (rng() * 200 - 100);
    ped.fleeY = y + (rng() * 200 - 100);
    peds.push(ped);
    return ped;
  }

  function hurt(ped, cause) {
    if (ped.state === 'down') return;
    ped.state = 'down';
    ped.downT = 24;
    const heat = cause === 'shot' ? 34 : cause === 'runover' ? 30 : 20;
    if (NP.police) NP.police.reportCrime(heat, ped.x, ped.y, true);
  }

  function senseDanger(ped) {
    const g = NP.game;
    const p = g.player;
    if (p.car && Math.abs(p.car.speed) > 190) {
      const d = Math.hypot(p.car.x - ped.x, p.car.y - ped.y);
      if (d < 105) return { x: p.car.x, y: p.car.y };
    }
    if (g.time - g.lastShotAt < 1.4) {
      const d = Math.hypot(g.lastShotX - ped.x, g.lastShotY - ped.y);
      if (d < 280) return { x: g.lastShotX, y: g.lastShotY };
    }
    if (g.time - g.lastPunchAt < 0.8) {
      const d = Math.hypot(g.lastPunchX - ped.x, g.lastPunchY - ped.y);
      if (d < 95) return { x: g.lastPunchX, y: g.lastPunchY };
    }
    for (const car of NP.vehicles.all) {
      if (car.driver === 'police' && !car.wrecked) {
        const d = Math.hypot(car.x - ped.x, car.y - ped.y);
        if (d < 120 && Math.abs(car.speed) > 60) return { x: car.x, y: car.y };
      }
    }
    return null;
  }

  function update(dt) {
    const p = NP.game.player;
    for (let i = peds.length - 1; i >= 0; i--) {
      const ped = peds[i];
      if (ped.state === 'down') {
        ped.downT -= dt;
        if (ped.downT <= 0) peds.splice(i, 1);
        continue;
      }
      const danger = senseDanger(ped);
      if (danger && ped.state !== 'flee') {
        ped.state = 'flee';
        ped.fleeT = 2 + rng() * 1.6;
        ped.fleeX = danger.x;
        ped.fleeY = danger.y;
      }
      let wantSpeed = 0;
      if (ped.state === 'flee') {
        ped.fleeT -= dt;
        const dx = ped.x - ped.fleeX;
        const dy = ped.y - ped.fleeY;
        const d = Math.hypot(dx, dy) || 1;
        ped.angle = Math.atan2(dy, dx);
        wantSpeed = 238;
        if (ped.fleeT <= 0) { ped.state = 'walk'; ped.wp = null; }
      } else {
        if (!ped.wp || Math.hypot(ped.wp.x - ped.x, ped.wp.y - ped.y) < 14) {
          ped.wp = sidewalkPointNear(ped.x, ped.y, 120, 460);
        }
        ped.angle = Math.atan2(ped.wp.y - ped.y, ped.wp.x - ped.x);
        wantSpeed = 74;
      }
      ped.speed = wantSpeed;
      ped.x += Math.cos(ped.angle) * wantSpeed * dt;
      ped.y += Math.sin(ped.angle) * wantSpeed * dt;
      ped.stepPhase += dt * (wantSpeed > 100 ? 13 : 8);
      NP.world.collideCircle(ped, 8);
      // Run over by any moving car.
      for (const car of NP.vehicles.all) {
        if (car.wrecked) continue;
        const cs = Math.hypot(car.vx, car.vy);
        if (cs < 26) continue;
        const d = Math.hypot(car.x - ped.x, car.y - ped.y);
        if (d < car.r + 7) {
          if (cs > 62) hurt(ped, 'runover');
          else {
            ped.state = 'flee';
            ped.fleeT = 1.6;
            ped.fleeX = car.x;
            ped.fleeY = car.y;
          }
          break;
        }
      }
      // Keep the crowd near the player.
      const dp = Math.hypot(ped.x - p.x, ped.y - p.y);
      if (dp > 1150) {
        const pt = sidewalkPointNear(p.x, p.y, 520, 880);
        ped.x = pt.x; ped.y = pt.y; ped.wp = null; ped.state = 'walk';
      }
    }
    if (peds.length < 24) {
      const pt = sidewalkPointNear(p.x, p.y, 540, 900);
      peds.push(makePed(pt.x, pt.y));
    }
  }

  return {
    init, update, spawnFleeing, hurt,
    get all() { return peds; },
  };
})();
