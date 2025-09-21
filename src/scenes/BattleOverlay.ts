import Phaser from 'phaser'
import type { ArmorDef, EnemyDef, Vec2, WeaponDef } from '../core/Types'
import type { CombatOutcome } from '../systems/combat'
import { simulateCombat } from '../systems/combat'
import type { GameScene } from './GameScene'

export type BattleInitData = {
  enemy: EnemyDef
  enemyPos: Vec2
  player: {
    hp: number
    weapon: WeaponDef | null
    armor: ArmorDef | null
    weaponCharge: number
  }
}

export class BattleOverlay {
  private readonly host: GameScene
  isActive = false

  enemy!: EnemyDef
  enemyPos!: Vec2
  playerWeapon: WeaponDef | null = null
  playerArmor: ArmorDef | null = null
  playerHp = 0
  startingHp = 0
  playerAtkBase = 0
  playerDef = 0
  weaponCharge = 0
  chargeMax = 0
  shieldMax = 0
  shieldRemaining = 0
  enemyHp = 0
  battleStarted = false
  battleEnded = false
  victory = false
  canWin = true
  round = 0
  specialUses = 0
  preview!: CombatOutcome
  logs: string[] = []
  private autoAdvanceEvent?: Phaser.Time.TimerEvent
  private autoAdvanceIntervalMs = 0

  private backdrop?: Phaser.GameObjects.Rectangle
  private panel?: Phaser.GameObjects.Rectangle
  private titleText?: Phaser.GameObjects.Text
  private playerText?: Phaser.GameObjects.Text
  private enemyText?: Phaser.GameObjects.Text
  private logText?: Phaser.GameObjects.Text
  private instructionText?: Phaser.GameObjects.Text

  constructor(scene: GameScene) {
    this.host = scene
  }

  open(data: BattleInitData) {
    if (this.isActive) return

    this.stopAutoAdvance()
    this.isActive = true
    this.enemy = data.enemy
    this.enemyPos = data.enemyPos

    const statusBonuses = typeof this.host.getStatusBonuses === 'function'
      ? this.host.getStatusBonuses()
      : { atk: 0, def: 0 }

    this.playerWeapon = data.player.weapon
    this.playerArmor = data.player.armor
    this.playerHp = data.player.hp
    this.startingHp = data.player.hp
    this.playerAtkBase = (data.player.weapon?.atk ?? 0) + (statusBonuses.atk ?? 0)
    this.playerDef = (data.player.armor?.def ?? 0) + (statusBonuses.def ?? 0)
    this.weaponCharge = data.player.weaponCharge
    this.chargeMax = this.playerWeapon?.special?.chargeMax ?? 0
    this.weaponCharge = this.chargeMax > 0 ? Math.min(this.weaponCharge, this.chargeMax) : 0
    this.shieldMax = data.player.armor?.shield ?? 0
    this.shieldRemaining = this.shieldMax
    this.enemyHp = this.enemy.base.hp
    this.round = 0
    this.specialUses = 0
    this.logs = []
    this.battleStarted = false
    this.battleEnded = false
    this.victory = false

    this.preview = simulateCombat(this.host, this.enemy)
    this.canWin = this.preview.canWin

    this.createUI()
    this.updateStatsText()
    this.appendLog(`你遭遇 ${this.enemy.name}！`)
    if (!this.canWin) this.appendLog('根據預測，目前無法戰勝對手。')
    this.updateInstructions()

    this.host.input.keyboard?.on('keydown', this.handleKey, this)
  }

  close() {
    if (!this.isActive) return

    this.isActive = false
    this.stopAutoAdvance()
    this.host.input.keyboard?.off('keydown', this.handleKey, this)

    const elements = [
      this.backdrop,
      this.panel,
      this.titleText,
      this.playerText,
      this.enemyText,
      this.logText,
      this.instructionText
    ]
    elements.forEach(el => el?.destroy())

    this.backdrop = undefined
    this.panel = undefined
    this.titleText = undefined
    this.playerText = undefined
    this.enemyText = undefined
    this.logText = undefined
    this.instructionText = undefined
    this.logs = []
  }

