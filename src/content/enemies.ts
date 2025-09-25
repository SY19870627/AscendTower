import type { EnemyDef } from '../core/Types'

export const enemies: EnemyDef[] = [
  {
    id: 'bandit',
    name: '山寨流寇',
    base: { hp: 40, atk: 10, def: 2 },
    coinDrop: { min: 4, max: 7 },
    spawnRules: [
      { floors: [1], count: 5 },
      { floors: [2], count: 2 }
    ]
  },
  {
    id: 'tower-wolf',
    name: '塔域風狼',
    base: { hp: 55, atk: 12, def: 3 },
    coinDrop: { min: 5, max: 9 },
    spawnRules: [
      { floors: [2], count: 3 },
      { floors: [3], count: 2 }
    ]
  },
  {
    id: 'ashen-adept',
    name: '灰燼術士',
    base: { hp: 48, atk: 14, def: 4 },
    coinDrop: { min: 6, max: 11 },
    spawnRules: [
      { floors: [3], count: 3 },
      { floors: [4], count: 2 }
    ]
  },
  {
    id: 'obsidian-guard',
    name: '黑曜守衛',
    base: { hp: 70, atk: 16, def: 6 },
    coinDrop: { min: 8, max: 13 },
    spawnRules: [
      { floors: [4], count: 3 },
      { floors: [5], count: 2 }
    ]
  },
  {
    id: 'storm-binder',
    name: '縛雷師',
    base: { hp: 62, atk: 18, def: 5 },
    coinDrop: { min: 9, max: 14 },
    spawnRules: [
      { floors: [5], count: 3 },
      { floors: [6], count: 2 }
    ]
  },
  {
    id: 'void-mimic',
    name: '虛境擬影',
    base: { hp: 82, atk: 20, def: 7 },
    coinDrop: { min: 11, max: 18 },
    spawnRules: [
      { floors: [6], count: 3 },
      { floors: [7, 8, 9, 10], count: 5 }
    ]
  }
]

export const enemiesById = new Map(enemies.map(enemy => [enemy.id, enemy]))

export function getEnemyDef(id: string): EnemyDef | undefined {
  return enemiesById.get(id)
}
