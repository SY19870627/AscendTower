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
  SkillDef,
  Tile
} from '../core/Types'
import { PlayerState, type InventoryEntry, type ActiveStatus, type SerializedPlayerState } from '../game/player/PlayerState'
import { getWeaponAttribute, getWeaponAttributeChargeMax } from '../game/weapons/weaponAttributes'
import { handleInput } from '../systems/input'
import { draw } from '../systems/render'
import { spawnWeapons, spawnArmors, spawnItems, makePosKey } from '../systems/spawning'
import { enemies } from '../content/enemies'
import { events, getEventDef } from '../content/events'
import { npcs, getNpcDef } from '../content/npcs'
import { getShopsForFloor, getShopDef } from '../content/shops'
import { getItemDef } from '../content/items'
import { getWeaponDef } from '../content/weapons'
import { getArmorDef } from '../content/armors'
import { BattleOverlay, type BattleInitData } from './BattleOverlay'
import { EventOverlay, type EventResolution } from './EventOverlay'
import { ShopOverlay, type ShopResolution, type ShopInventoryEntry } from './ShopOverlay'
import { DialogueOverlay } from './DialogueOverlay'
import { LibraryOverlay, type LibraryCategory } from './LibraryOverlay'

type FloorState = {
  grid: Grid
  weaponDrops: Map<string, WeaponDef>
  armorDrops: Map<string, ArmorDef>
  eventNodes: Map<string, EventDef>
  npcNodes: Map<string, NpcDef>
  shopNodes: Map<string, ShopDef>
  itemDrops: Map<string, ItemDef>
  lastActionMessage: string
}

export const SAVE_KEY = 'ascend-tower-save-v1'
const SAVE_VERSION = 1

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
  grid: SerializedGridState
  weaponDrops?: Array<[string, string]>
  armorDrops?: Array<[string, string]>
  itemDrops?: Array<[string, string]>
  eventNodes?: Array<[string, string]>
  npcNodes?: Array<[string, string]>
  shopNodes?: Array<[string, string]>
  lastActionMessage?: string
}

