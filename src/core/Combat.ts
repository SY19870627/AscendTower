import type { CombatPreview } from './Types'


export function previewCombat(pAtk:number, pDef:number, pHp:number, eAtk:number, eDef:number, eHp:number): CombatPreview {
const pDamage = Math.max(1, pAtk - eDef)
const eDamage = Math.max(1, eAtk - pDef)
const roundsToKill = Math.ceil(eHp / pDamage)
const hitsTaken = Math.max(0, roundsToKill - 1) // 先手
const lossHp = hitsTaken * eDamage
return { canWin: lossHp < pHp, lossHp, rounds: roundsToKill }
}