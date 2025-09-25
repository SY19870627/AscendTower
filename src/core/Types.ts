export type Vec2 = { x: number; y: number }
export type Tile =
  | 'floor'
  | 'wall'
  | 'key'
  | 'door'
  | 'stairs_up'
  | 'stairs_down'
  | 'stairs_branch'
  | 'enemy'
  | 'player'
  | 'weapon'
  | 'armor'
  | 'event'
  | 'shop'
  | 'npc'
  | 'item'
  | 'ending'
export interface SpawnRule {
  floors: number[]
  count: number
}

interface SpawnableDef {
  minFloor?: number
  spawnRules?: SpawnRule[]
}

export interface EnemyDef extends SpawnableDef {
  id: string
  name: string
  base: { hp: number; atk: number; def: number }
  coinDrop?: { min: number; max: number }
  mods?: string[]
}
export type WeaponAttributeId = 'armor-break' | 'fury-strike' | 'vampiric-edge' | 'storm-surge'
export type WeaponAttributeChargeMap = Partial<Record<WeaponAttributeId, number>>

export type ArmorAttributeId =
  | 'light-padding'
  | 'wind-channeling'
  | 'gust-barrier'
  | 'scale-reinforcement'
  | 'riverflow-weave'
  | 'spirit-warding'
  | 'phoenix-ember'
  | 'starfall-bastion'

export type ArmorAttributeBonuses = { def: number }

export interface WeaponAttributeDef {
  id: WeaponAttributeId
  name: string
  description: string
  chargeMax: number
  effect: 'ignore-defense' | 'bonus-damage' | 'life-steal'
  bonusDamage?: number
  healAmount?: number
}

export interface WeaponDef extends SpawnableDef {
  id: string
  name: string
  atk: number
  desc?: string
  attributeIds?: WeaponAttributeId[]
}
export interface ArmorAttributeDef {
  id: ArmorAttributeId
  name: string
  description: string
  defBonus?: number
}

export interface ArmorDef extends SpawnableDef {
  id: string
  name: string
  def: number
  desc?: string
  attributeIds?: ArmorAttributeId[]
}
export interface PlayerStats { hp: number; mp: number }
export interface ItemGrant { id: string; quantity?: number }
export interface StatusDef {
  id: string
  name: string
  description: string
  duration: number
  atkBonus?: number
  defBonus?: number
  hpPerTurn?: number
  type?: 'buff' | 'debuff'
}

export interface StatusGrant {
  id: string
  duration?: number
}

export interface SkillDef {
  id: string
  name: string
  description: string
  cooldown: number
  effect: EventOutcome
  minFloor?: number
}

export interface ItemDef {
  id: string
  name: string
  description?: string
  effect: EventOutcome
  stackable?: boolean
  minFloor?: number
}
export interface CombatPreview {
  canWin: boolean
  lossHp: number
  rounds: number
  playerHpRemaining?: number
}

export interface EventOutcome {
  message: string
  hpDelta?: number
  setHp?: number
  giveKey?: boolean
  grantItems?: ItemGrant[]
  coinDelta?: number
  grantStatuses?: StatusGrant[]
  grantSkills?: string[]
}

export interface EventOption {
  id: string
  label: string
  outcome: EventOutcome
}

export interface ShopOffer {
  id: string
  itemId: string
  price: number
  quantity?: number
}

export interface ShopDef extends SpawnableDef {
  id: string
  title: string
  description: string
  offers: ShopOffer[]
}

export interface EventDef {
  id: string
  title: string
  description: string
  preview?: string
  minFloor?: number
  options: EventOption[]
}

export interface NpcDef extends SpawnableDef {
  id: string
  name: string
  lines: string[]
  postMessage?: string
  outcome?: EventOutcome
  offeredMissionIds?: string[]
}

export type MissionGoal =
  | { type: 'reach-floor'; target: number }
  | { type: 'defeat-enemies'; target: number }
  | { type: 'collect-coins'; target: number }
  | { type: 'collect-items'; target: number; itemId?: string }

export interface MissionDef {
  id: string
  title: string
  description: string
  goal: MissionGoal
  reward?: EventOutcome
  autoUnlock?: boolean
}

export interface MissionStatus {
  def: MissionDef
  progress: number
  target: number
  completed: boolean
}
