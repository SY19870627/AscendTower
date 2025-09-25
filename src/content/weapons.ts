import type { WeaponDef } from '../core/Types'

const catalog: WeaponDef[] = [
  {
  id: 'bare-hands',
  name: '赤手空拳',
  atk: 1,
  desc: '沒有武器，只能靠雙拳應戰。'
  },
  {
    id: 'rusty-sword',
    name: '鏽蝕長劍',
    atk: 5,
    desc: '老舊的刀刃，總比徒手好。',
    spawnRules: [
      { floors: [1, 2], count: 1 }
    ]
  },
  {
    id: 'iron-spear',
    name: '鐵槍',
    atk: 8,
    attributeIds: ['armor-break'],
    desc: '攻守距離平衡。',
    spawnRules: [
      { floors: [2, 3], count: 1 }
    ]
  },
  {
    id: 'jade-charm',
    name: '玉靈符',
    atk: 10,
    attributeIds: ['vampiric-edge'],
    desc: '導引致命真氣的玄妙符器。',
    spawnRules: [
      { floors: [3, 4], count: 1 }
    ]
  },
  {
    id: 'storm-halberd',
    name: '風雷戟',
    atk: 12,
    attributeIds: ['storm-surge', 'fury-strike'],
    desc: '嵌有雷晶的長戟，每次擊落皆伴隨驟風。',
    spawnRules: [
      { floors: [4, 5], count: 1 }
    ]
  },
  {
    id: 'moonshadow-daggers',
    name: '月影雙刃',
    atk: 11,
    attributeIds: ['fury-strike'],
    desc: '以月鋒鍛成的雙刃，專為敏捷刺客打造。',
    spawnRules: [
      { floors: [3, 4], count: 1 }
    ]
  },
  {
    id: 'crag-hammer',
    name: '嶺岩戰鎚',
    atk: 14,
    attributeIds: ['fury-strike'],
    desc: '沉重的戰鎚，敲擊之勢有如碎裂山巒。',
    spawnRules: [
      { floors: [4, 5], count: 1 }
    ]
  },
  {
    id: 'serene-flute',
    name: '清靈笛',
    atk: 9,
    attributeIds: ['vampiric-edge'],
    desc: '一支以雲杉雕成的笛子，音色可化作靈刃。',
    spawnRules: [
      { floors: [5, 6], count: 1 }
    ]
  },
  {
    id: 'sunforged-blade',
    name: '熾陽太刀',
    atk: 16,
    attributeIds: ['armor-break', 'storm-surge'],
    desc: '以熔金赤銅淬鍛，閃耀的刀刃蘊藏灼熱。',
    spawnRules: [
      { floors: [6, 7, 8, 9, 10], count: 1 }
    ]
  }
]

export const weapons: WeaponDef[] = catalog

export const weaponsById = new Map(catalog.map(weapon => [weapon.id, weapon]))

export function getWeaponDef(id: string): WeaponDef | undefined {
  return weaponsById.get(id)
}
