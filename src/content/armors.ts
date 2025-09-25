import type { ArmorDef } from '../core/Types'

const catalog: ArmorDef[] = [
  {
    id: 'cloth-robe',
    name: '布衣',
    def: 0,
    desc: '尋常衣物，幾乎沒有防護力。',
    attributeIds: ['light-padding']
  },
  {
    id: 'leather-vest',
    name: '皮革護甲',
    def: 1,
    desc: '輕薄的襯層，可稍稍緩衝衝擊。',
    attributeIds: ['light-padding', 'wind-channeling'],
    spawnRules: [
      { floors: [1, 2], count: 1 }
    ]
  },
  {
    id: 'windwalk-cloak',
    name: '風行斗篷',
    def: 2,
    desc: '以風絲織就的披覆，減緩來襲之勢。',
    attributeIds: ['wind-channeling', 'gust-barrier'],
    spawnRules: [
      { floors: [2, 3], count: 1 }
    ]
  },
  {
    id: 'scale-mail',
    name: '鱗甲',
    def: 3,
    desc: '厚重的甲片，以速度換取安全。',
    attributeIds: ['scale-reinforcement', 'light-padding'],
    spawnRules: [
      { floors: [3, 4], count: 1 }
    ]
  },
  {
    id: 'river-ward-mail',
    name: '川衛軟甲',
    def: 3,
    desc: '水紋皮革層層包覆，能順勢卸力。',
    attributeIds: ['riverflow-weave', 'wind-channeling'],
    spawnRules: [
      { floors: [3, 4], count: 1 }
    ]
  },
  {
    id: 'spirit-robe',
    name: '靈紋法袍',
    def: 2,
    desc: '符咒縈繞的衣料，增強真氣。',
    attributeIds: ['spirit-warding', 'light-padding'],
    spawnRules: [
      { floors: [4, 5], count: 1 }
    ]
  },
  {
    id: 'phoenix-ward',
    name: '鳳羽護衣',
    def: 2,
    desc: '覆有赤羽的護衣，灼熱氣息守護身軀。',
    attributeIds: ['phoenix-ember', 'wind-channeling', 'light-padding'],
    spawnRules: [
      { floors: [5, 6], count: 1 }
    ]
  },
  {
    id: 'starfall-plate',
    name: '墜星重鎧',
    def: 3,
    desc: '隕星鋪鑄的厚鎧，連山岳衝擊也難以撼動。',
    attributeIds: ['starfall-bastion', 'scale-reinforcement'],
    spawnRules: [
      { floors: [6, 7, 8, 9, 10], count: 1 }
    ]
  }
]

export const armors: ArmorDef[] = catalog

export const armorsById = new Map(catalog.map(armor => [armor.id, armor]))

export function getArmorDef(id: string): ArmorDef | undefined {
  return armorsById.get(id)
}
