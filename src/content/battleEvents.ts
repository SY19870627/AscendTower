import type { BattleEventDef } from '../core/Types'

export const battleEvents: BattleEventDef[] = [
  {
    id: 'startled-pack',
    title: '驚動獸群',
    description: '你踩斷枯枝的一瞬，狼嚎從霧中炸開，獸影張牙舞爪撲來。',
    preview: '霧中有低沉的獸吼與踩踏聲。',
    enemyId: 'tower-wolf',
    triggerMessage: '你驚動了塔域風狼的族群，它們朝你包圍而來！'
  },
  {
    id: 'bandit-den',
    title: '誤入山賊地盤',
    description: '粗鄙的笑聲自陰影裡竄出，山賊拔刀圍成弧形，阻斷你的退路。',
    preview: '前方燃著未熄的營火與散落的酒罐。',
    enemyId: 'bandit',
    triggerMessage: '山寨流寇察覺你的闖入，高喊著要你留下財物！'
  },
  {
    id: 'hostile-sect',
    title: '敵對門派巡邏',
    description: '暗紅長袍在走廊勾勒出血色軌跡，術士掌心雷光閃動，準備奪命。',
    preview: '有人低聲念誦著陌生的法訣。',
    minFloor: 4,
    enemyId: 'ashen-adept',
    triggerMessage: '敵對門派的術士逼近，雷光迸裂──戰鬥無法避免！',
    enemyMods: ['elite']
  }
]

export const battleEventsById = new Map(battleEvents.map(event => [event.id, event]))

export function getBattleEventDef(id: string): BattleEventDef | undefined {
  return battleEventsById.get(id)
}
