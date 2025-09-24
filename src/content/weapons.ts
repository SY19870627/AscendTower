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
    desc: '老舊的刀刃，總比徒手好。'
  },
  {
    id: 'iron-spear',
    name: '鐵槍',
    atk: 8,
    attributeId: 'armor-break',
    desc: '攻守距離平衡。',
    minFloor: 2
  },
  {
    id: 'jade-charm',
    name: '玉靈符',
    atk: 10,
    desc: '導引致命真氣的玄妙符器。',
    minFloor: 3
  },
  {
    id: 'storm-halberd',
    name: '風雷戟',
    atk: 12,
    desc: '嵌有雷晶的長戟，每次擊落皆伴隨驟風。',
    minFloor: 3
  },
  {
    id: 'moonshadow-daggers',
    name: '月影雙刃',
    atk: 11,
    desc: '以月鋒鍛成的雙刃，專為敏捷刺客打造。',
    minFloor: 3
  },
  {
    id: 'crag-hammer',
    name: '嶺岩戰鎚',
    atk: 14,
    desc: '沉重的戰鎚，敲擊之勢有如碎裂山巒。',
    minFloor: 4
  },
  {
    id: 'serene-flute',
    name: '清靈笛',
    atk: 9,
    desc: '一支以雲杉雕成的笛子，音色可化作靈刃。',
    minFloor: 4
  },
  {
    id: 'sunforged-blade',
    name: '熾陽太刀',
    atk: 16,
    desc: '以熔金赤銅淬鍛，閃耀的刀刃蘊藏灼熱。',
    minFloor: 6
  }
]

export const weapons: WeaponDef[] = catalog

export const weaponsById = new Map(catalog.map(weapon => [weapon.id, weapon]))

export function getWeaponDef(id: string): WeaponDef | undefined {
  return weaponsById.get(id)
}
