import type {
  ArmorDef,
  EventOutcome,
  ItemDef,
  SkillDef,
  StatusDef,
  StatusGrant,
  WeaponDef
} from '../../core/Types'
import { getItemDef } from '../../content/items'
import { getStatusDef } from '../../content/statuses'
import { getSkillDef, skills } from '../../content/skills'

export type InventoryEntry = { def: ItemDef; quantity: number }
export type ActiveStatus = { def: StatusDef; remaining: number }

type ApplyOutcomeResult = {
  message: string
  lines: string[]
}

type PlayerStateConfig = {
  baseHp?: number
  baseMp?: number
  startingCoins?: number
  defaultSkillIds?: string[]
}

const DEFAULT_HP = 120
const DEFAULT_MP = 20
const DEFAULT_COINS = 120
const DEFAULT_SKILLS = ['battle-shout']

export class PlayerState {
  hasKey = false
  stats = { hp: DEFAULT_HP, mp: DEFAULT_MP }
  weapon: WeaponDef | null = null
  armor: ArmorDef | null = null
  weaponCharge = 0
  coins = DEFAULT_COINS
  inventory: InventoryEntry[] = []
  activeStatuses: ActiveStatus[] = []
  knownSkills: SkillDef[] = []
  skillCooldowns = new Map<string, number>()

  private readonly defaults: Required<PlayerStateConfig>

  constructor(config?: PlayerStateConfig) {
    this.defaults = {
      baseHp: config?.baseHp ?? DEFAULT_HP,
      baseMp: config?.baseMp ?? DEFAULT_MP,
      startingCoins: config?.startingCoins ?? DEFAULT_COINS,
      defaultSkillIds: config?.defaultSkillIds ?? DEFAULT_SKILLS
    }
    this.stats = { hp: this.defaults.baseHp, mp: this.defaults.baseMp }
    this.coins = this.defaults.startingCoins
  }

  reset() {
    this.hasKey = false
    this.stats = { hp: this.defaults.baseHp, mp: this.defaults.baseMp }
    this.weapon = null
    this.armor = null
    this.weaponCharge = 0
    this.coins = this.defaults.startingCoins
    this.inventory = []
    this.activeStatuses = []
    this.knownSkills = []
    this.skillCooldowns.clear()
    this.ensureDefaultSkills({ silent: true })
  }

  ensureDefaultSkills(options?: { silent?: boolean }) {
    for (const id of this.defaults.defaultSkillIds) {
      this.learnSkill(id, options)
    }
  }

  getStatusBonuses() {
    return this.activeStatuses.reduce(
      (acc, status) => {
        acc.atk += status.def.atkBonus ?? 0
        acc.def += status.def.defBonus ?? 0
        return acc
      },
      { atk: 0, def: 0 }
    )
  }

  addItemToInventory(item: ItemDef, quantity = 1): string {
    const amount = Math.max(quantity, 1)
    if (item.stackable) {
      const existing = this.inventory.find(entry => entry.def.id === item.id)
      if (existing) {
        existing.quantity += amount
      } else {
        this.inventory.push({ def: item, quantity: amount })
      }
    } else {
      for (let i = 0; i < amount; i++) {
        this.inventory.push({ def: item, quantity: 1 })
      }
    }
    const label = amount > 1 ? `${item.name} x${amount}` : item.name
    return `Gained ${label}.`
  }

  consumeInventorySlot(index: number): ItemDef | null {
    const stack = this.inventory[index]
    if (!stack) return null
    const item = stack.def
    if (item.stackable) {
      stack.quantity = Math.max(stack.quantity - 1, 0)
      if (stack.quantity <= 0) {
        this.inventory.splice(index, 1)
      }
    } else {
      this.inventory.splice(index, 1)
    }
    return item
  }

  getSkillByIndex(index: number): SkillDef | undefined {
    return this.knownSkills[index]
  }

  setSkillCooldown(skillId: string, value: number) {
    this.skillCooldowns.set(skillId, Math.max(value, 0))
  }

  getSkillCooldown(skillId: string): number {
    return this.skillCooldowns.get(skillId) ?? 0
  }

  tickStatuses(): { messages: string[]; defeated: boolean } {
    if (!this.activeStatuses.length) return { messages: [], defeated: false }
    const messages: string[] = []
    const remaining: ActiveStatus[] = []
    for (const status of this.activeStatuses) {
      if (typeof status.def.hpPerTurn === 'number' && status.def.hpPerTurn !== 0) {
        const before = this.stats.hp
        const after = Math.max(before + status.def.hpPerTurn, 0)
        this.stats.hp = after
        const delta = status.def.hpPerTurn
        const sign = delta > 0 ? '+' : ''
        messages.push(`${status.def.name}: HP ${before} -> ${after} (${sign}${delta})`)
      }
      const remainingTurns = status.remaining - 1
      if (remainingTurns > 0) {
        remaining.push({ def: status.def, remaining: remainingTurns })
      } else {
        messages.push(`Status ended: ${status.def.name}`)
      }
    }
    this.activeStatuses = remaining
    return { messages, defeated: this.stats.hp <= 0 }
  }

