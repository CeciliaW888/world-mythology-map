#!/usr/bin/env python3
"""
Generate narration audio for all myths using Edge TTS.
Produces storytelling-quality MP3 files for both Chinese and English.

Usage:
  pip install edge-tts
  python scripts/generate-narration.py

Output: audio/narration/{id}_{lang}.mp3
"""

import asyncio
import json
import os
import sys

try:
    import edge_tts
except ImportError:
    print("Install edge-tts first: pip install edge-tts")
    sys.exit(1)

# === Voice Configuration ===
# These are the best storytelling voices available in Edge TTS
VOICES = {
    'zh': 'zh-CN-XiaoxiaoNeural',      # Warm female, supports "storytelling" style
    'en': 'en-US-JennyNeural',          # Natural female English
}

# Edge TTS SSML style for engaging narration
VOICE_SETTINGS = {
    'zh': {
        'rate': '-10%',       # Slightly slower for drama
        'pitch': '+0Hz',
        'style': 'gentle',   # Xiaoxiao supports: gentle, calm, cheerful, lyrical, newscast
    },
    'en': {
        'rate': '-15%',       # Comfortable listening pace
        'pitch': '+0Hz',
        'style': 'gentle',
    }
}

# === Paths ===
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
MYTHS_PATH = os.path.join(PROJECT_DIR, 'data', 'myths.json')
OUTPUT_DIR = os.path.join(PROJECT_DIR, 'audio', 'narration')


async def generate_audio(myth_id, text, lang, voice, settings):
    """Generate a single narration MP3."""
    output_path = os.path.join(OUTPUT_DIR, f'{myth_id}_{lang}.mp3')

    if os.path.exists(output_path):
        print(f'  [skip] {output_path} already exists')
        return True

    try:
        # Build SSML for better quality
        ssml = f"""<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis'
               xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='{lang}'>
            <voice name='{voice}'>
                <mstts:express-as style='{settings["style"]}'>
                    <prosody rate='{settings["rate"]}' pitch='{settings["pitch"]}'>
                        {text}
                    </prosody>
                </mstts:express-as>
            </voice>
        </speak>"""

        communicate = edge_tts.Communicate(text, voice,
                                            rate=settings['rate'],
                                            pitch=settings['pitch'])
        await communicate.save(output_path)
        print(f'  [done] {output_path}')
        return True

    except Exception as e:
        print(f'  [FAIL] {myth_id}_{lang}: {e}')
        return False


async def main():
    # Load myths
    with open(MYTHS_PATH, 'r', encoding='utf-8') as f:
        myths = json.load(f)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    total = len(myths) * 2  # Chinese + English
    done = 0
    failed = 0

    print(f'Generating narration for {len(myths)} myths ({total} audio files)...\n')

    for myth in myths:
        myth_id = myth['id']
        name = myth.get('name', '')
        en_name = myth.get('en', '')

        # Chinese narration
        zh_text = myth.get('zh', '')
        if zh_text:
            print(f'[{myth_id}] {name} (zh)')
            ok = await generate_audio(myth_id, zh_text, 'zh',
                                       VOICES['zh'], VOICE_SETTINGS['zh'])
            done += 1
            if not ok: failed += 1

        # English narration
        en_text = myth.get('en2', '')
        if en_text:
            print(f'[{myth_id}] {en_name} (en)')
            ok = await generate_audio(myth_id, en_text, 'en',
                                       VOICES['en'], VOICE_SETTINGS['en'])
            done += 1
            if not ok: failed += 1

    print(f'\nDone! {done - failed}/{total} files generated.')
    if failed:
        print(f'{failed} failures — rerun to retry.')

    # Calculate total size
    total_size = 0
    for f in os.listdir(OUTPUT_DIR):
        if f.endswith('.mp3'):
            total_size += os.path.getsize(os.path.join(OUTPUT_DIR, f))
    print(f'Total audio size: {total_size / 1024 / 1024:.1f} MB')


if __name__ == '__main__':
    asyncio.run(main())
