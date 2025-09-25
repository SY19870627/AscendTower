import type { NpcDef } from '../core/Types'

export const npcs: NpcDef[] = [
  {
    id: 'tower-sage',
    name: '塔樓老者',
    lines: [
      '天梯會記住你踏出的每一步。',
      '若能帶回兩株療傷藥草，證明你已懂得照護同伴。'
    ],
    postMessage: '老者遞來竹籃，要你沿途留心療草。',
    outcome: {
      message: "聽了指點後，你覺得心神安穩。",
      hpDelta: 8
    },
    offeredMissionIds: ['gather-healing-herbs'],
    spawnRules: [
      { floors: [1, 2], count: 1 }
    ]
  },
  {
    id: 'scout',
    name: '遊行斥候',
    lines: [
      '我已繪出前方幾條走廊。',
      '這層的商人多半聚在東側廊道。'
    ],
    postMessage: '我能給的最好裝備就是情報。',
    spawnRules: [
      { floors: [2, 3], count: 1 }
    ]
  },
  {
    id: 'armory-curator',
    name: '武庫典藏師',
    lines: [
      '我替每位陣亡挑戰者記錄遺物。',
      '把這些帶上路，讓故事延續。',
      '若你擊敗五名敵人，記得回來告訴我。'
    ],
    outcome: {
      message: '典藏師默默遞給你保存良好的補給品。',
      grantItems: [{ id: 'iron-ration', quantity: 1 }]
    },
    offeredMissionIds: ['curator-salvage'],
    spawnRules: [
      { floors: [3, 4], count: 1 }
    ]
  },
  {
    id: 'battle-scholar',
    name: '戰訣學者',
    lines: [
      '你在第三口呼吸時姿勢就洩勁了。',
      '我教你一道護身真言。'
    ],
    outcome: {
      message: '你領會了更穩固的防禦。',
      grantSkills: ['stone-ward']
    },
    spawnRules: [
      { floors: [4, 5], count: 1 }
    ]
  },
  {
    id: 'vault-keeper',
    name: '密庫守者',
    lines: [
      '塔裡藏的不只灰塵而已。',
      '在攀登奪走你之前，先把這些錢花掉吧。'
    ],
    outcome: {
      message: '隱藏的錢袋讓你的荷包鼓了起來。',
      coinDelta: 35
    },
    spawnRules: [
      { floors: [5, 6, 7, 8, 9, 10], count: 1 }
    ]
  }
]

export const npcsById = new Map(npcs.map(npc => [npc.id, npc]))

export function getNpcDef(id: string): NpcDef | undefined {
  return npcsById.get(id)
}

