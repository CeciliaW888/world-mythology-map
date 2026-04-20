# World Mythology Map — Redesign Plan

## Vision
Transform the flat Leaflet map into an immersive, storybook-style experience that delights kids and triggers nostalgia in adults. Think: a magical globe you spin with your hands, where each country glows with its myths, plays its traditional music, and shows real artwork from that culture.

## Core Changes from Current Build

### 1. 3D Globe (Three.js)
Replace the 2D Leaflet map with a Three.js interactive globe.
- Earth texture with subtle country borders
- Myth locations as glowing pin markers on the globe surface
- Click a country → globe rotates smoothly to face it
- Ambient particle effects (floating golden dust / fireflies)
- Starfield background
- Mouse drag to rotate, scroll to zoom

**Libraries:** Three.js r128 (CDN), OrbitControls-equivalent (custom)

### 2. Replace Emojis with Real Artwork
Each myth gets a thumbnail image sourced from Wikimedia Commons — classical paintings, traditional art, historical illustrations from the home culture.
- China: traditional ink paintings, Dunhuang murals
- Greece: vase paintings, Renaissance interpretations
- Egypt: tomb paintings, papyrus art
- Japan: ukiyo-e woodblock prints
- Norse: Viking runestone art, romantic era paintings
- India: Mughal miniatures, temple carvings
- etc.

**Implementation:** Each myth entry gets an `img` field with a Wikimedia Commons URL. Fallback: gradient placeholder with the myth's initial character.

### 3. Country Music on Click
When you click a country/location, play a short loop of representative traditional music.
- China: guzheng/erhu
- Greece: bouzouki/lyre
- Egypt: oud/ney
- Japan: koto/shakuhachi
- Norway: hardingfele
- India: sitar/tabla
- Iraq: oud
- etc.

**Implementation:** Use free-licensed audio from Wikimedia Commons or Freesound.org. Web Audio API for playback. Crossfade between tracks. Volume control + mute button.

**Fallback:** If audio can't load, use Web Audio API to generate a simple ambient tone in a cultural scale (pentatonic for China, Phrygian for Middle East, etc.)

### 4. Kid-Friendly + Nostalgic Adult Design
- **Warm color palette:** deep navy background with golden/amber accents (like an old storybook)
- **Typography:** serif font for story titles (storybook feel), clean sans-serif for UI
- **Storybook card design:** story cards look like pages from an illustrated book with torn/aged edges
- **Animations:** smooth transitions, gentle floating effects, page-turn feel when opening stories
- **Large touch targets:** all interactive elements minimum 44px for mobile/kid use
- **Reading mode:** large text, comfortable line height, gentle background

## Layout (matching original video structure)

```
┌─────────────────────────────────────┬──────────┐
│  HEADER: 世界神话地图               │ Search   │
│  subtitle + country display         │          │
├─────────────────────────────────────┤ Country  │
│                                     │ Name     │
│         3D GLOBE                    │ Stats    │
│      (Three.js canvas)              ├──────────┤
│                                     │ Story    │
│                                     │ Grid     │
│                                     │ (2-col   │
│                                     │  images) │
├─────────────────────────────────────┤          │
│  STORY DETAIL PANEL (bottom)        │          │
│  [Image] [Title + Tags + Text]      │          │
│  [Language btns] [Play narration]   │          │
├─────────────────────────────────────┴──────────┤
│  FILTER BAR: themes | eras | toggles           │
└─────────────────────────────────────────────────┘
```

## Data Model (per myth)
```js
{
  id: Number,
  country: String,         // "China"
  cZh: String,             // "中国"
  lat: Number, lng: Number,
  name: String,            // Chinese name
  en: String,              // English name
  img: String,             // Wikimedia Commons URL (artwork)
  themes: String[],        // ["fire","flood"]
  era: String,             // "ancient"|"classical"|"medieval"|"modern"
  type: String,            // "创世"|"英雄"|"爱情"|etc.
  zh: String,              // Chinese story text
  en2: String,             // English story text
  langs: String[],         // available languages
  related: Number[],       // IDs of related myths
  music: String            // (optional) per-myth audio override
}
```

Country-level music config:
```js
const COUNTRY_MUSIC = {
  "China": "guzheng-ambient.mp3",
  "Greece": "greek-lyre.mp3",
  // ...
}
```

## Implementation Phases

### Phase 1: 3D Globe + Visual Upgrade (this session)
- [ ] Replace Leaflet with Three.js globe
- [ ] Add starfield background
- [ ] Plot myth markers as glowing dots on globe surface
- [ ] Click marker → rotate globe + open story
- [ ] Sidebar with image-based story cards (Wikimedia artwork)
- [ ] Bottom story detail panel with artwork
- [ ] Filter bar (themes, eras, toggles)
- [ ] Warm storybook color scheme

### Phase 2: Audio + Music
- [ ] Country music system (Web Audio API)
- [ ] Play on country click, crossfade between countries
- [ ] Volume/mute controls
- [ ] Optional: Web Speech API "read aloud" button per story

### Phase 3: Polish
- [ ] Smooth animations and transitions
- [ ] Mobile responsive
- [ ] Loading screen
- [ ] Connection lines on globe (great circle arcs between related myths)
- [ ] Push updated version to GitHub Pages

## Technical Constraints
- Single HTML file (all-in-one)
- CDN dependencies only: Three.js r128
- No backend — all data embedded
- Images from Wikimedia Commons (free use)
- Audio from Freesound/Wikimedia (free use) or synthesized

## Open Questions
1. How many total myths to include? Current: ~100 across 25 countries. Target?
2. Should narration use TTS (Web Speech API) or pre-recorded audio?
3. Mobile: touch to rotate globe, or fallback to 2D map?
