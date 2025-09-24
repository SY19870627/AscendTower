import type {
  ArmorDef,
  EventOutcome,
  ItemDef,
  SkillDef,
  StatusDef,
  StatusGrant,
  WeaponDef,
  WeaponAttributeChargeMap,
  WeaponAttributeId
} from '../../core/Types'
import { getItemDef } from '../../content/items'
import { getStatusDef } from '../../content/statuses'
import { getSkillDef, skills } from '../../content/skills'
import { getWeaponDef } from '../../content/weapons'
import { getArmorDef } from '../../content/armors'
import { getWeaponAttributes, normalizeWeaponAttributeCharge, normalizeWeaponAttributeCharges } from '../weapons/weaponAttributes'

export type InventoryEntry = { def: ItemDef; quantity: number }
export type ActiveStatus = { def: StatusDef; remaining: number }

export type SerializedInventoryEntry = { id?: string; quantity?: number }
export type SerializedStatusEntry = { id?: string; remaining?: number }
export type SerializedPlayerState = {
  hasKey?: boolean
  stats?: { hp?: number; mp?: number }
  weaponId?: string | null
  armorId?: string | null
  weaponAttributeCharge?: number
  weaponAttributeCharges?: [WeaponAttributeId, number][]
  weaponStash?: string[]
  armorStash?: string[]
  coins?: number
  inventory?: SerializedInventoryEntry[]
  activeStatuses?: SerializedStatusEntry[]
  knownSkills?: string[]
  skillCooldowns?: [string, number][]
}


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
const DEFAULT_WEAPON_ID = 'bare-hands'
const DEFAULT_ARMOR_ID = 'cloth-robe'

export class PlayerState {
  hasKey = false
  stats = { hp: DEFAULT_HP, mp: DEFAULT_MP }
  weapon: WeaponDef | null = null
  armor: ArmorDef | null = null
  weaponAttributeCharges = new Map<WeaponAttributeId, number>()
  weaponStash: WeaponDef[] = []
  armorStash: ArmorDef[] = []
  coins = DEFAULT_COINS
  inventory: InventoryEntry[] = []
  activeStatuses: ActiveStatus[] = []
  knownSkills: SkillDef[] = []
  skillCooldowns = new Map<string, number>()

  private readonly defaults: Required<PlayerStateConfig>

  private syncWeaponAttributeCharges(rawCharges: Map<WeaponAttributeId, number> | WeaponAttributeChargeMap | null = null) {
    this.weaponAttributeCharges.clear()
    const attributes = getWeaponAttributes(this.weapon?.attributeIds ?? [])
    if (!attributes.length) return
    const normalized = normalizeWeaponAttributeCharges(attributes, rawCharges)
    for (const attribute of attributes) {
      this.weaponAttributeCharges.set(attribute.id, normalized[attribute.id] ?? 0)
    }
  }

  getWeaponAttributeCharges(): Map<WeaponAttributeId, number> {
    return new Map(this.weaponAttributeCharges)
  }

  setWeaponAttributeCharges(rawCharges?: Map<WeaponAttributeId, number> | WeaponAttributeChargeMap | null) {
    this.syncWeaponAttributeCharges(rawCharges ?? null)
  }

  get weaponAttributeCharge(): number {
    const firstId = this.weapon?.attributeIds?.[0] ?? null
    if (!firstId) return 0
    return this.weaponAttributeCharges.get(firstId) ?? 0
  }

  set weaponAttributeCharge(value: number) {
    const firstId = this.weapon?.attributeIds?.[0] ?? null
    if (!firstId) {
      this.weaponAttributeCharges.clear()
      return
    }
    const [attribute] = getWeaponAttributes([firstId])
    const normalized = normalizeWeaponAttributeCharge(attribute ?? null, value)
    this.weaponAttributeCharges.set(firstId, normalized)
  }

