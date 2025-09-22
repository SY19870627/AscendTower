import type { WeaponAttributeDef, WeaponAttributeId } from '../../core/Types'

const definitions: WeaponAttributeDef[] = [
  {
    id: 'armor-break',
    name: '破防',
    description: '集氣完成後，本次攻擊無視敵方防禦。',
    chargeMax: 3,
    effect: 'ignore-defense',
  },
]

export const weaponAttributes = definitions
export const weaponAttributesById = new Map<WeaponAttributeId, WeaponAttributeDef>(
  definitions.map(def => [def.id, def])
)

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
