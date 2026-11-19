// Neon Palms — Leo Santos, the player: walking and sprinting, punching,
// shooting once he owns the pistol, stealing and driving cars, and taking
// his lumps when traffic hits him. Driving writes the car's controls; the
// vehicle module does the physics.
window.NP = window.NP || {};

NP.player = (function () {
  function nearestCar(x, y, maxD) {
    let best = null;
    let bestD = maxD;
    for (const car of NP.vehicles.all) {
      const d = Math.hypot(car.x - x, car.y - y);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  function enterCar(p, car) {
    const g = NP.game;
    if (car.wrecked) {
      g.toast('That car is wrecked.');
      return;
    }
    if (car.driver === 'traffic' && car.hasDriver) {
      NP.peds.spawnFleeing(car.x + 14, car.y + 10);
      car.hasDriver = false;
      NP.police.reportCrime(26, car.x, car.y, false);
      g.toast('Car jacked!');
    } else if (car.driver === 'police') {
      NP.police.reportCrime(30, car.x, car.y, true);
    }
    if (car.marked && NP.missions) NP.missions.onStole(car);
    car.driver = 'player';
    car.controls.throttle = 0;
    p.car = car;
    p.x = car.x;
    p.y = car.y;
    NP.audio.click();
  }

  function exitCar(p) {
    const car = p.car;
    car.driver = 'parked';
    car.controls = { throttle: 0, steer: 0, brake: true, handbrake: false };
    const side = car.angle + Math.PI / 2;
    p.x = car.x + Math.cos(side) * 32;
    p.y = car.y + Math.sin(side) * 32;
    NP.world.collideCircle(p, 10);
    p.car = null;
    NP.audio.engineStop();
    NP.audio.click();
  }

  function punch(p) {
    const g = NP.game;
    p.punchCd = 0.38;
    p.punchAnim = 0.18;
    g.lastPunchAt = g.time;
    g.lastPunchX = p.x;
    g.lastPunchY = p.y;
    NP.audio.punch();
    const fx = Math.cos(p.angle);
    const fy = Math.sin(p.angle);
    for (const ped of NP.peds.all) {
      if (ped.state === 'down') continue;
      const dx = ped.x - p.x;
      const dy = ped.y - p.y;
      if (Math.hypot(dx, dy) < 42 && dx * fx + dy * fy > 4) {
        NP.peds.hurt(ped, 'punch');
        if (NP.fx) NP.fx.hitSpark(ped.x, ped.y);
        return;
      }
    }
    const car = nearestCar(p.x, p.y, 46);
    if (car) {
      car.hp -= 4;
      if (NP.fx) NP.fx.hitSpark(car.x, car.y);
    }
  }

  function shoot(p) {
    const g = NP.game;
    p.shotCd = 0.24;
    g.lastShotAt = g.time;
    g.lastShotX = p.x;
    g.lastShotY = p.y;
    NP.audio.shot();
    const a = p.angle;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    if (NP.fx) NP.fx.muzzle(p.x + dx * 18, p.y + dy * 18, a);
    NP.police.reportCrime(13, p.x, p.y, false);
    // Hitscan: step the ray, first solid thing wins.
    let hitX = p.x + dx * 430;
    let hitY = p.y + dy * 430;
    for (let t = 12; t < 430; t += 7) {
      const x = p.x + dx * t;
      const y = p.y + dy * t;
      if (NP.world.buildingAt(x, y) || NP.world.isWater(x, y)) { hitX = x; hitY = y; break; }
      let struck = false;
      for (const ped of NP.peds.all) {
        if (ped.state !== 'down' && Math.hypot(ped.x - x, ped.y - y) < 11) {
          NP.peds.hurt(ped, 'shot');
          hitX = ped.x; hitY = ped.y; struck = true; break;
        }
      }
      if (struck) break;
      for (const car of NP.vehicles.all) {
        if (Math.hypot(car.x - x, car.y - y) < car.r + 3) {
          car.hp -= 26;
          if (NP.fx) NP.fx.hitSpark(x, y);
          hitX = x; hitY = y; struck = true; break;
        }
      }
      if (struck) break;
    }
    if (NP.fx) NP.fx.tracer(p.x + dx * 18, p.y + dy * 18, hitX, hitY);
  }

  function update(dt) {
    const g = NP.game;
    const p = g.player;
    const input = NP.input;
    p.punchCd -= dt;
    p.shotCd -= dt;
    p.punchAnim = Math.max(0, p.punchAnim - dt);
    p.hurtCd = Math.max(0, p.hurtCd - dt);
    if (p.hp < p.maxHp && g.time - p.lastHurtAt > 5) p.hp = Math.min(p.maxHp, p.hp + 3 * dt);

    if (p.car) {
      const car = p.car;
      const c = car.controls;
      c.throttle = input.down('KeyW') || input.down('ArrowUp') ? 1 : 0;
      c.brake = !!(input.down('KeyS') || input.down('ArrowDown'));
      c.steer = input.axis('KeyA', 'KeyD') + input.axis('ArrowLeft', 'ArrowRight');
      c.steer = Math.max(-1, Math.min(1, c.steer));
      c.handbrake = !!input.down('Space');
      p.x = car.x;
      p.y = car.y;
      p.angle = car.angle;
      p.speed = Math.abs(car.speed);
      NP.audio.engine(Math.min(1, Math.abs(car.speed) / car.maxSpeed), dt);
      if (input.hit('KeyE')) exitCar(p);
      return;
    }

    NP.audio.engineStop();
    // On foot.
    let mx = input.axis('KeyA', 'KeyD') + input.axis('ArrowLeft', 'ArrowRight');
    let my = input.axis('KeyW', 'KeyS') + input.axis('ArrowUp', 'ArrowDown');
    const sprint = input.down('ShiftLeft') || input.down('ShiftRight');
    const mag = Math.hypot(mx, my);
    if (mag > 0) {
      mx /= mag; my /= mag;
      const spd = sprint ? 248 : 168;
      p.x += mx * spd * dt;
      p.y += my * spd * dt;
      p.speed = spd;
      if (!p.hasPistol) p.angle = Math.atan2(my, mx);
    } else {
      p.speed = 0;
    }
    if (p.hasPistol) {
      p.angle = Math.atan2(NP.input.mouse.wy - p.y, NP.input.mouse.wx - p.x);
    }
    NP.world.collideCircle(p, 10);
    if (NP.world.isWater(p.x, p.y)) p.x = NP.world.WATER_X - 14;

    // Traffic is dangerous on foot.
    if (p.hurtCd <= 0) {
      for (const car of NP.vehicles.all) {
        if (car.wrecked) continue;
        const cs = Math.hypot(car.vx, car.vy);
        if (cs > 58 && Math.hypot(car.x - p.x, car.y - p.y) < car.r + 8) {
          p.hp -= 24;
          p.lastHurtAt = g.time;
          p.hurtCd = 0.9;
          p.x += car.vx * 0.14;
          p.y += car.vy * 0.14;
          NP.audio.hurt();
          if (NP.fx) NP.fx.hitSpark(p.x, p.y);
          if (p.hp <= 0) { g.onDown(); return; }
          break;
        }
      }
    }

    // Talk, enter, advance dialogue: all the E key, context decides.
    if (input.hit('KeyE')) {
      if (g.dialogue) { NP.missions.advanceDialogue(); return; }
      if (NP.missions.tryTalk()) return;
      const car = nearestCar(p.x, p.y, 52);
      if (car) { enterCar(p, car); return; }
    }
    if (input.hit('KeyF') && p.punchCd <= 0) punch(p);
    if (NP.input.mouse.clicked && !g.dialogue) {
      if (p.hasPistol) { if (p.shotCd <= 0) shoot(p); }
      else if (p.punchCd <= 0) punch(p);
    }
    if (p.hasPistol && NP.input.mouse.down && p.shotCd <= 0) shoot(p);
  }

  return { update, nearestCar, enterCar, exitCar };
})();
