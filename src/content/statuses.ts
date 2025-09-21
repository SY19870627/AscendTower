import type { StatusDef } from '../core/Types'

const catalog: StatusDef[] = [
  {
    id: 'battle-focus',
    name: '戰鬥專注',
    description: '接下來 3 回合攻擊力提升 3 點。',
    duration: 3,
    atkBonus: 3,
    type: 'buff'
  },
  {
    id: 'stone-skin',
    name: '石膚',
    description: '接下來 3 回合防禦力提升 4 點。',
    duration: 3,
    defBonus: 4,
    type: 'buff'
  },
  {
    id: 'regeneration',
    name: '再生',
    description: '接下來 4 回合，每回合結束回復 5 點生命。',
    duration: 4,
    hpPerTurn: 5,
    type: 'buff'
  },
  {
    id: 'poisoned',
    name: '中毒',
    description: '接下來 3 回合，每回合結束損失 4 點生命。',
    duration: 3,
    hpPerTurn: -4,
    type: 'debuff'
  }
]

export const statuses: StatusDef[] = catalog

export function getStatusDef(id: string): StatusDef | undefined {
  return catalog.find(status => status.id === id)
}
