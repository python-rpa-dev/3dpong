import { describe, it, expect } from 'vitest';
import { Audio } from '../src/audio/Audio.js';

describe('Rally music layers', () => {
  it('maps combo to layer thresholds', () => {
    const audio = new Audio();
    audio.setMusicIntensity(0);
    expect(audio.musicLayer).toBe(1);
    audio.setMusicIntensity(4);
    expect(audio.musicLayer).toBe(1);
    audio.setMusicIntensity(5);
    expect(audio.musicLayer).toBe(2);
    audio.setMusicIntensity(10);
    expect(audio.musicLayer).toBe(3);
    audio.setMusicIntensity(15);
    expect(audio.musicLayer).toBe(4);
    audio.setMusicIntensity(99);
    expect(audio.musicLayer).toBe(4);
  });

  it('startMusic is a no-op without an AudioContext', () => {
    const audio = new Audio();
    expect(() => audio.startMusic()).not.toThrow();
    expect(audio.musicPlaying).toBe(false);
  });

  it('stopMusic clears state safely', () => {
    const audio = new Audio();
    audio.stopMusic();
    expect(audio.musicPlaying).toBe(false);
    expect(audio.musicTimer).toBeNull();
  });
});
