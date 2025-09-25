import Phaser from 'phaser'
import { Grid } from '../core/Grid'
import type {
  ArmorDef,
  EventDef,
  EventOutcome,
  EnemyDef,
  Vec2,
  WeaponDef,
  ItemDef,
  ShopDef,
  NpcDef,
  SkillDef,
  Tile,
  WeaponAttributeId,
  WeaponAttributeChargeMap
} from '../core/Types'
import { PlayerState, type InventoryEntry, type ActiveStatus, type SerializedPlayerState } from '../game/player/PlayerState'
import { handleInput } from '../systems/input'
import { draw } from '../systems/render'
import { spawnWeapons, spawnArmors, spawnItems, makePosKey } from '../systems/spawning'
import { enemies } from '../content/enemies'
import { events, getEventDef } from '../content/events'
import { npcs, getNpcDef } from '../content/npcs'
import { getShopsForFloor, getShopDef } from '../content/shops'
import { items, getItemDef } from '../content/items'
import { weapons, getWeaponDef } from '../content/weapons'
import { armors, getArmorDef } from '../content/armors'
import { skills } from '../content/skills'
import { BattleOverlay, type BattleInitData } from './BattleOverlay'
import { EventOverlay, type EventResolution } from './EventOverlay'
import { ShopOverlay, type ShopResolution, type ShopInventoryEntry } from './ShopOverlay'
import { DialogueOverlay } from './DialogueOverlay'
import { LibraryOverlay, type LibraryCategory } from './LibraryOverlay'

type BranchEntranceState = {
  pos: Vec2
  branchKey: string | null
}

type FloorState = {
  grid: Grid
  weaponDrops: Map<string, WeaponDef>
  armorDrops: Map<string, ArmorDef>
  eventNodes: Map<string, EventDef>
  npcNodes: Map<string, NpcDef>
  shopNodes: Map<string, ShopDef>
  itemDrops: Map<string, ItemDef>
  lastActionMessage: string
  branchEntrances: Map<string, BranchEntranceState>
  branchReturnPos: Vec2 | null
}

export const SAVE_KEY = 'ascend-tower-save-v1'
const SAVE_VERSION = 2

type SerializedGridState = {
  w?: number
  h?: number
  tiles?: Tile[][]
  tileUnderPlayer?: Tile
  playerPos?: Vec2
  keyPos?: Vec2
  doorPos?: Vec2
  stairsUpPos?: Vec2
  stairsDownPos?: Vec2 | null
  enemyPos?: Vec2[]
  hasPlayer?: boolean
  rngState?: number
}

type SerializedFloorState = {
  floor: number
  branchPath?: number[]
  grid: SerializedGridState
  weaponDrops?: Array<[string, string]>
  armorDrops?: Array<[string, string]>
  itemDrops?: Array<[string, string]>
  eventNodes?: Array<[string, string]>
  npcNodes?: Array<[string, string]>
  shopNodes?: Array<[string, string]>
  lastActionMessage?: string
  branchEntrances?: Array<[
    string,
    {
      pos: Vec2
      branchKey?: string | null
    }
  ]>
  branchReturnPos?: Vec2 | null
}

type SerializedGameState = {
  version?: number
  timestamp?: number
  floor?: number
  branchPath?: number[]
  player?: SerializedPlayerState
  floorStates?: SerializedFloorState[]
  lastActionMessage?: string
  nextBranchIndex?: Array<[string, number]>
}

