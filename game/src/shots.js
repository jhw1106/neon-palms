// Neon Palms — screenshot staging behind ?shot=<scene>&seed=1. Each scene
// builds the same seeded city, places Leo, the traffic, the police and the
// HUD into a moment that shows several systems at once, then freezes the
// simulation so the frame is deterministic: the cover drive down Palmera
// Avenue, a four-star chase, a mission beat at the Marina Hotel, and the
// golden-hour getaway at the beach hideout.
window.NP = window.NP || {};

NP.shots = (function () {
  function placePeds(points) {
    const all = NP.peds.all;
    for (let i = 0; i < points.length && i < all.length; i++) {
      all[i].x = points[i][0];
      all[i].y = points[i][1];
      all[i].angle = points[i][2] || 0;
      all[i].state = 'walk';
      all[i].wp = null;
    }
  }

  function trafficCar(type, x, y, angle, color) {
    const car = NP.vehicles.spawnSpecial(type, x, y, angle, color);
    car.marked = false;
    car.driver = 'traffic';
    car.hasDriver = true;
    return car;
  }

  function setupBase() {
    const g = NP.game;
    g.buildWorld(20261);
    NP.police.clear();
    g.state = 'playing';
    g.frozen = true;
    g.time = 12;
    g.dusk = false;
    g.dialogue = null;
    g.big = null;
    g.toasts = [];
    g.pickups = [];
    const p = g.player;
    p.cash = 860;
    p.hp = 100;
    p.hasPistol = false;
    p.car = null;
    return p;
  }

  function putPlayerIn(car, p) {
    car.driver = 'player';
    p.car = car;
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
  }

  function stageCover() {
    const p = setupBase();
    const car = NP.vehicles.spawnSpecial('convertible', 2690, 760, Math.PI / 2, '#e2574c');
    car.marked = false;
    car.vy = 190;
    car.speed = 190;
    putPlayerIn(car, p);
    trafficCar('sedan', 2689, 505, Math.PI / 2, '#5bc0de');
    trafficCar('coupe', 2689, 1085, Math.PI / 2, '#f5f0e6');
    trafficCar('taxi', 2631, 980, -Math.PI / 2, '#ffd94d');
    trafficCar('truck', 2150, 889, 0, '#7fc97f');
    placePeds([[2548, 600, 1.5], [2772, 900, -1.5], [2548, 1050, 1.5], [2772, 560, -1.5]]);
    const g = NP.game;
    g.objective = { x: NP.world.PLACES.cafe.x, y: NP.world.PLACES.cafe.y + 120, text: 'Talk to Marisol Vega — Welcome to Costa Serena', kind: 'talk' };
    g.camera.x = 2755;
    g.camera.y = 815;
  }

  function stageChase() {
    const p = setupBase();
    p.hasPistol = true;
    p.cash = 1310;
    const car = NP.vehicles.spawnSpecial('coupe', 2060, 920, Math.PI / 2, '#5bc0de');
    car.marked = false;
    car.vy = 265;
    car.speed = 265;
    putPlayerIn(car, p);
    NP.police.forceStars(4);
    const cop1 = NP.vehicles.spawnPoliceCar(2031, 762);
    cop1.angle = Math.PI / 2; cop1.vy = 250;
    const cop2 = NP.vehicles.spawnPoliceCar(2090, 718);
    cop2.angle = Math.PI / 2; cop2.vy = 255;
    const cop3 = NP.vehicles.spawnPoliceCar(2152, 1005);
    cop3.angle = Math.PI / 2 - 0.3; cop3.vy = 230;
    trafficCar('sedan', 2031, 1200, Math.PI / 2, '#f2a541');
    placePeds([[1968, 830, 3.1], [2168, 1090, -1.5], [1960, 1180, 1.5]]);
    const g = NP.game;
    g.objective = { x: NP.world.PLACES.hideout.x, y: NP.world.PLACES.hideout.y, text: 'Shake the heat — reach the beach hideout', kind: 'mission' };
    g.camera.x = car.x;
    g.camera.y = 950;
  }

  function stageMission() {
    const p = setupBase();
    p.cash = 370;
    const target = NP.vehicles.spawnSpecial('convertible', 2400, 668, 0, '#ff6f61');
    p.x = 2348;
    p.y = 672;
    p.angle = 0.1;
    trafficCar('sedan', 2300, 889, 0, '#8d9db6');
    trafficCar('taxi', 2560, 831, Math.PI, '#ffd94d');
    placePeds([[2290, 700, 0.6], [2520, 760, -2.2], [2660, 940, 1.5], [2210, 620, 2.8]]);
    const g = NP.game;
    g.dialogue = {
      lines: [['Rosa Delgado', 'That coral convertible in the Marina Hotel lot, Leo. Tonight it sleeps in my garage — and the glovebox extra is yours.']],
      i: 0, onDone: null,
    };
    g.objective = { x: target.x, y: target.y, text: 'Steal the convertible', kind: 'mission' };
    g.camera.x = p.x + 60;
    g.camera.y = p.y + 10;
  }

  function stageStory() {
    const p = setupBase();
    p.cash = 2560;
    p.hasPistol = true;
    const g = NP.game;
    g.dusk = true;
    const car = NP.vehicles.spawnSpecial('coupe', 3030, 2065, -0.9, '#f7b731');
    car.marked = false;
    car.speed = 40;
    putPlayerIn(car, p);
    NP.police.forceStars(2);
    const cop1 = NP.vehicles.spawnPoliceCar(2915, 1960);
    cop1.angle = 0.9;
    const cop2 = NP.vehicles.spawnPoliceCar(2870, 2180);
    cop2.angle = -0.75;
    placePeds([[3010, 1980, 2.4], [3160, 2180, -0.8]]);
    g.big = { title: 'MISSION COMPLETE', sub: 'Golden Hour   +$1,200', t: 1.1 };
    g.objective = null;
    g.camera.x = 3060;
    g.camera.y = 2040;
  }

  function stage(name, gameObj) {
    // During boot NP.game is not assigned yet (main.js is still running),
    // so the game object arrives as an argument from the boot code.
    if (gameObj && !NP.game) NP.game = gameObj;
    if (name === 'chase') stageChase();
    else if (name === 'mission') stageMission();
    else if (name === 'story') stageStory();
    else stageCover();
  }

  return { stage };
})();
