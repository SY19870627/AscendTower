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
  }
]

export const weapons: WeaponDef[] = catalog

export const weaponsById = new Map(catalog.map(weapon => [weapon.id, weapon]))

export function getWeaponDef(id: string): WeaponDef | undefined {
  return weaponsById.get(id)
}