  tickSkillCooldowns(): string[] {
    if (this.skillCooldowns.size === 0) return []
    const messages: string[] = []
    const updated = new Map<string, number>()
    this.skillCooldowns.forEach((value, id) => {
      if (value <= 0) {
        updated.set(id, 0)
        return
      }
      const next = Math.max(value - 1, 0)
      updated.set(id, next)
      if (next === 0) {
        const skill = this.knownSkills.find(entry => entry.id === id)
        if (skill) messages.push(`${skill.name} is ready.`)
      }
    })
    this.skillCooldowns = updated
    return messages
  }

  private addStatus(def: StatusDef, duration: number): string {
    const existing = this.activeStatuses.find(status => status.def.id === def.id)
    if (existing) {
      const refreshed = Math.max(existing.remaining, duration)
      existing.remaining = refreshed
      return `Status refreshed: ${def.name} (${refreshed} turns remaining)`
    }
    this.activeStatuses.push({ def, remaining: duration })
    return `Status gained: ${def.name} (${duration} turns)`
  }

  applyStatusGrants(grants?: StatusGrant[]): string[] {
    if (!Array.isArray(grants) || !grants.length) return []
    const lines: string[] = []
    for (const grant of grants) {
      const def = getStatusDef(grant.id)
      if (!def) {
        lines.push(`Unknown status: ${grant.id}`)
        continue
      }
      const duration = Math.max(grant.duration ?? def.duration, 1)
      lines.push(this.addStatus(def, duration))
    }
    return lines
  }

  applySkillGrants(grants?: string[]): string[] {
    if (!Array.isArray(grants) || !grants.length) return []
    const lines: string[] = []
    for (const id of grants) {
      const message = this.learnSkill(id)
      if (message) lines.push(message)
    }
    return lines
  }

  learnSkill(id: string, options?: { silent?: boolean }): string | null {
    const def = getSkillDef(id) ?? skills.find(skill => skill.id === id) ?? null
    if (!def) return `Unknown skill: ${id}`
    if (this.knownSkills.some(skill => skill.id === def.id)) {
      if (options?.silent) return null
      return `Skill already known: ${def.name}`
    }
    this.knownSkills.push(def)
    this.skillCooldowns.set(def.id, 0)
    if (options?.silent) return null
    return `Skill learned: ${def.name}`
  }

  applyEventOutcome(outcome: EventOutcome): ApplyOutcomeResult {
    let message = (outcome.message ?? '').trim()
    const lines: string[] = []
    const append = (line: string) => {
      const trimmed = line.trim()
      if (trimmed.length) lines.push(trimmed)
    }

    if (typeof outcome.hpDelta === 'number') {
      const before = this.stats.hp
      const after = Math.max(before + outcome.hpDelta, 0)
      this.stats.hp = after
      append(`HP: ${before} -> ${after}`)
    }

    if (typeof outcome.setHp === 'number') {
      const before = this.stats.hp
      const after = Math.max(outcome.setHp, 0)
      this.stats.hp = after
      append(`HP: ${before} -> ${after}`)
    }

    if (typeof outcome.weaponChargeDelta === 'number') {
      const special = this.weapon?.special
      if (special && special.chargeMax > 0) {
        const before = Math.min(this.weaponCharge, special.chargeMax)
        const rawAfter = before + outcome.weaponChargeDelta
        const after = Math.max(0, Math.min(rawAfter, special.chargeMax))
        this.weaponCharge = after
        append(`Weapon charge: ${before} -> ${after}/${special.chargeMax}`)
      } else {
        append('No weapon is ready to hold extra charge.')
      }
    }

    if (outcome.giveKey) {
      if (!this.hasKey) {
        this.hasKey = true
        append('You secure a gleaming key.')
      } else {
        append('You already carry a key, so nothing changes.')
      }
    }

    if (Array.isArray(outcome.grantItems) && outcome.grantItems.length) {
      for (const grant of outcome.grantItems) {
        const def = getItemDef(grant.id)
        if (!def) {
          append(`An unknown item (${grant.id}) eludes your grasp.`)
          continue
        }
        const quantity = Math.max(grant.quantity ?? 1, 1)
        const gainMessage = this.addItemToInventory(def, quantity)
        append(gainMessage)
      }
    }

    if (typeof outcome.coinDelta === 'number') {
      const before = this.coins
      const after = Math.max(before + outcome.coinDelta, 0)
      this.coins = after
      append(`Coins: ${before} -> ${after}`)
    }

    const statusLines = this.applyStatusGrants(outcome.grantStatuses)
    statusLines.forEach(append)

    const skillLines = this.applySkillGrants(outcome.grantSkills)
    skillLines.forEach(append)

    const merged = [...(message.length ? [message] : []), ...lines]
    return {
      message: merged.join('\n'),
      lines
    }
  }
}
