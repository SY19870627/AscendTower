import type { EventDef } from '../core/Types'

export const events: EventDef[] = [
  {
    id: 'ancient-fountain',
    title: '遠古靈泉',
    description: '被遺忘的泉水潺潺低語著餘韻魔力，塵埃之下依然泛著柔光。',
    preview: '微光閃爍的泉水召喚著你靠近。',
    options: [
      {
        id: 'drink',
        label: '大口飲下',
        outcome: {
          message: '你啜飲光華泉水，生命力奔流全身。',
          hpDelta: 30
        }
      },
      {
        id: 'wash',
        label: '淬洗武器',
        outcome: {
          message: '泉水洗過武器時發出嗡鳴，但力量也拉扯著你的身體。',
          hpDelta: -10,
          weaponChargeDelta: 2,
          grantStatuses: [{ id: 'battle-focus' }]
        }
      },
      {
        id: 'collect-herbs',
        label: '收集療癒苔蘚',
        outcome: {
          message: '你採下一束散發雨土芬芳的苔蘚。',
          grantStatuses: [{ id: 'regeneration' }],
          grantItems: [{ id: 'healing-herb', quantity: 1 }]
        }
      }
    ]
  },
  {
    id: 'forgotten-altar',
    title: '遺忘祭壇',
    description: '熄滅的蠟燭圍繞著破裂祭壇，陳年供品仍靜置於塵埃間。',
    preview: '古老的祈禱在空氣中沉重滯留。',
    minFloor: 2,
    options: [
      {
        id: 'pray',
        label: '低聲祈禱',
        outcome: {
          message: '灼熱的回應自祭壇滲出，你感到虛弱，卻有鑰匙在掌心成形。',
          hpDelta: -15,
          giveKey: true
        }
      },
      {
        id: 'offer-blood',
        label: '滴下幾滴鮮血',
        outcome: {
          message: '你劃破手掌貼上石面，耳語使你的手臂更銳利。',
          hpDelta: -5,
          weaponChargeDelta: 1,
          grantStatuses: [{ id: 'stone-skin' }],
          grantSkills: ["stone-ward"]
        }
      },
      {
        id: 'inspect-offerings',
        label: '檢視陳舊供品',
        outcome: {
          message: '在褪色的飾品間，你找到仍溫熱的晶體，並在暗匣裡掏出 30 枚硬幣。',
          grantItems: [{ id: 'charge-crystal', quantity: 1 }],
          coinDelta: 30
        }
      }
    ]
  },
  {
    id: 'sealed-cache',
    title: '封鎖藏匿箱',
    description: '沉重的箱櫃被鍊鎖在地，鎖頭覆滿綠鏽。',
    preview: '有人很久以前把貴重物品藏在這裡。',
    minFloor: 3,
    options: [
      {
        id: 'force-open',
        label: '硬撬開鎖',
        outcome: {
          message: '鐵鏈崩斷，但你因此耗盡氣力。',
          hpDelta: -20,
          weaponChargeDelta: 3,
          grantStatuses: [{ id: 'poisoned' }]
        }
      },
      {
        id: 'study',
        label: '研究機關',
        outcome: {
          message: '你找到迂迴的符文，輕鬆揭開箱蓋。裡頭躺著包裹妥善的口糧。',
          hpDelta: 20,
          grantItems: [{ id: 'iron-ration', quantity: 1 }]
        }
      }
    ]
  },
  {
    id: 'lost-pack',
    title: '遺落行囊',
    description: '皮製背包倒在骸骨旁，背帶被歲月啃蝕，補給散落滿地。',
    preview: '有人把裝備留在這裡。',
    options: [
      {
        id: 'take-everything',
        label: '收走所有有用之物',
        outcome: {
          message: '你挑走最實用的物資並收好，還在包底找到幾枚硬幣。',
          grantItems: [
            { id: 'healing-herb', quantity: 2 },
            { id: 'iron-ration', quantity: 1 }
          ],
          coinDelta: 40
        }
      },
      {
        id: 'share',
        label: '留些東西給下一位闖者',
        outcome: {
          message: '你只取走一小捆，希望後來者也能受惠。',
          grantItems: [{ id: 'healing-herb', quantity: 1 }]
        }
      },
      {
        id: 'search-remains',
        label: '搜尋遺骨上的線索',
        outcome: {
          message: '背包裡夾著的筆記教你穿梭塔內的捷徑，你覺得踏實不少，還找到遺落的錢袋。',
          hpDelta: 10,
          coinDelta: 25,
          grantSkills: ["renewing-wave"]
        }
      }
    ]
  }
]

export const eventsById = new Map(events.map(event => [event.id, event]))

export function getEventDef(id: string): EventDef | undefined {
  return eventsById.get(id)
}

