# Bar Dance Character Bible

Source of truth for **visual universe**. Generate art only after this bible is locked.

Related files:

- Runtime roster: [`TikTokBridge/config/roster.json`](../../config/roster.json)
- Export/import rules: [`ART_BRIEF.md`](ART_BRIEF.md)
- Per-character prompts: [`game-assets/characters/`](../../../game-assets/characters/)

---

## Why generate (not buy packs)

Bar Dance needs **one coherent universe**. Mixing packs from different artists breaks the “same game” feeling. Prefer a custom set with locked style, camera, and proportions.

---

## Pipeline

```text
STYLE BIBLE
    ↓
MASTER CHARACTER SHEET   ← same camera / proportion / render
    ↓
12 CHARACTERS (MVP: 6 first)
    ↓
INDIVIDUAL PNG (neutral stand)
    ↓
POSE / EXPRESSION
    ↓
RIG (Spine preferred)
    ↓
DANCE ANIMATION (reusable across cast)
```

Do **not** generate characters one-off with different prompts each time. Always go through the master sheet first.

---

## Art direction (locked)

**Mix:** K-pop × Y2K × Gen-Z × Streetwear × Cute × Neon

**Palette:**

| Token | Role |
|-------|------|
| Hot Pink | Primary idol accent |
| Magenta | Energy / gifts |
| Black | Street / contrast |
| White | Clean highlights |
| Electric Purple | Night club |
| Neon Cyan | Cyber / Vivi line |

**Visual rules:**

- Full body, stylized / anime proportions
- Slightly larger head, longer legs
- Clear silhouette at ~256px
- Chunky sneakers, oversized jackets, crop tops, cargo / pleated skirts
- Chains, headphones, hair highlights, neon accents
- Glossy / cel-shaded rendering
- **Do not change art direction between characters**

---

## Export cleanliness (critical)

Not just “transparent PNG”. Require:

> clean isolated full-body character, transparent background, no shadow, no floor, no glow, no environmental lighting, no props

Bad (hard to cut / composite):

```text
character + halo + shadow + particles + floor light
```

Good:

```text
character only
transparent everywhere else
```

---

## Pose order

1. **Neutral standing** (master) — arms relaxed, facing camera-ish 3/4 or front, feet planted  
2. Idle  
3. Dance 01 / 02 / 03  
4. Victory / happy  

Never start with a dance pose as the master asset.

---

## Animation strategy

**Prefer Spine (or DragonBones/Rive) over PNG flipbooks long-term.**

```text
AI Character → PNG → layer separate → Spine bones → reusable dances
```

Target layers (example Mina):

```text
head, hair_front, hair_back, body,
upper_arm_L/R, forearm_L/R, hand_L/R,
thigh_L/R, shin_L/R, shoes
```

Goal:

```text
12 characters × 5 reusable dances
```

not

```text
12 × 20 unique flipbooks = 240
```

Phase-1 runtime in this repo still accepts GIF→PNG flipbooks so the floor works before Spine lands.

---

## MVP (Phase 1) — 6 characters only

| id | Name | Role | Identity |
|----|------|------|----------|
| mina | Mina | Pink K-pop Girl | playful, energetic, confident |
| yuna | Yuna | Y2K Girl | rebellious, fashionable |
| jin | Jin | Cool Street / K-pop Boy | cool, composed |
| kai | Kai | Hip-hop Boy | rhythmic, street swagger |
| vivi | Vivi | Cyber Idol | futuristic, mysterious |
| koko | Koko | Cat Mascot | playful, cheeky |

Test before expanding: visual consistency, gameplay, animation path, mobile perf, viewer reaction.

Then: `6 → 12 → 24 → seasonal`.

### Phase 2 (after MVP proves out)

Rina, Sora, Jay, Leo, Momo, Nova.

---

## Master Character Sheet checklist

Generate **one lineup image** first:

```text
01 Mina   Pink Idol Girl
02 Yuna   Y2K Girl
03 Jin    Cool Street Boy
04 Kai    Hip-hop Boy
05 Vivi   Cyber Idol
06 Koko   Cat Mascot
(+ later: Rina, Sora, Jay, Leo, Momo, Nova)
```

All in one row: same camera, same scale, same lighting/render.

Then crop / re-generate each character using that sheet as **reference**.

---

## Identity > recolor

Players must recognize characters from silhouette + fashion language, not only hair color.

Each character = BODY + OUTFIT + FACE identity.

---

## Economy layer (content model)

```text
CHARACTER + OUTFIT + DANCE + VFX + EMOTE
```

Example Mina skins over time:

```text
Base → Pink Idol → Neon Idol → Summer → Halloween → Christmas
```

Rarity ladder (runtime already sketched in `roster.json`):

`Common → Rare → Epic → Legendary` (+ later Limited / Event)

---

## Repo layout for regenerability

Keep **prompt + negative + metadata + seed/model** — not only PNG.

```text
game-assets/characters/<id>/
├── reference.png      # crop from master sheet
├── master.png         # neutral stand, clean
├── prompt.md
├── negative-prompt.md
├── metadata.json      # model, seed, date, version
├── full.png
├── idle.png
├── happy.png
├── dance.png
├── victory.png
└── layers/            # future Spine parts
```

Six months later you can still regenerate outfits without losing identity.

---

## Tracking status

Per variant in `config/roster.json`:

| status | meaning |
|--------|---------|
| `planned` | bible only |
| `art_ready` | PNG exported, not imported to Unity |
| `imported` | frames under `Resources/Characters/{id}_{rarity}/` |

Character-level: `phase: 1|2`, `mvp: true|false`.
