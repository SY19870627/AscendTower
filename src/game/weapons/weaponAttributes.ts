import type { WeaponAttributeChargeMap, WeaponAttributeDef, WeaponAttributeId } from '../../core/Types'

const definitions: WeaponAttributeDef[] = [
  {
    id: 'armor-break',
    name: '破甲',
    description: '攻擊時累積能量，滿載後使下一擊無視敵方防禦。',
    chargeMax: 3,
    effect: 'ignore-defense',
  },
]

export const weaponAttributes = definitions
export const weaponAttributesById = new Map<WeaponAttributeId, WeaponAttributeDef>(
  definitions.map(def => [def.id, def])
)

export function getWeaponAttributes(ids?: Iterable<WeaponAttributeId> | null): WeaponAttributeDef[] {
  if (!ids) return []
  const seen = new Set<WeaponAttributeId>()
  const result: WeaponAttributeDef[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    const def = weaponAttributesById.get(id)
    if (def) {
      result.push(def)
      seen.add(id)
    }
  }
  return result
}

export function getWeaponAttribute(id?: WeaponAttributeId | null): WeaponAttributeDef | null {
  if (!id) return null
  return weaponAttributesById.get(id) ?? null
}

export function getWeaponAttributeChargeMax(attribute: WeaponAttributeDef | null): number {
  if (!attribute) return 0
  return Math.max(1, attribute.chargeMax)
}

export function normalizeWeaponAttributeCharge(
  attribute: WeaponAttributeDef | null,
  rawCharge: number
): number {
  if (!attribute) return 0
  const max = getWeaponAttributeChargeMax(attribute)
  const clamped = Math.max(0, Math.floor(rawCharge))
  return Math.min(clamped, max)
}

export function normalizeWeaponAttributeCharges(
  attributes: WeaponAttributeDef[],
  rawCharges?: WeaponAttributeChargeMap | Map<WeaponAttributeId, number> | null
): WeaponAttributeChargeMap {
  const normalized: WeaponAttributeChargeMap = {}
  const sourceIsMap = rawCharges instanceof Map
  for (const attribute of attributes) {
    let raw = 0
    if (sourceIsMap) {
      raw = (rawCharges as Map<WeaponAttributeId, number>).get(attribute.id) ?? 0
    } else if (rawCharges && typeof rawCharges === 'object') {
      raw = (rawCharges as WeaponAttributeChargeMap)[attribute.id] ?? 0
    }
    normalized[attribute.id] = normalizeWeaponAttributeCharge(attribute, raw)
  }
  return normalized
}

export type WeaponAttributeAttackResult = {
  triggered: boolean
  ignoreDefense: boolean
  newCharge: number
}

export function advanceWeaponAttributeCharge(
  attribute: WeaponAttributeDef | null,
  currentCharge: number
): WeaponAttributeAttackResult {
  if (!attribute) {
    return { triggered: false, ignoreDefense: false, newCharge: 0 }
  }
  const max = getWeaponAttributeChargeMax(attribute)
  if (max <= 0) {
    return { triggered: false, ignoreDefense: false, newCharge: 0 }
  }
  const nextCharge = Math.min(currentCharge + 1, max)
  const triggered = nextCharge >= max
  return {
    triggered,
    ignoreDefense: triggered && attribute.effect === 'ignore-defense',
    newCharge: triggered ? 0 : nextCharge,
  }
}

export function isWeaponAttributeReady(attribute: WeaponAttributeDef | null, charge: number): boolean {
  if (!attribute) return false
  return charge >= getWeaponAttributeChargeMax(attribute)
}

export type WeaponAttributeRuntimeState = {
  def: WeaponAttributeDef
  charge: number
  chargeMax: number
}

export type AdvanceWeaponAttributesResult = {
  states: WeaponAttributeRuntimeState[]
  triggered: WeaponAttributeDef[]
  ignoreDefense: boolean
}

export function buildWeaponAttributeStates(
  ids: Iterable<WeaponAttributeId> | null,
  rawCharges?: WeaponAttributeChargeMap | Map<WeaponAttributeId, number> | null
): WeaponAttributeRuntimeState[] {
  const attributes = getWeaponAttributes(ids)
  if (!attributes.length) return []
  const normalized = normalizeWeaponAttributeCharges(attributes, rawCharges ?? null)
  return attributes.map(attribute => ({
    def: attribute,
    charge: normalized[attribute.id] ?? 0,
    chargeMax: getWeaponAttributeChargeMax(attribute),
  }))
}

export function advanceWeaponAttributeStates(
  states: WeaponAttributeRuntimeState[]
): AdvanceWeaponAttributesResult {
  if (!states.length) {
    return { states, triggered: [], ignoreDefense: false }
  }
  const updated: WeaponAttributeRuntimeState[] = []
  const triggered: WeaponAttributeDef[] = []
  let ignoreDefense = false
  for (const state of states) {
    const result = advanceWeaponAttributeCharge(state.def, state.charge)
    if (result.triggered) {
      triggered.push(state.def)
    }
    if (result.ignoreDefense) {
      ignoreDefense = true
    }
    updated.push({
      def: state.def,
      charge: result.newCharge,
      chargeMax: state.chargeMax,
    })
  }
  return { states: updated, triggered, ignoreDefense }
}

