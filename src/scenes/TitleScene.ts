import Phaser from 'phaser'
import { hasSavedGame } from './GameScene'

type MenuKey = 'new' | 'load' | 'story' | 'quit'

type MenuOption = {
  key: MenuKey
  label: string
}

export class TitleScene extends Phaser.Scene {
  private readonly menuOptions: MenuOption[] = [
    { key: 'new', label: '新開始冒險' },
    { key: 'load', label: '讀取存檔' },
    { key: 'story', label: '故事劇情' }
  ]
  private menuTexts: Phaser.GameObjects.Text[] = []
  private selectedIndex = 0
  private noticeText?: Phaser.GameObjects.Text
  private noticeTimer?: Phaser.Time.TimerEvent
  private readonly storyParagraphs = [
    '凡人皆仰望天梯。有人求道，有人求名，但多數只求證明自己並非塵埃。',
    '登仙塔再度開啟，十層高築，萬象皆亂於天機，每一步皆陌生。',
    '你只是芸芸散修之一，肩無宗門庇蔭，僅憑一口氣踏上石階。',
    '塔門轟然闔上，前路或仙緣，或輪迴。'
  ]
  private isStoryOpen = false
  private storyBackdrop?: Phaser.GameObjects.Rectangle
  private storyPanel?: Phaser.GameObjects.Rectangle
  private storyText?: Phaser.GameObjects.Text
  private storyInstruction?: Phaser.GameObjects.Text

  constructor() {
    super('TitleScene')
  }

  create() {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor(0x0a1414)

    this.add.text(width / 2, height * 0.22, '登仙塔', {
      fontFamily: 'serif',
      fontSize: '64px',
      color: '#ffefb0'
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.32, '攀登吧，挑戰者', {
      fontFamily: 'serif',
      fontSize: '26px',
      color: '#9fd'
    }).setOrigin(0.5)

    const startY = height * 0.5
    const spacing = 48
    this.menuTexts = this.menuOptions.map((option, index) => {
      return this.add.text(width / 2, startY + index * spacing, option.label, {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: '#cfe'
      }).setOrigin(0.5)
    })

    this.add.text(width / 2, height * 0.78, '↑/↓ 選擇   Enter 確認', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#9fd'
    }).setOrigin(0.5)

    this.noticeText = this.add.text(width / 2, height * 0.86, '', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#ffd27f'
    }).setOrigin(0.5)

    this.input.keyboard?.on('keydown', this.handleKey, this)
    this.events.on('shutdown', () => {
      this.input.keyboard?.off('keydown', this.handleKey, this)
      this.closeStory()
    })
    this.events.on('sleep', () => this.closeStory())
    this.events.on('wake', () => {
      this.closeStory()
      this.refreshMenu()
      this.setNotice('')
    })

    this.refreshMenu()
  }

  private handleKey(event: KeyboardEvent) {
    const key = event.key
    if (this.isStoryOpen) {
      if (key === 'Escape' || key === 'Enter' || key === ' ' || key === 'Spacebar') {
        event.preventDefault()
        this.closeStory()
      }
      return
    }
    if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      event.preventDefault()
      this.moveSelection(-1)
      return
    }
    if (key === 'ArrowDown' || key === 's' || key === 'S') {
      event.preventDefault()
      this.moveSelection(1)
      return
    }
    if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
      event.preventDefault()
      this.activateSelection()
      return
    }    
  }

  private moveSelection(delta: number) {
    const count = this.menuOptions.length
    this.selectedIndex = (this.selectedIndex + delta + count) % count
    this.refreshMenu()
  }

  private activateSelection() {
    const option = this.menuOptions[this.selectedIndex]
    switch (option.key) {
      case 'new':
        this.scene.start('GameScene', { reset: true, floor: 1 })
        break
      case 'load':
        if (!hasSavedGame()) {
          this.setNotice('尚未找到可讀取的存檔。')
          return
        }
        this.scene.start('GameScene', { startMode: 'load' })
        break
      case 'story':
        this.openStory()
        break
    }
  }

  private openStory() {
    if (this.isStoryOpen) return
    this.isStoryOpen = true
    this.setNotice('')

    const { width, height } = this.scale
    const depthBase = 900
    const panelWidth = Math.min(720, width * 0.82)
    const panelHeight = Math.min(420, height * 0.76)
    const panelLeft = width / 2 - panelWidth / 2
    const panelTop = height / 2 - panelHeight / 2

    this.storyBackdrop = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.78)
      .setScrollFactor(0)
      .setDepth(depthBase)

    this.storyPanel = this.add
      .rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x18212b, 0.92)
      .setStrokeStyle(2, 0x7fd4ff, 0.88)
      .setScrollFactor(0)
      .setDepth(depthBase + 1)

    const storyText = this.storyParagraphs.join('\n\n')
    this.storyText = this.add
      .text(panelLeft + 32, panelTop + 48, storyText, {
        fontFamily: 'serif',
        fontSize: '20px',
        color: '#ffefb0',
        lineSpacing: 12,
        wordWrap: { width: panelWidth - 64 }
      })
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.storyInstruction = this.add
      .text(width / 2, panelTop + panelHeight - 32, 'Enter / Space 關閉   Esc 返回', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#9fd'
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)
  }

  private closeStory() {
    if (!this.isStoryOpen) return
    this.isStoryOpen = false
    this.storyBackdrop?.destroy()
    this.storyPanel?.destroy()
    this.storyText?.destroy()
    this.storyInstruction?.destroy()
    this.storyBackdrop = undefined
    this.storyPanel = undefined
    this.storyText = undefined
    this.storyInstruction = undefined
  }

  private refreshMenu() {
    const loadAvailable = hasSavedGame()
    this.menuTexts.forEach((text, index) => {
      const option = this.menuOptions[index]
      const isSelected = index === this.selectedIndex
      const baseColor = option.key === 'load' && !loadAvailable ? '#666' : '#cfe'
      const color = isSelected ? '#ffec8b' : baseColor
      text.setColor(color)
      text.setAlpha(option.key === 'load' && !loadAvailable ? 0.6 : 1)
      if (option.key === 'load' && !loadAvailable && isSelected) {
        this.setNotice('目前沒有存檔可以讀取。')
      }
    })
  }

  private setNotice(message: string) {
    this.noticeText?.setText(message)
    this.noticeTimer?.remove(false)
    this.noticeTimer = undefined
    if (message) {
      this.noticeTimer = this.time.addEvent({
        delay: 2600,
        callback: () => {
          this.noticeText?.setText('')
          this.noticeTimer = undefined
        }
      })
    }
  }
}

