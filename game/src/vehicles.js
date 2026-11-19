// Neon Palms — cars: shared arcade physics (throttle, steering, handbrake
// drift, collisions), the traffic AI that follows lanes and turns at
// intersections, parked cars in the lots, and the special cars the story
// marks. The player and the police drive through the same physics by
// writing a car's `controls` each frame.
window.NP = window.NP || {};

NP.vehicles = (function () {
  const TYPES = {
    sedan: { maxSpeed: 405, accel: 255, hp: 100, len: 42, wid: 21 },
    convertible: { maxSpeed: 465, accel: 300, hp: 90, len: 43, wid: 21 },
    coupe: { maxSpeed: 485, accel: 320, hp: 95, len: 43, wid: 21 },
    taxi: { maxSpeed: 400, accel: 250, hp: 100, len: 42, wid: 21 },
    truck: { maxSpeed: 300, accel: 190, hp: 160, len: 56, wid: 25 },
    police: { maxSpeed: 470, accel: 315, hp: 130, len: 43, wid: 21 },
  };
  const PAINTS = ['#e2574c', '#f2a541', '#5bc0de', '#f5f0e6', '#7fc97f', '#e88bb0', '#8d9db6', '#ffd94d', '#b565d8', '#4dd0c4'];
  const LANE = 29;

  let cars = [];
  let rng = null;

  function makeCar(type, x, y, angle, color) {
    const t = TYPES[type];
    return {
      type, x, y, angle, vx: 0, vy: 0, speed: 0, lat: 0,
      color: color || PAINTS[(rng() * PAINTS.length) | 0],
      hp: t.hp, maxHp: t.hp, maxSpeed: t.maxSpeed, accel: t.accel,
      len: t.len, wid: t.wid, r: 18,
      driver: null, hasDriver: false, wrecked: false, marked: false,
      controls: { throttle: 0, steer: 0, brake: false, handbrake: false },
      route: null, stopT: 0, impactCd: 0, honkCd: 0, id: (Math.random() * 1e9) | 0,
    };
  }

  function laneTarget(car) {
    const r = car.route;
    if (!r) return { x: car.x + Math.cos(car.angle) * 100, y: car.y + Math.sin(car.angle) * 100 };
    if (r.axis === 'v') return { x: r.line - r.dir * LANE, y: car.y + r.dir * 130 };
    return { x: car.x + r.dir * 130, y: r.line + r.dir * LANE };
  }

  function routeFromPose(car) {
    // Snap a fresh traffic car onto the nearest road line, heading along it.
    let bestA = null;
    let bestD = 1e9;
    for (const ax of NP.world.AVENUES) { const d = Math.abs(car.x - ax); if (d < bestD) { bestD = d; bestA = { axis: 'v', line: ax }; } }
    for (const sy of NP.world.STREETS) { const d = Math.abs(car.y - sy); if (d < bestD) { bestD = d; bestA = { axis: 'h', line: sy }; } }
    const dir = rng() < 0.5 ? 1 : -1;
    car.route = { axis: bestA.axis, line: bestA.line, dir, crossed: '' };
    if (bestA.axis === 'v') { car.x = bestA.line - dir * LANE; car.angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { car.y = bestA.line + dir * LANE; car.angle = dir > 0 ? 0 : Math.PI; }
  }

  function maybeTurn(car) {
    const r = car.route;
    const crosses = r.axis === 'v' ? NP.world.STREETS : NP.world.AVENUES;
    for (const c of crosses) {
      const along = r.axis === 'v' ? car.y : car.x;
      const key = r.axis + ':' + c;
      if (Math.abs(along - c) < 26 && car.route.crossed !== key) {
        car.route.crossed = key;
        if (rng() < 0.38) {
          const dir = rng() < 0.5 ? 1 : -1;
          car.route = { axis: r.axis === 'v' ? 'h' : 'v', line: c, dir, crossed: key };
        } else if (rng() < 0.12) {
          car.stopT = 0.5 + rng() * 1.1; // a pause at the lights
        }
      }
    }
  }

  function obstacleAhead(car, dist) {
    const fx = Math.cos(car.angle);
    const fy = Math.sin(car.angle);
    for (const other of cars) {
      if (other === car) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const ahead = dx * fx + dy * fy;
      const side = Math.abs(-dx * fy + dy * fx);
      if (ahead > 0 && ahead < dist && side < 20) return other;
    }
    const p = NP.game && NP.game.player;
    if (p && !p.car) {
      const dx = p.x - car.x;
      const dy = p.y - car.y;
      const ahead = dx * fx + dy * fy;
      const side = Math.abs(-dx * fy + dy * fx);
      if (ahead > 0 && ahead < dist - 6 && side < 18) return p;
    }
    return null;
  }

  function trafficThink(car, dt) {
    const c = car.controls;
    c.throttle = 0; c.steer = 0; c.brake = false; c.handbrake = false;
    if (car.stopT > 0) {
      car.stopT -= dt;
      c.brake = true;
      return;
    }
    maybeTurn(car);
    const target = laneTarget(car);
    const want = Math.atan2(target.y - car.y, target.x - car.x);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    c.steer = Math.max(-1, Math.min(1, diff * 2.4));
    const cruise = car.type === 'truck' ? 105 : 128;
    const blocked = obstacleAhead(car, 62);
    if (blocked) {
      if (car.speed > 24) c.brake = true;
      else c.throttle = 0;
      if (car.honkCd <= 0 && NP.fx && Math.abs(car.speed) < 6) { car.honkCd = 3 + rng() * 4; }
    } else if (car.speed < cruise) {
      c.throttle = 0.75;
    }
    car.honkCd -= dt;
  }

  function physics(car, dt) {
    const c = car.controls;
    const fx = Math.cos(car.angle);
    const fy = Math.sin(car.angle);
    let vf = car.vx * fx + car.vy * fy;
    let vl = -car.vx * fy + car.vy * fx;
    if (car.wrecked) { c.throttle = 0; c.brake = true; }
    if (c.throttle > 0) vf += car.accel * c.throttle * dt * (1 - Math.max(0, vf) / (car.maxSpeed * 1.18));
    if (c.brake) {
      if (vf > 10) vf -= 430 * dt;
      else { vf -= car.accel * 0.72 * dt; if (vf < -128) vf = -128; }
    }
    vf -= vf * (c.throttle > 0 ? 0.5 : 1.5) * dt;
    const sf = Math.max(-1, Math.min(1, vf / 135));
    car.angle += c.steer * 1.8 * sf * dt * (c.handbrake ? 1.4 : 1);
    vl *= Math.exp(-(c.handbrake ? 1.9 : 11) * dt);
    const nfx = Math.cos(car.angle);
    const nfy = Math.sin(car.angle);
    car.vx = nfx * vf - nfy * vl;
    car.vy = nfy * vf + nfx * vl;
    car.x += car.vx * dt;
    car.y += car.vy * dt;
    car.speed = vf;
    car.lat = vl;
    if (NP.world.isSand(car.x, car.y)) { car.vx *= 1 - 1.6 * dt; car.vy *= 1 - 1.6 * dt; }
  }

  function collide(car, dt) {
    const speedBefore = Math.hypot(car.vx, car.vy);
    const hit = NP.world.collideCircle(car, car.r);
    if (hit) {
      car.impactCd -= dt;
      if (speedBefore > 118 && car.impactCd <= 0) {
        car.impactCd = 0.3;
        const dmg = (speedBefore - 100) * 0.09;
        car.hp -= dmg;
        if (NP.fx) NP.fx.impact(car, speedBefore);
      }
      car.vx *= 0.42;
      car.vy *= 0.42;
    }
    if (NP.world.isWater(car.x, car.y)) {
      car.x -= car.vx * dt * 1.4;
      car.y -= car.vy * dt * 1.4;
      car.vx *= 0.6; car.vy *= 0.6;
    }
  }

  function collidePairs() {
    for (let i = 0; i < cars.length; i++) {
      for (let j = i + 1; j < cars.length; j++) {
        const a = cars[i];
        const b = cars[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        const min = a.r + b.r - 4;
        if (d2 < min * min && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const push = (min - d) / 2;
          const ux = dx / d;
          const uy = dy / d;
          a.x -= ux * push; a.y -= uy * push;
          b.x += ux * push; b.y += uy * push;
          const rel = Math.abs((a.vx - b.vx) * ux + (a.vy - b.vy) * uy);
          const swap = 0.35;
          a.vx -= ux * rel * swap; a.vy -= uy * rel * swap;
          b.vx += ux * rel * swap; b.vy += uy * rel * swap;
          if (rel > 105) {
            a.hp -= (rel - 95) * 0.07;
            b.hp -= (rel - 95) * 0.07;
            if (NP.fx) NP.fx.carCrash(a, b, rel);
          }
        }
      }
    }
  }

  function spawnTraffic(px, py) {
    const pt = NP.world.randomRoadPoint(rng, px, py, 520, 880);
    const types = ['sedan', 'sedan', 'convertible', 'taxi', 'coupe', 'sedan'];
    const car = makeCar(types[(rng() * types.length) | 0], pt.x, pt.y, 0);
    car.driver = 'traffic';
    car.hasDriver = true;
    routeFromPose(car);
    cars.push(car);
    return car;
  }

  function init(seed) {
    rng = NP.world.rng(seed * 7919 + 13);
    cars = [];
    // Parked cars fill the lots.
    for (const lot of NP.world.lots) {
      const n = 3 + ((rng() * 3) | 0);
      for (let i = 0; i < n; i++) {
        const vertical = rng() < 0.5;
        const x = lot.x + 24 + rng() * Math.max(10, lot.w - 48);
        const y = lot.y + 24 + rng() * Math.max(10, lot.h - 48);
        if (NP.world.buildingAt(x, y)) continue;
        const car = makeCar(rng() < 0.18 ? 'convertible' : 'sedan', x, y, vertical ? Math.PI / 2 : 0);
        car.driver = 'parked';
        cars.push(car);
      }
    }
    // Danny's food truck, a fixture of the west parking lot.
    const truck = makeCar('truck', NP.world.PLACES.truck.x, NP.world.PLACES.truck.y, 0, '#f5f0e6');
    truck.driver = 'parked';
    cars.push(truck);
    for (let i = 0; i < 13; i++) spawnTraffic(NP.world.PLACES.spawn.x, NP.world.PLACES.spawn.y);
  }

  function spawnSpecial(type, x, y, angle, color) {
    const car = makeCar(type, x, y, angle, color);
    car.driver = 'parked';
    car.marked = true;
    cars.push(car);
    return car;
  }

  function spawnPoliceCar(x, y) {
    const car = makeCar('police', x, y, 0, '#f4f6f8');
    car.driver = 'police';
    car.hasDriver = true;
    routeFromPose(car);
    cars.push(car);
    return car;
  }

  function removeCar(car) {
    const i = cars.indexOf(car);
    if (i >= 0) cars.splice(i, 1);
  }

  function update(dt) {
    const p = NP.game.player;
    for (const car of cars) {
      if (car.hp <= 0 && !car.wrecked) {
        car.wrecked = true;
        if (NP.fx) NP.fx.wrecked(car);
      }
      if (car.driver === 'traffic') {
        const d = Math.hypot(car.x - p.x, car.y - p.y);
        if (d > 1080) {
          const pt = NP.world.randomRoadPoint(rng, p.x, p.y, 560, 900);
          car.x = pt.x; car.y = pt.y; car.vx = 0; car.vy = 0;
          routeFromPose(car);
        }
        if (!car.wrecked) trafficThink(car, dt);
      }
      physics(car, dt);
      collide(car, dt);
    }
    collidePairs();
    let trafficCount = 0;
    for (const car of cars) if (car.driver === 'traffic') trafficCount++;
    if (trafficCount < 13) spawnTraffic(p.x, p.y);
  }

  return {
    TYPES,
    init, update, spawnSpecial, spawnPoliceCar, removeCar,
    get all() { return cars; },
  };
})();
