import Phaser from 'phaser'
import { Grid } from '../core/Grid'
import type { ArmorDef, EventDef, EventOutcome, Vec2, WeaponDef, ItemDef, ShopDef } from '../core/Types'
import { handleInput } from '../systems/input'
import { draw } from '../systems/render'
import { spawnWeapons, spawnArmors, spawnItems, makePosKey } from '../systems/spawning'
import { enemies } from '../content/enemies'
import { events } from '../content/events'
import { getShopsForFloor } from '../content/shops'
import { getItemDef } from '../content/items'
import { BattleOverlay, type BattleInitData } from './BattleOverlay'
import { EventOverlay, type EventResolution } from './EventOverlay'
import { ShopOverlay, type ShopResolution, type ShopInventoryEntry } from './ShopOverlay'
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
  coins = 120
  readonly sidebarWidth = 360
  readonly sidebarPadding = 16
  gridOrigin = { x: 0, y: 0 }
  floor = 1
  weaponDrops = new Map<string, WeaponDef>()
  armorDrops = new Map<string, ArmorDef>()
  eventNodes = new Map<string, EventDef>()
  shopNodes = new Map<string, ShopDef>()
  itemDrops = new Map<string, ItemDef>()
  inventory: { def: ItemDef; quantity: number }[] = []
  lastActionMessage = ''
  battleOverlay!: BattleOverlay
  eventOverlay!: EventOverlay
  shopOverlay!: ShopOverlay

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
    this.coins = 120
    this.inventory = []
    this.itemDrops.clear()
    this.shopNodes.clear()
    this.lastActionMessage = ''
  }

  create() {
    this.grid = new Grid(11, 11, Date.now() & 0xffff)
    this.gridOrigin = { x: this.sidebarWidth + this.sidebarPadding, y: 0 }
    this.weaponDrops.clear()
    this.armorDrops.clear()
    this.eventNodes.clear()
    this.itemDrops.clear()
    this.shopNodes.clear()
    spawnWeapons(this)
    spawnArmors(this)
    spawnItems(this)
    this.spawnShops()
    this.spawnEvents()
    this.lastActionMessage = ''
    this.gfx = this.add.graphics()
    this.gfx.setDepth(0)

    const sidebarHeight = this.scale.height
    this.add.rectangle(0, 0, this.sidebarWidth, sidebarHeight, 0x112020)
      .setOrigin(0, 0)
      .setDepth(-1)

    this.battleOverlay = new BattleOverlay(this)
    this.eventOverlay = new EventOverlay(this)
    this.shopOverlay = new ShopOverlay(this)

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => handleInput(this, e.key))
    draw(this)

    this.add.text(
      this.sidebarPadding,
      sidebarHeight - 24,
      'WASD/Arrow keys move. Stand near enemies for previews. Legend: @ You  K Key  D Door  > Stairs  E Enemy  W Weapon  A Armor  S Shop  ? Event.',
      { fontSize: '12px', color: '#9fd' }
    ).setDepth(1)
  }
  private spawnShops() {
    const available = getShopsForFloor(this.floor)
    if (!available.length) return

    const pool = [...available]
    const spawnCount = Math.min(Math.max(1, Math.floor(this.floor / 4) + 1), pool.length)

    for (let i = 0; i < spawnCount; i++) {
      const pick = this.grid.rng.int(0, pool.length - 1)
      const def = pool.splice(pick, 1)[0]
      const pos = this.grid.place('shop')
      this.shopNodes.set(makePosKey(pos.x, pos.y), def)
    }
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

  startShop(pos: Vec2) {
    if (this.shopOverlay?.isActive) return
    const key = makePosKey(pos.x, pos.y)
    const shopDef = this.shopNodes.get(key)
    if (!shopDef) return

    const entries: ShopInventoryEntry[] = shopDef.offers
      .map(offer => {
        const item = getItemDef(offer.itemId)
        if (!item) return null
        return { offer, item } as ShopInventoryEntry
      })
      .filter((entry): entry is ShopInventoryEntry => entry !== null)

    if (!entries.length) {
      this.lastActionMessage = 'The merchant has nothing left to sell.'
      draw(this)
      return
    }

    this.shopOverlay.open({ shop: shopDef, pos, entries, coins: this.coins })
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

    if (Array.isArray(outcome.grantItems) && outcome.grantItems.length) {
      for (const grant of outcome.grantItems) {
        const def = getItemDef(grant.id)
        if (!def) {
          append(`An unknown item (${grant.id}) eludes your grasp.`)
          continue
        }
        const quantity = Math.max(grant.quantity ?? 1, 1)
        const gainMessage = this.addItemToInventory(def, quantity, { silent: true })
        append(gainMessage)
      }
    }

    if (typeof outcome.coinDelta === 'number') {
      const before = this.coins
      const after = Math.max(before + outcome.coinDelta, 0)
      this.coins = after
      append(`Coins: ${before} -> ${after}`)
    }
    this.cameras.main.flash(90, 120, 220, 255)
    draw(this)
    return message
  }
  addItemToInventory(item: ItemDef, quantity = 1, options?: { silent?: boolean }): string {
    const amount = Math.max(quantity, 1)
    if (item.stackable) {
      const existing = this.inventory.find(entry => entry.def.id === item.id)
      if (existing) {
        existing.quantity += amount
      } else {
        this.inventory.push({ def: item, quantity: amount })
      }
    } else {
      for (let i = 0; i < amount; i++) {
        this.inventory.push({ def: item, quantity: 1 })
      }
    }

    const label = amount > 1 ? `${item.name} x${amount}` : item.name
    const message = `Gained ${label}.`
    if (!options?.silent) {
      this.lastActionMessage = message
    }
    return message
  }

  useInventorySlot(index: number): boolean {
    const stack = this.inventory[index]
    if (!stack) return false
    const item = stack.def

    if (item.stackable) {
      stack.quantity = Math.max(stack.quantity - 1, 0)
      if (stack.quantity <= 0) {
        this.inventory.splice(index, 1)
      }
    } else {
      this.inventory.splice(index, 1)
    }

    const outcomeMessage = this.applyEventOutcome(item.effect)
    this.lastActionMessage = `Used ${item.name}.\n${outcomeMessage}`
    draw(this)
    return true
  }

  purchaseFromShop(entry: ShopInventoryEntry): { success: boolean; message: string; coins: number } {
    const cost = Math.max(entry.offer.price, 0)
    if (this.coins < cost) {
      const message = `Not enough coins. Need ${cost}, have ${this.coins}.`
      this.lastActionMessage = message
      draw(this)
      return { success: false, message, coins: this.coins }
    }

    const before = this.coins
    this.coins = Math.max(this.coins - cost, 0)
    const amount = Math.max(entry.offer.quantity ?? 1, 1)
    const gainMessage = this.addItemToInventory(entry.item, amount, { silent: true })
    const summary = `Purchased ${entry.item.name}${amount > 1 ? ` x${amount}` : ''} for ${cost} coins.`
    const message = `${summary}\n${gainMessage}\nCoins: ${before} -> ${this.coins}`
    this.lastActionMessage = message
    draw(this)
    return { success: true, message, coins: this.coins }
  }
  completeEvent(pos: Vec2, _resolution: EventResolution) {
    const key = makePosKey(pos.x, pos.y)
    this.eventNodes.delete(key)

    if (this.grid.tiles[pos.y][pos.x] === 'event') {
      this.grid.tiles[pos.y][pos.x] = 'floor'
    }

    draw(this)
  }

  completeShop(pos: Vec2, _resolution: ShopResolution) {
    const key = makePosKey(pos.x, pos.y)
    this.shopNodes.delete(key)

    if (this.grid.tiles[pos.y][pos.x] === 'shop') {
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




































