  private createUI() {
    const { width, height } = this.host.scale
    const panelWidth = 680
    const panelHeight = 440
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

    this.titleText = this.host.add
      .text(width / 2, panelTop + 18, `VS ${this.enemy.name}`, { fontSize: '24px', color: '#ffe9a6' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.playerText = this.host.add
      .text(panelLeft + 32, panelTop + 60, '', {
        fontSize: '16px',
        color: '#cfe',
        lineSpacing: 6
      })
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.enemyText = this.host.add
      .text(panelLeft + panelWidth - 250, panelTop + 60, '', {
        fontSize: '16px',
        color: '#fcd',
        lineSpacing: 6
      })
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.logText = this.host.add
      .text(panelLeft + 32, panelTop + panelHeight - 150, '', {
        fontSize: '15px',
        color: '#ffe9a6',
        wordWrap: { width: panelWidth - 64 },
        lineSpacing: 4
      })
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.instructionText = this.host.add
      .text(width / 2, panelTop + panelHeight - 40, '', { fontSize: '14px', color: '#9fd' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)
  }

  private updateStatsText() {
    if (!this.playerText || !this.enemyText) return

    const weaponLines: string[] = []
    if (this.playerWeapon) {
      weaponLines.push(`武器: ${this.playerWeapon.name} (ATK ${this.playerAtkBase})`)
      if (this.playerWeapon.special) {
        const ready = this.chargeMax > 0 && this.weaponCharge >= this.chargeMax
        weaponLines.push(`特技 ${this.playerWeapon.special.name} 傷害 ${this.playerWeapon.special.damage}`)
        weaponLines.push(`蓄力 ${this.weaponCharge}/${this.chargeMax}${ready ? ' READY' : ''}`)
        if (this.playerWeapon.special.desc) weaponLines.push(this.playerWeapon.special.desc)
      }
    } else {
      weaponLines.push(`武器: 素手 (ATK ${this.playerAtkBase})`)
      weaponLines.push('特技: 無')
    }

    const armorLines: string[] = []
    if (this.playerArmor) {
      armorLines.push(`防具: ${this.playerArmor.name} (+DEF ${this.playerArmor.def})`)
      if (typeof this.playerArmor.shield === 'number') {
        armorLines.push(`護盾: ${Math.max(this.shieldRemaining, 0)}/${this.playerArmor.shield}`)
      }
      if (this.playerArmor.desc) armorLines.push(this.playerArmor.desc)
    } else if (this.shieldMax > 0) {
      armorLines.push(`護盾: ${Math.max(this.shieldRemaining, 0)}/${this.shieldMax}`)
    }

    const playerLines = [
      '你',
      `HP: ${this.playerHp}/${this.startingHp}`,
      `DEF: ${this.playerDef}`,
      ...weaponLines,
      ...armorLines
    ]

    this.playerText.setText(playerLines.join('\n'))

    const enemyLines = [
      this.enemy.name,
      `HP: ${this.enemyHp}`,
      `ATK: ${this.enemy.base.atk}`,
      `DEF: ${this.enemy.base.def}`,
      this.canWin ? `預測勝利 (失血 ${this.preview.lossHp})` : '目前無法戰勝'
    ]

    this.enemyText.setText(enemyLines.join('\n'))
    this.updateInstructions()
  }

  private updateInstructions() {
    if (!this.instructionText) return

    let actionLine: string
    if (this.battleEnded) {
      actionLine = '按 Enter / Space / Esc 離開戰鬥。'
    } else if (!this.canWin) {
      actionLine = '按 Esc 撤退。'
    } else if (!this.battleStarted) {
      actionLine = '按 Enter / Space 開始戰鬥，Esc 撤退。'
    } else {
      actionLine = '按 Enter / Space 進行下一回合。'
    }

    const lines = [actionLine]

    if (!this.battleEnded && this.canWin) {
      if (this.autoAdvanceIntervalMs > 0 && this.autoAdvanceEvent) {
        const seconds = this.autoAdvanceIntervalMs === 500 ? '0.5' : (this.autoAdvanceIntervalMs / 1000).toString()
        lines.push(`自動戰鬥中，每 ${seconds} 秒一回合，按 0 停止。`)
      } else {
        lines.push('按 1 設定 0.5 秒自動戰鬥，按 2 設定 1 秒，按 0 停止。')
      }
    }

    this.instructionText.setText(lines.join('\n'))
  }

  private appendLog(line: string) {
    this.logs.push(line)
    if (this.logs.length > 16) this.logs.shift()
    this.logText?.setText(this.logs.join('\n'))
  }

  private tick(auto = false) {
    if (!this.battleStarted) {
      this.battleStarted = true
    }

    if (this.battleEnded) {
      if (auto) this.stopAutoAdvance(false)
      return
    }

    this.round++

    const baseAtk = this.playerAtkBase
    const enemyDef = this.enemy.base.def
    let damage = Math.max(1, baseAtk - enemyDef)
    let usedSpecial = false
    const special = this.playerWeapon?.special
    if (special) {
      if (this.chargeMax > 0 && this.weaponCharge >= this.chargeMax) {
        damage = Math.max(1, (special.damage ?? baseAtk) - enemyDef)
        this.weaponCharge = 0
        usedSpecial = true
        this.specialUses++
      } else if (this.chargeMax > 0) {
        this.weaponCharge = Math.min(this.weaponCharge + 1, this.chargeMax)
      }
    }

    this.enemyHp -= damage
    this.appendLog(`你造成 ${damage} 傷害${usedSpecial ? '（特技）' : ''}。`)
    if (this.enemyHp <= 0) {
      this.finishBattle(true)
      if (auto) this.stopAutoAdvance(false)
      return
    }

    const rawEnemyDamage = Math.max(1, this.enemy.base.atk - this.playerDef)
    let remainingDamage = rawEnemyDamage
    let shieldAbsorbed = 0
    if (this.shieldRemaining > 0) {
      shieldAbsorbed = Math.min(this.shieldRemaining, remainingDamage)
      this.shieldRemaining -= shieldAbsorbed
      remainingDamage -= shieldAbsorbed
    }
    if (remainingDamage > 0) {
      this.playerHp -= remainingDamage
    }

    this.appendLog(
      `敵人造成 ${rawEnemyDamage} 傷害` +
        (shieldAbsorbed > 0 ? `（護盾吸收 ${shieldAbsorbed}）` : '') +
        (remainingDamage > 0 ? `，HP 剩 ${Math.max(this.playerHp, 0)}` : '，護盾全數吸收')
    )

    if (this.playerHp <= 0) {
      this.finishBattle(false)
      if (auto) this.stopAutoAdvance(false)
      return
    }

    this.updateStatsText()
  }

  private startAutoAdvance(intervalSeconds: number) {
    this.stopAutoAdvance()
    const intervalMs = Math.max(intervalSeconds * 1000, 100)
    this.autoAdvanceIntervalMs = intervalMs
    this.autoAdvanceEvent = this.host.time.addEvent({ delay: intervalMs, callback: this.tick, callbackScope: this, loop: true })
  }

  private stopAutoAdvance(updateInstruction = true) {
    this.autoAdvanceEvent?.remove(false)
    this.autoAdvanceEvent = undefined
    this.autoAdvanceIntervalMs = 0
    if (updateInstruction) this.updateInstructions()
  }

  private finishBattle(victory: boolean) {
    if (this.battleEnded) return
    this.stopAutoAdvance(false)
    this.battleEnded = true
    this.victory = victory
    this.updateStatsText()
    this.appendLog(victory ? '你贏得了戰鬥！' : '你倒下了……')
    this.updateInstructions()
  }

  private resolveAfterBattle() {
    this.close()
    if (this.victory) {
      this.host.finishBattle({
        enemyPos: this.enemyPos,
        remainingHp: this.playerHp,
        weaponCharge: this.weaponCharge
      })
    } else {
      this.host.handlePlayerDefeat()
    }
  }

  private retreat() {
    this.close()
    this.host.cancelBattle()
  }

  private handleKey = (event: KeyboardEvent) => {
    if (!this.isActive) return

    const key = event.key

    if (key === 'Escape') {
      event.preventDefault()
      if (this.battleEnded) {
        this.resolveAfterBattle()
      } else {
        this.retreat()
      }
      return
    }

    if (this.battleEnded) {
      if (key === 'Enter' || key === ' ' || key === 'Spacebar' || key === 'Space') {
        event.preventDefault()
        this.resolveAfterBattle()
      }
      return
    }

    if (!this.canWin) {
      if (key === 'Enter' || key === ' ' || key === 'Spacebar' || key === 'Space') {
        event.preventDefault()
        this.tick()
      }
      return
    }

    if (key === 'Enter' || key === ' ' || key === 'Spacebar' || key === 'Space') {
      event.preventDefault()
      this.tick()
      return
    }

    if (key === '1') {
      event.preventDefault()
      this.startAutoAdvance(0.5)
      this.updateInstructions()
      return
    }

    if (key === '2') {
      event.preventDefault()
      this.startAutoAdvance(1)
      this.updateInstructions()
      return
    }

    if (key === '0') {
      event.preventDefault()
      this.stopAutoAdvance()
      return
    }
  }
}

export default BattleOverlay
