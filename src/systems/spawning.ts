import { weapons } from '../content/weapons'
import { armors } from '../content/armors'
import type { Vec2, WeaponDef, ArmorDef } from '../core/Types'

export function makePosKey(x: number, y: number) {
  return `${x},${y}`
}

export function spawnWeapons(scene: any) {
  const available = weapons.filter(w => (w.minFloor ?? 1) <= scene.floor)
  const pool = available.length ? [...available] : [...weapons]
  const spawnCount = Math.min(1 + Math.floor((scene.floor - 1) / 2), pool.length)
  for (let i = 0; i < spawnCount; i++) {
    const pos = scene.grid.place('weapon')
    const weapon = pool.splice(scene.grid.rng.int(0, pool.length - 1), 1)[0]
    scene.weaponDrops.set(makePosKey(pos.x, pos.y), weapon)
    if (!pool.length) pool.push(...(available.length ? available : weapons))
  }
}

export function spawnArmors(scene: any) {
  const available = armors.filter(a => (a.minFloor ?? 1) <= scene.floor)
  const pool = available.length ? [...available] : [...armors]
  const spawnCount = Math.min(1 + Math.floor(scene.floor / 3), pool.length)
  for (let i = 0; i < spawnCount; i++) {
    const pos = scene.grid.place('armor')
    const armor = pool.splice(scene.grid.rng.int(0, pool.length - 1), 1)[0]
    scene.armorDrops.set(makePosKey(pos.x, pos.y), armor)
    if (!pool.length) pool.push(...(available.length ? available : armors))
  }
}

export function pickupWeapon(scene: any, pos: Vec2) {
  const key = makePosKey(pos.x, pos.y)
  const weapon: WeaponDef | undefined = scene.weaponDrops.get(key)
  if (!weapon) return
  scene.playerWeapon = weapon
  scene.weaponCharge = 0
  scene.weaponDrops.delete(key)
  scene.cameras.main.flash(120, 80, 180, 255)
}

export function pickupArmor(scene: any, pos: Vec2) {
  const key = makePosKey(pos.x, pos.y)
  const armor: ArmorDef | undefined = scene.armorDrops.get(key)
  if (!armor) return
  scene.playerArmor = armor
  scene.armorDrops.delete(key)
  scene.cameras.main.flash(120, 120, 200, 255)
}
