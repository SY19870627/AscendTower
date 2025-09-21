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
  NpcDef,
  SkillDef
} from '../core/Types'
import { PlayerState, type InventoryEntry, type ActiveStatus } from '../game/player/PlayerState'
import { handleInput } from '../systems/input'
import { draw } from '../systems/render'
import { spawnWeapons, spawnArmors, spawnItems, makePosKey } from '../systems/spawning'
import { enemies } from '../content/enemies'
import { events } from '../content/events'
import { npcs } from '../content/npcs'
import { getShopsForFloor } from '../content/shops'
import { getItemDef } from '../content/items'
import { BattleOverlay, type BattleInitData } from './BattleOverlay'
import { EventOverlay, type EventResolution } from './EventOverlay'
import { ShopOverlay, type ShopResolution, type ShopInventoryEntry } from './ShopOverlay'
import { DialogueOverlay } from './DialogueOverlay'
import { LibraryOverlay, type LibraryCategory } from './LibraryOverlay'


export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene')
  }

  grid!: Grid
  gfx!: Phaser.GameObjects.Graphics
  readonly sidebarWidth = 360
  readonly sidebarPadding = 16
  gridOrigin = { x: 0, y: 0 }
  floor = 1
  weaponDrops = new Map<string, WeaponDef>()
  armorDrops = new Map<string, ArmorDef>()
  eventNodes = new Map<string, EventDef>()
  npcNodes = new Map<string, NpcDef>()
  shopNodes = new Map<string, ShopDef>()
  itemDrops = new Map<string, ItemDef>()
  lastActionMessage = ''
  battleOverlay!: BattleOverlay
  eventOverlay!: EventOverlay
  shopOverlay!: ShopOverlay
  dialogueOverlay!: DialogueOverlay
  libraryOverlay!: LibraryOverlay
  private readonly playerState = new PlayerState()

  get hasKey(): boolean {
    return this.playerState.hasKey
  }

  set hasKey(value: boolean) {
    this.playerState.hasKey = value
  }

  get playerStats() {
    return this.playerState.stats
  }

  get playerWeapon(): WeaponDef | null {
    return this.playerState.weapon
  }

  set playerWeapon(value: WeaponDef | null) {
    this.playerState.weapon = value
  }

  get playerArmor(): ArmorDef | null {
    return this.playerState.armor
  }

  set playerArmor(value: ArmorDef | null) {
    this.playerState.armor = value
  }

  get weaponCharge(): number {
    return this.playerState.weaponCharge
  }

  set weaponCharge(value: number) {
    this.playerState.weaponCharge = Math.max(value, 0)
  }

  get coins(): number {
    return this.playerState.coins
  }

  set coins(value: number) {
    this.playerState.coins = Math.max(value, 0)
  }

  get weaponStash(): WeaponDef[] {
    return this.playerState.weaponStash
  }

  get armorStash(): ArmorDef[] {
    return this.playerState.armorStash
  }

  get inventory(): InventoryEntry[] {
    return this.playerState.inventory
  }

  get activeStatuses(): ActiveStatus[] {
    return this.playerState.activeStatuses
  }

  get knownSkills(): SkillDef[] {
    return this.playerState.knownSkills
  }

  get skillCooldowns(): Map<string, number> {
    return this.playerState.skillCooldowns
  }

  private appendActionMessages(lines: string[]) {
    const additions = lines.map(line => line.trim()).filter(line => line.length > 0)
    if (!additions.length) return
    const current = (this.lastActionMessage ?? '').trim()
    const merged = current.length ? current.split('\n').concat(additions) : additions
    this.lastActionMessage = merged.join('\n')
  }

  getStatusBonuses() {
    return this.playerState.getStatusBonuses()
  }

  init(data?: { floor?: number; reset?: boolean }) {
    if (data?.reset) this.resetPlayerState()
    this.floor = data?.floor ?? this.floor ?? 1
  }

  resetPlayerState() {
    this.playerState.reset()
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
    this.shopNodes.clear()
    this.itemDrops.clear()
    this.playerState.activeStatuses = []
    this.playerState.skillCooldowns.clear()

    spawnWeapons(this)
    spawnArmors(this)
    spawnItems(this)
    this.spawnShops()
    this.spawnEvents()
    this.spawnNpcs()
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
    this.dialogueOverlay = new DialogueOverlay(this)
    this.libraryOverlay = new LibraryOverlay(this)

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => handleInput(this, e.key))
    draw(this)

    this.add.text(
      this.sidebarPadding,
      sidebarHeight - 24,
      'WASD/Arrow keys move. Q/W/E use skills. L opens library. Legend: @ You  K Key  D Door  > Stairs  E Enemy  W Weapon  A Armor  S Shop  N NPC  ? Event.',
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
    if (this.libraryOverlay?.isActive) this.libraryOverlay.close()
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
    if (this.libraryOverlay?.isActive) this.libraryOverlay.close()
    if (this.eventOverlay?.isActive) return
    const key = makePosKey(pos.x, pos.y)
    const eventDef = this.eventNodes.get(key)
    if (!eventDef) return
    this.eventOverlay.open({ event: eventDef, pos })
  }



  private spawnNpcs() {
    const available = npcs.filter(npc => (npc.minFloor ?? 1) <= this.floor)
    if (!available.length) return
    const pool = [...available]
    const baseCount = Math.max(1, Math.floor(this.floor / 4) + 1)
    const spawnCount = Math.min(baseCount, 2, pool.length)
    for (let i = 0; i < spawnCount; i++) {
      const pick = this.grid.rng.int(0, pool.length - 1)
      const def = pool.splice(pick, 1)[0]
      const pos = this.grid.place('npc')
      this.npcNodes.set(makePosKey(pos.x, pos.y), def)
      if (!pool.length) pool.push(...available)
    }
  }

  startNpc(pos: Vec2) {
    if (this.dialogueOverlay?.isActive) return
    const key = makePosKey(pos.x, pos.y)
    const npcDef = this.npcNodes.get(key)
    if (!npcDef) return
    this.dialogueOverlay.open({ npc: npcDef, pos })
  }

  resolveNpcInteraction(payload: { npc: NpcDef; pos: Vec2 }) {
    const { npc, pos } = payload
    const key = makePosKey(pos.x, pos.y)
    this.npcNodes.delete(key)
    if (this.grid.tiles[pos.y][pos.x] === 'npc') {
      this.grid.tiles[pos.y][pos.x] = 'floor'
    }
    const lines: string[] = []
    if (npc.postMessage) lines.push(npc.postMessage)
    if (npc.outcome) {
      const outcomeMessage = this.applyEventOutcome(npc.outcome)
      lines.push(outcomeMessage)
    }
    if (!lines.length) {
      lines.push(`${npc.name} nods appreciatively.`)
    }
    this.appendActionMessages(lines)
    draw(this)
  }
  acquireWeapon(weapon: WeaponDef, options?: { silent?: boolean }): string[] {
    const result = this.playerState.acquireWeapon(weapon)
    const lines = [`Equipped weapon: ${weapon.name}`]
    if (result.replaced && result.replaced.id !== weapon.id) {
      lines.push(`Stored ${result.replaced.name} in the armory.`)
    }
    if (!options?.silent) {
      this.appendActionMessages(lines)
    }
    draw(this)
    return lines
  }

  acquireArmor(armor: ArmorDef, options?: { silent?: boolean }): string[] {
    const result = this.playerState.acquireArmor(armor)
    const lines = [`Equipped armor: ${armor.name}`]
    if (result.replaced && result.replaced.id !== armor.id) {
      lines.push(`Stored ${result.replaced.name} in the armory.`)
    }
    if (!options?.silent) {
      this.appendActionMessages(lines)
    }
    draw(this)
    return lines
  }

  equipWeaponFromLibrary(index: number): { success: boolean; message: string } {
    const before = this.playerWeapon
    const weapon = this.playerState.equipWeaponByIndex(index)
    if (!weapon) {
      const message = "No weapon available in that slot."
      this.appendActionMessages([message])
      draw(this)
      return { success: false, message }
    }
    const lines = [`Equipped weapon: ${weapon.name}`]
    if (before && before.id !== weapon.id) {
      lines.push(`Stored ${before.name} in the armory.`)
    }
    this.appendActionMessages(lines)
    draw(this)
    return { success: true, message: lines[0] }
  }

  equipArmorFromLibrary(index: number): { success: boolean; message: string } {
    const before = this.playerArmor
    const armor = this.playerState.equipArmorByIndex(index)
    if (!armor) {
      const message = "No armor available in that slot."
      this.appendActionMessages([message])
      draw(this)
      return { success: false, message }
    }
    const lines = [`Equipped armor: ${armor.name}`]
    if (before && before.id !== armor.id) {
      lines.push(`Stored ${before.name} in the armory.`)
    }
    this.appendActionMessages(lines)
    draw(this)
    return { success: true, message: lines[0] }
  }

  toggleLibrary(category?: LibraryCategory) {
    if (!this.libraryOverlay) return
    if (this.libraryOverlay.isActive) {
      this.libraryOverlay.close()
    } else {
      this.libraryOverlay.open({ category })
    }
  }

  addItemToInventory(item: ItemDef, quantity = 1, options?: { silent?: boolean }): string {
    const message = this.playerState.addItemToInventory(item, quantity)
    if (!options?.silent) {
      this.appendActionMessages([message])
    }
    return message
  }

  useInventorySlot(index: number): boolean {
    const item = this.playerState.consumeInventorySlot(index)
    if (!item) return false

    const outcomeMessage = this.applyEventOutcome(item.effect)
    this.appendActionMessages([`Used ${item.name}.`, outcomeMessage])
    const continueTurn = this.advanceTurn('item')
    if (continueTurn) {
      draw(this)
    }
    return true
  }
  useSkill(index: number): boolean {
    const skill = this.playerState.getSkillByIndex(index)
    if (!skill) return false
    const currentCooldown = this.playerState.getSkillCooldown(skill.id)
    if (currentCooldown > 0) {
      this.appendActionMessages([`${skill.name} is on cooldown (${currentCooldown} turns).`])
      draw(this)
      return true
    }

    const outcomeMessage = this.applyEventOutcome(skill.effect)
    this.appendActionMessages([`Skill used: ${skill.name}`, outcomeMessage])
    this.playerState.setSkillCooldown(skill.id, Math.max(skill.cooldown, 0))
    const continueTurn = this.advanceTurn('skill')
    if (continueTurn) {
      draw(this)
    }
    return true
  }
  applyEventOutcome(outcome: EventOutcome): string {
    const { message } = this.playerState.applyEventOutcome(outcome)
    this.lastActionMessage = message
    this.cameras.main.flash(90, 120, 220, 255)
    draw(this)
    return message
  }
  startBattle(enemyPos: Vec2) {
    if (this.libraryOverlay?.isActive) this.libraryOverlay.close()
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
    const statusTick = this.playerState.tickStatuses()
    const skillTick = this.playerState.tickSkillCooldowns()
    const messages = [...statusTick.messages, ...skillTick]
    if (messages.length) this.appendActionMessages(messages)
    if (statusTick.defeated) {
      this.handlePlayerDefeat()
      return false
    }
    return true
  }





  learnSkill(id: string, options?: { silent?: boolean }): string | null {
    return this.playerState.learnSkill(id, options)
  }
  getSkillCooldown(skillId: string): number {
    return this.playerState.getSkillCooldown(skillId)
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




























