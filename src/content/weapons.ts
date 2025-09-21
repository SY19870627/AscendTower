import type { WeaponDef } from '../core/Types'

const catalog: WeaponDef[] = [
  {
    id: 'rusty-sword',
    name: '鏽蝕長劍',
    atk: 5,
    special: { name: '弦月斬', damage: 12, chargeMax: 3, desc: '橫掃的斬擊，劈開眼前敵人。' },
    desc: '老舊的刀刃，總比徒手好。'
  },
  {
    id: 'iron-spear',
    name: '鐵槍',
    atk: 8,
    special: { name: '貫穿突刺', damage: 16, chargeMax: 4, desc: '直線突進，一擊穿透要害。' },
    desc: '攻守距離平衡。',
    minFloor: 2
  },
  {
    id: 'jade-charm',
    name: '玉靈符',
    atk: 10,
    special: { name: '靈氣爆發', damage: 22, chargeMax: 5, desc: '爆裂的靈氣浪潮，震碎敵人。' },
    desc: '導引致命真氣的玄妙符器。',
    minFloor: 3
  },
  {
    id: 'storm-halberd',
    name: '風雷戟',
    atk: 12,
    special: { name: '雷霆掃擊', damage: 20, chargeMax: 4, desc: '揮出纏繞雷光的半月弧，震退成列敵眾。' },
    desc: '嵌有雷晶的長戟，每次擊落皆伴隨驟風。',
    minFloor: 3
  },
  {
    id: 'moonshadow-daggers',
    name: '月影雙刃',
    atk: 11,
    special: { name: '影步連斬', damage: 18, chargeMax: 3, desc: '瞬息穿梭暗影，從敵背後補上快斬。' },
    desc: '以月鋒鍛成的雙刃，專為敏捷刺客打造。',
    minFloor: 3
  },
  {
    id: 'crag-hammer',
    name: '嶺岩戰鎚',
    atk: 14,
    special: { name: '山崩重擊', damage: 26, chargeMax: 5, desc: '將震撼力灌入地面，使敵踉蹌破防。' },
    desc: '沉重的戰鎚，敲擊之勢有如碎裂山巒。',
    minFloor: 4
  },
  {
    id: 'serene-flute',
    name: '清靈笛',
    atk: 9,
    special: { name: '靈音迴響', damage: 17, chargeMax: 4, desc: '音波震蕩，撫平傷痕並擾亂敵心。' },
    desc: '一支以雲杉雕成的笛子，音色可化作靈刃。',
    minFloor: 4
  },
  {
    id: 'sunforged-blade',
    name: '熾陽太刀',
    atk: 16,
    special: { name: '旭日焚擊', damage: 30, chargeMax: 5, desc: '凝聚烈陽之勢，一刀燃盡前路障礙。' },
    desc: '以熔金赤銅淬鍛，閃耀的刀刃蘊藏灼熱。',
    minFloor: 6
  }
]

export const weapons: WeaponDef[] = catalog

export const weaponsById = new Map(catalog.map(weapon => [weapon.id, weapon]))

export function getWeaponDef(id: string): WeaponDef | undefined {
  return weaponsById.get(id)
}
