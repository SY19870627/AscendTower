import type {
  Vec2,
  WeaponDef,
  ArmorDef,
  ItemDef,
  SpawnRule
} from '../core/Types'

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
  scene.weaponDrops?.clear?.()
}

export function spawnArmors(scene: any) {
  scene.armorDrops?.clear?.()
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
  scene.itemDrops?.clear?.()
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



