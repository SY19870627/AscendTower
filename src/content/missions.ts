import type { MissionDef } from '../core/Types'

export const missions: MissionDef[] = [
  {
    id: 'reach-floor-3',
    title: '踏入第三層',
    description: '抵達第三層，確認自己能在塔內立足。',
    goal: { type: 'reach-floor', target: 3 },
    reward: {
      message: '你熟悉了塔的節奏，獲得額外的旅費。',
      coinDelta: 60
    }
  },
  {
    id: 'defeat-10-enemies',
    title: '試煉戰士',
    description: '擊敗十名敵人，磨練戰鬥本能。',
    goal: { type: 'defeat-enemies', target: 10 },
    reward: {
      message: '戰鬥經驗化作資源，你整理包裹獲得補給。',
      grantItems: [{ id: 'healing-herb', quantity: 3 }]
    }
  },
  {
    id: 'collect-5-items',
    title: '行囊漸滿',
    description: '收集五件道具，為長途冒險做好準備。',
    goal: { type: 'collect-items', target: 5 },
    reward: {
      message: '井然有序的行囊令你心安，獲得蓄能水晶。',
      grantItems: [{ id: 'charge-crystal', quantity: 1 }]
    }
  },
  {
    id: 'collect-200-coins',
    title: '積攢資源',
    description: '累積獲得兩百枚金幣，保障旅途所需。',
    goal: { type: 'collect-coins', target: 200 },
    reward: {
      message: '你妥善規劃開銷，額外獲得一袋金幣。',
      coinDelta: 120
    }
  },
  {
    id: 'gather-healing-herbs',
    title: '療草傳遞',
    description: '替塔樓老者收集兩株療傷藥草，證明你能照護同伴。',
    goal: { type: 'collect-items', target: 2, itemId: 'healing-herb' },
    reward: {
      message: '老者熬成清香藥湯，你的傷勢逐漸復原。',
      hpDelta: 30
    },
    autoUnlock: false
  },
  {
    id: 'curator-salvage',
    title: '遺物採錄',
    description: '協助武庫典藏師擊敗五名敵人，為他蒐集戰場見聞。',
    goal: { type: 'defeat-enemies', target: 5 },
    reward: {
      message: '典藏師將整理好的補給交到你手中。',
      grantItems: [{ id: 'iron-ration', quantity: 2 }]
    },
    autoUnlock: false
  }
]

const missionMap = new Map(missions.map(mission => [mission.id, mission]))

export function getMissionDef(id: string): MissionDef | undefined {
  return missionMap.get(id)
}
