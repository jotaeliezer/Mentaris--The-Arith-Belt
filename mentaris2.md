# Mentaris 2 Plan (multiplayer-focused)

Planning document only. The current game stays as-is; nothing here changes existing code.

## 1. Core idea
The math question IS the input. The student types the answer directly (2x1 or 3x1 digit multiplication, plus addition and subtraction). That number launches missiles, unlocks asteroids, and earns rewards.

## 2. Progression ladder
- Early: addition and subtraction.
- Higher levels or harder missions: multiplication, decimals, and perfect squares.

## 3. Ship and controls
Keep the ship with native mouse-and-keyboard controls; the mouse is the shoot button. Two open aiming options:
- **(a) Click-to-target:** the missile arcs to the clicked asteroid and pairs naturally with the math gate.
- **(b) Straight-line laser.**

## 4. Free roam multiplayer
- Not timed; asteroids are scattered around the map.
- Approaching an asteroid shows its question difficulty without revealing the answer (color-coding or star rating, open point).
- Students choose easy or hard; harder gives more rewards, easier gives fewer.
- Multiple players join and play simultaneously.

## 5. Open questions
- Aiming mechanic: click-to-target vs laser.
- How difficulty is displayed: color vs stars.
- Multiplayer infrastructure: not yet decided.

## 6. Risk and recovery
- **(a)** The ship has HP. When an alien hits the ship it loses HP.
- **(b)** If HP reaches zero, the ship loses all its collected material, Minecraft-style.
- **(c)** Recovery is explicit: when the player respawns into the same session or same world, all of their minerals are recuperable.
- **(d)** Aliens are rival solvers: they try to take whatever the player solved from asteroids the player destroys.
