import type { ItemDef } from '../core/Types'

const catalog: ItemDef[] = [
  {
    id: 'healing-herb',
    name: '療傷藥草',
    description: '芬芳的草枝，嚼食後能癒合傷勢。',
    stackable: true,
    effect: {
      message: '你咀嚼療草，生機湧遍全身。',
      hpDelta: 25
    }
  },
  {
    id: 'charge-crystal',
    name: '蓄能水晶',
    description: '凝成礦石的雷光，可回復武器能量。',
    stackable: true,
    minFloor: 2,
    effect: {
      message: '水晶發出低鳴，武器吸收了能量。',
      weaponChargeDelta: 3
    }
  },
  {
    id: 'iron-ration',
    name: '鐵備乾糧',
    description: '扎實的口糧，為旅途增加韌性。',
    stackable: true,
    minFloor: 3,
    effect: {
      message: '乾糧穩住了你的心志，身軀也更結實。',
      hpDelta: 15
    }
  },
  {
    id: 'focus-tea',
    name: '靜心茶包',
    description: '以高山嫩葉烘製，能讓心志凝定。',
    stackable: true,
    effect: {
      message: '茶香緩緩入喉，你的意志更加專注。',
      grantStatuses: [{ id: 'storm-heart', duration: 2 }]
    }
  },
  {
    id: 'ember-draught',
    name: '炙心藥劑',
    description: '濃稠的赤紅藥液，能喚醒戰意。',
    effect: {
      message: '灼熱藥液在體內奔騰，武器渴望戰鬥。',
      hpDelta: -5,
      weaponChargeDelta: 2
    },
    minFloor: 3
  },
  {
    id: 'mist-bomb',
    name: '迷霧彈',
    description: '拋出後會散開濃霧，掩護撤離或偷襲。',
    stackable: true,
    effect: {
      message: '煙霧包覆全身，你的身形逐漸模糊。',
      grantStatuses: [{ id: 'shadow-veil', duration: 2 }]
    }
  },
  {
    id: 'lunar-talisman',
    name: '月耀符',
    description: '蘸滿月光的符箓，可在短暫時間庇佑身心。',
    effect: {
      message: '符光環繞，你感受到月霧般的守護。',
      hpDelta: 6,
      grantStatuses: [{ id: 'moon-ward', duration: 4 }]
    },
    minFloor: 4
  }
]

export const items: ItemDef[] = catalog

export const itemsById = new Map(catalog.map(item => [item.id, item]))

export function getItemDef(id: string): ItemDef | undefined {
  return itemsById.get(id)
}
