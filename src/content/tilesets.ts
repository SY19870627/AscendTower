export const TILE = { size: 64 } as const

export const COLORS = {
  floor: 0x1f3f3f,
  wall: 0x132a2a,
  key: 0xf5d142,
  event: 0xb57edc,
  door: 0xa6722a,
  stairs: 0x7ad3b5,
  player: 0x89c2ff,
  enemy: 0xff6b6b,
  weapon: 0x9fe676,
  armor: 0x7fc0ff,
  shop: 0xffb85c,
  item: 0xffd27f,
} as const

export const GLYPH = {
  floor: '.',
  wall: '#',
  key: 'K',
  door: 'D',
  stairs: '>',
  event: '?',
  player: '@',
  enemy: 'E',
  armor: 'A',
  weapon: 'W',
  shop: 'S',
  item: '!',
} as const






