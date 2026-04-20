# LibriVox Sources for World Mythology Map

## Known LibriVox Audiobooks Covering Our Myths

### Greek Myths
- **Bulfinch's Mythology** — https://librivox.org/bulfinch039s-mythology-the-age-of-fable-by-thomas-bulfinch/
  - Covers: Prometheus (id:20), Aphrodite (id:21), Trojan War (id:22), Odyssey (id:23), Icarus (id:24), Orpheus (id:25), Theseus (id:26), Pandora (id:27), Perseus (id:28), Deucalion's Flood (id:29)
- **Myths and Legends of Ancient Greece and Rome** by E.M. Berens — https://librivox.org/myths-and-legends-of-ancient-greece-and-rome-by-e-m-berens/

### Norse Myths
- **Norse Mythology** (Prose Edda) — https://librivox.org/the-younger-edda-by-snorri-sturlason/
  - Covers: Odin (id:50), Thor (id:51), Ragnarok (id:52), Freya (id:53), Loki (id:54), Yggdrasil (id:55)
- **Teutonic Mythology** by Viktor Rydberg — https://librivox.org/teutonic-mythology-gods-and-goddesses-of-the-northland-by-viktor-rydberg/

### Egyptian Myths
- **Egyptian Mythology and Egyptian Christianity** — https://librivox.org/egyptian-mythology-and-egyptian-christianity-by-samuel-sharpe/
  - Covers: Osiris & Isis (id:30), Ra (id:31)
- **Legends of Ancient Egypt** by F.H. Brooksbank — https://librivox.org/legends-of-ancient-egypt-by-f-h-brooksbank/

### Indian Myths
- **Indian Fairy Tales** — https://librivox.org/indian-fairy-tales-by-joseph-jacobs/
- **The Ramayana** (condensed) — https://librivox.org/the-ramayana-by-romesh-c-dutt/
  - Covers: Rama (id:60)
- **Mahabharata** (condensed) — https://librivox.org/stories-from-the-mahabharata-by-alfred-john-church/

### Japanese Myths
- **Japanese Fairy Tales** compiled by Yei Theodora Ozaki — https://librivox.org/japanese-fairy-tales-by-yei-theodora-ozaki/
  - Covers: Momotaro (id:46), Urashima Taro (id:47), Kaguya-hime (id:48)

### Irish Myths
- **Celtic Fairy Tales** by Joseph Jacobs — https://librivox.org/celtic-fairy-tales-by-joseph-jacobs/
  - Covers: Cu Chulainn (id:80), Tuatha De Danann (id:81)

### Chinese Myths
- **Chinese Fairy Tales** by various — https://librivox.org/chinese-fairy-tales-by-various/
- **Myths and Legends of China** by E.T.C. Werner — https://librivox.org/myths-and-legends-of-china-by-e-t-c-werner/
  - Covers many Chinese myths (ids 1-15)

### Mesopotamian (Iraq)
- **The Epic of Gilgamesh** — https://librivox.org/the-epic-of-gilgamesh/
  - Covers: Gilgamesh (id:40), Enkidu (id:41), Utnapishtim flood (id:42)

## Strategy
1. For myths covered by LibriVox: extract relevant chapters, trim to the specific myth section
2. For myths NOT covered: generate with Edge TTS using the `generate-narration.py` script
3. All audio files go in `audio/narration/{id}_{lang}.mp3`

## How to Extract LibriVox Clips
LibriVox chapters are typically 5-30 minutes. To extract a specific myth:

```bash
# Download the chapter MP3 from LibriVox
# Use ffmpeg to trim to the relevant section:
ffmpeg -i chapter.mp3 -ss 02:15 -to 05:30 -c copy audio/narration/20_en.mp3
```
