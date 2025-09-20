import type { EventDef } from '../core/Types'

export const events: EventDef[] = [
  {
    id: 'ancient-fountain',
    title: '古老泉水',
    description: '一池散發著柔和藍光的泉水，水面平靜卻似乎暗藏神秘力量。',
    preview: '清澈泉水散發微光。',
    options: [
      {
        id: 'drink',
        label: '直接飲用',
        outcome: {
          message: '泉水溫暖包覆著你，HP +30。',
          hpDelta: 30
        }
      },
      {
        id: 'wash',
        label: '用泉水清洗傷口',
        outcome: {
          message: '泉水有些冰冷，你失去 10 HP，但武技蓄力 +2。',
          hpDelta: -10,
          weaponChargeDelta: 2
        }
      }
    ]
  },
  {
    id: 'forgotten-altar',
    title: '遺忘的祭壇',
    description: '石製祭壇覆滿灰塵，中央擺著一顆褪色水晶，儀式文字已模糊不清。',
    preview: '神秘祭壇靜靜等待旅人。',
    minFloor: 2,
    options: [
      {
        id: 'pray',
        label: '虔誠祈禱',
        outcome: {
          message: '黑暗力量回應了你，HP -15，但獲得鑰匙。',
          hpDelta: -15,
          giveKey: true
        }
      },
      {
        id: 'offer-blood',
        label: '以鮮血祭獻',
        outcome: {
          message: '你付出 5 HP，武技蓄力 +1。',
          hpDelta: -5,
          weaponChargeDelta: 1
        }
      }
    ]
  },
  {
    id: 'sealed-cache',
    title: '封印寶匣',
    description: '厚重的寶匣被暗紅鎖鏈纏繞，伴隨微弱的低鳴聲。',
    preview: '鎖鏈纏繞的寶箱，散發邪異氣息。',
    minFloor: 3,
    options: [
      {
        id: 'force-open',
        label: '強行打開',
        outcome: {
          message: '鎖鏈反噬，你受到 20 點傷害，但武技蓄力 +3。',
          hpDelta: -20,
          weaponChargeDelta: 3
        }
      },
      {
        id: 'study',
        label: '耐心研究封印',
        outcome: {
          message: '你找到安全的開啟方式，HP +20。',
          hpDelta: 20
        }
      }
    ]
  }
]
