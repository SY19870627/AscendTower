import type { Tile, Vec2 } from './Types'
import { RNG } from './RNG'

type GridOptions = {
  enemyCount?: number
  wallThickness?: number
}

export class Grid {
  w: number
  h: number
  tiles: Tile[][]
  rng: RNG
  keyPos!: Vec2
  doorPos!: Vec2
  stairsUpPos: Vec2 | null = null
  playerPos!: Vec2
  enemyPos: Vec2[] = []
  tileUnderPlayer: Tile = 'floor'
  private hasPlayer = false
  private wallThickness: number

  constructor(w = 14, h = 14, seed = 1337, options?: GridOptions) {
    this.w = w
    this.h = h
    this.rng = new RNG(seed)
    this.tiles = Array.from({ length: h }, () => Array.from({ length: w }, () => 'floor' as Tile))
    const normalizedThickness = Math.max(0, Math.floor(options?.wallThickness ?? 1))
    const maxThickness = Math.max(
      0,
      Math.min(Math.floor((this.w - 1) / 2), Math.floor((this.h - 1) / 2))
    )
    this.wallThickness = Math.max(0, Math.min(normalizedThickness, maxThickness))
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
      t === 'stairs_up' ||
      t === 'stairs_branch' ||
      t === 'enemy' ||
      t === 'player' ||
      t === 'door' ||
      t === 'weapon' ||
      t === 'armor' ||
      t === 'event' ||
      t === 'battle_event' ||
      t === 'shop' ||
      t === 'npc' ||
      t === 'item' ||
      t === 'ending'
    )
  }

  getTile(p: Vec2): Tile {
    return this.tiles[p.y][p.x]
  }

  setTile(p: Vec2, tile: Tile) {
    this.tiles[p.y][p.x] = tile
  }

  setPlayerPosition(pos: Vec2, underlying: Tile) {
    if (this.hasPlayer) {
      this.tiles[this.playerPos.y][this.playerPos.x] = this.tileUnderPlayer
    }
    this.playerPos = { x: pos.x, y: pos.y }
    this.tileUnderPlayer = underlying
    this.tiles[pos.y][pos.x] = 'player'
    this.hasPlayer = true
  }

  movePlayer(pos: Vec2): Tile {
    const target = this.tiles[pos.y][pos.x]
    if (this.hasPlayer) {
      this.tiles[this.playerPos.y][this.playerPos.x] = this.tileUnderPlayer
    }
    this.playerPos = { x: pos.x, y: pos.y }
    this.tileUnderPlayer = target
    this.tiles[pos.y][pos.x] = 'player'
    this.hasPlayer = true
    return target
  }

  detachPlayer() {
    if (!this.hasPlayer) return
    this.tiles[this.playerPos.y][this.playerPos.x] = this.tileUnderPlayer
    this.hasPlayer = false
  }

  hasActivePlayer() {
    return this.hasPlayer
  }

  setTileUnderPlayer(tile: Tile) {
    this.tileUnderPlayer = tile
  }

  getTileUnderPlayer(): Tile {
    return this.tileUnderPlayer
  }

  place(t: Tile) {
    while (true) {
      const minX = this.wallThickness
      const maxX = Math.max(minX, this.w - this.wallThickness - 1)
      const minY = this.wallThickness
      const maxY = Math.max(minY, this.h - this.wallThickness - 1)
      const p = { x: this.rng.int(minX, maxX), y: this.rng.int(minY, maxY) }
      if (this.tiles[p.y][p.x] === 'floor') {
        this.tiles[p.y][p.x] = t
        return p
      }
    }
  }

  private generate() {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (
          x < this.wallThickness ||
          y < this.wallThickness ||
          x >= this.w - this.wallThickness ||
          y >= this.h - this.wallThickness
        ) {
          this.tiles[y][x] = 'wall'
        }
      }
    }

    const centerX = Math.min(Math.max(Math.floor(this.w / 2), this.wallThickness), this.w - this.wallThickness - 1)
    const centerY = Math.min(Math.max(Math.floor(this.h / 2), this.wallThickness), this.h - this.wallThickness - 1)
    const startPos = { x: centerX, y: centerY }
    this.setPlayerPosition(startPos, 'floor')

    this.keyPos = this.place('key')
    this.doorPos = this.place('door')

    this.carvePath(this.playerPos, this.keyPos)
    this.carvePath(this.keyPos, this.doorPos)
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

  connectTiles(a: Vec2, b: Vec2) {
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

