import { advanceWeaponAttributeCharge, getWeaponAttribute, getWeaponAttributeChargeMax } from '../game/weapons/weaponAttributes'
import type { EnemyDef } from '../core/Types'

export type CombatOutcome = {
  canWin: boolean
  lossHp: number
  rounds: number
  attributeTriggers: number
  finalAttributeCharge: number
  playerHpRemaining: number
  shieldRemaining: number
}

export function getEffectiveCombatStats(scene: any) {
  const bonuses = typeof scene.getStatusBonuses === 'function' ? scene.getStatusBonuses() : { atk: 0, def: 0 }
  const weaponAtk = (scene.playerWeapon?.atk ?? 0) + (bonuses.atk ?? 0)
  const armorDef = (scene.playerArmor?.def ?? 0) + (bonuses.def ?? 0)
  return { atk: weaponAtk, def: armorDef }
}

export function describeDirection(dx: number, dy: number) {
  if (dy === -1) return 'UP'
  if (dy === 1) return 'DOWN'
  if (dx === -1) return 'LEFT'
  return 'RIGHT'
}

export function simulateCombat(scene: any, enemy: EnemyDef): CombatOutcome {
  const weapon = scene.playerWeapon
  const attribute = getWeaponAttribute(weapon?.attributeId ?? null)
  const attributeChargeMax = getWeaponAttributeChargeMax(attribute)
  const initialAttributeCharge = attribute ? Math.min(Math.max(scene.weaponAttributeCharge ?? 0, 0), attributeChargeMax) : 0
  let attributeCharge = initialAttributeCharge
  let attributeTriggers = 0
  const combatStats = getEffectiveCombatStats(scene)
  const baseAtk = combatStats.atk
  const playerDef = combatStats.def
  const shieldMax = scene.playerArmor?.shield ?? 0
  let shieldRemaining = shieldMax
  let playerHp = scene.playerStats.hp
  let enemyHp = enemy.base.hp
  const enemyAtk = enemy.base.atk
  const enemyDef = enemy.base.def
  let rounds = 0

  while (true) {
    rounds++
    let ignoreDefense = false
    if (attribute) {
      const attributeResult = advanceWeaponAttributeCharge(attribute, attributeCharge)
      attributeCharge = attributeResult.newCharge
      ignoreDefense = attributeResult.ignoreDefense
      if (attributeResult.triggered) attributeTriggers++
    } else {
      attributeCharge = 0
    }
    const damage = Math.max(1, ignoreDefense ? baseAtk : baseAtk - enemyDef)
    enemyHp -= damage
    if (enemyHp <= 0) break

    const enemyDamage = Math.max(1, enemyAtk - playerDef)
    let remainingDamage = enemyDamage
    if (shieldRemaining > 0) {
      const absorbed = Math.min(shieldRemaining, remainingDamage)
      shieldRemaining -= absorbed
      remainingDamage -= absorbed
    }
    if (remainingDamage > 0) {
      playerHp -= remainingDamage
      if (playerHp <= 0) break
    }
  }

  const canWin = enemyHp <= 0 && playerHp > 0
  const playerHpRemaining = Math.max(playerHp, 0)
  const lossHp = Math.max(0, scene.playerStats.hp - playerHpRemaining)
  const finalAttributeCharge = attribute ? Math.min(Math.max(attributeCharge, 0), attributeChargeMax) : 0
  const shieldRemainingOutput = Math.max(shieldRemaining, 0)
  return { canWin, lossHp, rounds, attributeTriggers, finalAttributeCharge, playerHpRemaining, shieldRemaining: shieldRemainingOutput }
}
