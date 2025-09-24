import { advanceWeaponAttributeStates, buildWeaponAttributeStates } from '../game/weapons/weaponAttributes'
import type { EnemyDef, WeaponAttributeChargeMap, WeaponAttributeId } from '../core/Types'

export type CombatAttributeSummary = {
  id: WeaponAttributeId
  name: string
  triggers: number
}

export type CombatOutcome = {
  canWin: boolean
  lossHp: number
  rounds: number
  triggeredAttributes: CombatAttributeSummary[]
  finalAttributeCharges: WeaponAttributeChargeMap
  playerHpRemaining: number
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
  const initialStates = buildWeaponAttributeStates(weapon?.attributeIds ?? [], scene.weaponAttributeCharges ?? null)
  let attributeStates = initialStates
  const triggerCounts = new Map<WeaponAttributeId, { name: string; triggers: number }>()

  const combatStats = getEffectiveCombatStats(scene)
  const baseAtk = combatStats.atk
  const playerDef = combatStats.def
  let playerHp = scene.playerStats.hp
  const startingPlayerHp = playerHp
  let enemyHp = enemy.base.hp
  const enemyAtk = enemy.base.atk
  const enemyDef = enemy.base.def
  let rounds = 0

  while (true) {
    rounds++
    let ignoreDefense = false
    let bonusDamage = 0
    let lifeSteal = 0
    if (attributeStates.length) {
      const attributeResult = advanceWeaponAttributeStates(attributeStates)
      attributeStates = attributeResult.states
      ignoreDefense = attributeResult.ignoreDefense
      bonusDamage = attributeResult.bonusDamage
      lifeSteal = attributeResult.lifeSteal
      for (const triggered of attributeResult.triggered) {
        const existing = triggerCounts.get(triggered.id)
        if (existing) {
          existing.triggers += 1
        } else {
          triggerCounts.set(triggered.id, { name: triggered.name, triggers: 1 })
        }
      }
    }

    const baseDamage = Math.max(1, ignoreDefense ? baseAtk : baseAtk - enemyDef)
    const totalDamage = baseDamage + bonusDamage
    enemyHp -= totalDamage
    if (lifeSteal > 0) {
      playerHp = Math.min(playerHp + lifeSteal, startingPlayerHp)
    }
    if (enemyHp <= 0) break

    const enemyDamage = Math.max(1, enemyAtk - playerDef)
    playerHp -= enemyDamage
    if (playerHp <= 0) break
  }

  const canWin = enemyHp <= 0 && playerHp > 0
  const playerHpRemaining = Math.max(playerHp, 0)
  const lossHp = Math.max(0, scene.playerStats.hp - playerHpRemaining)

  const finalAttributeCharges: WeaponAttributeChargeMap = {}
  for (const state of attributeStates) {
    finalAttributeCharges[state.def.id] = state.charge
  }

  const triggeredAttributes: CombatAttributeSummary[] = Array.from(triggerCounts.entries()).map(([id, entry]) => ({
    id,
    name: entry.name,
    triggers: entry.triggers,
  }))

  return { canWin, lossHp, rounds, triggeredAttributes, finalAttributeCharges, playerHpRemaining }
}