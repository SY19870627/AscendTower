import type { WeaponDef } from '../core/Types'

export const weapons: WeaponDef[] = [
  {
    id: 'rusty-sword',
    name: 'Rusty Sword',
    atk: 5,
    special: { name: 'Crescent Slash', damage: 12, chargeMax: 3, desc: 'Sweeping strike that cleaves foes.' },
    desc: 'A worn blade, but better than bare hands.'
  },
  {
    id: 'iron-spear',
    name: 'Iron Spear',
    atk: 8,
    special: { name: 'Piercing Lunge', damage: 16, chargeMax: 4, desc: 'Line thrust that strikes vital points.' },
    desc: 'Balanced reach and guard.',
    minFloor: 2
  },
  {
    id: 'jade-charm',
    name: 'Jade Charm',
    atk: 10,
    special: { name: 'Spirit Burst', damage: 22, chargeMax: 5, desc: 'Explosive qi wave that devastates foes.' },
    desc: 'Mystic charm that channels lethal qi.',
    minFloor: 3
  },
]
