// Neon Palms — the wanted system and the Costa Serena PD. Crimes witnessed
// by pedestrians or officers raise heat; heat becomes stars; stars send
// patrol cars that chase, ram and box the player in. Stay out of sight and
// the heat cools. Get stopped next to a patrol car and the bust meter fills.
window.NP = window.NP || {};

NP.police = (function () {
  let heat = 0;
  let bust = 0;
  let unseenT = 0;
  let spawnT = 0;
  let decayBoost = 1;

  function starsFor(h) {
    if (h <= 2) return 0;
    if (h <= 26) return 1;
    if (h <= 50) return 2;
    if (h <= 74) return 3;
    if (h <= 98) return 4;
    return 5;
  }

  function witnessed(x, y, radius) {
    for (const ped of NP.peds.all) {
      if (ped.state !== 'down' && Math.hypot(ped.x - x, ped.y - y) < radius) return true;
    }
    for (const car of NP.vehicles.all) {
      if (car.driver === 'police' && Math.hypot(car.x - x, car.y - y) < radius + 130) return true;
      if (car.hasDriver && Math.hypot(car.x - x, car.y - y) < radius) return true;
    }
    return false;
  }

  function reportCrime(points, x, y, always) {
    if (always || witnessed(x, y, 175)) {
      heat = Math.min(122, heat + points);
      unseenT = 0;
    }
  }

  function forceStars(n) {
    heat = Math.max(heat, n <= 0 ? 0 : 3 + (n - 1) * 24 + 1);
    unseenT = 0;
  }

  function policeCars() {
    return NP.vehicles.all.filter((c) => c.driver === 'police');
  }

  function chaseThink(car, dt) {
    const p = NP.game.player;
    const c = car.controls;
    const tx = p.car ? p.car.x : p.x;
    const ty = p.car ? p.car.y : p.y;
    const tvx = p.car ? p.car.vx : 0;
    const tvy = p.car ? p.car.vy : 0;
    const d = Math.hypot(tx - car.x, ty - car.y);
    const aimX = tx + tvx * Math.min(0.45, d / 900);
    const aimY = ty + tvy * Math.min(0.45, d / 900);
    const want = Math.atan2(aimY - car.y, aimX - car.x);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    c.steer = Math.max(-1, Math.min(1, diff * 2.6));
    c.handbrake = Math.abs(diff) > 2.2 && car.speed > 120;
    const playerSlow = p.car ? Math.abs(p.car.speed) < 16 : p.speed < 42;
    if (!p.car && d < 40) {
      c.throttle = 0; c.brake = true; // stop beside a suspect on foot
    } else if (p.car && d < 52 && playerSlow) {
      c.throttle = 0; c.brake = true; // box a stopped car in
    } else if (d < 26) {
      c.throttle = 0.2; c.brake = false;
    } else {
      c.throttle = 1; c.brake = false;
      if (diff > 2.6 && car.speed > 60) c.brake = true;
    }
  }

  function update(dt) {
    const g = NP.game;
    const p = g.player;
    const stars = starsFor(heat);
    const cops = policeCars();

    // Seen, or not? Any patrol car close enough counts as eyes on the player.
    let seen = false;
    let nearest = 1e9;
    for (const car of cops) {
      const d = Math.hypot(car.x - p.x, car.y - p.y);
      if (d < nearest) nearest = d;
      if (d < 330) seen = true;
    }
    if (seen) unseenT = 0;
    else unseenT += dt;
    if (stars > 0 && unseenT > 3.5) {
      heat = Math.max(0, heat - 3.4 * decayBoost * dt);
    }
    if (starsFor(heat) === 0 && cops.length) {
      for (const car of cops) car.driver = 'traffic'; // stood down: drive away
      bust = 0;
    }

    // Reinforcements roll in from off-screen while the heat is on.
    const wanted = stars === 0 ? 0 : Math.min(2 + stars, 7);
    spawnT -= dt;
    if (cops.length < wanted && spawnT <= 0) {
      spawnT = 1.1;
      const pt = NP.world.randomRoadPoint(Math.random, p.x, p.y, 640, 820);
      NP.vehicles.spawnPoliceCar(pt.x, pt.y);
    }
    for (const car of cops) if (!car.wrecked) chaseThink(car, dt);

    // The bust meter: stopped, on foot or in a car, with a patrol car close.
    const playerStopped = p.car ? Math.abs(p.car.speed) < 16 : p.speed < 42;
    if (stars > 0 && playerStopped && nearest < 58) {
      bust = Math.min(1, bust + dt / 2.1);
      if (bust >= 1) {
        bust = 0;
        NP.game.onBusted();
      }
    } else {
      bust = Math.max(0, bust - dt * 1.4);
    }

    NP.audio.siren(stars > 0 && nearest < 560 && g.state === 'playing');
  }

  return {
    reportCrime, forceStars, update, policeCars,
    setDecayBoost(v) { decayBoost = v; },
    clear() { heat = 0; bust = 0; unseenT = 0; },
    get heat() { return heat; },
    get stars() { return starsFor(heat); },
    get bust() { return bust; },
  };
})();
