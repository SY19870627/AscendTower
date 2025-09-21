import type { ArmorDef } from '../core/Types'

const catalog: ArmorDef[] = [
  { id: 'leather-vest', name: '皮革護甲', def: 4, shield: 6, desc: '輕薄的襯層，可稍稍緩衝衝擊。' },
  { id: 'scale-mail', name: '鱗甲', def: 7, shield: 12, desc: '厚重的甲片，以速度換取安全。', minFloor: 2 },
  { id: 'spirit-robe', name: '靈紋法袍', def: 5, shield: 15, desc: '符咒縈繞的衣料，增強真氣。', minFloor: 3 }
]

export const armors: ArmorDef[] = catalog

export const armorsById = new Map(catalog.map(armor => [armor.id, armor]))

export function getArmorDef(id: string): ArmorDef | undefined {
  return armorsById.get(id)
}
