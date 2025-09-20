import Phaser from 'phaser'
import { Grid } from '../core/Grid'
import type { ArmorDef, EventDef, EventOutcome, Vec2, WeaponDef } from '../core/Types'
import { handleInput } from '../systems/input'
import { draw } from '../systems/render'
import { spawnWeapons, spawnArmors, makePosKey } from '../systems/spawning'
import { enemies } from '../content/enemies'
import { events } from '../content/events'
import { BattleOverlay, type BattleInitData } from './BattleOverlay'
import { EventOverlay, type EventResolution } from './EventOverlay'
export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene')
  }

  grid!: Grid
  gfx!: Phaser.GameObjects.Graphics
  hasKey = false
  playerStats = { hp: 120, mp: 20 }
  playerWeapon: WeaponDef | null = null
  playerArmor: ArmorDef | null = null
  weaponCharge = 0
  readonly sidebarWidth = 360
  readonly sidebarPadding = 16
  gridOrigin = { x: 0, y: 0 }
  floor = 1
  weaponDrops = new Map<string, WeaponDef>()
  armorDrops = new Map<string, ArmorDef>()
  eventNodes = new Map<string, EventDef>()
  battleOverlay!: BattleOverlay
  eventOverlay!: EventOverlay

  init(data?: { floor?: number; reset?: boolean }) {
    if (data?.reset) this.resetPlayerState()
    this.floor = data?.floor ?? this.floor ?? 1
  }

  resetPlayerState() {
    this.hasKey = false
    this.playerStats = { hp: 120, mp: 20 }
    this.playerWeapon = null
    this.playerArmor = null
    this.weaponCharge = 0
  }

  create() {
    this.grid = new Grid(11, 11, Date.now() & 0xffff)
    this.gridOrigin = { x: this.sidebarWidth + this.sidebarPadding, y: 0 }

    this.weaponDrops.clear()
    this.armorDrops.clear()
    this.eventNodes.clear()
    spawnWeapons(this)
    spawnArmors(this)
    this.spawnEvents()

    this.gfx = this.add.graphics()
    this.gfx.setDepth(0)

    const sidebarHeight = this.scale.height
    this.add.rectangle(0, 0, this.sidebarWidth, sidebarHeight, 0x112020)
      .setOrigin(0, 0)
      .setDepth(-1)

    this.battleOverlay = new BattleOverlay(this)
    this.eventOverlay = new EventOverlay(this)

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => handleInput(this, e.key))
    draw(this)

    this.add.text(
      this.sidebarPadding,
      sidebarHeight - 24,
      'WASD/Arrow keys move. Stand near enemies for previews. Legend: @ You  K Key  D Door  > Stairs  E Enemy  W Weapon  A Armor  ? Event.',
      { fontSize: '12px', color: '#9fd' }
    ).setDepth(1)
  }
  private spawnEvents() {
    const available = events.filter(event => (event.minFloor ?? 1) <= this.floor)
    const pool = available.length ? available : events
    if (!pool.length) return

    const baseCount = 1 + Math.floor(this.floor / 3)
    const spawnCount = Math.min(Math.max(baseCount, 1), 3)

    for (let i = 0; i < spawnCount; i++) {
      const def = pool[this.grid.rng.int(0, pool.length - 1)]
      const pos = this.grid.place('event')
      this.eventNodes.set(makePosKey(pos.x, pos.y), def)
    }
  }

  startEvent(pos: Vec2) {
    if (this.eventOverlay?.isActive) return
    const key = makePosKey(pos.x, pos.y)
    const eventDef = this.eventNodes.get(key)
    if (!eventDef) return
    this.eventOverlay.open({ event: eventDef, pos })
  }

  applyEventOutcome(outcome: EventOutcome): string {
    let message = outcome.message.trim()
    const append = (line: string) => {
      message = message.length ? `${message}\n${line}` : line
    }

    if (typeof outcome.hpDelta === 'number') {
      const before = this.playerStats.hp
      const after = Math.max(before + outcome.hpDelta, 0)
      this.playerStats.hp = after
      append(`HP: ${before} -> ${after}`)
    }

    if (typeof outcome.setHp === 'number') {
      const before = this.playerStats.hp
      const after = Math.max(outcome.setHp, 0)
      this.playerStats.hp = after
      append(`HP: ${before} -> ${after}`)
    }

    if (typeof outcome.weaponChargeDelta === 'number') {
      const special = this.playerWeapon?.special
      if (special && special.chargeMax > 0) {
        const before = Math.min(this.weaponCharge, special.chargeMax)
        const rawAfter = before + outcome.weaponChargeDelta
        const after = Math.max(0, Math.min(rawAfter, special.chargeMax))
        this.weaponCharge = after
        append(`Weapon charge: ${before} -> ${after}/${special.chargeMax}`)
      } else {
        append('No weapon is ready to hold extra charge.')
      }
    }

    if (outcome.giveKey) {
      if (!this.hasKey) {
        this.hasKey = true
        append('You secure a gleaming key.')
      } else {
        append('You already carry a key, so nothing changes.')
      }
    }

    this.cameras.main.flash(90, 120, 220, 255)
    draw(this)
    return message
  }
  completeEvent(pos: Vec2, _resolution: EventResolution) {
    const key = makePosKey(pos.x, pos.y)
    this.eventNodes.delete(key)

    if (this.grid.tiles[pos.y][pos.x] === 'event') {
      this.grid.tiles[pos.y][pos.x] = 'floor'
    }

    draw(this)
  }

  startBattle(enemyPos: Vec2) {
    if (this.eventOverlay?.isActive) return
    if (this.battleOverlay?.isActive) return
    const enemy = this.getEnemyAt(enemyPos)
    if (!enemy) return

    const payload: BattleInitData = {
      enemy,
      enemyPos,
      player: {
        hp: this.playerStats.hp,
        weapon: this.playerWeapon,
        armor: this.playerArmor,
        weaponCharge: this.weaponCharge
      }
    }

    this.battleOverlay.open(payload)
  }

  getEnemyAt(pos: Vec2) {
    const exists = this.grid.enemyPos.some(p => p.x === pos.x && p.y === pos.y)
    if (!exists) return null
    return enemies[0]
  }

  finishBattle(outcome: { enemyPos: Vec2; remainingHp: number; weaponCharge: number }) {
    const { enemyPos, remainingHp, weaponCharge } = outcome
    const prev = { ...this.grid.playerPos }

    this.playerStats.hp = Math.max(Math.floor(remainingHp), 0)
    this.weaponCharge = Math.max(weaponCharge, 0)

    this.grid.tiles[prev.y][prev.x] = 'floor'
    this.grid.playerPos = { x: enemyPos.x, y: enemyPos.y }
    this.grid.tiles[enemyPos.y][enemyPos.x] = 'player'
    this.grid.enemyPos = this.grid.enemyPos.filter(p => p.x !== enemyPos.x || p.y !== enemyPos.y)

    this.cameras.main.flash(120, 80, 200, 255)
    draw(this)
  }

  cancelBattle() {
    draw(this)
  }

  handlePlayerDefeat() {
    this.cameras.main.flash(160, 255, 60, 60)
    this.resetPlayerState()
    this.time.delayedCall(200, () => {
      this.scene.restart({ floor: 1, reset: true })
    })
  }
}

export default GameScene






















