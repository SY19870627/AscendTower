import type { MissionDef } from '../core/Types'

export const missions: MissionDef[] = [
  {
    id: 'floor-1-clearing',
    title: '穩固步伐',
    description: '在第一層擊敗一名敵人，確認自己站得住腳。',
    goal: { type: 'defeat-enemies', target: 1 },
    reward: {
      message: '戰鬥結束後，樓梯浮現於一角。'
    },
    autoUnlock: false,
    floor: 1
  },
  {
    id: 'floor-2-clearing',
    title: '持續前行',
    description: '在第二層打倒兩名敵人，熟悉塔內的攻勢。',
    goal: { type: 'defeat-enemies', target: 2 },
    reward: {
      message: '隨著敵影散去，新的階梯出現。'
    },
    autoUnlock: false,
    floor: 2
  },
  {
    id: 'floor-3-clearing',
    title: '戰陣試煉',
    description: '在第三層擊敗三名敵人，讓身手更加純熟。',
    goal: { type: 'defeat-enemies', target: 3 },
    reward: {
      message: '樓梯的光芒自地面溢出。'
    },
    autoUnlock: false,
    floor: 3
  },
  {
    id: 'floor-4-clearing',
    title: '圍城突破',
    description: '在第四層殲滅四名敵人，擊碎阻礙去路的包圍圈。',
    goal: { type: 'defeat-enemies', target: 4 },
    reward: {
      message: '塵埃落定後，樓梯顯露真形。'
    },
    autoUnlock: false,
    floor: 4
  },
  {
    id: 'floor-5-clearing',
    title: '五重考驗',
    description: '在第五層打倒五名敵人，證明自己能承受壓力。',
    goal: { type: 'defeat-enemies', target: 5 },
    reward: {
      message: '踏遍戰場後，前往上一層的階梯顯現。'
    },
    autoUnlock: false,
    floor: 5
  },
  {
    id: 'floor-6-clearing',
    title: '重鋒洗禮',
    description: '在第六層擊敗五名敵人，適應逐漸提升的壓力。',
    goal: { type: 'defeat-enemies', target: 5 },
    reward: {
      message: '你喘口氣，新的樓梯在遠處浮起。'
    },
    autoUnlock: false,
    floor: 6
  },
  {
    id: 'floor-7-clearing',
    title: '靈力考核',
    description: '在第七層打倒五名敵人，將靈力運用得心應手。',
    goal: { type: 'defeat-enemies', target: 5 },
    reward: {
      message: '靈力平息之際，樓梯回應你的呼喚。'
    },
    autoUnlock: false,
    floor: 7
  },
  {
    id: 'floor-8-clearing',
    title: '殘陣掃除',
    description: '在第八層擊倒五名敵人，掃清殘留的危機。',
    goal: { type: 'defeat-enemies', target: 5 },
    reward: {
      message: '戰場恢復寂靜時，階梯悄然成形。'
    },
    autoUnlock: false,
    floor: 8
  },
  {
    id: 'floor-9-clearing',
    title: '終局序章',
    description: '在第九層打倒五名敵人，為最後的登頂做準備。',
    goal: { type: 'defeat-enemies', target: 5 },
    reward: {
      message: '接近頂層的階梯回應你的決意。'
    },
    autoUnlock: false,
    floor: 9
  },
  {
    id: 'floor-10-clearing',
    title: '塔頂對決',
    description: '在第十層擊敗五名敵人，迎向最終的結局。',
    goal: { type: 'defeat-enemies', target: 5 },
    reward: {
      message: '最後的阻礙倒下，結局之門在前方開啟。'
    },
    autoUnlock: false,
    floor: 10
  }
]

const missionMap = new Map(missions.map(mission => [mission.id, mission]))
const floorMissionMap = new Map<number, MissionDef>()
for (const mission of missions) {
  if (typeof mission.floor === 'number') {
    const normalized = Math.max(1, Math.floor(mission.floor))
    if (!floorMissionMap.has(normalized)) {
      floorMissionMap.set(normalized, mission)
    }
  }
}

export function getMissionDef(id: string): MissionDef | undefined {
  return missionMap.get(id)
}

export function getMissionForFloor(floor: number): MissionDef | undefined {
  const normalized = Math.max(1, Math.floor(floor))
  return floorMissionMap.get(normalized)
}
