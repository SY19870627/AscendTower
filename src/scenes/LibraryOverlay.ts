import Phaser from 'phaser'
import type { ArmorDef, SkillDef, WeaponDef } from '../core/Types'
import type { GameScene } from './GameScene'
import type { InventoryEntry } from '../game/player/PlayerState'
import { getArmorAttributes, sumArmorAttributeBonuses } from '../game/armors/armorAttributes'

export type LibraryCategory = 'weapons' | 'armor' | 'items' | 'skills'

export class LibraryOverlay {
  private readonly host: GameScene
  isActive = false

  private category: LibraryCategory = 'weapons'
  private selectedIndex = 0
  private statusMessage = ''

  private backdrop?: Phaser.GameObjects.Rectangle
  private panel?: Phaser.GameObjects.Rectangle
  private titleText?: Phaser.GameObjects.Text
  private listText?: Phaser.GameObjects.Text
  private detailText?: Phaser.GameObjects.Text
  private instructionText?: Phaser.GameObjects.Text

  constructor(scene: GameScene) {
    this.host = scene
  }

  open(options?: { category?: LibraryCategory }) {
    if (this.isActive) {
      if (options?.category && options.category !== this.category) {
        this.category = options.category
        this.selectedIndex = 0
      }
      this.statusMessage = ''
      this.refresh()
      return
    }

    this.isActive = true
    if (options?.category) this.category = options.category
    this.selectedIndex = 0
    this.statusMessage = ''
    this.createUI()
    this.refresh()
    this.host.input.keyboard?.on('keydown', this.handleKey, this)
  }

  close() {
    if (!this.isActive) return
    this.isActive = false
    this.host.input.keyboard?.off('keydown', this.handleKey, this)
    this.backdrop?.destroy()
    this.panel?.destroy()
    this.titleText?.destroy()
    this.listText?.destroy()
    this.detailText?.destroy()
    this.instructionText?.destroy()
    this.backdrop = undefined
    this.panel = undefined
    this.titleText = undefined
    this.listText = undefined
    this.detailText = undefined
    this.instructionText = undefined
    this.statusMessage = ''
  }

  private createUI() {
    const { width, height } = this.host.scale
    const panelWidth = 680
    const panelHeight = 440
    const depthBase = 3200

    this.backdrop = this.host.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.55)
      .setScrollFactor(0)
      .setDepth(depthBase)
      .setInteractive({ useHandCursor: false })

