export const TILE = { size: 64 } as const

export const COLORS = {
  floor: 0x153131,
  wall: 0x0e2222,
  key: 0xf5d142,
  event: 0xb57edc,
  door: 0xa6722a,
  stairs: 0x7ad3b5,
  player: 0x89c2ff,
  enemy: 0xd96b6b,
  weapon: 0x7fd96b,
  armor: 0x6ba9d9,
  shop: 0xff9f43,
  item: 0xffc04d,
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




