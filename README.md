# 가나다 디펜스 (GaNaDa Defense)

A mobile-first **idle defense game** where you **swipe to draw Korean letters (한글 자음)**
to cast different attacks against waves of **dokkaebi (도깨비, Korean goblins)** — inspired by
brush/symbol-drawing action games. Draw a stroke, and the matching jamo erupts into fire,
lightning, frost, and more.

No build step, no images, no dependencies — everything (art, sound, recognition) is generated
at runtime. Pure HTML5 Canvas + vanilla JavaScript ES modules. Works on phones and desktop, and
installs as a PWA for offline play.

## How to play

1. **자동포 (Auto Qi)** fires on its own — that's the *idle* layer that grinds weak enemies and 💰.
2. **Draw a consonant** anywhere on the screen with your finger (or mouse) to cast a spell.
   Each drawing costs **먹 (ink / mana)**, which refills over time.
3. Defend your **성문 (gate)** on the left. If its health hits zero, it's game over.
4. Spend 💰 in the **🛒 대장간 (forge / shop)** on permanent upgrades. Upgrades and gold are
   **saved** in your browser, so each run makes you stronger (idle/roguelite progression).
5. Every **5th wave** spawns a **도깨비 대장 (boss dokkaebi)**.

### The spellbook — consonants (자음)

All **14 basic consonants** are spells. Draw the single-stroke gesture shown in the in-game
**📖 마법서 (Spellbook)** menu, which lists every letter's ink cost and effect.

| Draw | Jamo | Spell | Effect |
|------|------|-------|--------|
| `7`-corner | **ㄱ** | 번개 Chain Lightning | Arcs between several enemies |
| `L`  | **ㄴ** | 대지가르기 Earth Slam | Frontline AoE + knockback |
| `⊏`  | **ㄷ** | 독안개 Poison Mist | AoE + damage-over-time |
| `zig-zag` | **ㄹ** | 용의 숨결 Dragon's Breath | Full-screen ultimate (most ink) |
| `□`  | **ㅁ** | 서리감옥 Frost Prison | AoE damage + slow/freeze |
| `∪`  | **ㅂ** | 물대포 Water Cannon | Single hit + heavy knockback |
| `∧`  | **ㅅ** | 화염탄 Fire Bolt | Homing bolt, explosion + burn (cheap, spammable) |
| `○`  | **ㅇ** | 수호의 빛 Guardian Nova | Damages everything + **repairs the gate** |
| `Z`  | **ㅈ** | 질풍참 Gale Slash | Forward slash + knockback |
| `Z`+cap | **ㅊ** | 회오리 Tornado | Wide AoE + knockback |
| `┐`+bar | **ㅋ** | 암흑탄 Dark Bolt | High-damage single bolt |
| `E`  | **ㅌ** | 빛기둥 Light Pillar | Pillars fall from the sky |
| `Π`  | **ㅍ** | 폭풍 Tempest | Lane-wide sweep |
| balloon | **ㅎ** | 태양폭발 Solar Flare | Full damage + gate repair |

> The harder the letter is to draw, the stronger (and pricier) the spell. The exact stroke for each
> letter is shown in the **📖 마법서** menu (top bar).

### Dual spells — compose a syllable (조합)

Korean writes in syllable blocks: an initial consonant (초성) + a vowel (중성) + an optional
final consonant (종성). **Draw a consonant, then a vowel, and they fuse into a syllable** like
**가 (ㄱ + ㅏ)** that casts a stronger, vowel-shaped spell. A live syllable indicator shows the
block assembling; it fires when you stop drawing (or after a short window).

The **vowel decides the delivery shape**, the **consonant decides the element**. All **10 basic
vowels** work, including the iotized (double-tick) ones which are stronger versions:

| Draw | Vowel | Shape |
|------|-------|-------|
| `⊢` | **ㅏ** | 창 — a forward piercing **lance** |
| `⊢⊢` | **ㅑ** | 쌍창 — a **stronger** lance |
| `⊣` | **ㅓ** | 소용돌이 — a wide **swirl** (big AoE) |
| `⊣⊣` | **ㅕ** | 대소용돌이 — a **huge** swirl |
| `⊥` | **ㅗ** | 비 — bolts **rain** from the sky |
| `⊥⊥` | **ㅛ** | 폭우 — a heavier **downpour** |
| `⊤` | **ㅜ** | 운석 — a crashing **meteor** |
| `⊤⊤` | **ㅠ** | 운석우 — a **meteor shower** |
| `—` | **ㅡ** | 파동 — a **wave** sweeping the lane |
| `│` | **ㅣ** | 관통 — a high-damage **pierce** |

