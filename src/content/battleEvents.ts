import type { BattleEventDef } from '../core/Types'

const catalog: BattleEventDef[] = [
  {
    id: 'bandit-encampment',
    title: '山寨伏兵',
    description:
      '你誤闖山寨臨時據點，營火旁滿是粗糙兵刃與未分配的金袋。伏兵正待命，只要有動靜便會蜂擁而上。',
    enemyId: 'bandit',
    waveCount: { min: 2, max: 3 },
    rewardOptions: [
      {
        id: 'bandit-encampment-heal',
        label: '分得療傷酒，恢復 35 點生命',
        outcome: {
          message: '你分得伏兵囤積的藥酒，灼熱刺激修復你的傷勢。',
          hpDelta: 35
        }
      },
      {
        id: 'bandit-encampment-coins',
        label: '收刮金袋，獲得 30 金幣',
        outcome: {
          message: '你把山寨的金袋打結收入囊中。',
          coinDelta: 30
        }
      },
      {
        id: 'bandit-encampment-items',
        label: '搜括藥草，取得療傷藥草 x2',
        outcome: {
          message: '你找到幾束乾燥藥草，足以支撐後續旅程。',
          grantItems: [{ id: 'healing-herb', quantity: 2 }]
        }
      }
    ],
    minFloor: 1
  },
  {
    id: 'wolf-den-howl',
    title: '風狼群巢',
    description:
      '塔域風狼盤踞於洞穴，帶頭者發出低沉嗥鳴，群狼隨著風勢輪番衝擊。若不速戰速決，很難全身而退。',
    enemyId: 'tower-wolf',
    waveCount: [2, 3, 4],
    rewardOptions: [
      {
        id: 'wolf-den-focus',
        label: '吸納狼息，獲得靜心茶包',
        outcome: {
          message: '你汲取風狼呼吸間的精氣，沖泡成一包靜心茶。',
          grantItems: [{ id: 'focus-tea', quantity: 1 }]
        }
      },
      {
        id: 'wolf-den-mastery',
        label: '磨練身骨，提升 20 點生命',
        outcome: {
          message: '與群狼周旋的經驗讓你的身軀更加堅實。',
          hpDelta: 20
        }
      },
      {
        id: 'wolf-den-coins',
        label: '搜集狼牙，換得 36 金幣',
        outcome: {
          message: '你將狼牙收束成串，估算著能換得不錯的報酬。',
          coinDelta: 36
        }
      }
    ],
    minFloor: 2
  },
  {
    id: 'obsidian-blockade',
    title: '黑曜封鎖線',
    description:
      '塔衛已在狹長回廊築起封鎖線，黑曜守衛冷靜調度，輪番硬碰硬地試探你的破綻。只有連續突破，才能撼動防線。',
    enemyId: 'obsidian-guard',
    waveCount: { min: 3, max: 4 },
    rewardOptions: [
      {
        id: 'obsidian-ward',
        label: '撿起完好的甲片，獲得月耀符',
        outcome: {
          message: '守衛的甲片折射微光，你從中繪製出一道月耀符。',
          grantItems: [{ id: 'lunar-talisman', quantity: 1 }]
        }
      },
      {
        id: 'obsidian-discipline',
        label: '沉澱戰意，恢復 40 點生命',
        outcome: {
          message: '你調息黑曜殘焰，讓體內靈息再度飽滿。',
          hpDelta: 40
        }
      },
      {
        id: 'obsidian-tribute',
        label: '奪取軍需，獲得 48 金幣',
        outcome: {
          message: '你截下守衛的軍需封囊，沉甸甸地塞進行囊。',
          coinDelta: 48
        }
      }
    ],
    minFloor: 4
  }
]

export const battleEvents: BattleEventDef[] = catalog

export const battleEventsById = new Map(catalog.map(event => [event.id, event]))

export function getBattleEventDef(id: string): BattleEventDef | undefined {
  return battleEventsById.get(id)
}