  private equipDefaultGear() {
    this.weapon = getWeaponDef(DEFAULT_WEAPON_ID) ?? null
    this.weaponAttributeCharges = new Map<WeaponAttributeId, number>()
    this.syncWeaponAttributeCharges()
    this.armor = getArmorDef(DEFAULT_ARMOR_ID) ?? null
  }

  constructor(config?: PlayerStateConfig) {
    this.defaults = {
      baseHp: config?.baseHp ?? DEFAULT_HP,
      baseMp: config?.baseMp ?? DEFAULT_MP,
      startingCoins: config?.startingCoins ?? DEFAULT_COINS,
      defaultSkillIds: config?.defaultSkillIds ?? DEFAULT_SKILLS
    }
    this.stats = { hp: this.defaults.baseHp, mp: this.defaults.baseMp }
    this.coins = this.defaults.startingCoins
    this.equipDefaultGear()
  }

  reset() {
    this.hasKey = false
    this.stats = { hp: this.defaults.baseHp, mp: this.defaults.baseMp }
    this.weapon = null
    this.weaponStash = []
    this.armor = null
    this.armorStash = []
    this.weaponAttributeCharges = new Map<WeaponAttributeId, number>()
    this.coins = this.defaults.startingCoins
    this.inventory = []
    this.activeStatuses = []
    this.knownSkills = []
    this.skillCooldowns.clear()
    this.equipDefaultGear()
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

  serialize(): SerializedPlayerState {
    const attributes = getWeaponAttributes(this.weapon?.attributeIds ?? [])
    const normalizedCharges = normalizeWeaponAttributeCharges(attributes, this.weaponAttributeCharges)
    const attributeEntries: [WeaponAttributeId, number][] = attributes.map(attribute => [
      attribute.id,
      normalizedCharges[attribute.id] ?? 0
    ])
    const primaryCharge = attributeEntries.length ? attributeEntries[0][1] : 0

    return {
      hasKey: this.hasKey,
      stats: { hp: this.stats.hp, mp: this.stats.mp },
      weaponId: this.weapon?.id ?? null,
      armorId: this.armor?.id ?? null,
      weaponAttributeCharge: primaryCharge,
      weaponAttributeCharges: attributeEntries,
      weaponStash: this.weaponStash.map(weapon => weapon.id),
      armorStash: this.armorStash.map(armor => armor.id),
      coins: Math.max(0, Math.floor(this.coins)),
      inventory: this.inventory.map(entry => ({
        id: entry.def.id,
        quantity: Math.max(1, Math.floor(entry.quantity))
      })),
      activeStatuses: this.activeStatuses.map(status => ({
        id: status.def.id,
        remaining: Math.max(1, Math.floor(status.remaining))
      })),
      knownSkills: this.knownSkills.map(skill => skill.id),
      skillCooldowns: Array.from(this.skillCooldowns.entries()).map(([id, value]) => [
        id,
        Math.max(0, Math.floor(value))
      ])
    }
  }

  restore(state: SerializedPlayerState) {
    this.hasKey = !!state.hasKey
    const hp = Math.max(0, Math.floor(state.stats?.hp ?? this.defaults.baseHp))
    const mp = Math.max(0, Math.floor(state.stats?.mp ?? this.defaults.baseMp))
    this.stats = { hp, mp }

    this.weapon = state.weaponId ? getWeaponDef(state.weaponId) ?? null : null

    const savedChargeEntries = Array.isArray(state.weaponAttributeCharges) ? state.weaponAttributeCharges : []
    let chargeSource: Map<WeaponAttributeId, number> | WeaponAttributeChargeMap | null = null
    if (savedChargeEntries.length) {
      const sanitized = savedChargeEntries
        .filter(entry => Array.isArray(entry) && entry.length >= 2 && typeof entry[0] === 'string')
        .map(entry => {
          const [id, value] = entry as [WeaponAttributeId, number]
          return [id, Math.max(0, Math.floor(value ?? 0))] as [WeaponAttributeId, number]
        })
      if (sanitized.length) {
        chargeSource = new Map<WeaponAttributeId, number>(sanitized)
      }
    } else if (typeof state.weaponAttributeCharge === 'number') {
      const fallbackId = this.weapon?.attributeIds?.[0] ?? null
      if (fallbackId) {
        const normalizedValue = Math.max(0, Math.floor(state.weaponAttributeCharge ?? 0))
        chargeSource = new Map<WeaponAttributeId, number>([[fallbackId, normalizedValue]])
      }
    }
    this.syncWeaponAttributeCharges(chargeSource)

    this.armor = state.armorId ? getArmorDef(state.armorId) ?? null : null

    const weaponStashIds = Array.isArray(state.weaponStash) ? state.weaponStash : []
    this.weaponStash = weaponStashIds
      .map(id => getWeaponDef(id) ?? null)
      .filter((def): def is WeaponDef => def !== null)

    const armorStashIds = Array.isArray(state.armorStash) ? state.armorStash : []
    this.armorStash = armorStashIds
      .map(id => getArmorDef(id) ?? null)
      .filter((def): def is ArmorDef => def !== null)

    this.coins = Math.max(0, Math.floor(state.coins ?? this.defaults.startingCoins))

    const inventoryEntries = Array.isArray(state.inventory) ? state.inventory : []
    this.inventory = inventoryEntries
      .map(entry => {
        if (!entry?.id) return null
        const def = getItemDef(entry.id)
        if (!def) return null
        const quantity = Math.max(1, Math.floor(entry.quantity ?? 1))
        return { def, quantity }
      })
      .filter((entry): entry is InventoryEntry => entry !== null)

    const statusEntries = Array.isArray(state.activeStatuses) ? state.activeStatuses : []
    this.activeStatuses = statusEntries
      .map(entry => {
        if (!entry?.id) return null
        const def = getStatusDef(entry.id)
        if (!def) return null
        const remaining = Math.max(1, Math.floor(entry.remaining ?? def.duration ?? 1))
        return { def, remaining }
      })
      .filter((entry): entry is ActiveStatus => entry !== null)

    const skillIds = Array.isArray(state.knownSkills) ? state.knownSkills : []
    this.knownSkills = skillIds
      .map(id => getSkillDef(id) ?? skills.find(skill => skill.id === id) ?? null)
      .filter((def): def is SkillDef => def !== null)

    if (!this.knownSkills.length) {
      this.ensureDefaultSkills({ silent: true })
    }

    if (!this.weapon) {
      this.weapon = getWeaponDef(DEFAULT_WEAPON_ID) ?? null
      this.weaponAttributeCharges = new Map<WeaponAttributeId, number>()
      this.syncWeaponAttributeCharges()
    }
    if (!this.armor) {
      this.armor = getArmorDef(DEFAULT_ARMOR_ID) ?? null
    }

    this.skillCooldowns.clear()
    const cooldownEntries = Array.isArray(state.skillCooldowns) ? state.skillCooldowns : []
    for (const [id, value] of cooldownEntries) {
      if (typeof id !== 'string') continue
      const cooldown = Math.max(0, Math.floor(value ?? 0))
      this.skillCooldowns.set(id, cooldown)
    }
    for (const skill of this.knownSkills) {
      if (!this.skillCooldowns.has(skill.id)) {
        this.skillCooldowns.set(skill.id, 0)
      }
    }
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
    return `取得 ${label}。`
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

  private ensureWeaponStored(weapon: WeaponDef | null) {
    if (!weapon) return
    if (!this.weaponStash.some(entry => entry.id === weapon.id)) {
      this.weaponStash.push(weapon)
    }
  }

  private ensureArmorStored(armor: ArmorDef | null) {
    if (!armor) return
    if (!this.armorStash.some(entry => entry.id === armor.id)) {
      this.armorStash.push(armor)
    }
  }

  acquireWeapon(weapon: WeaponDef): { replaced?: WeaponDef | null } {
    const previous = this.weapon
    if (previous) this.ensureWeaponStored(previous)
    this.weapon = weapon
    this.weaponAttributeCharges = new Map<WeaponAttributeId, number>()
    this.syncWeaponAttributeCharges()
    this.ensureWeaponStored(weapon)
    return { replaced: previous }
  }

  acquireArmor(armor: ArmorDef): { replaced?: ArmorDef | null } {
    const previous = this.armor
    if (previous) this.ensureArmorStored(previous)
    this.armor = armor
    this.ensureArmorStored(armor)
    return { replaced: previous }
  }

  equipWeaponByIndex(index: number): WeaponDef | null {
    const weapon = this.weaponStash[index]
    if (!weapon) return null
    const previous = this.weapon
    if (previous && previous.id !== weapon.id) this.ensureWeaponStored(previous)
    this.weapon = weapon
    this.weaponAttributeCharges = new Map<WeaponAttributeId, number>()
    this.syncWeaponAttributeCharges()
    return weapon
  }

  equipArmorByIndex(index: number): ArmorDef | null {
    const armor = this.armorStash[index]
    if (!armor) return null
    const previous = this.armor
    if (previous && previous.id !== armor.id) this.ensureArmorStored(previous)
    this.armor = armor
    return armor
  }

  reorderSkill(index: number, delta: number): boolean {
    const source = index
    const target = source + delta
    if (source < 0 || source >= this.knownSkills.length) return false
    if (target < 0 || target >= this.knownSkills.length) return false
    if (delta === 0) return true
    const [skill] = this.knownSkills.splice(source, 1)
    this.knownSkills.splice(target, 0, skill)
    return true
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
        messages.push(`${status.def.name}：生命 ${before} -> ${after} (${sign}${delta})`)
      }
      const remainingTurns = status.remaining - 1
      if (remainingTurns > 0) {
        remaining.push({ def: status.def, remaining: remainingTurns })
      } else {
        messages.push(`狀態結束：${status.def.name}`)
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
        if (skill) messages.push(`${skill.name} 已冷卻完畢。`)
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
      return `狀態延長：${def.name}（剩餘 ${refreshed} 回合）`
    }
    this.activeStatuses.push({ def, remaining: duration })
    return `獲得狀態：${def.name}（${duration} 回合）`
  }

  applyStatusGrants(grants?: StatusGrant[]): string[] {
    if (!Array.isArray(grants) || !grants.length) return []
    const lines: string[] = []
    for (const grant of grants) {
      const def = getStatusDef(grant.id)
      if (!def) {
        lines.push(`未知的狀態：${grant.id}`)
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
    if (!def) return `未知的技能：${id}`
    if (this.knownSkills.some(skill => skill.id === def.id)) {
      if (options?.silent) return null
      return `已知的技能：${def.name}`
    }
    this.knownSkills.push(def)
    this.skillCooldowns.set(def.id, 0)
    if (options?.silent) return null
    return `學會技能：${def.name}`
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
      append(`生命：${before} -> ${after}`)
    }

    if (typeof outcome.setHp === 'number') {
      const before = this.stats.hp
      const after = Math.max(outcome.setHp, 0)
      this.stats.hp = after
      append(`生命：${before} -> ${after}`)
    }


    if (outcome.giveKey) {
      if (!this.hasKey) {
        this.hasKey = true
        append('你妥善收好一把閃亮的鑰匙。')
      } else {
        append('你已經持有鑰匙，沒有任何變化。')
      }
    }

    if (Array.isArray(outcome.grantItems) && outcome.grantItems.length) {
      for (const grant of outcome.grantItems) {
        const def = getItemDef(grant.id)
        if (!def) {
          append(`謎樣的物品（${grant.id}）從你手中溜走。`)
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
      append(`金幣：${before} -> ${after}`)
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
