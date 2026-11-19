# Neon Palms

**A Costa Serena crime story.** Leo Santos rolls into a sunlit coastal city with $120, a borrowed shirt, and a talent for other people's cars. Work four jobs for Marisol Vega of Cafe Brisa and Rosa Delgado of Delgado Motors — a sealed crate, a borrowed convertible, a duffel that has to disappear, and one golden-hour getaway — while the Costa Serena PD keeps score in stars.

![Competition](https://make.fun/badge/gta6-01.svg)
![Rank](https://make.fun/badge/gta6-01/jhw1106/neon-palms/rank.svg)
![Reward](https://make.fun/badge/gta6-01/jhw1106/neon-palms/reward.svg)

Entered in the make.fun bounty [Make GTA 6](https://make.fun/bounty/gta6-01). The game is plain static files — open `game/index.html` in a desktop browser, or run `node serve.ts` and visit the printed address. No build step, no network, no libraries: every line of the game is hand-written vanilla JavaScript and Canvas 2D.

## How to play

- **WASD / arrow keys** — walk and drive. **Shift** — sprint. **Space** — handbrake (drift).
- **E** — talk to people, steal and enter cars, get out, advance dialogue.
- **F or mouse click** — punch. Once Leo owns the pistol: the **mouse aims**, **click** shoots.
- **Esc / P** — pause. **M** — mute.
- Steal any car you can reach. Crimes somebody sees raise your wanted stars; more stars bring more patrol cars, and they will ram and box you in. Get stopped next to one and the bust meter fills — pay the fine and walk out of the station. Lose the police by breaking their line of sight and lying low until the stars cool.
- Follow the gold marker (also on the minimap) from job to job. Progress, cash and the pistol are saved automatically; Continue picks up where you left off.

## Features

- A hand-built open world: five avenues and four streets of pastel blocks with rooftop clutter, palm sidewalks, parking lots, named places (Cafe Brisa, Delgado Motors, Serena Clinic, the Marina Hotel, Costa Serena PD), and a beach with open water along the east edge.
- Traffic that follows lanes, turns at intersections, brakes for obstacles and honks; parked cars in every lot; pedestrians who stroll, panic, flee gunfire and sirens, and dive out of the way of fast cars.
- Car theft with bailing drivers, arcade driving physics with handbrake drift, skid marks, collision damage, smoke and wrecks.
- A five-star wanted system: witnessed crimes raise heat, patrol cars chase, ram and box you in, a bust meter, fines, and heat that cools when you stay unseen.
- Combat on foot: punches, and a pistol with mouse aim, muzzle flash and tracers.
- A four-mission story with named characters and dialogue, objective markers in the world and on the minimap, cash rewards, timed and escape stages, retries on failure, and free roam after the finale.
- A full HUD: circular-corner minimap with roads, water, traffic, flashing police and the mission marker; wanted stars; cash and health; speedometer; objective banner; dialogue box.
- Start screen with New Game / Continue (localStorage save), pause menu, busted and knocked-out screens.
- Synthesized WebAudio sound only — engine hum that follows your speed, two-tone sirens, punches, shots, crashes, pickups and a mission-complete jingle. No audio files.
- Golden-hour art direction: warm gradient light, long building shadows, headlight cones at dusk, dust and spark particles, screen shake on hard hits, and a camera that looks ahead when you drive.

## Layout

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored library.
- `serve.ts` — a tiny local static server for playing the game.
- `game/` — the game itself: `index.html`, `style.css`, and `src/` split by job — `world.js` (the city), `vehicles.js` (car physics and traffic), `pedestrians.js`, `player.js`, `police.js` (wanted system and patrol AI), `missions.js` (the story), `render.js` (drawing and effects), `hud.js` (HUD, minimap, screens), `audio.js` (synthesized sound), `input.js`, `save.js`, `shots.js` (screenshot staging) and `main.js` (boot and the game loop).
- `screenshots/` — four real renders of the game, staged with `?shot=` scenes.
- `vendor/makefun-game.ts` — the make.fun dossier library, unchanged.

## License

MIT — see `LICENSE`.
