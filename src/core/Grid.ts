import type { Tile, Vec2 } from './Types'
import { RNG } from './RNG'

type GridOptions = {
  includeDownstairs?: boolean
}

export class Grid {
  w: number
  h: number
  tiles: Tile[][]
  rng: RNG
  keyPos!: Vec2
  doorPos!: Vec2
  stairsUpPos!: Vec2
  stairsDownPos: Vec2 | null = null
  playerPos!: Vec2
  enemyPos: Vec2[] = []
  tileUnderPlayer: Tile = 'floor'
  private hasPlayer = false

  constructor(w = 14, h = 14, seed = 1337, options?: GridOptions) {
    this.w = w
    this.h = h
    this.rng = new RNG(seed)
    this.tiles = Array.from({ length: h }, () => Array.from({ length: w }, () => 'floor' as Tile))
    this.generate(options)
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
      t === 'stairs_down' ||
      t === 'stairs_branch' ||
      t === 'enemy' ||
      t === 'player' ||
      t === 'door' ||
      t === 'weapon' ||
      t === 'armor' ||
      t === 'event' ||
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
      const p = { x: this.rng.int(1, this.w - 2), y: this.rng.int(1, this.h - 2) }
      if (this.tiles[p.y][p.x] === 'floor') {
        this.tiles[p.y][p.x] = t
        return p
      }
    }
  }

  private generate(options?: GridOptions) {
    const includeDownstairs = options?.includeDownstairs ?? false

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

    if (includeDownstairs) {
      const downPos = this.place('stairs_down')
      this.stairsDownPos = downPos
      this.setPlayerPosition(downPos, 'stairs_down')
    } else {
      this.stairsDownPos = null
      const startPos = this.place('player')
      this.setPlayerPosition(startPos, 'floor')
    }

    this.keyPos = this.place('key')
    this.doorPos = this.place('door')
    this.stairsUpPos = this.place('stairs_up')

    for (let i = 0; i < 5; i++) {
      this.enemyPos.push(this.place('enemy'))
    }

    this.carvePath(this.playerPos, this.keyPos)
    this.carvePath(this.keyPos, this.doorPos)
    this.carvePath(this.doorPos, this.stairsUpPos)
    if (this.stairsDownPos) {
      this.carvePath(this.stairsDownPos, this.keyPos)
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

