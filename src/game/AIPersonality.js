export const PERSONALITIES = {
  chill: {
    name: 'CHILL',
    errorScale: 1.2,
    delayScale: 1.15,
    win: ['nice try', 'all in a day\'s work', 'zzz... what?'],
    lose: ['fair play!', 'you earned that one', 'good game so far'],
    impressed: ['oh, not bad', 'huh, you can rally'],
  },
  confident: {
    name: 'CONFIDENT',
    errorScale: 1.0,
    delayScale: 1.0,
    win: ['told you so', 'smooth', 'this is going perfectly'],
    lose: ['lucky bounce', 'warm-up round, right?', 'won\'t happen twice'],
    impressed: ['ok, that was clean', 'respect. but I\'m next'],
  },
  trashTalker: {
    name: 'TRASH TALKER',
    errorScale: 0.85,
    delayScale: 0.9,
    win: ['IS THAT ALL?', 'practice more!', 'too easy!'],
    lose: ['lag. definitely lag.', 'I let you have that', 'ENJOY IT WHILE IT LASTS'],
    impressed: ['lucky shot!', 'don\'t get cocky'],
  },
};

const NAMES = Object.keys(PERSONALITIES);

export function pickPersonality(rng = Math.random) {
  return PERSONALITIES[NAMES[Math.floor(rng() * NAMES.length)]];
}
