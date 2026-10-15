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

## 5. Seeded worlds
- Worlds are generated from a seed, similar to seeded survival-world generation, so every player who uses the same seed shares the same asteroid layout.
- Players roam to asteroids, see each asteroid's question difficulty, and solve to get items and rewards.
- Rewards are spent to level up the ship, weapons, and abilities, and to buy other ships within the game.
- Aliens show up periodically as stakes and pressure.

## 6. Risk and recovery
- **(a)** The ship has HP. When an alien hits the ship it loses HP.
- **(b)** If HP reaches zero, the ship loses all its collected material, dropped on the spot.
- **(c)** When the ship is destroyed, the collected minerals are recuperable but follow a timed drop: the items sit at the death location for a limited time and start disappearing if not recovered in time.
- **(d)** Aliens are rival solvers: they try to take whatever the player solved from asteroids the player destroys.

## 7. Fabrication
Collected asteroid materials are used to:
- **(a)** Manufacture better weapons.
- **(b)** Build a faster ship.
- **(c)** Fabricate items.
- **(d)** Buy math hints.

Gather resources, then fabricate upgrades, in tiers where better gear needs rarer materials. Materials carried are at stake until used or banked in fabrication, which ties into the risk rules.

## 8. Open questions
- Aiming mechanic: click-to-target vs laser.
- How difficulty is displayed: color vs stars.
- Multiplayer infrastructure: not yet decided.
- The seed must be shared between players.
