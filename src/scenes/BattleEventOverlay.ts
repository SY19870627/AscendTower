import Phaser from 'phaser'
import type { BattleEventDef, EventOption, Vec2 } from '../core/Types'
import type { GameScene } from './GameScene'

export type BattleEventPromptData = {
  mode: 'prompt'
  event: BattleEventDef
  pos: Vec2
  totalWaves: number
  remainingWaves: number
  onFight: () => void
  onRetreat: () => void
}

export type BattleEventRewardData = {
  mode: 'rewards'
  event: BattleEventDef
  rewards: EventOption[]
  onSelect: (option: EventOption) => void
}

export type BattleEventOverlayData = BattleEventPromptData | BattleEventRewardData

export class BattleEventOverlay {
  private readonly host: GameScene
  isActive = false

  private data: BattleEventOverlayData | null = null

  private backdrop?: Phaser.GameObjects.Rectangle
  private panel?: Phaser.GameObjects.Rectangle
  private titleText?: Phaser.GameObjects.Text
  private descriptionText?: Phaser.GameObjects.Text
  private statusText?: Phaser.GameObjects.Text
  private optionTexts: Phaser.GameObjects.Text[] = []
  private instructionText?: Phaser.GameObjects.Text

  constructor(scene: GameScene) {
    this.host = scene
  }

  open(data: BattleEventOverlayData) {
    this.close()
    this.isActive = true
    this.data = data
    this.createUI()
    this.host.input.keyboard?.on('keydown', this.handleKey, this)
  }

  close() {
    if (!this.isActive) {
      this.data = null
      return
    }

    this.isActive = false
    this.host.input.keyboard?.off('keydown', this.handleKey, this)
    const elements: (Phaser.GameObjects.GameObject | undefined)[] = [
      this.backdrop,
      this.panel,
      this.titleText,
      this.descriptionText,
      this.statusText,
      this.instructionText,
      ...this.optionTexts
    ]
    elements.forEach(el => el?.destroy())

    this.backdrop = undefined
    this.panel = undefined
    this.titleText = undefined
    this.descriptionText = undefined
    this.statusText = undefined
    this.instructionText = undefined
    this.optionTexts = []
    this.data = null
  }

  private createUI() {
    if (!this.data) return
    const { width, height } = this.host.scale
    const panelWidth = 660
    const panelHeight = this.data.mode === 'rewards' ? 460 : 420
    const depthBase = 2500

    this.backdrop = this.host.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
      .setScrollFactor(0)
      .setDepth(depthBase)
      .setInteractive({ useHandCursor: false })

    this.panel = this.host.add
      .rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x040c14, 0.9)
      .setStrokeStyle(2, 0xff9c52, 0.8)
      .setScrollFactor(0)
      .setDepth(depthBase + 1)

    const panelTop = height / 2 - panelHeight / 2
    const panelLeft = width / 2 - panelWidth / 2
    const contentLeft = panelLeft + 32

    this.titleText = this.host.add
      .text(width / 2, panelTop + 20, this.data.event.title, {
        fontSize: '26px',
        color: '#ffe6c3'
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.descriptionText = this.host.add
      .text(contentLeft, (this.titleText?.y ?? panelTop) + 54, this.data.event.description, {
        fontSize: '17px',
        color: '#fff4d9',
        wordWrap: { width: panelWidth - 64 },
        lineSpacing: 6
      })
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    const statusTop = (this.descriptionText?.y ?? panelTop) + (this.descriptionText?.height ?? 0) + 26
    this.statusText = this.host.add
      .text(width / 2, statusTop, this.buildStatusText(), {
        fontSize: '16px',
        color: '#ffe0a3',
        align: 'center',
        wordWrap: { width: panelWidth - 80 },
        lineSpacing: 4
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.renderOptions(panelTop, panelHeight, contentLeft)
    this.renderInstructions(panelTop, panelHeight)
  }

  private buildStatusText(): string {
    if (!this.data || this.data.mode !== 'prompt') {
      return this.data?.mode === 'rewards'
        ? '連續突破封鎖後，你得以從戰利品中選擇一份獎勵。'
        : ''
    }
    const total = Math.max(1, Math.floor(this.data.totalWaves))
    const remaining = Math.max(0, Math.floor(this.data.remainingWaves))
    const cleared = Math.max(0, total - remaining)
    if (remaining === total) {
      return `波次：${total}。敵人尚未察覺，你可先手。`
    }
    if (remaining <= 0) {
      return `波次：${total}。封鎖線已被擊破。`
    }
    return `波次：${total}。已清除 ${cleared} 波，尚餘 ${remaining} 波。`
  }

  private renderOptions(panelTop: number, _panelHeight: number, contentLeft: number) {
    if (!this.data) return
    this.optionTexts.forEach(text => text.destroy())
    this.optionTexts = []

    const optionBaseY = (this.statusText?.y ?? panelTop) + (this.statusText?.height ?? 0) + 24
    if (this.data.mode === 'prompt') {
      const options: { label: string; hotkey: string }[] = [
        { label: '1. 迎戰', hotkey: '1' },
        { label: '2. 撤退', hotkey: '2' }
      ]
      options.forEach((option, idx) => {
        const text = this.host.add
          .text(contentLeft, optionBaseY + idx * 34, option.label, {
            fontSize: '18px',
            color: '#ffffff'
          })
          .setScrollFactor(0)
          .setDepth((this.panel?.depth ?? 0) + 2)
        this.optionTexts.push(text)
      })
      return
    }

    const rewards = this.data.rewards
    rewards.forEach((option, idx) => {
      const text = this.host.add
        .text(contentLeft, optionBaseY + idx * 64, `${idx + 1}. ${option.label}`, {
          fontSize: '18px',
          color: '#ffffff',
          wordWrap: { width: (this.panel?.width ?? 600) - 72 },
          lineSpacing: 6
        })
        .setScrollFactor(0)
        .setDepth((this.panel?.depth ?? 0) + 2)
      this.optionTexts.push(text)
    })
  }

  private renderInstructions(panelTop: number, panelHeight: number) {
    if (!this.data) return
    const instruction = this.data.mode === 'prompt'
      ? '按 1 迎戰、按 2 或 Esc 撤退。'
      : '選擇 1-3 其一的獎勵。'

    this.instructionText = this.host.add
      .text(this.host.scale.width / 2, panelTop + panelHeight - 56, instruction, {
        fontSize: '15px',
        color: '#ffd8a2',
        wordWrap: { width: (this.panel?.width ?? 600) - 80 },
        align: 'center'
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth((this.panel?.depth ?? 0) + 2)
  }

  private handleKey(event: KeyboardEvent) {
    if (!this.isActive || !this.data) return

    if (this.data.mode === 'prompt') {
      if (['1', 'Enter', ' ', 'Spacebar', 'Space'].includes(event.key)) {
        event.preventDefault()
        const onFight = this.data.onFight
        this.close()
        onFight()
        return
      }
      if (event.key === '2' || event.key === 'Escape') {
        event.preventDefault()
        const onRetreat = this.data.onRetreat
        this.close()
        onRetreat()
        return
      }
      return
    }

    if (this.data.mode === 'rewards') {
      if (!['1', '2', '3'].includes(event.key)) return
      const index = Number(event.key) - 1
      const option = this.data.rewards[index]
      if (!option) return
      event.preventDefault()
      const onSelect = this.data.onSelect
      this.close()
      onSelect(option)
    }
  }
}

export default BattleEventOverlay