type SerializedGameState = {
  version?: number
  timestamp?: number
  floor?: number
  player?: SerializedPlayerState
  floorStates?: SerializedFloorState[]
  lastActionMessage?: string
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
  private readonly handleJumpButtonClick = () => {
    this.jumpToFloor(10)
  }
  private readonly endingDialogueLines = [
    '你跨出塔門，卻聽見遠處傳來第一層的木門聲再度被推開。',
    '風裡有初來者的腳步，你把自己的名字，寫在門後那張微黃的符紙背面',
    '“若見此字，別怕黑。” ',
    '然後你把符紙輕輕一按，世界再次刷新。'
  ]
  private endingTilePos: Vec2 | null = null
  private endingTriggered = false
  private readonly floorStates = new Map<number, FloorState>()
  private pendingEntry: 'up' | 'down' | null = null
  private pendingStartMode: 'load' | null = null
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

  get weaponAttributeCharge(): number {
    return this.playerState.weaponAttributeCharge
  }

  set weaponAttributeCharge(value: number) {
    const attribute = this.playerState.weapon?.attributeId
    const def = getWeaponAttribute(attribute ?? null)
    const clamped = Math.max(0, Math.floor(value))
    this.playerState.weaponAttributeCharge = def ? Math.min(clamped, getWeaponAttributeChargeMax(def)) : 0
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

  init(data?: { floor?: number; reset?: boolean; entry?: 'up' | 'down'; startMode?: 'load' }) {
    if (data?.reset) this.resetPlayerState()
    this.floor = data?.floor ?? this.floor ?? 1
    this.pendingEntry = data?.entry ?? null
    this.pendingStartMode = data?.startMode === 'load' ? 'load' : null
    this.endingTriggered = false
    this.endingTilePos = null
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
    this.pendingEntry = null
    this.pendingStartMode = null
    this.endingTilePos = null
    this.endingTriggered = false
    this.syncFloorLastAction()
  }

  create() {
    this.gridOrigin = { x: this.sidebarWidth + this.sidebarPadding, y: 0 }

    this.playerState.activeStatuses = []
    this.playerState.skillCooldowns.clear()

    this.loadFloorState()

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

    this.setupJumpButton()

    const shouldAutoLoad = this.pendingStartMode === 'load'
    this.pendingStartMode = null
    if (shouldAutoLoad) {
      this.loadGame({ silent: true })
    }
  }

  private setupJumpButton() {
    if (typeof document === 'undefined') return

    this.cleanupJumpButton()

    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = this.floor === 10 ? '已抵達第10層' : '前往第10層'
    button.style.position = 'fixed'
    button.style.top = '16px'
    button.style.right = '24px'
    button.style.zIndex = '5000'
    button.style.padding = '8px 16px'
    button.style.background = this.floor === 10 ? '#2d3a3a' : '#275555'
    button.style.color = '#fdf7df'
    button.style.border = '1px solid #49b6a6'
    button.style.borderRadius = '6px'
    button.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.35)'
    button.style.fontSize = '14px'
    button.style.fontFamily = 'inherit'
    button.style.cursor = this.floor === 10 ? 'default' : 'pointer'

    if (this.floor !== 10) {
      button.addEventListener('click', this.handleJumpButtonClick)
    } else {
      button.disabled = true
      button.style.opacity = '0.65'
    }

    document.body.appendChild(button)
    this.jumpButtonEl = button

    this.events.once('shutdown', () => this.cleanupJumpButton())
    this.events.once('destroy', () => this.cleanupJumpButton())
  }

  private cleanupJumpButton() {
    const button = this.jumpButtonEl
    if (!button) return

    button.removeEventListener('click', this.handleJumpButtonClick)
    button.remove()
    this.jumpButtonEl = undefined
  }

  private ensureEndingTile() {
    if (this.floor !== 10) {
      this.endingTilePos = null
      return
    }

    const existing = this.findEndingTilePos()
    if (existing) {
      this.endingTilePos = existing
      return
    }

    const pos = this.grid.place('ending')
    this.endingTilePos = pos
  }

  private refreshEndingTileReference() {
    if (this.floor !== 10) {
      this.endingTilePos = null
      return
    }

    this.endingTilePos = this.findEndingTilePos()
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
    const cached = this.floorStates.get(this.floor)
    if (cached) {
      this.grid = cached.grid
      this.weaponDrops = cached.weaponDrops
      this.armorDrops = cached.armorDrops
      this.eventNodes = cached.eventNodes
      this.npcNodes = cached.npcNodes
      this.shopNodes = cached.shopNodes
      this.itemDrops = cached.itemDrops
      this.lastActionMessage = cached.lastActionMessage
      this.refreshEndingTileReference()
      this.syncFloorLastAction()
      this.positionPlayerForEntry()
      return
    }

    const seed = (Date.now() ^ (this.floor << 8)) & 0xffff
    this.grid = new Grid(14, 14, seed, { includeDownstairs: this.floor > 1 })
    this.weaponDrops = new Map<string, WeaponDef>()
    this.armorDrops = new Map<string, ArmorDef>()
    this.eventNodes = new Map<string, EventDef>()
    this.npcNodes = new Map<string, NpcDef>()
    this.shopNodes = new Map<string, ShopDef>()
    this.itemDrops = new Map<string, ItemDef>()
    this.lastActionMessage = ''

    spawnWeapons(this)
    spawnArmors(this)
    spawnItems(this)
    this.spawnShops()
    this.spawnEvents()
    this.spawnNpcs()
    this.ensureEndingTile()
    if (!this.knownSkills.length) this.learnSkill('battle-shout', { silent: true })

    const state: FloorState = {
      grid: this.grid,
      weaponDrops: this.weaponDrops,
      armorDrops: this.armorDrops,
      eventNodes: this.eventNodes,
      npcNodes: this.npcNodes,
      shopNodes: this.shopNodes,
      itemDrops: this.itemDrops,
      lastActionMessage: this.lastActionMessage
    }
    this.floorStates.set(this.floor, state)
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

    const state = this.floorStates.get(this.floor)
    if (state) state.lastActionMessage = this.lastActionMessage

    const direction = clamped > this.floor ? 'up' : 'down'
    const underlying = direction === 'up' ? 'stairs_up' : 'stairs_down'
    this.grid.setTileUnderPlayer(underlying)
    this.grid.detachPlayer()

    const entry = direction === 'up' ? 'down' : 'up'
    this.scene.restart({ floor: clamped, entry })
  }

  private startEndingSequence(pos: Vec2) {
    if (this.endingTriggered) return
    if (this.dialogueOverlay?.isActive) return

    this.endingTriggered = true
    this.endingTilePos = { x: pos.x, y: pos.y }

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
    this.endingTilePos = null
    this.time.delayedCall(240, () => {
      this.scene.start('TitleScene')
    })
  }

  transitionFloor(direction: 'up' | 'down') {
    const canProceed = this.advanceTurn('move')
    if (!canProceed) return

    const state = this.floorStates.get(this.floor)
    if (state) state.lastActionMessage = this.lastActionMessage

    const underlying = direction === 'up' ? 'stairs_up' : 'stairs_down'
    this.grid.setTileUnderPlayer(underlying)
    this.grid.detachPlayer()

    const targetFloor = direction === 'up' ? this.floor + 1 : Math.max(1, this.floor - 1)
    if (targetFloor === this.floor) {
      draw(this)
      return
    }

    const entry = direction === 'up' ? 'down' : 'up'
    this.scene.restart({ floor: targetFloor, entry })
  }

  syncFloorLastAction() {
    const state = this.floorStates.get(this.floor)
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

  private snapshotFloorState(floor: number, state: FloorState): SerializedFloorState {
    return {
      floor,
      grid: this.snapshotGrid(state.grid),
      weaponDrops: Array.from(state.weaponDrops.entries()).map(([pos, weapon]) => [pos, weapon.id]),
      armorDrops: Array.from(state.armorDrops.entries()).map(([pos, armor]) => [pos, armor.id]),
      itemDrops: Array.from(state.itemDrops.entries()).map(([pos, item]) => [pos, item.id]),
      eventNodes: Array.from(state.eventNodes.entries()).map(([pos, event]) => [pos, event.id]),
      npcNodes: Array.from(state.npcNodes.entries()).map(([pos, npc]) => [pos, npc.id]),
      shopNodes: Array.from(state.shopNodes.entries()).map(([pos, shop]) => [pos, shop.id]),
      lastActionMessage: state.lastActionMessage
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

    return {
      grid,
      weaponDrops,
      armorDrops,
      eventNodes,
      npcNodes,
      shopNodes,
      itemDrops,
      lastActionMessage: data.lastActionMessage ?? ''
    }
  }

  private serializeGameState(): SerializedGameState {
    this.syncFloorLastAction()
    const floorStates = Array.from(this.floorStates.entries()).map(([floor, state]) =>
      this.snapshotFloorState(floor, state)
    )
    return {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      floor: this.floor,
      player: this.playerState.serialize(),
      floorStates,
      lastActionMessage: this.lastActionMessage
    }
  }

  private applySerializedGameState(data: SerializedGameState): boolean {
    if (!data || typeof data !== 'object') return false
    if (typeof data.version === 'number' && data.version > SAVE_VERSION) return false

    const floorStates = new Map<number, FloorState>()
    for (const entry of data.floorStates ?? []) {
      const restored = this.rebuildFloorState(entry)
      if (restored) {
        floorStates.set(entry.floor, restored)
      }
    }

    if (!floorStates.size) return false

    this.floorStates.clear()
    for (const [floor, state] of floorStates.entries()) {
      this.floorStates.set(floor, state)
    }

    if (typeof data.floor === 'number' && floorStates.has(data.floor)) {
      this.floor = data.floor
    } else {
      const first = floorStates.keys().next()
      if (!first.done) {
        this.floor = first.value
      }
    }

    const active = this.floorStates.get(this.floor)
    if (!active) return false

    this.grid = active.grid
    this.weaponDrops = active.weaponDrops
    this.armorDrops = active.armorDrops
    this.eventNodes = active.eventNodes
    this.npcNodes = active.npcNodes
    this.shopNodes = active.shopNodes
    this.itemDrops = active.itemDrops
    this.lastActionMessage = active.lastActionMessage ?? ''
    this.pendingEntry = null

    if (data.player) {
      this.playerState.restore(data.player)
    } else {
      this.playerState.reset()
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
        weaponCharge: this.weaponCharge,
        weaponAttributeCharge: this.weaponAttributeCharge
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

  finishBattle(outcome: { enemyPos: Vec2; remainingHp: number; weaponCharge: number; weaponAttributeCharge: number }) {
    const { enemyPos, remainingHp, weaponCharge, weaponAttributeCharge } = outcome
    this.playerStats.hp = Math.max(Math.floor(remainingHp), 0)
    this.weaponCharge = Math.max(weaponCharge, 0)
    this.weaponAttributeCharge = Math.max(weaponAttributeCharge, 0)

    this.grid.movePlayer(enemyPos)
    this.grid.enemyPos = this.grid.enemyPos.filter(p => p.x !== enemyPos.x || p.y !== enemyPos.y)
    this.grid.setTileUnderPlayer('floor')
    this.cameras.main.flash(120, 80, 200, 255)
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






































































