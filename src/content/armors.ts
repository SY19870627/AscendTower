import type { ArmorDef } from '../core/Types'

const catalog: ArmorDef[] = [
  { id: 'cloth-robe', name: '布衣', def: 1, shield: 2, desc: '尋常衣物，幾乎沒有防護力。' },
  { id: 'leather-vest', name: '皮革護甲', def: 4, shield: 6, desc: '輕薄的襯層，可稍稍緩衝衝擊。' },
  { id: 'windwalk-cloak', name: '風行斗篷', def: 5, shield: 8, desc: '以風絲織就的披覆，減緩來襲之勢。', minFloor: 2 },
  { id: 'scale-mail', name: '鱗甲', def: 7, shield: 12, desc: '厚重的甲片，以速度換取安全。', minFloor: 3 },
  { id: 'river-ward-mail', name: '川衛軟甲', def: 8, shield: 14, desc: '水紋皮革層層包覆，能順勢卸力。', minFloor: 3 },
  { id: 'spirit-robe', name: '靈紋法袍', def: 6, shield: 15, desc: '符咒縈繞的衣料，增強真氣。', minFloor: 4 },
  { id: 'phoenix-ward', name: '鳳羽護衣', def: 9, shield: 18, desc: '覆有赤羽的護衣，灼熱氣息守護身軀。', minFloor: 4 },
  { id: 'starfall-plate', name: '墜星重鎧', def: 11, shield: 24, desc: '隕星鋪鑄的厚鎧，連山岳衝擊也難以撼動。', minFloor: 5 }
]

export const armors: ArmorDef[] = catalog

export const armorsById = new Map(catalog.map(armor => [armor.id, armor]))

export function getArmorDef(id: string): ArmorDef | undefined {
  return armorsById.get(id)
}
