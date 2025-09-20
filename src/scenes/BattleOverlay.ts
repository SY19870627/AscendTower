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
    this.playerWeapon = data.player.weapon
    this.playerArmor = data.player.armor
    this.playerHp = data.player.hp
    this.startingHp = data.player.hp
    this.playerDef = data.player.armor?.def ?? 0
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

    this.preview = simulateCombat(
      {
        playerWeapon: this.playerWeapon,
        playerArmor: this.playerArmor,
        weaponCharge: this.weaponCharge,
        playerStats: { hp: this.playerHp }
      } as any,
      this.enemy
    )
    this.canWin = this.preview.canWin

    this.createUI()
    this.updateStatsText()
    this.appendLog(`你遇到了 ${this.enemy.name}！`)
    if (!this.canWin) this.appendLog('目前贏不了這場戰鬥。')
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
    const panelWidth = 690
    const panelHeight = 540
    const depthBase = 2000

    this.backdrop = this.host.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.55)
      .setScrollFactor(0)
      .setDepth(depthBase)
      .setInteractive({ useHandCursor: false })

    this.panel = this.host.add
      .rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x08151d, 0.95)
      .setStrokeStyle(2, 0x4fa6ff, 0.85)
      .setScrollFactor(0)
      .setDepth(depthBase + 1)

    this.titleText = this.host.add
      .text(width / 2, height / 2 - panelHeight / 2 + 24, '戰鬥', { fontSize: '24px', color: '#ffffff' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    const leftX = width / 2 - panelWidth / 2 + 24
    const rightX = width / 2 + panelWidth / 2 - 24
    const topY = (this.titleText?.y ?? 0) + 36

    this.playerText = this.host.add
      .text(leftX, topY, '', { fontSize: '16px', color: '#cfe' })
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.enemyText = this.host.add
      .text(rightX, topY, '', { fontSize: '16px', color: '#fbb', align: 'right' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    const logTop = topY + 210
    this.logText = this.host.add
      .text(leftX, logTop, '', { fontSize: '16px', color: '#ddd', wordWrap: { width: panelWidth - 48 } })
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.instructionText = this.host.add
      .text(width / 2, height / 2 + panelHeight / 2 - 32, '', { fontSize: '16px', color: '#9fd' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)
  }

  private handleKey = (event: KeyboardEvent) => {
    if (!this.isActive) return

    const { key, code } = event

    if (key === 'Escape') {
      if (this.battleEnded) {
        this.resolveAfterBattle()
      } else {
        this.retreat()
      }
      return
    }

    if (key === '1' || code === 'Digit1' || code === 'Numpad1') {
      event.preventDefault()
      this.setAutoAdvance(500)
      return
    }

    if (key === '2' || code === 'Digit2' || code === 'Numpad2') {
      event.preventDefault()
      this.setAutoAdvance(1000)
      return
    }

    if (key === ' ' || key === 'Spacebar' || key === 'Space' || key === 'Enter') {
      event.preventDefault()
      this.stopAutoAdvance(false)
      if (this.battleEnded) {
        this.resolveAfterBattle()
      } else {
        this.startOrAdvanceBattle()
      }
    }
  }

  private setAutoAdvance(intervalMs: number) {
    if (this.battleEnded) return

    if (!this.canWin) {
      this.appendLog('目前勝算不足，無法啟動自動戰鬥。')
      this.host.cameras.main.shake(80, 0.002)
      this.stopAutoAdvance()
      return
    }

    if (this.autoAdvanceIntervalMs === intervalMs && this.autoAdvanceEvent) {
      this.appendLog('停止自動戰鬥。')
      this.stopAutoAdvance()
      return
    }

    this.stopAutoAdvance(false)

    this.autoAdvanceIntervalMs = intervalMs
    this.autoAdvanceEvent = this.host.time.addEvent({
      delay: intervalMs,
      loop: true,
      callback: () => {
        if (!this.isActive || this.battleEnded) {
          this.stopAutoAdvance(false)
          return
        }

        this.startOrAdvanceBattle()

        if (this.battleEnded) {
          this.stopAutoAdvance(false)
        }
      }
    })

    const seconds = intervalMs === 500 ? '0.5' : (intervalMs / 1000).toString()
    this.appendLog(`啟動自動戰鬥（每 ${seconds} 秒）。`)
    this.startOrAdvanceBattle()
    this.updateInstructions()
  }

  private stopAutoAdvance(updateInstructions = true) {
    const hadAuto = !!this.autoAdvanceEvent || this.autoAdvanceIntervalMs > 0

    this.autoAdvanceEvent?.destroy()
    this.autoAdvanceEvent = undefined
    this.autoAdvanceIntervalMs = 0

    if (updateInstructions && hadAuto) {
      this.updateInstructions()
    }
  }
  private startOrAdvanceBattle() {
    if (!this.canWin) {
      this.host.cameras.main.shake(80, 0.002)
      this.appendLog('你需要變得更強再來挑戰。')
      return
    }
    if (!this.battleStarted) {
      this.battleStarted = true
      this.appendLog('戰鬥開始！')
      this.updateInstructions()
    }
    this.advanceRound()
  }

  private advanceRound() {
    if (this.battleEnded) return
    this.round += 1

    const enemyDef = this.enemy.base.def
    const baseAtk = this.playerWeapon?.atk ?? 0
    const special = this.playerWeapon?.special
    let damage = Math.max(1, baseAtk - enemyDef)
    let usedSpecial = false

    if (special && this.chargeMax > 0) {
      if (this.weaponCharge >= this.chargeMax) {
        damage = Math.max(1, special.damage - enemyDef)
        this.weaponCharge = 0
        this.specialUses += 1
        usedSpecial = true
      } else {
        this.weaponCharge = Math.min(this.weaponCharge + 1, this.chargeMax)
      }
    }

    this.enemyHp = Math.max(this.enemyHp - damage, 0)
    this.appendLog(`第 ${this.round} 回合：你造成 ${damage} 傷害${usedSpecial ? '（必殺技）' : ''}。`)

    if (this.enemyHp <= 0) {
      this.appendLog(`${this.enemy.name} 被擊倒！`)
      this.finishBattle(true)
      return
    }

    const rawEnemyDamage = Math.max(1, this.enemy.base.atk - this.playerDef)
    let shieldAbsorbed = 0
    if (this.shieldRemaining > 0) {
      shieldAbsorbed = Math.min(this.shieldRemaining, rawEnemyDamage)
      this.shieldRemaining -= shieldAbsorbed
    }

    const incomingDamage = Math.max(rawEnemyDamage - shieldAbsorbed, 0)
    if (shieldAbsorbed > 0) this.appendLog(`護盾吸收了 ${shieldAbsorbed} 點傷害。`)

    if (incomingDamage > 0) {
      this.playerHp = Math.max(this.playerHp - incomingDamage, 0)
      this.appendLog(`${this.enemy.name} 反擊造成 ${incomingDamage} 傷害。`)
    } else {
      this.appendLog(`${this.enemy.name} 的攻擊被完全擋下。`)
    }

    if (this.playerHp <= 0) {
      this.finishBattle(false)
      return
    }

    this.updateStatsText()
  }

  private finishBattle(victory: boolean) {
    if (this.battleEnded) return
    this.stopAutoAdvance(false)
    this.battleEnded = true
    this.victory = victory
    this.updateStatsText()
    this.appendLog(victory ? '戰鬥勝利！' : '你倒下了...')
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

  private updateStatsText() {
    if (!this.playerText || !this.enemyText) return

    const weaponLines: string[] = []
    if (this.playerWeapon) {
      weaponLines.push(`武器：${this.playerWeapon.name} (ATK ${this.playerWeapon.atk})`)
      if (this.playerWeapon.special) {
        const ready = this.chargeMax > 0 && this.weaponCharge >= this.chargeMax
        weaponLines.push(`必殺技：${this.playerWeapon.special.name} 傷害 ${this.playerWeapon.special.damage}`)
        weaponLines.push(`充能：${this.weaponCharge}/${this.chargeMax}${ready ? '（可用）' : ''}`)
        if (this.playerWeapon.special.desc) weaponLines.push(this.playerWeapon.special.desc)
      } else {
        weaponLines.push('必殺技：無')
      }
    } else {
      weaponLines.push('武器：徒手 (ATK 0)')
      weaponLines.push('必殺技：無')
    }

    const armorLines: string[] = []
    if (this.playerArmor) {
      armorLines.push(`防具：${this.playerArmor.name} (+DEF ${this.playerArmor.def})`)
      if (typeof this.playerArmor.shield === 'number') {
        armorLines.push(`護盾：${Math.max(this.shieldRemaining, 0)}/${this.playerArmor.shield}`)
      }
      if (this.playerArmor.desc) armorLines.push(this.playerArmor.desc)
    } else if (this.shieldMax > 0) {
      armorLines.push(`護盾：${Math.max(this.shieldRemaining, 0)}/${this.shieldMax}`)
    }

    const playerLines = [
      '玩家',
      `HP：${this.playerHp}/${this.startingHp}`,
      `DEF：${this.playerDef}`,
      ...weaponLines,
      ...armorLines
    ]

    this.playerText.setText(playerLines.join('\n'))

    const enemyLines = [
      this.enemy.name,
      `HP：${this.enemyHp}`,
      `ATK：${this.enemy.base.atk}`,
      `DEF：${this.enemy.base.def}`,
      this.canWin ? `預估損失 HP：-${this.preview.lossHp}` : '你暫時無法獲勝'
    ]

    this.enemyText.setText(enemyLines.join('\n'))
    this.updateInstructions()
  }

  private updateInstructions() {
    if (!this.instructionText) return

    let actionLine: string
    if (this.battleEnded) {
      actionLine = '按 Enter / 空白鍵結束戰鬥，Esc 返回。'
    } else if (!this.canWin) {
      actionLine = '按 Esc 撤退，先提升戰力再來挑戰。'
    } else if (!this.battleStarted) {
      actionLine = '按 Enter / 空白鍵開始戰鬥，Esc 撤退。'
    } else {
      actionLine = '按 Enter / 空白鍵繼續下一回合。'
    }

    const lines = [actionLine]

    if (!this.battleEnded && this.canWin) {
      if (this.autoAdvanceIntervalMs > 0 && this.autoAdvanceEvent) {
        const seconds = this.autoAdvanceIntervalMs === 500 ? '0.5' : (this.autoAdvanceIntervalMs / 1000).toString()
        lines.push(`自動戰鬥中：每 ${seconds} 秒進行，按相同數字停止。`)
      } else {
        lines.push('按 1 啟動每 0.5 秒自動，按 2 啟動每 1 秒自動。')
      }
    }

    this.instructionText.setText(lines.join('\n'))
  }  private appendLog(line: string) {
    this.logs.push(line)
    if (this.logs.length > 12) this.logs.shift()
    this.logText?.setText(this.logs.join('\n'))
  }
}

export default BattleOverlay




