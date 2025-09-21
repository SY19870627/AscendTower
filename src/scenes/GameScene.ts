import Phaser from 'phaser'
import { Grid } from '../core/Grid'
import type {
  ArmorDef,
  EventDef,
  EventOutcome,
  Vec2,
  WeaponDef,
  ItemDef,
  ShopDef,
  StatusDef,
  StatusGrant,
  SkillDef
} from '../core/Types'
import { handleInput } from '../systems/input'
import { draw } from '../systems/render'
import { spawnWeapons, spawnArmors, spawnItems, makePosKey } from '../systems/spawning'
import { enemies } from '../content/enemies'
import { events } from '../content/events'
import { getShopsForFloor } from '../content/shops'
import { getItemDef } from '../content/items'
import { getStatusDef } from '../content/statuses'
import { skills, getSkillDef } from '../content/skills'
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
  activeStatuses: { def: StatusDef; remaining: number }[] = []
  knownSkills: SkillDef[] = []
  skillCooldowns = new Map<string, number>()
  lastActionMessage = ''
  battleOverlay!: BattleOverlay
  eventOverlay!: EventOverlay
  shopOverlay!: ShopOverlay

  private appendActionMessages(lines: string[]) {
    const additions = lines.map(line => line.trim()).filter(line => line.length > 0)
    if (!additions.length) return
    const current = (this.lastActionMessage ?? '').trim()
    const merged = current.length ? current.split('\n').concat(additions) : additions
    this.lastActionMessage = merged.join('\n')
  }

  getStatusBonuses() {
    return this.activeStatuses.reduce(
      (acc, status) => {
        acc.atk += status.def.atkBonus ?? 0
        acc.def += status.def.defBonus ?? 0
        return acc
      },
      { atk: 0, def: 0 }
    )
  }

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
    this.activeStatuses = []
    this.knownSkills = []
    this.skillCooldowns.clear()
    this.learnSkill('battle-shout', { silent: true })
    this.lastActionMessage = ''
  }

  create() {
    this.grid = new Grid(11, 11, Date.now() & 0xffff)
    this.gridOrigin = { x: this.sidebarWidth + this.sidebarPadding, y: 0 }

    this.weaponDrops.clear()
    this.armorDrops.clear()
    this.eventNodes.clear()
    this.shopNodes.clear()
    this.itemDrops.clear()
    this.activeStatuses = []
    this.skillCooldowns.clear()

    spawnWeapons(this)
    spawnArmors(this)
    spawnItems(this)
    this.spawnShops()
    this.spawnEvents()
    if (!this.knownSkills.length) this.learnSkill('battle-shout', { silent: true })
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
      'WASD/Arrow keys move. Q/W/E use skills. Legend: @ You  K Key  D Door  > Stairs  E Enemy  W Weapon  A Armor  S Shop  ? Event.',
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
      this.appendActionMessages(['The merchant has nothing left to sell.'])
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
      this.appendActionMessages([message])
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
    this.appendActionMessages([`Used ${item.name}.`, outcomeMessage])
    const continueTurn = this.advanceTurn('item')
    if (continueTurn) {
      draw(this)
    }
    return true
  }

  useSkill(index: number): boolean {
    const skill = this.knownSkills[index]
    if (!skill) return false
    const currentCooldown = this.skillCooldowns.get(skill.id) ?? 0
    if (currentCooldown > 0) {
      this.appendActionMessages([`${skill.name} is on cooldown (${currentCooldown} turns).`])
      draw(this)
      return true
    }

    const outcomeMessage = this.applyEventOutcome(skill.effect)
    this.appendActionMessages([`Skill used: ${skill.name}`, outcomeMessage])
    this.skillCooldowns.set(skill.id, Math.max(skill.cooldown, 0))
    const continueTurn = this.advanceTurn('skill')
    if (continueTurn) {
      draw(this)
    }
    return true
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

    const statusLines = this.applyStatusGrants(outcome.grantStatuses)
    statusLines.forEach(append)

    const skillLines = this.applySkillGrants(outcome.grantSkills)
    skillLines.forEach(append)

    this.lastActionMessage = message
    this.cameras.main.flash(90, 120, 220, 255)
    draw(this)
    return message
  }

  startBattle(enemyPos: Vec2) {
    if (this.eventOverlay?.isActive) return
    if (this.shopOverlay?.isActive) return
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

  purchaseFromShop(entry: ShopInventoryEntry): { success: boolean; message: string; coins: number } {
    const cost = Math.max(entry.offer.price, 0)
    if (this.coins < cost) {
      const message = `Not enough coins. Need ${cost}, have ${this.coins}.`
      this.appendActionMessages([message])
      draw(this)
      return { success: false, message, coins: this.coins }
    }

    const before = this.coins
    this.coins = Math.max(this.coins - cost, 0)
    const amount = Math.max(entry.offer.quantity ?? 1, 1)
    const gainMessage = this.addItemToInventory(entry.item, amount, { silent: true })
    const summary = `Purchased ${entry.item.name}${amount > 1 ? ` x${amount}` : ''} for ${cost} coins.`
    const details = `Coins: ${before} -> ${this.coins}`
    this.appendActionMessages([summary, gainMessage, details])
    draw(this)
    return { success: true, message: `${summary}\n${gainMessage}\n${details}`, coins: this.coins }
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

  advanceTurn(_reason: 'move' | 'item' | 'shop' | 'skill' = 'move'): boolean {
    const statusTick = this.tickStatuses()
    const skillTick = this.tickSkillCooldowns()
    const messages = [...statusTick.messages, ...skillTick]
    if (messages.length) this.appendActionMessages(messages)
    if (statusTick.defeated) {
      this.handlePlayerDefeat()
      return false
    }
    return true
  }

  private tickStatuses(): { messages: string[]; defeated: boolean } {
    if (!this.activeStatuses.length) return { messages: [], defeated: false }
    const messages: string[] = []
    const remaining: { def: StatusDef; remaining: number }[] = []

    for (const status of this.activeStatuses) {
      if (typeof status.def.hpPerTurn === 'number' && status.def.hpPerTurn !== 0) {
        const before = this.playerStats.hp
        const after = Math.max(before + status.def.hpPerTurn, 0)
        this.playerStats.hp = after
        const delta = status.def.hpPerTurn
        const sign = delta > 0 ? '+' : ''
        messages.push(`${status.def.name}: HP ${before} -> ${after} (${sign}${delta})`)
      }
      const remainingTurns = status.remaining - 1
      if (remainingTurns > 0) {
        remaining.push({ def: status.def, remaining: remainingTurns })
      } else {
        messages.push(`Status ended: ${status.def.name}`)
      }
    }

    this.activeStatuses = remaining
    return { messages, defeated: this.playerStats.hp <= 0 }
  }

  private tickSkillCooldowns(): string[] {
    if (this.skillCooldowns.size === 0) return []
    const messages: string[] = []
    const updated = new Map<string, number>()
    this.skillCooldowns.forEach((value, id) => {
      if (value <= 0) {
        updated.set(id, 0)
        return
      }
      const next = Math.max(value - 1, 0)
      updated.set(id, next)
      if (next === 0) {
        const skill = this.knownSkills.find(entry => entry.id === id)
        if (skill) messages.push(`${skill.name} is ready.`)
      }
    })
    this.skillCooldowns = updated
    return messages
  }

  private addStatus(def: StatusDef, duration: number): string {
    const existing = this.activeStatuses.find(status => status.def.id === def.id)
    if (existing) {
      const refreshed = Math.max(existing.remaining, duration)
      existing.remaining = refreshed
      return `Status refreshed: ${def.name} (${refreshed} turns remaining)`
    }
    this.activeStatuses.push({ def, remaining: duration })
    return `Status gained: ${def.name} (${duration} turns)`
  }

  private applyStatusGrants(grants?: StatusGrant[]): string[] {
    if (!Array.isArray(grants) || !grants.length) return []
    const lines: string[] = []
    for (const grant of grants) {
      const def = getStatusDef(grant.id)
      if (!def) {
        lines.push(`Unknown status: ${grant.id}`)
        continue
      }
      const duration = Math.max(grant.duration ?? def.duration, 1)
      lines.push(this.addStatus(def, duration))
    }
    return lines
  }

  private applySkillGrants(grants?: string[]): string[] {
    if (!Array.isArray(grants) || !grants.length) return []
    const lines: string[] = []
    for (const id of grants) {
      const message = this.learnSkill(id)
      if (message) lines.push(message)
    }
    return lines
  }

  learnSkill(id: string, options?: { silent?: boolean }): string | null {
    const def = getSkillDef(id) ?? skills.find(skill => skill.id === id) ?? null
    if (!def) return `Unknown skill: ${id}`
    if (this.knownSkills.some(skill => skill.id === def.id)) {
      if (options?.silent) return null
      return `Skill already known: ${def.name}`
    }
    this.knownSkills.push(def)
    this.skillCooldowns.set(def.id, 0)
    if (options?.silent) return null
    return `Skill learned: ${def.name}`
  }

  getSkillCooldown(skillId: string): number {
    return this.skillCooldowns.get(skillId) ?? 0
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
