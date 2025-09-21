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
  }
]

export const items: ItemDef[] = catalog

export const itemsById = new Map(catalog.map(item => [item.id, item]))

export function getItemDef(id: string): ItemDef | undefined {
  return itemsById.get(id)
}
