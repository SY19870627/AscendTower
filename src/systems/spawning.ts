import { weapons } from '../content/weapons'
import { armors } from '../content/armors'
import { items } from '../content/items'
import type {
  Vec2,
  WeaponDef,
  ArmorDef,
  ItemDef,
  SpawnRule
} from '../core/Types'

const droppableWeapons = weapons.filter(weapon => weapon.id !== 'bare-hands')
const droppableArmors = armors.filter(armor => armor.id !== 'cloth-robe')

export function makePosKey(x: number, y: number) {
  return `${x},${y}`
}

type SpawnableDef = { minFloor?: number; spawnRules?: SpawnRule[] }

export function isDefAvailableOnFloor<T extends SpawnableDef>(def: T, floor: number): boolean {
  if (Array.isArray(def.spawnRules) && def.spawnRules.length) {
    return def.spawnRules.some(rule =>
      Array.isArray(rule.floors) && rule.floors.includes(floor) && Math.floor(rule.count ?? 0) > 0
    )
  }
  return (def.minFloor ?? 1) <= floor
}

export function buildForcedSpawnList<T extends SpawnableDef>(defs: readonly T[], floor: number): T[] {
  const forced: T[] = []
  for (const def of defs) {
    if (!Array.isArray(def.spawnRules)) continue
    for (const rule of def.spawnRules) {
      if (!rule) continue
      const count = Math.max(0, Math.floor(rule.count ?? 0))
      if (!count) continue
      const floors = Array.isArray(rule.floors) ? rule.floors : []
      if (!floors.includes(floor)) continue
      for (let i = 0; i < count; i++) {
        forced.push(def)
      }
    }
  }
  return forced
}

export function spawnWeapons(scene: any) {
  const forced = buildForcedSpawnList(droppableWeapons, scene.floor)
  if (forced.length) {
    const pool = [...forced]
    while (pool.length) {
      const pos = scene.grid.place('weapon')
      const weapon = pool.splice(scene.grid.rng.int(0, pool.length - 1), 1)[0]
      scene.weaponDrops.set(makePosKey(pos.x, pos.y), weapon)
    }
    return
  }

  const available = droppableWeapons.filter(weapon => isDefAvailableOnFloor(weapon, scene.floor))
  const pool = available.length ? [...available] : [...droppableWeapons]
  const spawnCount = Math.min(1 + Math.floor((scene.floor - 1) / 2), pool.length)
  for (let i = 0; i < spawnCount; i++) {
    const pos = scene.grid.place('weapon')
    const weapon = pool.splice(scene.grid.rng.int(0, pool.length - 1), 1)[0]
    scene.weaponDrops.set(makePosKey(pos.x, pos.y), weapon)
    if (!pool.length) pool.push(...(available.length ? available : droppableWeapons))
  }
}

export function spawnArmors(scene: any) {
  const forced = buildForcedSpawnList(droppableArmors, scene.floor)
  if (forced.length) {
    const pool = [...forced]
    while (pool.length) {
      const pos = scene.grid.place('armor')
      const armor = pool.splice(scene.grid.rng.int(0, pool.length - 1), 1)[0]
      scene.armorDrops.set(makePosKey(pos.x, pos.y), armor)
    }
    return
  }

  const available = droppableArmors.filter(armor => isDefAvailableOnFloor(armor, scene.floor))
  const pool = available.length ? [...available] : [...droppableArmors]
  const spawnCount = Math.min(1 + Math.floor(scene.floor / 3), pool.length)
  for (let i = 0; i < spawnCount; i++) {
    const pos = scene.grid.place('armor')
    const armor = pool.splice(scene.grid.rng.int(0, pool.length - 1), 1)[0]
    scene.armorDrops.set(makePosKey(pos.x, pos.y), armor)
    if (!pool.length) pool.push(...(available.length ? available : droppableArmors))
  }
}

export function pickupWeapon(scene: any, pos: Vec2) {
  const key = makePosKey(pos.x, pos.y)
  const weapon: WeaponDef | undefined = scene.weaponDrops.get(key)
  if (!weapon) return
  if (typeof scene.acquireWeapon === 'function') {
    scene.acquireWeapon(weapon)
  } else {
    scene.playerWeapon = weapon
    scene.weaponAttributeCharges = null
  }
  scene.weaponDrops.delete(key)
  scene.cameras.main.flash(120, 80, 180, 255)
}

export function pickupArmor(scene: any, pos: Vec2) {
  const key = makePosKey(pos.x, pos.y)
  const armor: ArmorDef | undefined = scene.armorDrops.get(key)
  if (!armor) return
  if (typeof scene.acquireArmor === 'function') {
    scene.acquireArmor(armor)
  } else {
    scene.playerArmor = armor
  }
  scene.armorDrops.delete(key)
  scene.cameras.main.flash(120, 120, 200, 255)
}

export function spawnItems(scene: any) {
  const available = items.filter(item => (item.minFloor ?? 1) <= scene.floor)
  const pool = available.length ? available : items
  if (!pool.length) return
  const baseCount = 1 + Math.floor(scene.floor / 4)
  const spawnCount = Math.max(1, Math.min(baseCount, 3))
  for (let i = 0; i < spawnCount; i++) {
    const pos = scene.grid.place('item')
    const chosen = pool[scene.grid.rng.int(0, pool.length - 1)] as ItemDef
    scene.itemDrops.set(makePosKey(pos.x, pos.y), chosen)
  }
}

export function pickupItem(scene: any, pos: Vec2) {
  const key = makePosKey(pos.x, pos.y)
  const item: ItemDef | undefined = scene.itemDrops.get(key)
  if (!item) return
  scene.addItemToInventory(item)
  scene.itemDrops.delete(key)
  scene.cameras.main.flash(120, 200, 140, 255)
  scene.syncFloorLastAction?.()
}



