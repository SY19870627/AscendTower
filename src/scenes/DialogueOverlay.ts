import Phaser from 'phaser'
import type { NpcDef, Vec2 } from '../core/Types'
import type { GameScene } from './GameScene'

export type DialogueInit = {
  npc: NpcDef
  pos: Vec2
}

export class DialogueOverlay {
  private readonly host: GameScene
  isActive = false

  private npc?: NpcDef
  private npcPos?: Vec2
  private index = 0
  private lines: string[] = []

  private backdrop?: Phaser.GameObjects.Rectangle
  private panel?: Phaser.GameObjects.Rectangle
  private nameText?: Phaser.GameObjects.Text
  private bodyText?: Phaser.GameObjects.Text
  private instructionText?: Phaser.GameObjects.Text

  constructor(scene: GameScene) {
    this.host = scene
  }

  open(data: DialogueInit) {
    if (this.isActive) return

    this.isActive = true
    this.npc = data.npc
    this.npcPos = data.pos
    this.lines = data.npc.lines.length ? [...data.npc.lines] : ['...']
    this.index = 0

    this.createUI()
    this.refresh()
    this.host.input.keyboard?.on('keydown', this.handleKey, this)
  }

  close() {
    if (!this.isActive) return
    this.teardown()
  }

  private finish() {
    if (!this.isActive || !this.npc || !this.npcPos) {
      this.teardown()
      return
    }
    const payload = { npc: this.npc, pos: this.npcPos }
    this.teardown()
    this.host.resolveNpcInteraction(payload)
  }

  private teardown() {
    this.isActive = false
    this.host.input.keyboard?.off('keydown', this.handleKey, this)
    this.backdrop?.destroy()
    this.panel?.destroy()
    this.nameText?.destroy()
    this.bodyText?.destroy()
    this.instructionText?.destroy()
    this.backdrop = undefined
    this.panel = undefined
    this.nameText = undefined
    this.bodyText = undefined
    this.instructionText = undefined
    this.lines = []
    this.index = 0
    this.npc = undefined
    this.npcPos = undefined
  }

  private createUI() {
    const { width, height } = this.host.scale
    const panelWidth = 560
    const panelHeight = 280
    const depthBase = 3100

    this.backdrop = this.host.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.55)
      .setScrollFactor(0)
      .setDepth(depthBase)
      .setInteractive({ useHandCursor: false })

    this.panel = this.host.add
      .rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x101b24, 0.94)
      .setStrokeStyle(2, 0x87e4ff, 0.85)
      .setScrollFactor(0)
      .setDepth(depthBase + 1)

    const panelTop = height / 2 - panelHeight / 2

    this.nameText = this.host.add
      .text(width / 2, panelTop + 24, this.npc?.name ?? '???', { fontSize: '22px', color: '#ffe9a6' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.bodyText = this.host.add
      .text(width / 2, panelTop + 80, '', {
        fontSize: '18px',
        color: '#cfe',
        align: 'center',
        wordWrap: { width: panelWidth - 60 }
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.instructionText = this.host.add
      .text(width / 2, panelTop + panelHeight - 48, '', {
        fontSize: '14px',
        color: '#cfe'
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)
  }

  private refresh() {
    if (!this.isActive || !this.npc) return
    if (this.nameText) this.nameText.setText(this.npc.name)
    if (this.bodyText) this.bodyText.setText(this.lines[this.index] ?? '...')
    const total = this.lines.length
    const instructions = total > 0
      ? `按 Enter 繼續（${this.index + 1}/${total}），Esc 關閉`
      : '按 Esc 關閉'
    this.instructionText?.setText(instructions)
  }

  private advance() {
    if (this.index >= this.lines.length - 1) {
      this.finish()
      return
    }
    this.index += 1
    this.refresh()
  }

  private handleKey = (event: KeyboardEvent) => {
    if (!this.isActive) return
    const key = event.key
    if (key === 'Escape') {
      event.preventDefault()
      this.close()
      return
    }
    if (key === 'Enter' || key === ' ' || key === 'Spacebar' || key === 'Space') {
      event.preventDefault()
      this.advance()
    }
  }
}

export default DialogueOverlay
