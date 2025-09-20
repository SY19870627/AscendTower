export type Vec2 = { x: number; y: number }
export type Tile =
  | 'floor'
  | 'wall'
  | 'key'
  | 'door'
  | 'stairs'
  | 'enemy'
  | 'player'
  | 'weapon'
  | 'armor'
  | 'event'
  | 'item'
export interface EnemyDef { id: string; name: string; base: { hp: number; atk: number; def: number }; mods?: string[] }
export interface WeaponSpecial { name: string; damage: number; chargeMax: number; desc?: string }
export interface WeaponDef { id: string; name: string; atk: number; special: WeaponSpecial; desc?: string; minFloor?: number }
export interface ArmorDef { id: string; name: string; def: number; shield?: number; desc?: string; minFloor?: number }
export interface PlayerStats { hp: number; mp: number }
export interface ItemGrant { id: string; quantity?: number }
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
}

export interface EventOption {
  id: string
  label: string
  outcome: EventOutcome
}

export interface EventDef {
  id: string
  title: string
  description: string
  preview?: string
  minFloor?: number
  options: EventOption[]
}