export function hasSavedGame(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return !!window.localStorage.getItem(SAVE_KEY)
  } catch {
    return false
  }
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene')
  }

  preload() {
    this.load.spritesheet('floor_wall', 'assets/floor_wall.png', { frameWidth: 16, frameHeight: 16 })
    this.load.spritesheet('symbol_tiles', 'assets/symbol_tiles.png', { frameWidth: 16, frameHeight: 16 })
  }

  grid!: Grid
  gfx!: Phaser.GameObjects.Graphics
  tileSprites = new Map<string, Phaser.GameObjects.Image>()
  tileIcons = new Map<string, Phaser.GameObjects.Image>()
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
  private jumpButtonEl?: HTMLButtonElement
  private testLootButtonEl?: HTMLButtonElement
  private readonly handleJumpButtonClick = () => {
    this.jumpToFloor(10)
  }
  private readonly handleTestLootButtonClick = () => {
    this.grantAllTestingRewards()
  }
  private readonly endingDialogueLines = [
    '你跨出塔門，卻聽見遠處傳來第一層的木門聲再度被推開。',
    '風裡有初來者的腳步，你把自己的名字，寫在門後那張微黃的符紙背面',
    '“若見此字，別怕黑。” ',
    '然後你把符紙輕輕一按，世界再次刷新。'
  ]
  private readonly lifespanEndingLines = [
    '當你再度停下腳步，才察覺丹田真火已成餘燼。',
    '漫長攀行換得滿身塵土，卻換不回流逝的歲月。',
    '壽命已盡，求仙之路在此畫下句點。'
  ]
  private endingTriggered = false
  private lifespanEndingTriggered = false
  private readonly floorStates = new Map<string, FloorState>()
  private branchPath: number[] = []
  private branchEntrances = new Map<string, BranchEntranceState>()
  private branchReturnPos: Vec2 | null = null
  private readonly nextBranchIndex = new Map<string, number>()
  private pendingEntry: 'up' | 'down' | 'branch' | 'return' | null = null
  private pendingReturnFromBranchKey: string | null = null
  private pendingStartMode: 'load' | null = null
  private readonly playerState = new PlayerState()

  private makeFloorKey(floor: number, branchPath: number[]): string {
    if (!branchPath.length) return `${Math.max(1, Math.floor(floor))}`
    const normalized = branchPath
      .map(value => Math.max(0, Math.floor(value)))
      .filter(value => Number.isFinite(value) && value > 0)
    const base = Math.max(1, Math.floor(floor))
    return normalized.length ? `${base}b${normalized.join('-')}` : `${base}`
  }

  private parseFloorKey(key: string): { floor: number; branchPath: number[] } {
    const [floorPart, branchPart] = key.split('b')
    const floor = Math.max(1, Number.parseInt(floorPart ?? '1', 10) || 1)
    if (!branchPart) return { floor, branchPath: [] }

    const branchPath = branchPart
      .split('-')
      .map(value => Math.max(0, Number.parseInt(value, 10) || 0))
      .filter(value => value > 0)
    return { floor, branchPath }
  }

  private getCurrentFloorKey(): string {
    return this.makeFloorKey(this.floor, this.branchPath)
  }

  get hasKey(): boolean {
    return this.playerState.hasKey
  }

  get isBranchFloor(): boolean {
    return this.branchPath.length > 0
  }

  get floorDisplayName(): string {
    if (!this.branchPath.length) {
      return `樓層 ${this.floor}`
    }
    return `樓層 ${this.floor} · 支線 ${this.branchPath.join('.')}`
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

  get weaponAttributeCharge(): number {
    return this.playerState.weaponAttributeCharge
  }

  set weaponAttributeCharge(value: number) {
    this.playerState.weaponAttributeCharge = value
  }

  get weaponAttributeCharges(): Map<WeaponAttributeId, number> {
    return this.playerState.getWeaponAttributeCharges()
  }

  set weaponAttributeCharges(value: Map<WeaponAttributeId, number> | WeaponAttributeChargeMap | null) {
    this.playerState.setWeaponAttributeCharges(value ?? null)
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

  get ageDisplay(): string {
    return this.playerState.getAgeDisplay()
  }

  get lifespanLimitDisplay(): string {
    return this.playerState.getAgeLimitDisplay()
  }

  get lifespanRemainingDisplay(): string {
    return this.playerState.getRemainingAgeDisplay()
  }

  get isLifespanEndingActive(): boolean {
    return this.lifespanEndingTriggered
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

  getArmorAttributeBonuses() {
    return this.playerState.getArmorAttributeBonuses()
  }

  init(
    data?: {
      floor?: number
      reset?: boolean
      entry?: 'up' | 'down' | 'branch' | 'return'
      branchPath?: number[]
      returnFromBranchKey?: string | null
      startMode?: 'load'
    }
  ) {
    if (data?.reset) this.resetPlayerState()
    this.floor = data?.floor ?? this.floor ?? 1
    this.pendingEntry = data?.entry ?? null
    this.pendingReturnFromBranchKey = data?.returnFromBranchKey ?? null
    this.pendingStartMode = data?.startMode === 'load' ? 'load' : null
    this.endingTriggered = false
    this.lifespanEndingTriggered = false

    if (Array.isArray(data?.branchPath)) {
      this.branchPath = data.branchPath
        .map(value => Math.max(0, Math.floor(Number(value))))
        .filter(value => value > 0)
    }
  }

  resetPlayerState() {
    this.playerState.reset()
    this.weaponDrops = new Map<string, WeaponDef>()
    this.armorDrops = new Map<string, ArmorDef>()
    this.eventNodes = new Map<string, EventDef>()
    this.npcNodes = new Map<string, NpcDef>()
    this.shopNodes = new Map<string, ShopDef>()
    this.itemDrops = new Map<string, ItemDef>()
    this.floorStates.clear()
    this.lastActionMessage = ''
    this.branchPath = []
    this.branchEntrances = new Map<string, BranchEntranceState>()
    this.branchReturnPos = null
    this.nextBranchIndex.clear()
    this.pendingEntry = null
    this.pendingReturnFromBranchKey = null
    this.pendingStartMode = null
    this.endingTriggered = false
    this.lifespanEndingTriggered = false
    this.syncFloorLastAction()
  }

  create() {
    this.gridOrigin = { x: this.sidebarWidth + this.sidebarPadding, y: 0 }

    this.playerState.activeStatuses = []
    this.playerState.skillCooldowns.clear()

    this.loadFloorState()

    this.resetTileSpriteCache()

    this.gfx = this.add.graphics()
    this.gfx.setDepth(0)

    this.events.once('shutdown', () => this.resetTileSpriteCache())
    this.events.once('destroy', () => this.resetTileSpriteCache())

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

    this.setupJumpButton()

    const shouldAutoLoad = this.pendingStartMode === 'load'
    this.pendingStartMode = null
    if (shouldAutoLoad) {
      this.loadGame({ silent: true })
    }

    if (this.playerState.hasReachedAgeLimit()) {
      this.triggerLifespanEnding()
    }
  }

  private resetTileSpriteCache() {
    this.tileSprites.forEach(sprite => sprite.destroy())
    this.tileSprites.clear()
    this.tileIcons.forEach(sprite => sprite.destroy())
    this.tileIcons.clear()
  }

  private setupJumpButton() {
    if (typeof document === 'undefined') return

    this.cleanupJumpButton()

    const jumpButton = document.createElement('button')
    jumpButton.type = 'button'
    jumpButton.textContent = this.floor === 10 ? '已抵達第10層' : '前往第10層'
    jumpButton.style.position = 'fixed'
    jumpButton.style.top = '16px'
    jumpButton.style.right = '24px'
    jumpButton.style.zIndex = '5000'
    jumpButton.style.padding = '8px 16px'
    jumpButton.style.background = this.floor === 10 ? '#2d3a3a' : '#275555'
    jumpButton.style.color = '#fdf7df'
    jumpButton.style.border = '1px solid #49b6a6'
    jumpButton.style.borderRadius = '6px'
    jumpButton.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.35)'
    jumpButton.style.fontSize = '14px'
    jumpButton.style.fontFamily = 'inherit'
    jumpButton.style.cursor = this.floor === 10 ? 'default' : 'pointer'

    if (this.floor !== 10) {
      jumpButton.addEventListener('click', this.handleJumpButtonClick)
    } else {
      jumpButton.disabled = true
      jumpButton.style.opacity = '0.65'
    }

    document.body.appendChild(jumpButton)
    this.jumpButtonEl = jumpButton

    const lootButton = document.createElement('button')
    lootButton.type = 'button'
    lootButton.textContent = '測試：取得全資源'
    lootButton.style.position = 'fixed'
    lootButton.style.top = '56px'
    lootButton.style.right = '24px'
    lootButton.style.zIndex = '5000'
    lootButton.style.padding = '8px 16px'
    lootButton.style.background = '#3d274f'
    lootButton.style.color = '#fdf7df'
    lootButton.style.border = '1px solid #704b9e'
    lootButton.style.borderRadius = '6px'
    lootButton.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.35)'
    lootButton.style.fontSize = '14px'
    lootButton.style.fontFamily = 'inherit'
    lootButton.style.cursor = 'pointer'

    lootButton.addEventListener('click', this.handleTestLootButtonClick)
    document.body.appendChild(lootButton)
    this.testLootButtonEl = lootButton

    this.events.once('shutdown', () => this.cleanupJumpButton())
    this.events.once('destroy', () => this.cleanupJumpButton())
  }

  private cleanupJumpButton() {
    const jumpButton = this.jumpButtonEl
    if (jumpButton) {
      jumpButton.removeEventListener('click', this.handleJumpButtonClick)
      jumpButton.remove()
      this.jumpButtonEl = undefined
    }

    const lootButton = this.testLootButtonEl
    if (lootButton) {
      lootButton.removeEventListener('click', this.handleTestLootButtonClick)
      lootButton.remove()
      this.testLootButtonEl = undefined
    }
  }

  private grantAllTestingRewards() {
    const messages: string[] = []

    const ownedWeaponIds = new Set<string>()
    if (this.playerState.weapon?.id) ownedWeaponIds.add(this.playerState.weapon.id)
    for (const weapon of this.playerState.weaponStash) {
      ownedWeaponIds.add(weapon.id)
    }
    for (const weapon of weapons) {
      if (weapon.id === 'bare-hands') continue
      if (ownedWeaponIds.has(weapon.id)) continue
      this.playerState.weaponStash.push(weapon)
      ownedWeaponIds.add(weapon.id)
      messages.push(`獲得武器：${weapon.name}`)
    }

    const ownedArmorIds = new Set<string>()
    if (this.playerState.armor?.id) ownedArmorIds.add(this.playerState.armor.id)
    for (const armor of this.playerState.armorStash) {
      ownedArmorIds.add(armor.id)
    }
    for (const armor of armors) {
      if (ownedArmorIds.has(armor.id)) continue
      this.playerState.armorStash.push(armor)
      ownedArmorIds.add(armor.id)
      messages.push(`獲得防具：${armor.name}`)
    }

    const inventoryIds = new Set(this.playerState.inventory.map(entry => entry.def.id))
    for (const item of items) {
      if (inventoryIds.has(item.id)) continue
      const quantity = item.stackable ? 3 : 1
      const message = this.playerState.addItemToInventory(item, quantity)
      if (message) messages.push(message)
      inventoryIds.add(item.id)
    }

    for (const skill of skills) {
      const alreadyKnown = this.playerState.knownSkills.some(entry => entry.id === skill.id)
      if (alreadyKnown) continue
      const message = this.playerState.learnSkill(skill.id)
      if (message) messages.push(message)
    }

    if (!messages.length) {
      messages.push('測試：所有資源已經擁有。')
    } else {
      messages.unshift('測試：已取得所有武器、防具、道具與技能。')
    }

    this.appendActionMessages(messages)
    this.syncFloorLastAction()
    draw(this)
  }


  private ensureEndingTile() {
    if (this.floor !== 10 || this.isBranchFloor) {
        return
    }

    const existing = this.findEndingTilePos()
    if (existing) {
      return
    }

    this.grid.place('ending')
  }

  private findEndingTilePos(): Vec2 | null {
    if (!this.grid?.tiles) return null

    for (let y = 0; y < this.grid.tiles.length; y++) {
      const row = this.grid.tiles[y]
      for (let x = 0; x < row.length; x++) {
        if (row[x] === 'ending') {
          return { x, y }
        }
      }
    }

    return null
  }

  private loadFloorState() {
    const key = this.getCurrentFloorKey()
    const cached = this.floorStates.get(key)
    if (cached) {
      this.grid = cached.grid
      this.weaponDrops = cached.weaponDrops
      this.armorDrops = cached.armorDrops
      this.eventNodes = cached.eventNodes
      this.npcNodes = cached.npcNodes
      this.shopNodes = cached.shopNodes
      this.itemDrops = cached.itemDrops
      this.lastActionMessage = cached.lastActionMessage
      this.branchEntrances = cached.branchEntrances
      this.branchReturnPos = cached.branchReturnPos
      this.syncFloorLastAction()
      this.positionPlayerForEntry()
      return
    }

    const seed = (Date.now() ^ (this.floor << 8)) & 0xffff
    const includeDownstairs = this.isBranchFloor || this.floor > 1
    this.grid = new Grid(14, 14, seed, { includeDownstairs })
    this.weaponDrops = new Map<string, WeaponDef>()
    this.armorDrops = new Map<string, ArmorDef>()
    this.eventNodes = new Map<string, EventDef>()
    this.npcNodes = new Map<string, NpcDef>()
    this.shopNodes = new Map<string, ShopDef>()
    this.itemDrops = new Map<string, ItemDef>()
    this.lastActionMessage = ''
    this.branchEntrances = new Map<string, BranchEntranceState>()
    this.branchReturnPos = this.isBranchFloor
      ? this.grid.stairsDownPos
        ? { x: this.grid.stairsDownPos.x, y: this.grid.stairsDownPos.y }
        : { x: this.grid.playerPos.x, y: this.grid.playerPos.y }
      : null

    spawnWeapons(this)
    spawnArmors(this)
    spawnItems(this)
    this.spawnShops()
    this.spawnEvents()
    this.spawnNpcs()
    this.ensureEndingTile()
    this.spawnBranchEntrances()
    if (!this.knownSkills.length) this.learnSkill('battle-shout', { silent: true })

    const state: FloorState = {
      grid: this.grid,
      weaponDrops: this.weaponDrops,
      armorDrops: this.armorDrops,
      eventNodes: this.eventNodes,
      npcNodes: this.npcNodes,
      shopNodes: this.shopNodes,
      itemDrops: this.itemDrops,
      lastActionMessage: this.lastActionMessage,
      branchEntrances: this.branchEntrances,
      branchReturnPos: this.branchReturnPos
    }
    this.floorStates.set(key, state)
    this.positionPlayerForEntry()
  }

  private positionPlayerForEntry() {
    const entry = this.pendingEntry
    this.pendingEntry = null

    if (!entry) {
      if (!this.grid.hasActivePlayer()) {
        const fallback = this.grid.stairsDownPos ?? this.grid.stairsUpPos ?? this.grid.playerPos
        const underlying =
          fallback === this.grid.stairsDownPos ? 'stairs_down'
            : fallback === this.grid.stairsUpPos ? 'stairs_up'
            : this.grid.getTile(fallback)
        this.grid.setPlayerPosition(fallback, underlying)
      }
      return
    }

    if (entry === 'branch') {
      const pos =
        this.branchReturnPos ??
        (this.grid.stairsDownPos ? { x: this.grid.stairsDownPos.x, y: this.grid.stairsDownPos.y } : this.grid.playerPos)
      const underlying = this.grid.stairsDownPos ? 'stairs_down' : this.grid.getTile(pos)
      this.branchReturnPos = { x: pos.x, y: pos.y }
      const state = this.floorStates.get(this.getCurrentFloorKey())
      if (state) state.branchReturnPos = this.branchReturnPos
      this.grid.setPlayerPosition(this.branchReturnPos, underlying)
      this.pendingReturnFromBranchKey = null
      return
    }

    if (entry === 'return') {
      const fromKey = this.pendingReturnFromBranchKey
      this.pendingReturnFromBranchKey = null

      let targetPos: Vec2 | null = null
      if (fromKey) {
        for (const entrance of this.branchEntrances.values()) {
          if (entrance.branchKey === fromKey) {
            targetPos = { x: entrance.pos.x, y: entrance.pos.y }
            break
          }
        }
      }

      const pos = targetPos ?? (this.grid.stairsUpPos ? { x: this.grid.stairsUpPos.x, y: this.grid.stairsUpPos.y } : this.grid.playerPos)
      const underlying = this.grid.getTile(pos)
      this.grid.setPlayerPosition(pos, underlying)
      return
    }

    if (entry === 'down' && this.grid.stairsDownPos) {
      this.grid.setPlayerPosition(this.grid.stairsDownPos, 'stairs_down')
      return
    }

    if (entry === 'up') {
      const pos = this.grid.stairsUpPos ?? this.grid.playerPos
      const underlying = this.grid.stairsUpPos ? 'stairs_up' : this.grid.getTile(pos)
      this.grid.setPlayerPosition(pos, underlying)
    }
  }

  private jumpToFloor(targetFloor: number) {
    if (!Number.isFinite(targetFloor)) return

    const clamped = Math.max(1, Math.floor(targetFloor))
    if (clamped === this.floor) return

    if (
      this.battleOverlay?.isActive ||
      this.eventOverlay?.isActive ||
      this.shopOverlay?.isActive ||
      this.dialogueOverlay?.isActive ||
      this.libraryOverlay?.isActive
    ) {
      return
    }

    const canProceed = this.advanceTurn('move')
    if (!canProceed) return

    const state = this.floorStates.get(this.getCurrentFloorKey())
    if (state) state.lastActionMessage = this.lastActionMessage

    const direction = clamped > this.floor ? 'up' : 'down'
    const underlying = direction === 'up' ? 'stairs_up' : 'stairs_down'
    this.grid.setTileUnderPlayer(underlying)
    this.grid.detachPlayer()

    const entry = direction === 'up' ? 'down' : 'up'
    this.scene.restart({ floor: clamped, entry, branchPath: [] })
  }

  private startEndingSequence(pos: Vec2) {
    if (this.endingTriggered) return
    if (this.dialogueOverlay?.isActive) return

    this.endingTriggered = true

    if (this.grid.tiles[pos.y] && this.grid.tiles[pos.y][pos.x] === 'ending') {
      this.grid.tiles[pos.y][pos.x] = 'floor'
    }
    if (this.grid.playerPos.x === pos.x && this.grid.playerPos.y === pos.y) {
      this.grid.setTileUnderPlayer('floor')
    }

    draw(this)

    const finaleNpc: NpcDef = {
      id: 'ending',
      name: '塔頂旅者',
      lines: [...this.endingDialogueLines]
    }

    this.dialogueOverlay.open({ npc: finaleNpc, pos })
  }

  private handleEndingCompletion() {
    this.time.delayedCall(240, () => {
      this.scene.start('TitleScene')
    })
  }

  transitionFloor(direction: 'up' | 'down' | 'branch' | 'return') {
    const canProceed = this.advanceTurn('move')
    if (!canProceed) return

    const state = this.floorStates.get(this.getCurrentFloorKey())
    if (state) state.lastActionMessage = this.lastActionMessage

    if (direction === 'branch') {
      if (this.isBranchFloor) {
        draw(this)
        return
      }
      const posKey = makePosKey(this.grid.playerPos.x, this.grid.playerPos.y)
      const entrance = this.branchEntrances.get(posKey)
      if (!entrance) {
        draw(this)
        return
      }

      let branchKey = entrance.branchKey
      let branchPath: number[]
      if (!branchKey) {
        const parentKey = this.getCurrentFloorKey()
        const nextIndex = (this.nextBranchIndex.get(parentKey) ?? 0) + 1
        this.nextBranchIndex.set(parentKey, nextIndex)
        branchPath = [...this.branchPath, nextIndex]
        branchKey = this.makeFloorKey(this.floor, branchPath)
        entrance.branchKey = branchKey
        this.branchEntrances.set(posKey, entrance)
      } else {
        const parsed = this.parseFloorKey(branchKey)
        branchPath = parsed.branchPath
      }

      this.grid.setTileUnderPlayer('stairs_branch')
      this.grid.detachPlayer()
      this.scene.restart({ floor: this.floor, entry: 'branch', branchPath })
      return
    }

    if (direction === 'return') {
      if (!this.branchPath.length) {
        draw(this)
        return
      }
      const branchKey = this.getCurrentFloorKey()
      this.grid.setTileUnderPlayer('stairs_down')
      this.grid.detachPlayer()

      const parentPath = this.branchPath.slice(0, -1)
      this.scene.restart({ floor: this.floor, entry: 'return', branchPath: parentPath, returnFromBranchKey: branchKey })
      return
    }

    const underlying = direction === 'up' ? 'stairs_up' : 'stairs_down'
    this.grid.setTileUnderPlayer(underlying)
    this.grid.detachPlayer()

    const targetFloor = direction === 'up' ? this.floor + 1 : Math.max(1, this.floor - 1)
    if (targetFloor === this.floor) {
      draw(this)
      return
    }

    const entry = direction === 'up' ? 'down' : 'up'
    this.scene.restart({ floor: targetFloor, entry, branchPath: [] })
  }

  syncFloorLastAction() {
    const state = this.floorStates.get(this.getCurrentFloorKey())
    if (state) state.lastActionMessage = this.lastActionMessage
  }
  private snapshotGrid(grid: Grid): SerializedGridState {
    return {
      w: grid.w,
      h: grid.h,
      tiles: grid.tiles.map(row => [...row]) as Tile[][],
      tileUnderPlayer: grid.getTileUnderPlayer(),
      playerPos: { x: grid.playerPos.x, y: grid.playerPos.y },
      keyPos: { x: grid.keyPos.x, y: grid.keyPos.y },
      doorPos: { x: grid.doorPos.x, y: grid.doorPos.y },
      stairsUpPos: { x: grid.stairsUpPos.x, y: grid.stairsUpPos.y },
      stairsDownPos: grid.stairsDownPos ? { x: grid.stairsDownPos.x, y: grid.stairsDownPos.y } : null,
      enemyPos: grid.enemyPos.map(pos => ({ x: pos.x, y: pos.y })),
      rngState: grid.rng.getState(),
      hasPlayer: grid.hasActivePlayer()
    }
  }

  private rebuildGrid(data: SerializedGridState): Grid | null {
    if (!data || !Array.isArray(data.tiles) || !data.tiles.length) return null
    const tiles = data.tiles.map(row => [...row]) as Tile[][]
    const h = tiles.length
    const w = tiles[0]?.length ?? 0
    if (w <= 0 || h <= 0) return null

    const grid = new Grid(w, h, 0)
    grid.detachPlayer()
    grid.tiles = tiles
    grid.w = w
    grid.h = h

    if (data.keyPos) grid.keyPos = { x: data.keyPos.x, y: data.keyPos.y }
    if (data.doorPos) grid.doorPos = { x: data.doorPos.x, y: data.doorPos.y }
    if (data.stairsUpPos) grid.stairsUpPos = { x: data.stairsUpPos.x, y: data.stairsUpPos.y }
    grid.stairsDownPos = data.stairsDownPos ? { x: data.stairsDownPos.x, y: data.stairsDownPos.y } : null

    const playerPos = data.playerPos ?? grid.playerPos
    const tileUnder = (data.tileUnderPlayer ?? grid.getTileUnderPlayer()) as Tile

    if (tiles[playerPos.y] && tiles[playerPos.y].length > playerPos.x) {
      tiles[playerPos.y][playerPos.x] = tileUnder
    }

    grid.setPlayerPosition({ x: playerPos.x, y: playerPos.y }, tileUnder)

    grid.enemyPos = Array.isArray(data.enemyPos)
      ? data.enemyPos.map(pos => ({ x: pos.x, y: pos.y }))
      : []

    if (typeof data.rngState === 'number') {
      grid.rng.setState(data.rngState)
    }

    return grid
  }

  private snapshotFloorState(floorKey: string, state: FloorState): SerializedFloorState {
    const { floor, branchPath } = this.parseFloorKey(floorKey)
    return {
      floor,
      branchPath,
      grid: this.snapshotGrid(state.grid),
      weaponDrops: Array.from(state.weaponDrops.entries()).map(([pos, weapon]) => [pos, weapon.id]),
      armorDrops: Array.from(state.armorDrops.entries()).map(([pos, armor]) => [pos, armor.id]),
      itemDrops: Array.from(state.itemDrops.entries()).map(([pos, item]) => [pos, item.id]),
      eventNodes: Array.from(state.eventNodes.entries()).map(([pos, event]) => [pos, event.id]),
      npcNodes: Array.from(state.npcNodes.entries()).map(([pos, npc]) => [pos, npc.id]),
      shopNodes: Array.from(state.shopNodes.entries()).map(([pos, shop]) => [pos, shop.id]),
      lastActionMessage: state.lastActionMessage,
      branchEntrances: Array.from(state.branchEntrances.entries()).map(([posKey, info]) => [
        posKey,
        {
          pos: { x: info.pos.x, y: info.pos.y },
          branchKey: info.branchKey ?? null
        }
      ]),
      branchReturnPos: state.branchReturnPos ? { x: state.branchReturnPos.x, y: state.branchReturnPos.y } : null
    }
  }

  private rebuildFloorState(data: SerializedFloorState): FloorState | null {
    const grid = this.rebuildGrid(data.grid)
    if (!grid) return null

    const weaponDrops = new Map<string, WeaponDef>()
    for (const [pos, id] of data.weaponDrops ?? []) {
      const def = getWeaponDef(id)
      if (def) weaponDrops.set(pos, def)
    }

    const armorDrops = new Map<string, ArmorDef>()
    for (const [pos, id] of data.armorDrops ?? []) {
      const def = getArmorDef(id)
      if (def) armorDrops.set(pos, def)
    }

    const itemDrops = new Map<string, ItemDef>()
    for (const [pos, id] of data.itemDrops ?? []) {
      const def = getItemDef(id)
      if (def) itemDrops.set(pos, def)
    }

    const eventNodes = new Map<string, EventDef>()
    for (const [pos, id] of data.eventNodes ?? []) {
      const def = getEventDef(id)
      if (def) eventNodes.set(pos, def)
    }

    const npcNodes = new Map<string, NpcDef>()
    for (const [pos, id] of data.npcNodes ?? []) {
      const def = getNpcDef(id)
      if (def) npcNodes.set(pos, def)
    }

    const shopNodes = new Map<string, ShopDef>()
    for (const [pos, id] of data.shopNodes ?? []) {
      const def = getShopDef(id)
      if (def) shopNodes.set(pos, def)
    }

    const branchEntrances = new Map<string, BranchEntranceState>()
    for (const [posKey, info] of data.branchEntrances ?? []) {
      if (!info?.pos) continue
      const pos = { x: info.pos.x, y: info.pos.y }
      branchEntrances.set(posKey, { pos, branchKey: info.branchKey ?? null })
    }

    const branchReturnPos = data.branchReturnPos
      ? { x: data.branchReturnPos.x, y: data.branchReturnPos.y }
      : null

    return {
      grid,
      weaponDrops,
      armorDrops,
      eventNodes,
      npcNodes,
      shopNodes,
      itemDrops,
      lastActionMessage: data.lastActionMessage ?? '',
      branchEntrances,
      branchReturnPos
    }
  }

  private serializeGameState(): SerializedGameState {
    this.syncFloorLastAction()
    const floorStates = Array.from(this.floorStates.entries()).map(([floorKey, state]) =>
      this.snapshotFloorState(floorKey, state)
    )
    return {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      floor: this.floor,
      branchPath: [...this.branchPath],
      player: this.playerState.serialize(),
      floorStates,
      lastActionMessage: this.lastActionMessage,
      nextBranchIndex: Array.from(this.nextBranchIndex.entries())
    }
  }

  private applySerializedGameState(data: SerializedGameState): boolean {
    if (!data || typeof data !== 'object') return false
    if (typeof data.version === 'number' && data.version > SAVE_VERSION) return false

    const floorStates = new Map<string, FloorState>()
    for (const entry of data.floorStates ?? []) {
      const restored = this.rebuildFloorState(entry)
      if (!restored) continue
      const key = this.makeFloorKey(entry.floor ?? 1, entry.branchPath ?? [])
      floorStates.set(key, restored)
    }

    if (!floorStates.size) return false

    this.floorStates.clear()
    for (const [key, state] of floorStates.entries()) {
      this.floorStates.set(key, state)
    }

    let targetKey: string | null = null
    if (typeof data.floor === 'number') {
      const branchPath = Array.isArray(data.branchPath)
        ? data.branchPath.map(value => Math.max(0, Math.floor(Number(value)))).filter(value => value > 0)
        : []
      const candidate = this.makeFloorKey(data.floor, branchPath)
      if (this.floorStates.has(candidate)) {
        targetKey = candidate
      }
    }

    if (!targetKey) {
      const first = this.floorStates.keys().next()
      if (!first.done) {
        targetKey = first.value
      }
    }

    if (!targetKey) return false

    const targetMeta = this.parseFloorKey(targetKey)
    this.floor = targetMeta.floor
    this.branchPath = targetMeta.branchPath

    const active = this.floorStates.get(targetKey)
    if (!active) return false

    this.grid = active.grid
    this.weaponDrops = active.weaponDrops
    this.armorDrops = active.armorDrops
    this.eventNodes = active.eventNodes
    this.npcNodes = active.npcNodes
    this.shopNodes = active.shopNodes
    this.itemDrops = active.itemDrops
    this.lastActionMessage = active.lastActionMessage ?? ''
    this.branchEntrances = active.branchEntrances
    this.branchReturnPos = active.branchReturnPos
    this.pendingEntry = null
    this.pendingReturnFromBranchKey = null

    if (data.player) {
      this.playerState.restore(data.player)
    } else {
      this.playerState.reset()
    }

    this.nextBranchIndex.clear()
    if (Array.isArray(data.nextBranchIndex)) {
      for (const [key, value] of data.nextBranchIndex) {
        if (typeof key === 'string' && Number.isFinite(value)) {
          this.nextBranchIndex.set(key, Math.max(0, Math.floor(value)))
        }
      }
    }

    for (const [key, state] of this.floorStates.entries()) {
      const keyMeta = this.parseFloorKey(key)
      let maxIndex = this.nextBranchIndex.get(key) ?? 0
      for (const info of state.branchEntrances.values()) {
        if (!info.branchKey) continue
        const parsed = this.parseFloorKey(info.branchKey)
        if (parsed.floor !== keyMeta.floor) continue
        const last = parsed.branchPath[parsed.branchPath.length - 1] ?? 0
        if (last > maxIndex) maxIndex = last
      }
      this.nextBranchIndex.set(key, maxIndex)
    }

    this.syncFloorLastAction()
    return true
  }

  saveGame() {
    const storage = this.getSaveStorage()
    if (!storage) {
      this.appendActionMessages(['無法存取本機儲存空間，無法保存進度。'])
      this.syncFloorLastAction()
      draw(this)
      return
    }

    try {
      const payload = this.serializeGameState()
      storage.setItem(SAVE_KEY, JSON.stringify(payload))
      this.appendActionMessages(['進度已儲存。'])
      this.syncFloorLastAction()
    } catch (error) {
      console.error('[AscendTower] 儲存失敗', error)
      this.appendActionMessages(['儲存進度失敗。'])
      this.syncFloorLastAction()
    }
    draw(this)
  }

  loadGame(options?: { silent?: boolean }): boolean {
    const storage = this.getSaveStorage()
    if (!storage) {
      this.appendActionMessages(['無法存取本機儲存空間，無法讀取進度。'])
      this.syncFloorLastAction()
      draw(this)
      return false
    }

    const raw = storage.getItem(SAVE_KEY)
    if (!raw) {
      this.appendActionMessages(['找不到存檔。'])
      this.syncFloorLastAction()
      draw(this)
      return false
    }

    try {
      const payload = JSON.parse(raw) as SerializedGameState
      if (!this.applySerializedGameState(payload)) {
        this.appendActionMessages(['存檔版本不相容。'])
        this.syncFloorLastAction()
        draw(this)
        return false
      }

      this.closeAllOverlays()
      if (!options?.silent) {
        this.appendActionMessages(['進度已讀取。'])
        this.syncFloorLastAction()
      }
      draw(this)
      if (this.playerState.hasReachedAgeLimit()) {
        this.triggerLifespanEnding()
      }
      return true
    } catch (error) {
      console.error('[AscendTower] 讀檔失敗', error)
      this.appendActionMessages(['讀取存檔失敗。'])
      this.syncFloorLastAction()
      draw(this)
      return false
    }
  }

  private closeAllOverlays() {
    this.battleOverlay?.close()
    this.eventOverlay?.close()
    this.shopOverlay?.close()
    this.dialogueOverlay?.close()
    if (this.libraryOverlay?.isActive) {
      this.libraryOverlay.close()
    }
  }

  private getSaveStorage(): Storage | null {
    if (typeof window === 'undefined') return null
    try {
      return window.localStorage
    } catch {
      return null
    }
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

  private spawnBranchEntrances() {
    if (this.isBranchFloor) {
      return
    }

    this.branchEntrances.clear()
    if (this.floor <= 1) {
      return
    }

    const spawnChance = Math.min(0.25 + this.floor * 0.05, 0.85)
    if (this.grid.rng.next() > spawnChance) {
      return
    }

    const spawnCount = Math.min(1 + Math.floor(this.floor / 5), 2)
    for (let i = 0; i < spawnCount; i++) {
      const pos = this.grid.place('stairs_branch')
      const posKey = makePosKey(pos.x, pos.y)
      this.branchEntrances.set(posKey, { pos, branchKey: null })
      this.grid.connectTiles(this.grid.playerPos, pos)
    }
  }

  tryEnterDoorBranch(): boolean {
    if (this.isBranchFloor) {
      return false
    }

    const pos = { x: this.grid.playerPos.x, y: this.grid.playerPos.y }
    const posKey = makePosKey(pos.x, pos.y)
    if (!this.branchEntrances.has(posKey)) {
      this.branchEntrances.set(posKey, { pos, branchKey: null })
    }

    return true
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
      this.appendActionMessages(['商人已無可販售的物品。'])
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

  triggerEndingTile(pos: Vec2) {
    this.startEndingSequence(pos)
  }

  resolveNpcInteraction(payload: { npc: NpcDef; pos: Vec2 }) {
    const { npc, pos } = payload
    if (npc.id === 'ending') {
      this.handleEndingCompletion()
      return
    }
    if (npc.id === 'lifespan-ending') {
      this.handleLifespanEndingCompletion()
      return
    }

    const key = makePosKey(pos.x, pos.y)
    this.npcNodes.delete(key)
    if (this.grid.tiles[pos.y][pos.x] === 'npc') {
      this.grid.tiles[pos.y][pos.x] = 'floor'
    }
    if (this.grid.playerPos.x === pos.x && this.grid.playerPos.y === pos.y) {
      this.grid.setTileUnderPlayer('floor')
    }
    const lines: string[] = []
    if (npc.postMessage) lines.push(npc.postMessage)
    if (npc.outcome) {
      const outcomeMessage = this.applyEventOutcome(npc.outcome)
      lines.push(outcomeMessage)
    }
    if (!lines.length) {
      lines.push(`${npc.name} 感激地點點頭。`)
    }
    this.appendActionMessages(lines)
    this.syncFloorLastAction()
    draw(this)
  }
  acquireWeapon(weapon: WeaponDef, options?: { silent?: boolean }): string[] {
    const result = this.playerState.acquireWeapon(weapon)
    const lines = [`已裝備武器：${weapon.name}`]
    if (result.replaced && result.replaced.id !== weapon.id) {
      lines.push(`已將 ${result.replaced.name} 收入武庫。`)
    }
    if (!options?.silent) {
      this.appendActionMessages(lines)
    }
    draw(this)
    return lines
  }

  acquireArmor(armor: ArmorDef, options?: { silent?: boolean }): string[] {
    const result = this.playerState.acquireArmor(armor)
    const lines = [`已裝備防具：${armor.name}`]
    if (result.replaced && result.replaced.id !== armor.id) {
      lines.push(`已將 ${result.replaced.name} 收入武庫。`)
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
      const message = "該欄位沒有可用武器。"
      this.appendActionMessages([message])
      draw(this)
      return { success: false, message }
    }
    const lines = [`已裝備武器：${weapon.name}`]
    if (before && before.id !== weapon.id) {
      lines.push(`已將 ${before.name} 收入武庫。`)
    }
    this.appendActionMessages(lines)
    this.syncFloorLastAction()
    draw(this)
    return { success: true, message: lines[0] }
  }

  equipArmorFromLibrary(index: number): { success: boolean; message: string } {
    const before = this.playerArmor
    const armor = this.playerState.equipArmorByIndex(index)
    if (!armor) {
      const message = "該欄位沒有可用防具。"
      this.appendActionMessages([message])
      draw(this)
      return { success: false, message }
    }
    const lines = [`已裝備防具：${armor.name}`]
    if (before && before.id !== armor.id) {
      lines.push(`已將 ${before.name} 收入武庫。`)
    }
    this.appendActionMessages(lines)
    this.syncFloorLastAction()
    draw(this)
    return { success: true, message: lines[0] }
  }
  reorderSkill(index: number, delta: number): boolean {
    const moved = this.playerState.reorderSkill(index, delta)
    if (moved) {
      draw(this)
    }
    return moved
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
    this.appendActionMessages([`使用了 ${item.name}。`, outcomeMessage])
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
      this.appendActionMessages([`${skill.name} 正在冷卻（剩餘 ${currentCooldown} 回合）。`])
      draw(this)
      return true
    }

    const outcomeMessage = this.applyEventOutcome(skill.effect)
    this.appendActionMessages([`已施放技能：${skill.name}`, outcomeMessage])
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
    this.syncFloorLastAction()
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
        weaponAttributeCharges: Array.from(this.weaponAttributeCharges.entries())
      }
    }

    this.battleOverlay.open(payload)
  }

  getEnemyAt(pos: Vec2) {
    const exists = this.grid.enemyPos.some(p => p.x === pos.x && p.y === pos.y)
    if (!exists) return null
    const pool = enemies.filter(enemy => (enemy.minFloor ?? 1) <= this.floor)
    const selection = pool.length ? pool : enemies
    const index = this.grid.rng.int(0, selection.length - 1)
    return selection[index]
  }

  finishBattle(outcome: {
    enemy: EnemyDef
    enemyPos: Vec2
    remainingHp: number
    weaponAttributeCharges: Array<[WeaponAttributeId, number]> | Map<WeaponAttributeId, number> | WeaponAttributeChargeMap | null
  }) {
    const { enemy, enemyPos, remainingHp, weaponAttributeCharges } = outcome
    this.playerStats.hp = Math.max(Math.floor(remainingHp), 0)

    let normalizedCharges: Map<WeaponAttributeId, number> | WeaponAttributeChargeMap | null = null
    if (weaponAttributeCharges instanceof Map) {
      normalizedCharges = weaponAttributeCharges
    } else if (Array.isArray(weaponAttributeCharges)) {
      const sanitized = weaponAttributeCharges.map(([id, value]) => [
        id,
        Math.max(0, Math.floor(value ?? 0))
      ]) as Array<[WeaponAttributeId, number]>
      normalizedCharges = new Map<WeaponAttributeId, number>(sanitized)
    } else if (weaponAttributeCharges) {
      normalizedCharges = weaponAttributeCharges
    }
    this.weaponAttributeCharges = normalizedCharges

    this.grid.movePlayer(enemyPos)
    this.grid.enemyPos = this.grid.enemyPos.filter(p => p.x !== enemyPos.x || p.y !== enemyPos.y)
    this.grid.setTileUnderPlayer('floor')

    const rewardMessages: string[] = []
    const drop = enemy.coinDrop
    if (drop) {
      const min = Math.max(0, Math.floor(drop.min))
      const max = Math.max(min, Math.floor(drop.max))
      const coins = this.grid.rng.int(min, max)
      if (coins > 0) {
        const before = this.coins
        this.coins = before + coins
        rewardMessages.push('擊敗 ' + enemy.name + '，獲得 ' + coins + ' 金幣。')
        rewardMessages.push('金幣：' + before + ' -> ' + this.coins)
      }
    }

    this.cameras.main.flash(120, 80, 200, 255)

    if (rewardMessages.length) {
      this.appendActionMessages(rewardMessages)
      this.syncFloorLastAction()
    }

    draw(this)
  }

  cancelBattle() {
    draw(this)
  }

  purchaseFromShop(entry: ShopInventoryEntry): { success: boolean; message: string; coins: number } {
    const cost = Math.max(entry.offer.price, 0)
    if (this.coins < cost) {
      const message = `金幣不足。需要 ${cost}，目前只有 ${this.coins}。`
      this.appendActionMessages([message])
      draw(this)
      return { success: false, message, coins: this.coins }
    }

    const before = this.coins
    this.coins = Math.max(this.coins - cost, 0)
    const amount = Math.max(entry.offer.quantity ?? 1, 1)
    const gainMessage = this.addItemToInventory(entry.item, amount, { silent: true })
    const summary = `花費 ${cost} 金幣購得 ${entry.item.name}${amount > 1 ? ` x${amount}` : ''}。`
    const details = `金幣：${before} -> ${this.coins}`
    this.appendActionMessages([summary, gainMessage, details])
    draw(this)
    return { success: true, message: `${summary}
${gainMessage}
${details}`, coins: this.coins }
  }

  completeEvent(pos: Vec2, _resolution: EventResolution) {
    const key = makePosKey(pos.x, pos.y)
    this.eventNodes.delete(key)

    if (this.grid.tiles[pos.y][pos.x] === 'event') {
      this.grid.tiles[pos.y][pos.x] = 'floor'
    }
    if (this.grid.playerPos.x === pos.x && this.grid.playerPos.y === pos.y) {
      this.grid.setTileUnderPlayer('floor')
    }

    draw(this)
  }

  completeShop(pos: Vec2, _resolution: ShopResolution) {
    const key = makePosKey(pos.x, pos.y)
    this.shopNodes.delete(key)

    if (this.grid.tiles[pos.y][pos.x] === 'shop') {
      this.grid.tiles[pos.y][pos.x] = 'floor'
    }
    if (this.grid.playerPos.x === pos.x && this.grid.playerPos.y === pos.y) {
      this.grid.setTileUnderPlayer('floor')
    }

    draw(this)
  }

  advanceTurn(reason: 'move' | 'item' | 'shop' | 'skill' = 'move'): boolean {
    const statusTick = this.playerState.tickStatuses()
    const skillTick = this.playerState.tickSkillCooldowns()
    const messages = [...statusTick.messages, ...skillTick]
    if (messages.length) this.appendActionMessages(messages)
    if (statusTick.defeated) {
      this.handlePlayerDefeat()
      return false
    }
    if (reason === 'move') {
      const reachedLimit = this.playerState.advanceAgeHalfMonth()
      if (reachedLimit) {
        this.triggerLifespanEnding()
        return false
      }
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

  private triggerLifespanEnding() {
    if (this.lifespanEndingTriggered) return
    this.lifespanEndingTriggered = true
    this.closeAllOverlays()
    const lines = [
      `年齡已達 ${this.lifespanLimitDisplay}，壽元枯竭。`,
      '求仙之路終止於此。'
    ]
    this.appendActionMessages(lines)
    this.syncFloorLastAction()
    draw(this)

    const finaleNpc: NpcDef = {
      id: 'lifespan-ending',
      name: '殘燈僧',
      lines: [...this.lifespanEndingLines]
    }

    this.dialogueOverlay.open({ npc: finaleNpc, pos: this.grid.playerPos })
  }

  private handleLifespanEndingCompletion() {
    this.time.delayedCall(320, () => {
      this.scene.start('TitleScene')
    })
  }
}

export default GameScene






































