Add a **third consonant (받침)** — e.g. **건** (ㄱ + ㅓ + ㄴ) or **혈** (ㅎ + ㅕ + ㄹ) — to fuse both
consonants into a **screen-wide ultimate** that carries both their effects.

### Two ways to draw

- **Quick draw** (default): draw a stroke and it commits after a short pause — fast for single
  letters and quick combos.
- **✍️ 모아 그리기 (Hold draw)**: tap the button to compose with **no time limit** — draw every
  stroke of a long syllable (great for `건`, `혈`) at your own pace, then tap **✨ 시전** to fire.

A few real Korean words are **hidden signature spells**: spell out **불** (ㅂㅜㄹ, "fire") for
지옥불, **물** (ㅁㅜㄹ, "water") for 해일, **산** (ㅅㅏㄴ, "mountain") for 산사태 — each with a
power bonus.

## Run it

It's a static site. Any web server works (ES modules need `http://`, not `file://`):

```bash
npm start          # serves on http://localhost:8080
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080` on your phone (same Wi-Fi) or desktop. On mobile, "Add to
Home Screen" to install it as a fullscreen app.

### Deploy to GitHub Pages

Push this repo and enable **Settings → Pages → Deploy from branch** (root). The game is served
as-is; no build required.

## Project layout

```
index.html          # markup + HUD/overlays
css/style.css        # mobile-first UI styling
manifest.json, sw.js # PWA install + offline cache
assets/icon.svg      # app icon (brushstroke ㄱ/ㅅ)
src/
  main.js            # bootstrap
  game.js            # game loop, waves, combat, input, rendering glue
  recognizer.js      # $1-style unistroke recognizer + jamo stroke templates
  attacks.js         # spell definitions (per letter)
  upgrades.js        # idle-economy upgrade definitions
  entities.js        # Enemy / Projectile / Particle / FloatingText
  render.js          # procedural canvas art (dokkaebi, gate, background)
  ui.js              # DOM HUD, spell guide, shop, overlays
  audio.js           # procedural WebAudio sound effects
```

## How letter recognition works

`recognizer.js` implements the classic **$1 Unistroke Recognizer** pipeline
(resample → scale → translate → nearest-template), but with **rotation normalization
deliberately turned off** so a drawn `ㄱ` is never mistaken for a `ㄴ` — Korean letters are
orientation-sensitive. Each jamo is stored as a single-stroke point template; the best match
above a confidence threshold fires its spell, otherwise you get a `?` miss.

To stay forgiving of real, messy finger-drawing, matching is made **invariant to where you
start and which way you draw**:

- **Direction-invariant** for every letter — the candidate is also compared reversed, so drawing
  `ㅅ` left-to-right or right-to-left reads the same.
- **Start-point-invariant for closed shapes** (`ㅇ`, `ㅁ`) — a circle is matched against *all*
  cyclic start offsets and both directions, so an `ㅇ` started at the bottom, drawn
  counter-clockwise, squashed into an oval, or even left slightly open still recognizes reliably.
- **Near-1D strokes** (`ㅡ`, `ㅣ`) scale uniformly so a line isn't blown up into a noisy square.
- **Shape-feature guard** — that very flexible circle matcher used to swallow squares (`ㅁ`),
  `⊏` (`ㄷ`) and `∪` (`ㅂ`). A smoothed **corner count** and an **endpoint-openness** measure
  asymmetrically penalize the circle by how *cornered* or *open* your stroke is, so round vs
  polygonal closed shapes stay cleanly separated.

These mirror/start cases are *reversals and rotations of the same shape*, so they boost tolerance
without ever turning one letter into another (a mirror is not a reversal). Measured on a battery of
*realistic* distortions (±15° tilt, 0.75–1.3× stretch, finger jitter, trimmed ends), every
consonant and vowel recognizes ~100% within its syllable slot, with no confusions — up from `ㅁ`
landing at ~18% (mistaken for `ㅇ`) before this guard.

## License

MIT
