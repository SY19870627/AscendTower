import type { ArmorDef } from '../core/Types'

const catalog: ArmorDef[] = [
  { id: 'leather-vest', name: 'Leather Vest', def: 4, shield: 6, desc: 'Light padding that softens blows.' },
  { id: 'scale-mail', name: 'Scale Mail', def: 7, shield: 12, desc: 'Heavy plates that trade speed for safety.', minFloor: 2 },
  { id: 'spirit-robe', name: 'Spirit Robe', def: 5, shield: 15, desc: 'Enchanted cloth that bolsters qi.', minFloor: 3 }
]

export const armors: ArmorDef[] = catalog

export const armorsById = new Map(catalog.map(armor => [armor.id, armor]))

export function getArmorDef(id: string): ArmorDef | undefined {
  return armorsById.get(id)
}
