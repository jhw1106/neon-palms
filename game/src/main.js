// Neon Palms — boot and the game loop. Owns the shared game state (player,
// camera, dialogue, toasts, pickups), runs the update order each frame
// (player, traffic, pedestrians, police, missions, effects), handles the
// state screens' keys and clicks, and exposes NP.game to every module.
window.NP = window.NP || {};

NP.game = (function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let vw = 1280;
  let vh = 720;

  const game = {
    state: 'title',
    time: 0,
    dusk: false,
    shake: 0,
    camera: { x: NP.world.PLACES.spawn.x, y: NP.world.PLACES.spawn.y },
    player: null,
    saveData: NP.save.fresh(),
    dialogue: null,
    objective: null,
    pickups: [],
    toasts: [],
    big: null,
    lastFine: 0,
    frozen: false,
    lastShotAt: -99, lastShotX: 0, lastShotY: 0,
    lastPunchAt: -99, lastPunchX: 0, lastPunchY: 0,
  };

  function freshPlayer() {
    return {
      x: NP.world.PLACES.spawn.x, y: NP.world.PLACES.spawn.y,
      angle: -Math.PI / 2, speed: 0, hp: 100, maxHp: 100,
      cash: 120, car: null, hasPistol: false,
      punchCd: 0, shotCd: 0, punchAnim: 0, hurtCd: 0, lastHurtAt: -99,
    };
  }
  game.player = freshPlayer();

  function toast(text) {
    game.toasts.push({ text, t: 0 });
    if (game.toasts.length > 3) game.toasts.shift();
  }
  game.toast = toast;

  function bigToast(title, sub) { game.big = { title, sub, t: 0 }; }
  game.bigToast = bigToast;

  function buildWorld(seed) {
    NP.world.build(seed);
    NP.vehicles.init(seed);
    NP.peds.init(seed);
  }
  game.buildWorld = buildWorld;

  function placePlayerAtSpawn() {
    const p = game.player;
    if (p.car) { p.car.driver = 'parked'; p.car = null; }
    p.x = NP.world.PLACES.spawn.x;
    p.y = NP.world.PLACES.spawn.y;
    p.hp = p.maxHp;
    game.camera.x = p.x;
    game.camera.y = p.y;
  }

  function startRun(fromSave) {
    buildWorld(20261);
    NP.police.clear();
    game.pickups = [];
    game.dialogue = null;
    game.player = freshPlayer();
    if (fromSave) {
      const data = NP.save.load() || NP.save.fresh();
      game.saveData = data;
      game.player.cash = data.cash;
      game.player.hasPistol = !!data.hasPistol;
    } else {
      game.saveData = NP.save.fresh();
      NP.save.store(game.saveData);
      game.player.cash = game.saveData.cash;
    }
    if (game.saveData.mission === 1 && !game.player.hasPistol) {
      // The pistol pickup waits at the garage for a run resumed mid-story.
      game.pickups.push({ kind: 'pistol', x: NP.world.PLACES.garage.x - 60, y: NP.world.PLACES.garage.y + 210 });
    }
    placePlayerAtSpawn();
    game.state = 'playing';
    NP.audio.click();
  }

  game.onBusted = function () {
    const p = game.player;
    const fine = 100 + 60 * NP.police.stars;
    game.lastFine = Math.min(p.cash, fine);
    p.cash -= game.lastFine;
    game.saveData.cash = p.cash;
    NP.save.store(game.saveData);
    if (p.car) { p.car.driver = 'parked'; p.car.controls.brake = true; p.car = null; }
    for (const car of NP.police.policeCars()) car.driver = 'traffic';
    NP.police.clear();
    NP.audio.busted();
    NP.audio.siren(false);
    NP.audio.engineStop();
    if (NP.missions.active) NP.missions.failMission('busted');
    p.x = NP.world.PLACES.station.x;
    p.y = NP.world.PLACES.station.y + 40;
    p.hp = Math.max(40, p.hp);
    game.state = 'busted';
  };

  game.onDown = function () {
    const p = game.player;
    const bill = Math.min(p.cash, 40);
    p.cash -= bill;
    game.saveData.cash = p.cash;
    NP.save.store(game.saveData);
    if (p.car) { p.car.driver = 'parked'; p.car = null; }
    for (const car of NP.police.policeCars()) car.driver = 'traffic';
    NP.police.clear();
    NP.audio.siren(false);
    NP.audio.engineStop();
    if (NP.missions.active) NP.missions.failMission('Leo went down');
    p.x = NP.world.PLACES.clinic.x;
    p.y = NP.world.PLACES.clinic.y + 46;
    p.hp = p.maxHp;
    game.state = 'down';
  };

  function respawnFromScreen() {
    game.camera.x = game.player.x;
    game.camera.y = game.player.y;
    game.state = 'playing';
    NP.audio.click();
  }

  function updateCamera(dt) {
    const p = game.player;
    let tx = p.x;
    let ty = p.y;
    if (p.car) {
      tx += p.car.vx * 0.55;
      ty += p.car.vy * 0.55;
    }
    const k = 1 - Math.exp(-(p.car ? 3.4 : 5.5) * dt);
    game.camera.x += (tx - game.camera.x) * k;
    game.camera.y += (ty - game.camera.y) * k;
    game.camera.x = Math.max(vw / 2 - 240, Math.min(NP.world.W + 240 - vw / 2, game.camera.x));
    game.camera.y = Math.max(vh / 2 - 160, Math.min(NP.world.H + 160 - vh / 2, game.camera.y));
  }

  function update(dt) {
    game.time += dt;
    NP.input.mouse.wx = NP.input.mouse.x + game.camera.x - vw / 2;
    NP.input.mouse.wy = NP.input.mouse.y + game.camera.y - vh / 2;
    for (const t of game.toasts) t.t += dt;
    game.toasts = game.toasts.filter((t) => t.t < 3.4);
    if (game.big) {
      game.big.t += dt;
      if (game.big.t > 3.6) game.big = null;
    }
    game.shake = Math.max(0, game.shake - dt * 26);

    if (game.state === 'title') {
      const s = NP.world.PLACES.spawn;
      game.camera.x = s.x + Math.cos(game.time * 0.07) * 190;
      game.camera.y = s.y + Math.sin(game.time * 0.07) * 120;
      return;
    }
    if (game.state !== 'playing') return;

    NP.player.update(dt);
    NP.vehicles.update(dt);
    if (game.player.car) {
      game.player.x = game.player.car.x;
      game.player.y = game.player.car.y;
    }
    NP.peds.update(dt);
    NP.police.update(dt);
    NP.missions.update(dt);
    NP.fx.update(dt);
    updateCamera(dt);
    // Keep the save fresh when the story moves.
    game.saveData.cash = game.player.cash;
    game.saveData.hasPistol = game.player.hasPistol;
  }

  function handleKeys() {
    const input = NP.input;
    if (input.hit('KeyM')) {
      const muted = NP.audio.toggleMute();
      toast(muted ? 'Sound off' : 'Sound on');
    }
    if (game.state === 'playing' && (input.hit('Escape') || input.hit('KeyP'))) {
      game.state = 'pause';
      NP.audio.siren(false);
      NP.audio.engineStop();
    } else if (game.state === 'pause' && (input.hit('Escape') || input.hit('KeyP'))) {
      game.state = 'playing';
    } else if ((game.state === 'busted' || game.state === 'down') && input.hit('Enter')) {
      respawnFromScreen();
    } else if (game.state === 'title' && input.hit('Enter')) {
      startRun(NP.save.has());
    }
  }

  function handleClicks() {
    if (!NP.input.mouse.clicked) return;
    NP.audio.unlock();
    if (game.state === 'title' || game.state === 'pause') {
      const id = NP.hud.handleClick(NP.input.mouse.x, NP.input.mouse.y);
      if (id === 'new') { NP.save.wipe(); startRun(false); }
      else if (id === 'continue') startRun(true);
      else if (id === 'resume') game.state = 'playing';
      else if (id === 'restart') { NP.save.wipe(); startRun(false); }
    }
  }

  let last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.033, last ? (ts - last) / 1000 : 0.016);
    last = ts;
    if (!game.frozen) {
      handleKeys();
      handleClicks();
      update(dt);
    }
    NP.render.draw(ctx, vw, vh, game.time);
    NP.hud.draw(ctx, vw, vh, game.time);
    NP.input.endFrame();
  }

  function resize() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = vw;
    canvas.height = vh;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointerdown', () => NP.audio.unlock(), { once: true });
  window.addEventListener('keydown', () => NP.audio.unlock(), { once: true });

  // Boot: build the city, then either stage a screenshot scene or open the title.
  resize();
  NP.input.bind(canvas);
  buildWorld(20261);
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    NP.shots.stage(shot, game);
  }
  window.__np = game;
  requestAnimationFrame(frame);
  return game;
})();
