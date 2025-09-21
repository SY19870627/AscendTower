import type { StatusDef } from '../core/Types'

const catalog: StatusDef[] = [
  {
    id: 'battle-focus',
    name: 'Battle Focus',
    description: 'Attack increased by 3 for the next 3 turns.',
    duration: 3,
    atkBonus: 3,
    type: 'buff'
  },
  {
    id: 'stone-skin',
    name: 'Stone Skin',
    description: 'Defense increased by 4 for the next 3 turns.',
    duration: 3,
    defBonus: 4,
    type: 'buff'
  },
  {
    id: 'regeneration',
    name: 'Regeneration',
    description: 'Restore 5 HP at the end of each turn for 4 turns.',
    duration: 4,
    hpPerTurn: 5,
    type: 'buff'
  },
  {
    id: 'poisoned',
    name: 'Poisoned',
    description: 'Lose 4 HP at the end of each turn for 3 turns.',
    duration: 3,
    hpPerTurn: -4,
    type: 'debuff'
  }
]

export const statuses: StatusDef[] = catalog

export function getStatusDef(id: string): StatusDef | undefined {
  return catalog.find(status => status.id === id)
}
