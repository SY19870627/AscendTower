import type { ItemDef } from '../core/Types'

const catalog: ItemDef[] = [
  {
    id: 'healing-herb',
    name: 'Healing Herb',
    description: 'A fragrant sprig that mends wounds when chewed.',
    stackable: true,
    effect: {
      message: 'You chew the restorative herb. Vitality surges through you.',
      hpDelta: 25
    }
  },
  {
    id: 'charge-crystal',
    name: 'Charge Crystal',
    description: 'Condensed lightning in mineral form. Restores weapon charge.',
    stackable: true,
    minFloor: 2,
    effect: {
      message: 'The crystal hums and your weapon drinks in the energy.',
      weaponChargeDelta: 3
    }
  },
  {
    id: 'iron-ration',
    name: 'Iron Ration',
    description: 'Dense provisions that bolster resilience for the trek ahead.',
    stackable: true,
    minFloor: 3,
    effect: {
      message: 'The iron ration steadies your resolve. You feel hardier.',
      hpDelta: 15
    }
  }
]

export const items: ItemDef[] = catalog

export const itemsById = new Map(catalog.map(item => [item.id, item]))

export function getItemDef(id: string): ItemDef | undefined {
  return itemsById.get(id)
}
