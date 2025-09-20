import type { Tile, Vec2 } from './Types'
import { RNG } from './RNG'

export class Grid {
  w: number
  h: number
  tiles: Tile[][]
  rng: RNG
  keyPos!: Vec2
  doorPos!: Vec2
  stairsPos!: Vec2
  playerPos!: Vec2
  enemyPos: Vec2[] = []

  constructor(w = 11, h = 11, seed = 1337) {
    this.w = w
    this.h = h
    this.rng = new RNG(seed)
    this.tiles = Array.from({ length: h }, () => Array.from({ length: w }, () => 'floor' as Tile))
    this.generate()
  }

  inBounds(p: Vec2) {
    return p.x >= 0 && p.y >= 0 && p.x < this.w && p.y < this.h
  }

  isWalkable(p: Vec2) {
    const t = this.tiles[p.y][p.x]
    return (
      t === 'floor' ||
      t === 'key' ||
      t === 'stairs' ||
      t === 'enemy' ||
      t === 'player' ||
      t === 'door' ||
      t === 'weapon' ||
      t === 'armor' ||
      t === 'event' ||
      t === 'shop' ||
      t === 'item'
    )
  }

  private generate() {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (x === 0 || y === 0 || x === this.w - 1 || y === this.h - 1) {
          this.tiles[y][x] = 'wall'
        }
      }
    }

    for (let i = 0; i < 18; i++) {
      const x = this.rng.int(1, this.w - 2)
      const y = this.rng.int(1, this.h - 2)
      this.tiles[y][x] = 'wall'
    }

    this.playerPos = this.place('player')
    this.keyPos = this.place('key')
    this.doorPos = this.place('door')
    this.stairsPos = this.place('stairs')

    for (let i = 0; i < 5; i++) {
      this.enemyPos.push(this.place('enemy'))
    }

    this.carvePath(this.playerPos, this.keyPos)
    this.carvePath(this.keyPos, this.doorPos)
    this.carvePath(this.doorPos, this.stairsPos)
  }

  place(t: Tile) {
    while (true) {
      const p = { x: this.rng.int(1, this.w - 2), y: this.rng.int(1, this.h - 2) }
      if (this.tiles[p.y][p.x] === 'floor') {
        this.tiles[p.y][p.x] = t
        return p
      }
    }
  }

  private carvePath(a: Vec2, b: Vec2) {
    const dx = Math.sign(b.x - a.x)
    const dy = Math.sign(b.y - a.y)

    let x = a.x
    let y = a.y

    while (x !== b.x) {
      x += dx
      if (this.tiles[y][x] === 'wall') this.tiles[y][x] = 'floor'
    }

    while (y !== b.y) {
      y += dy
      if (this.tiles[y][x] === 'wall') this.tiles[y][x] = 'floor'
    }
  }
}
