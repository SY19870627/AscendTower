export type Vec2 = { x: number; y: number }
export type Tile =
  | 'floor'
  | 'wall'
  | 'key'
  | 'door'
  | 'stairs_up'
  | 'stairs_down'
  | 'enemy'
  | 'player'
  | 'weapon'
  | 'armor'
  | 'event'
  | 'shop'
  | 'npc'
  | 'item'
  | 'ending'
export interface EnemyDef {
  id: string
  name: string
  base: { hp: number; atk: number; def: number }
  coinDrop?: { min: number; max: number }
  mods?: string[]
  minFloor?: number
}
export interface WeaponSpecial { name: string; damage: number; chargeMax: number; desc?: string }
export type WeaponAttributeId = 'armor-break'

export interface WeaponAttributeDef {
  id: WeaponAttributeId
  name: string
  description: string
  chargeMax: number
  effect: 'ignore-defense'
}

export interface WeaponDef { id: string; name: string; atk: number; special: WeaponSpecial; desc?: string; minFloor?: number; attributeId?: WeaponAttributeId }
export interface ArmorDef { id: string; name: string; def: number; shield?: number; desc?: string; minFloor?: number }
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
  specialUses?: number
  finalCharge?: number
  playerHpRemaining?: number
  shieldRemaining?: number
}

export interface EventOutcome {
  message: string
  hpDelta?: number
  setHp?: number
  weaponChargeDelta?: number
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

export interface ShopDef {
  id: string
  title: string
  description: string
  minFloor?: number
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

export interface NpcDef {
  id: string
  name: string
  lines: string[]
  postMessage?: string
  outcome?: EventOutcome
  minFloor?: number
}