    this.panel = this.host.add
      .rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x101b24, 0.94)
      .setStrokeStyle(2, 0x7fd4ff, 0.85)
      .setScrollFactor(0)
      .setDepth(depthBase + 1)

    const panelTop = height / 2 - panelHeight / 2
    const panelLeft = width / 2 - panelWidth / 2

    this.titleText = this.host.add
      .text(width / 2, panelTop + 18, '藏品總覽', { fontSize: '24px', color: '#ffe9a6' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.listText = this.host.add
      .text(panelLeft + 24, panelTop + 64, '', {
        fontSize: '16px',
        color: '#cfe',
        lineSpacing: 6,
        wordWrap: { width: panelWidth / 2 - 36 }
      })
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.detailText = this.host.add
      .text(panelLeft + panelWidth / 2 + 12, panelTop + 64, '', {
        fontSize: '15px',
        color: '#ffe9a6',
        lineSpacing: 6,
        wordWrap: { width: panelWidth / 2 - 36 }
      })
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.instructionText = this.host.add
      .text(panelLeft + 24, panelTop + panelHeight - 96, '', {
        fontSize: '14px',
        color: '#cfe',
        lineSpacing: 4,
        wordWrap: { width: panelWidth - 48 }
      })
      .setScrollFactor(0)
      .setDepth(depthBase + 2)
  }

  private handleKey = (event: KeyboardEvent) => {
    if (!this.isActive) return

    const key = event.key

    if (key === 'Escape' || key === 'L' || key === 'l') {
      event.preventDefault()
      this.close()
      return
    }

    if (key === 'ArrowUp') {
      event.preventDefault()
      this.moveSelection(-1)
      return
    }

    if (key === 'ArrowDown') {
      event.preventDefault()
      this.moveSelection(1)
      return
    }

    if (this.category === 'skills' && (key === '[' || key === ']')) {
      event.preventDefault()
      const delta = key === '[' ? -1 : 1
      this.reorderSelectedSkill(delta)
      return
    }

    if (key === 'Enter' || key === ' ' || key === 'Spacebar' || key === 'Space') {
      event.preventDefault()
      this.performAction()
      return
    }

    if (key === '1') {
      event.preventDefault()
      this.setCategory('weapons')
      return
    }

    if (key === '2') {
      event.preventDefault()
      this.setCategory('armor')
      return
    }

    if (key === '3') {
      event.preventDefault()
      this.setCategory('items')
      return
    }

    if (key === '4') {
      event.preventDefault()
      this.setCategory('skills')
      return
    }
  }

  private setCategory(category: LibraryCategory) {
    if (this.category === category) return
    this.category = category
    this.selectedIndex = 0
    this.statusMessage = ''
    this.refresh()
  }

  private moveSelection(delta: number) {
    const size = this.currentEntryCount()
    if (size <= 0) return
    this.selectedIndex = (this.selectedIndex + delta + size) % size
    this.refresh()
  }

  private currentEntryCount() {
    switch (this.category) {
      case 'weapons':
        return this.host.weaponStash?.length ?? 0
      case 'armor':
        return this.host.armorStash?.length ?? 0
      case 'items':
        return this.host.inventory?.length ?? 0
      case 'skills':
        return this.host.knownSkills?.length ?? 0
      default:
        return 0
    }
  }

  private refresh() {
    if (!this.isActive) return
    const view = this.buildView()
    this.titleText?.setText(view.title)
    this.listText?.setText(view.lines.join('\n'))
    this.detailText?.setText(view.detail)
    const instructionLines = [
      '[1] 武器  [2] 防具  [3] 道具  [4] 技能',
      '用 ↑/↓ 移動，Enter 裝備或使用，Esc 或 L 關閉。'
    ]
    if (this.statusMessage) instructionLines.push(this.statusMessage)
    this.instructionText?.setText(instructionLines.join('\n'))
  }

  private buildView(): { title: string; lines: string[]; detail: string } {
    switch (this.category) {
      case 'weapons':
        return this.buildWeaponView()
      case 'armor':
        return this.buildArmorView()
      case 'items':
        return this.buildItemView()
      case 'skills':
      default:
        return this.buildSkillView()
    }
  }

  private normalizeSelection(size: number) {
    if (size <= 0) {
      this.selectedIndex = 0
      return
    }
    if (this.selectedIndex >= size) this.selectedIndex = size - 1
    if (this.selectedIndex < 0) this.selectedIndex = 0
  }

  private buildWeaponView(): { title: string; lines: string[]; detail: string } {
    const stash: WeaponDef[] = this.host.weaponStash ?? []
    this.normalizeSelection(stash.length)
    const currentId = this.host.playerWeapon?.id ?? null
    const lines = stash.length
      ? stash.map((weapon, idx) => {
          const pointer = idx === this.selectedIndex ? '>' : ' '
          const equipped = weapon.id === currentId ? '[E]' : '   '
          return `${pointer} ${equipped} ${idx + 1}. ${weapon.name}（攻擊 ${weapon.atk}）`
        })
      : ['（空）']

    let detail = '未選擇任何武器。'
    const weapon = stash[this.selectedIndex]
    if (weapon) {
      const detailLines = [
        `${weapon.name}`,
        `攻擊 ${weapon.atk}`
      ]
      if (weapon.desc) detailLines.push(weapon.desc)
      detail = detailLines.join('\n')
    }

    return {
      title: '武備庫 - 武器',
      lines,
      detail
    }
  }

  private buildArmorView(): { title: string; lines: string[]; detail: string } {
    const stash: ArmorDef[] = this.host.armorStash ?? []
    this.normalizeSelection(stash.length)
    const currentId = this.host.playerArmor?.id ?? null
    const lines = stash.length
      ? stash.map((armor, idx) => {
          const pointer = idx === this.selectedIndex ? '>' : ' '
          const equipped = armor.id === currentId ? '[E]' : '   '
          const attributes = getArmorAttributes(armor.attributeIds ?? [])
          const attributeBonuses = sumArmorAttributeBonuses(attributes)
          const totalDef = armor.def + attributeBonuses.def
          const bonusText = attributeBonuses.def ? `（屬性 +${attributeBonuses.def}）` : ''
          return `${pointer} ${equipped} ${idx + 1}. ${armor.name}（防禦 ${totalDef}${bonusText}）`
        })
      : ['（空）']

    let detail = '未選擇任何防具。'
    const armor = stash[this.selectedIndex]
    if (armor) {
      const attributes = getArmorAttributes(armor.attributeIds ?? [])
      const attributeBonuses = sumArmorAttributeBonuses(attributes)
      const totalDef = armor.def + attributeBonuses.def
      const bonusText = attributeBonuses.def ? `（屬性 +${attributeBonuses.def}）` : ''
      const detailLines = [
        `${armor.name}`,
        `防禦 ${totalDef}${bonusText}`
      ]
      if (attributes.length) {
        for (const attribute of attributes) {
          detailLines.push(`屬性 ${attribute.name}`)
          detailLines.push(attribute.description)
        }
      }
      if (armor.desc) detailLines.push(armor.desc)
      detail = detailLines.join('\n')
    }

    return {
      title: '武備庫 - 防具',
      lines,
      detail
    }
  }

  private buildItemView(): { title: string; lines: string[]; detail: string } {
    const inventory: InventoryEntry[] = this.host.inventory ?? []
    this.normalizeSelection(inventory.length)
    const lines = inventory.length
      ? inventory.map((stack, idx) => {
          const pointer = idx === this.selectedIndex ? '>' : ' '
          const qty = stack.quantity > 1 ? ` x${stack.quantity}` : ''
          return `${pointer}   ${idx + 1}. ${stack.def.name}${qty}`
        })
      : ['（空）']

    let detail = '未選擇任何道具。'
    const stack = inventory[this.selectedIndex]
    if (stack) {
      const detailLines = [stack.def.name]
      if (stack.def.description) detailLines.push(stack.def.description)
      if (stack.def.effect?.message) detailLines.push(stack.def.effect.message)
      detail = detailLines.join('\n')
    }

    return {
      title: '行囊 - 道具',
      lines,
      detail
    }
  }

  private buildSkillView(): { title: string; lines: string[]; detail: string } {
    const skills: SkillDef[] = this.host.knownSkills ?? []
    this.normalizeSelection(skills.length)
    const lines = skills.length
      ? skills.map((skill, idx) => {
          const pointer = idx === this.selectedIndex ? '>' : ' '
          const cooldown = this.host.getSkillCooldown?.(skill.id) ?? 0
          const state = cooldown > 0 ? `CD ${cooldown}` : '就緒'
          return `${pointer}   ${idx + 1}. ${skill.name} (${state})`
        })
      : ['（空）']

    let detail = '未選擇任何技能。'
    const skill = skills[this.selectedIndex]
    if (skill) {
      const detailLines = [
        `${skill.name}`,
        `冷卻 ${skill.cooldown}`,
        skill.description
      ]
      if (skill.effect?.message) detailLines.push(skill.effect.message)
      detail = detailLines.join('\n')
    }

    return {
      title: '靈典 - 技能',
      lines,
      detail
    }
  }

  private reorderSelectedSkill(delta: number) {
    const skills = this.host.knownSkills ?? []
    if (!skills.length) {
      this.statusMessage = '沒有可調整的技能。'
      this.refresh()
      return
    }
    const target = this.selectedIndex + delta
    if (target < 0 || target >= skills.length) {
      this.statusMessage = delta < 0 ? '已經在最上方。' : '已經在最下方。'
      this.refresh()
      return
    }
    const moved = this.host.reorderSkill?.(this.selectedIndex, delta) ?? false
    if (!moved) {
      this.statusMessage = '無法調整技能順序。'
      this.refresh()
      return
    }
    const updatedSkills = this.host.knownSkills ?? skills
    this.selectedIndex = target
    const skill = updatedSkills[target]
    this.statusMessage = skill ? `已將 ${skill.name} ${delta < 0 ? '上移' : '下移'}。` : '技能順序已更新。'
    this.refresh()
  }
  private performAction() {
    switch (this.category) {
      case 'weapons': {
        const result = this.host.equipWeaponFromLibrary(this.selectedIndex)
        this.statusMessage = result.message
        this.refresh()
        return
      }
      case 'armor': {
        const result = this.host.equipArmorFromLibrary(this.selectedIndex)
        this.statusMessage = result.message
        this.refresh()
        return
      }
      case 'items': {
        const success = this.host.useInventorySlot?.(this.selectedIndex) ?? false
        this.statusMessage = success ? '已使用道具。' : '該欄位沒有道具。'
        this.refresh()
        return
      }
      case 'skills':
      default: {
        const skill = this.host.knownSkills?.[this.selectedIndex]
        const handled = this.host.useSkill?.(this.selectedIndex) ?? false
        if (skill) {
          this.statusMessage = handled ? `已發出技能指令：${skill.name}。` : `無法使用 ${skill.name}。`
        } else {
          this.statusMessage = handled ? '已發出技能指令。' : '沒有可用技能。'
        }
        this.refresh()
      }
    }
  }
}

export default LibraryOverlay


