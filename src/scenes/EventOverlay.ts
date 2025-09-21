import Phaser from 'phaser'
import type { EventDef, EventOption, Vec2 } from '../core/Types'
import type { GameScene } from './GameScene'

export type EventInitData = {
  event: EventDef
  pos: Vec2
}

export type EventResolution =
  | { type: 'option'; option: EventOption }
  | { type: 'skip' }

export class EventOverlay {
  private readonly host: GameScene
  isActive = false

  private event!: EventDef
  private eventPos!: Vec2
  private selectedIndex = -1
  private resolved = false
  private resolution: EventResolution | null = null

  private backdrop?: Phaser.GameObjects.Rectangle
  private panel?: Phaser.GameObjects.Rectangle
  private titleText?: Phaser.GameObjects.Text
  private descriptionText?: Phaser.GameObjects.Text
  private optionTexts: Phaser.GameObjects.Text[] = []
  private resultText?: Phaser.GameObjects.Text
  private instructionText?: Phaser.GameObjects.Text

  constructor(scene: GameScene) {
    this.host = scene
  }

  open(data: EventInitData) {
    if (this.isActive) return

    this.isActive = true
    this.event = data.event
    this.eventPos = data.pos
    this.selectedIndex = -1
    this.resolved = false
    this.resolution = null

    this.createUI()
    this.updateOptionStyles()
    this.updateInstructions()

    this.host.input.keyboard?.on('keydown', this.handleKey, this)
  }

  close() {
    if (!this.isActive) return

    this.isActive = false
    this.host.input.keyboard?.off('keydown', this.handleKey, this)

    const elements: (Phaser.GameObjects.GameObject | undefined)[] = [
      this.backdrop,
      this.panel,
      this.titleText,
      this.descriptionText,
      this.resultText,
      this.instructionText,
      ...this.optionTexts
    ]
    elements.forEach(el => el?.destroy())

    this.backdrop = undefined
    this.panel = undefined
    this.titleText = undefined
    this.descriptionText = undefined
    this.resultText = undefined
    this.instructionText = undefined
    this.optionTexts = []

    this.host.completeEvent(this.eventPos, this.resolution ?? { type: 'skip' })
  }

  private createUI() {
    const { width, height } = this.host.scale
    const panelWidth = 660
    const panelHeight = 420
    const depthBase = 2400

    this.backdrop = this.host.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.55)
      .setScrollFactor(0)
      .setDepth(depthBase)
      .setInteractive({ useHandCursor: false })

    this.panel = this.host.add
      .rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x07121a, 0.92)
      .setStrokeStyle(2, 0x4fa6ff, 0.85)
      .setScrollFactor(0)
      .setDepth(depthBase + 1)

    const panelTop = height / 2 - panelHeight / 2
    const panelLeft = width / 2 - panelWidth / 2

    this.titleText = this.host.add
      .text(width / 2, panelTop + 18, this.event.title, { fontSize: '24px', color: '#ffffff' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.descriptionText = this.host.add
      .text(panelLeft + 28, (this.titleText?.y ?? panelTop) + 48, this.event.description, {
        fontSize: '16px',
        color: '#cfe',
        wordWrap: { width: panelWidth - 56 },
        lineSpacing: 6
      })
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    let optionsY = (this.descriptionText?.y ?? panelTop) + (this.descriptionText?.height ?? 0) + 24

    this.optionTexts = this.event.options.map((option, idx) => {
      const text = this.host.add
        .text(panelLeft + 40, optionsY, `${idx + 1}. ${option.label}`, { fontSize: '18px', color: '#ffffff' })
        .setScrollFactor(0)
        .setDepth(depthBase + 2)
      optionsY += text.height + 10
      return text
    })

    this.resultText = this.host.add
      .text(width / 2, panelTop + panelHeight - 120, '', {
        fontSize: '16px',
        color: '#ffe9a6',
        wordWrap: { width: panelWidth - 60 },
        align: 'center' as const
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.instructionText = this.host.add
      .text(width / 2, panelTop + panelHeight - 54, '', { fontSize: '14px', color: '#9fd' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)
  }

  private updateOptionStyles() {
    this.optionTexts.forEach((text, idx) => {
      const isSelected = idx === this.selectedIndex
      text.setColor(isSelected ? '#ffe066' : '#ffffff')
      text.setAlpha(this.resolved && !isSelected ? 0.55 : 1)
    })
  }

  private showResult(message: string) {
    this.resultText?.setText(message)
  }

  private resolveOption(index: number) {
    if (this.resolved) return
    const option = this.event.options[index]
    if (!option) return

    this.selectedIndex = index
    const message = this.host.applyEventOutcome(option.outcome)
    this.resolution = { type: 'option', option }
    this.resolved = true
    this.showResult(message)
    this.updateOptionStyles()
    this.updateInstructions()
  }

  private resolveSkip() {
    if (this.resolved) return
    this.selectedIndex = -1
    this.resolution = { type: 'skip' }
    this.resolved = true
    this.showResult('你選擇按兵不動，沒有任何改變。')
    this.updateOptionStyles()
    this.updateInstructions()
  }

  private updateInstructions() {
    if (!this.instructionText) return

    let message: string
    if (!this.resolved) {
      const count = this.event.options.length
      message = `按 1-${count} 選擇，按 Esc 離開。`
    } else {
      message = '按 Enter / 空白鍵 / Esc 繼續。'
    }

    this.instructionText.setText(message)
  }

  private handleKey = (event: KeyboardEvent) => {
    if (!this.isActive) return

    if (!this.resolved) {
      if (event.key === 'Escape') {
        event.preventDefault()
        this.resolveSkip()
        return
      }

      const numeric = Number.parseInt(event.key, 10)
      if (!Number.isNaN(numeric)) {
        const index = numeric - 1
        if (index >= 0 && index < this.event.options.length) {
          event.preventDefault()
          this.resolveOption(index)
        }
      }
      return
    }

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar' || event.key === 'Space' || event.key === 'Escape') {
      event.preventDefault()
      this.close()
    }
  }
}

export default EventOverlay



