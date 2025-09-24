import type { EnemyDef } from '../core/Types'

export const enemies: EnemyDef[] = [
  { id: 'bandit', name: '山寨流寇', base: { hp: 40, atk: 10, def: 2 }, minFloor: 1, coinDrop: { min: 4, max: 7 } },
  { id: 'tower-wolf', name: '塔域風狼', base: { hp: 55, atk: 12, def: 3 }, minFloor: 2, coinDrop: { min: 5, max: 9 } },
  { id: 'ashen-adept', name: '灰燼術士', base: { hp: 48, atk: 14, def: 4 }, minFloor: 3, coinDrop: { min: 6, max: 11 } },
  { id: 'obsidian-guard', name: '黑曜守衛', base: { hp: 70, atk: 16, def: 6 }, minFloor: 4, coinDrop: { min: 8, max: 13 } },
  { id: 'storm-binder', name: '縛雷師', base: { hp: 62, atk: 18, def: 5 }, minFloor: 4, coinDrop: { min: 9, max: 14 } },
  { id: 'void-mimic', name: '虛境擬影', base: { hp: 82, atk: 20, def: 7 }, minFloor: 5, coinDrop: { min: 11, max: 18 } }
]
