import Phaser from 'phaser'
import type { ItemDef, ShopDef, ShopOffer, Vec2 } from '../core/Types'
import type { GameScene } from './GameScene'

export type ShopInventoryEntry = { offer: ShopOffer; item: ItemDef }

export type ShopInitData = {
  shop: ShopDef
  entries: ShopInventoryEntry[]
  coins: number
  pos: Vec2
}

export type ShopResolution =
  | { type: 'leave' }
  | { type: 'purchase'; entry: ShopInventoryEntry }

export class ShopOverlay {
  private readonly host: GameScene
  isActive = false

  private shop!: ShopDef
  private entries: ShopInventoryEntry[] = []
  private coins = 0
  private pos!: Vec2
  private selectedIndex = -1
  private lastResolution: ShopResolution = { type: 'leave' }

  private backdrop?: Phaser.GameObjects.Rectangle
  private panel?: Phaser.GameObjects.Rectangle
  private titleText?: Phaser.GameObjects.Text
  private descriptionText?: Phaser.GameObjects.Text
  private coinText?: Phaser.GameObjects.Text
  private optionTexts: Phaser.GameObjects.Text[] = []
  private detailText?: Phaser.GameObjects.Text
  private resultText?: Phaser.GameObjects.Text
  private instructionText?: Phaser.GameObjects.Text

  constructor(scene: GameScene) {
    this.host = scene
  }

  open(data: ShopInitData) {
    if (this.isActive) return

    this.isActive = true
    this.shop = data.shop
    this.entries = data.entries
    this.coins = data.coins
    this.pos = data.pos
    this.selectedIndex = this.entries.length ? 0 : -1
    this.lastResolution = { type: 'leave' }

    this.createUI()
    this.updateOptionStyles()
    this.updateCoins()
    this.updateDetail(this.selectedIndex)
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
      this.coinText,
      this.detailText,
      this.resultText,
      this.instructionText,
      ...this.optionTexts
    ]
    elements.forEach(el => el?.destroy())

    this.backdrop = undefined
    this.panel = undefined
    this.titleText = undefined
    this.descriptionText = undefined
    this.coinText = undefined
    this.detailText = undefined
    this.resultText = undefined
    this.instructionText = undefined
    this.optionTexts = []

    this.host.completeShop(this.pos, this.lastResolution)
  }

  private createUI() {
    const { width, height } = this.host.scale
    const panelWidth = 760
    const panelHeight = 520
    const depthBase = 2600

    this.backdrop = this.host.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.55)
      .setScrollFactor(0)
      .setDepth(depthBase)
      .setInteractive({ useHandCursor: false })

    this.panel = this.host.add
      .rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x101b24, 0.94)
      .setStrokeStyle(2, 0xffb347, 0.85)
      .setScrollFactor(0)
      .setDepth(depthBase + 1)

    const panelTop = height / 2 - panelHeight / 2
    const panelLeft = width / 2 - panelWidth / 2
    const contentLeft = panelLeft + 36

    this.titleText = this.host.add
      .text(width / 2, panelTop + 22, this.shop.title, { fontSize: '26px', color: '#ffe9a6' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.descriptionText = this.host.add
      .text(contentLeft, (this.titleText?.y ?? panelTop) + 52, this.shop.description, {
        fontSize: '16px',
        color: '#d0ecff',
        wordWrap: { width: panelWidth - 72 },
        lineSpacing: 6,
      })
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.coinText = this.host.add
      .text(panelLeft + panelWidth - 40, panelTop + 32, '', { fontSize: '18px', color: '#ffd27f' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    const listTop = (this.descriptionText?.y ?? panelTop) + (this.descriptionText?.height ?? 0) + 32
    const listWidth = Math.min(340, panelWidth - 220)
    let optionsY = listTop

    this.optionTexts = this.entries.map((entry, idx) => {
      const qtyLabel = entry.offer.quantity && entry.offer.quantity > 1 ? ` x${entry.offer.quantity}` : ''
      const label = `${idx + 1}. ${entry.item.name}${qtyLabel} - ${entry.offer.price} 金幣`
      const text = this.host.add
        .text(contentLeft, optionsY, label, {
          fontSize: '18px',
          color: '#ffffff',
          wordWrap: { width: listWidth - 12 },
          lineSpacing: 6,
        })
        .setScrollFactor(0)
        .setDepth(depthBase + 2)
      optionsY += text.height + 16
      return text
    })

    const detailLeft = contentLeft + listWidth + 32
    const detailWidth = Math.max(240, panelWidth - (detailLeft - panelLeft) - 36)
    const detailTop = listTop

    this.detailText = this.host.add
      .text(detailLeft, detailTop, '', {
        fontSize: '16px',
        color: '#cfe',
        wordWrap: { width: detailWidth },
        lineSpacing: 6,
      })
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.resultText = this.host.add
      .text(detailLeft, panelTop + panelHeight - 116, '', {
        fontSize: '15px',
        color: '#ffe9a6',
        wordWrap: { width: detailWidth },
        lineSpacing: 5,
      })
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.instructionText = this.host.add
      .text(width / 2, panelTop + panelHeight - 52, '', {
        fontSize: '14px',
        color: '#9fd',
        wordWrap: { width: panelWidth - 96 },
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)
  }

  private updateCoins() {
    this.coinText?.setText(`金幣：${this.coins}`)
  }

  private updateOptionStyles() {
    this.optionTexts.forEach((text, idx) => {
      const isSelected = idx === this.selectedIndex
      text.setColor(isSelected ? '#ffd27f' : '#ffffff')
    })
  }

  private updateDetail(index: number) {
    if (!this.detailText) return
    const entry = this.entries[index]
    if (!entry) {
      this.detailText.setText('')
      return
    }

    const lines: string[] = []
    if (entry.item.description) lines.push(entry.item.description)
    if (entry.item.effect.message) lines.push(`效果：${entry.item.effect.message}`)
    this.detailText.setText(lines.join('\n'))
  }

  private showResult(message: string) {
    this.resultText?.setText(message)
  }

  private updateInstructions() {
    if (!this.instructionText) return
    const count = this.entries.length
    const range = count > 0 ? `1-${count}` : ''
    const buyHint = count > 0 ? `按 ${range} 購買。` : '沒有可販售的物品。'
    this.instructionText.setText(`${buyHint} Esc 離開。`)
  }

  private attemptPurchase(index: number) {
    if (index < 0 || index >= this.entries.length) return
    const entry = this.entries[index]
    this.selectedIndex = index
    this.updateOptionStyles()
    this.updateDetail(index)

    const result = this.host.purchaseFromShop(entry)
    this.coins = result.coins
    this.updateCoins()
    this.showResult(result.message)
    this.lastResolution = result.success ? { type: 'purchase', entry } : this.lastResolution
  }

  private moveSelection(offset: number) {
    if (!this.entries.length) return
    const next = (this.selectedIndex + offset + this.entries.length) % this.entries.length
    this.selectedIndex = next
    this.updateOptionStyles()
    this.updateDetail(next)
  }

  private handleKey = (event: KeyboardEvent) => {
    if (!this.isActive) return

    if (event.key === 'Escape') {
      event.preventDefault()
      this.close()
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      this.moveSelection(-1)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      this.moveSelection(1)
      return
    }

    const numeric = Number.parseInt(event.key, 10)
    if (!Number.isNaN(numeric)) {
      const index = numeric - 1
      if (index >= 0 && index < this.entries.length) {
        event.preventDefault()
        this.attemptPurchase(index)
      }
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (this.selectedIndex >= 0) this.attemptPurchase(this.selectedIndex)
    }
  }
}

export default ShopOverlay


