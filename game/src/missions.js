// Neon Palms — the story: four jobs in Costa Serena, given by Marisol Vega
// of Cafe Brisa and Rosa Delgado of Delgado Motors, with Danny Okafor and
// his food truck in between. Each mission is a list of stages — go, pick
// up, steal, deliver, escape, beat the clock — with dialogue at the beats,
// a cash reward, and a retry if Leo gets busted or the car gets wrecked.
window.NP = window.NP || {};

NP.missions = (function () {
  const P = NP.world.PLACES;
  const GIVERS = {
    marisol: { name: 'Marisol Vega', x: P.cafe.x, y: P.cafe.y + 120, color: '#e5989b' },
    rosa: { name: 'Rosa Delgado', x: P.garage.x, y: P.garage.y + 130, color: '#6bcbef' },
    danny: { name: 'Danny Okafor', x: P.truck.x, y: P.truck.y + 52, color: '#ffe066' },
  };

  const DEFS = [
    {
      title: 'Welcome to Costa Serena', giver: 'marisol', reward: 250,
      intro: [
        ['Marisol Vega', 'Leo Santos. Your aunt said you would come hungry and broke. She was half right, I hope.'],
        ['Leo Santos', 'Just hungry, Marisol. And ready to work.'],
        ['Marisol Vega', 'Then work: Danny has a crate for my kitchen, across town by the west lot. Bring it to me — and Leo, the crate stays closed.'],
      ],
      stages: [
        { kind: 'goto', x: P.truck.x, y: P.truck.y + 52, label: "Pick up Marisol's crate from Danny", arrive: [
          ['Danny Okafor', 'Leo! Man, you got tall. Here — one crate, still sealed, still none of your business.'],
          ['Leo Santos', 'You are all heart, Danny.'],
        ] },
        { kind: 'goto', x: P.cafe.x, y: P.cafe.y + 120, label: 'Deliver the crate to Marisol', arrive: [
          ['Marisol Vega', 'Sealed. Good. You would be amazed how many drivers get curious.'],
        ] },
      ],
    },
    {
      title: 'The Marina Convertible', giver: 'rosa', reward: 450,
      intro: [
        ['Rosa Delgado', 'You are Marisol\u2019s new runner? I have a client who collects convertibles — one specific coral convertible, parked at the Marina Hotel.'],
        ['Leo Santos', 'And the owner knows about this collection?'],
        ['Rosa Delgado', 'The owner owes my client money. Bring me the car, unmarked, and there is a little extra in the glovebox for you.'],
      ],
      stages: [
        { kind: 'gotoCar', label: 'Find the coral convertible at the Marina Hotel' },
        { kind: 'steal', label: 'Steal the convertible' },
        { kind: 'deliverCar', x: P.garage.x, y: P.garage.y + 240, label: 'Deliver the convertible to Delgado Motors' },
      ],
    },
    {
      title: 'Hot Goods', giver: 'marisol', reward: 650,
      intro: [
        ['Marisol Vega', 'The police raided my supplier this morning. There is a duffel behind my cafe that cannot be here when they come back.'],
        ['Leo Santos', 'And you want me to carry it. In daylight.'],
        ['Marisol Vega', 'To the old lifeguard hut, south beach. Take this pistol — not for using, for courage. Now go, they are already watching the cafe.'],
      ],
      stages: [
        { kind: 'goto', x: P.cafe.x - 60, y: P.cafe.y - 60, label: 'Pick up the duffel behind Cafe Brisa' },
        { kind: 'escape', x: P.hideout.x, y: P.hideout.y, label: 'Reach the beach hideout and lose the police' },
      ],
    },
    {
      title: 'Golden Hour', giver: 'rosa', reward: 1200,
      intro: [
        ['Rosa Delgado', 'Last job, Leo, and it pays like it. The gold coupe outside goes to a buyer at the old pier — he sails at sundown.'],
        ['Leo Santos', 'And if the police have opinions?'],
        ['Rosa Delgado', 'Drive faster than their opinions. The clock is already running, querido.'],
      ],
      stages: [
        { kind: 'enterCar', label: 'Take the gold coupe at Delgado Motors' },
        { kind: 'timed', x: P.pier.x, y: P.pier.y, seconds: 150, label: 'Deliver the coupe to the old pier before sundown' },
      ],
    },
  ];

  let active = null;

  function speak(lines, onDone) {
    NP.game.dialogue = { lines, i: 0, onDone: onDone || null };
  }

  function advanceDialogue() {
    const d = NP.game.dialogue;
    if (!d) return;
    NP.audio.click();
    d.i++;
    if (d.i >= d.lines.length) {
      NP.game.dialogue = null;
      if (d.onDone) d.onDone();
    }
  }

  function giverOf(def) { return GIVERS[def.giver]; }

  function nextDef() {
    const idx = NP.game.saveData.mission;
    return idx < DEFS.length ? DEFS[idx] : null;
  }

  function tryTalk() {
    if (active || NP.game.dialogue) return false;
    const def = nextDef();
    if (!def) return false;
    const g = giverOf(def);
    const p = NP.game.player;
    if (Math.hypot(p.x - g.x, p.y - g.y) > 58) return false;
    startMission(def);
    return true;
  }

  function startMission(def) {
    speak(def.intro, () => {
      active = { def, stage: 0, targetCar: null, timer: 0 };
      const idx = NP.game.saveData.mission;
      if (idx === 1) {
        active.targetCar = NP.vehicles.spawnSpecial('convertible', 2400, 668, 0, '#ff6f61');
      }
      if (idx === 2) {
        if (!NP.game.player.hasPistol) {
          NP.game.player.hasPistol = true;
          NP.game.toast('Marisol gave you a pistol. Mouse aims, click fires.');
        }
        NP.police.forceStars(3);
      }
      if (idx === 3) {
        active.targetCar = NP.vehicles.spawnSpecial('coupe', 1010, 1905, 0, '#f7b731');
      }
      enterStage();
      NP.game.toast('Mission started: ' + def.title);
    });
  }

  function enterStage() {
    const st = active.def.stages[active.stage];
    if (!st) return;
    if (st.kind === 'timed') {
      active.timer = st.seconds;
      NP.police.forceStars(2);
    }
    if (st.arrive) { /* dialogue plays on arrival instead */ }
  }

  function stageTarget() {
    const st = active.def.stages[active.stage];
    if (!st) return null;
    if (st.kind === 'gotoCar' || st.kind === 'steal' || st.kind === 'enterCar') {
      return active.targetCar ? { x: active.targetCar.x, y: active.targetCar.y } : null;
    }
    return { x: st.x, y: st.y };
  }

  function advanceStage() {
    const st = active.def.stages[active.stage];
    active.stage++;
    NP.audio.pickup();
    if (active.stage >= active.def.stages.length) {
      completeMission();
      return;
    }
    if (st && st.arrive) {
      // Arrival dialogue belongs to the stage just finished; play it, then continue.
    }
    enterStage();
  }

  function completeMission() {
    const def = active.def;
    const g = NP.game;
    active = null;
    g.player.cash += def.reward;
    g.saveData.cash = g.player.cash;
    g.saveData.mission++;
    g.saveData.hasPistol = g.player.hasPistol;
    if (g.saveData.mission >= DEFS.length) {
      g.saveData.storyDone = true;
      g.bigToast('STORY COMPLETE', 'Costa Serena is yours now, Leo. Free roam — the city keeps turning.');
    } else {
      g.bigToast('MISSION COMPLETE', def.title + '  +$' + def.reward);
    }
    NP.audio.jingle();
    NP.audio.cash();
    if (g.saveData.mission === 2) {
      g.pickups.push({ kind: 'pistol', x: P.garage.x - 60, y: P.garage.y + 210 });
      g.toast('Rosa left something for you at the garage.');
    }
    NP.save.store(g.saveData);
  }

  function failMission(reason) {
    if (!active) return;
    const def = active.def;
    if (active.targetCar) {
      if (NP.game.player.car === active.targetCar) NP.player.exitCar(NP.game.player);
      NP.vehicles.removeCar(active.targetCar);
      active.targetCar = null;
    }
    active = null;
    NP.police.setDecayBoost(1);
    NP.game.toast('Mission failed — ' + reason + '. Talk to ' + giverOf(def).name + ' to retry.');
  }

  function giverPrompt() {
    if (active || NP.game.dialogue) return null;
    const def = nextDef();
    if (!def) return null;
    const gv = giverOf(def);
    const p = NP.game.player;
    if (Math.hypot(p.x - gv.x, p.y - gv.y) <= 58) return 'E — Talk to ' + gv.name;
    return null;
  }

  function onStole(car) {
    if (!active) return;
    const st = active.def.stages[active.stage];
    if ((st.kind === 'steal' || st.kind === 'enterCar') && car === active.targetCar) {
      if (st.kind === 'steal') NP.police.forceStars(2);
      advanceStage();
    }
  }

  function update(dt) {
    const g = NP.game;
    const p = g.player;
    // Pickups (the pistol Rosa leaves behind).
    for (let i = g.pickups.length - 1; i >= 0; i--) {
      const pk = g.pickups[i];
      if (!p.car && Math.hypot(p.x - pk.x, p.y - pk.y) < 24) {
        g.pickups.splice(i, 1);
        if (pk.kind === 'pistol') {
          p.hasPistol = true;
          g.saveData.hasPistol = true;
          NP.save.store(g.saveData);
          g.toast('Picked up a pistol. Mouse aims, click fires.');
          NP.audio.pickup();
        }
      }
    }
    if (!active) {
      const def = nextDef();
      if (def && !g.dialogue) {
        const gv = giverOf(def);
        g.objective = { x: gv.x, y: gv.y, text: 'Talk to ' + gv.name + ' — ' + def.title, kind: 'talk' };
      } else if (!g.dialogue) {
        g.objective = null;
      }
      return;
    }
    const st = active.def.stages[active.stage];
    const target = stageTarget();
    if (target) g.objective = { x: target.x, y: target.y, text: st.label, kind: 'mission' };
    if (st.kind === 'timed') {
      active.timer -= dt;
      g.objective.timer = Math.max(0, active.timer);
      if (active.timer <= 0) { failMission('out of time'); return; }
    }
    if (active.targetCar && active.targetCar.wrecked && (st.kind === 'deliverCar' || st.kind === 'timed')) {
      failMission('the car was wrecked');
      return;
    }
    const d = target ? Math.hypot(p.x - target.x, p.y - target.y) : 9999;
    if (st.kind === 'goto' && d < 40 && !active.waiting) {
      if (st.arrive) {
        active.waiting = true;
        speak(st.arrive, () => { active.waiting = false; advanceStage(); });
      } else {
        advanceStage();
      }
    } else if (st.kind === 'gotoCar' && d < 60) {
      advanceStage();
    } else if (st.kind === 'deliverCar' && p.car === active.targetCar && d < 76) {
      advanceStage();
    } else if (st.kind === 'timed' && p.car === active.targetCar && d < 70) {
      advanceStage();
    } else if (st.kind === 'escape') {
      const inZone = d < 95;
      NP.police.setDecayBoost(inZone ? 3.2 : 1);
      if (inZone && NP.police.stars === 0) {
        NP.police.setDecayBoost(1);
        advanceStage();
      }
    }
  }

  return {
    DEFS, GIVERS, tryTalk, advanceDialogue, onStole, failMission, update, giverPrompt, nextDef,
    get active() { return active; },
    giverOf,
  };
})();
