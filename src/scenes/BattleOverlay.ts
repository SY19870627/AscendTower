import Phaser from 'phaser'
import type { ArmorDef, EnemyDef, Vec2, WeaponAttributeDef, WeaponAttributeId, WeaponDef } from '../core/Types'
import type { GameScene } from './GameScene'

import { advanceWeaponAttributeStates, buildWeaponAttributeStates, type WeaponAttributeRuntimeState } from '../game/weapons/weaponAttributes'
import { getArmorAttributes, sumArmorAttributeBonuses } from '../game/armors/armorAttributes'

export type BattleInitData = {
  enemy: EnemyDef
  enemyPos: Vec2
  player: {
    hp: number
    weapon: WeaponDef | null
    armor: ArmorDef | null
    weaponAttributeCharges?: [WeaponAttributeId, number][]
    weaponAttributeCharge?: number
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
  weaponAttributeStates: WeaponAttributeRuntimeState[] = []
  enemyHp = 0
  battleStarted = false
  battleEnded = false
  victory = false
  round = 0
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

  private panelWidth = 0
  private panelHeight = 0
  private panelTop = 0
  private panelLeft = 0
  private contentLeft = 0
  private contentRight = 0
  private columnWidth = 0
  private logTopBase = 0

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
    const armorAttributes = getArmorAttributes(data.player.armor?.attributeIds ?? [])
    const armorBonuses = sumArmorAttributeBonuses(armorAttributes)
    this.playerAtkBase = (data.player.weapon?.atk ?? 0) + (statusBonuses.atk ?? 0)
    this.playerDef =
      (data.player.armor?.def ?? 0) + (statusBonuses.def ?? 0) + (armorBonuses.def ?? 0)

    const chargeEntries = Array.isArray(data.player.weaponAttributeCharges) ? data.player.weaponAttributeCharges : []
    let initialChargeSource: Map<WeaponAttributeId, number> | null = null
    if (chargeEntries.length) {
      const sanitized = chargeEntries
        .filter(entry => Array.isArray(entry) && entry.length >= 2 && typeof entry[0] === 'string')
        .map(entry => {
          const [id, value] = entry as [WeaponAttributeId, number]
          return [id, Math.max(0, Math.floor(value ?? 0))] as [WeaponAttributeId, number]
        })
      if (sanitized.length) {
        initialChargeSource = new Map<WeaponAttributeId, number>(sanitized)
      }
    } else if (typeof data.player.weaponAttributeCharge === 'number') {
      const fallbackId = this.playerWeapon?.attributeIds?.[0]
      if (fallbackId) {
        const fallbackValue = Math.max(0, Math.floor(data.player.weaponAttributeCharge ?? 0))
        initialChargeSource = new Map<WeaponAttributeId, number>([[fallbackId, fallbackValue]])
      }
    }
    this.weaponAttributeStates = this.playerWeapon
      ? buildWeaponAttributeStates(this.playerWeapon.attributeIds ?? [], initialChargeSource)
      : []

    this.enemyHp = this.enemy.base.hp
    this.round = 0
    this.logs = []
    this.battleStarted = false
    this.battleEnded = false
    this.victory = false


    this.createUI()
    this.updateStatsText()
    this.appendLog(`向 ${this.enemy.name} 發動攻勢！`)
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
    this.weaponAttributeStates = []
  }

  private createUI() {
    const { width, height } = this.host.scale
    this.panelWidth = 820
    this.panelHeight = 520
    const depthBase = 2600

    this.backdrop = this.host.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.55)
      .setScrollFactor(0)
      .setDepth(depthBase)
      .setInteractive({ useHandCursor: false })

    this.panel = this.host.add
      .rectangle(width / 2, height / 2, this.panelWidth, this.panelHeight, 0x101b24, 0.94)
      .setStrokeStyle(2, 0xffb347, 0.85)
      .setScrollFactor(0)
      .setDepth(depthBase + 1)

    this.panelTop = height / 2 - this.panelHeight / 2
    this.panelLeft = width / 2 - this.panelWidth / 2
    this.contentLeft = this.panelLeft + 36
    this.contentRight = this.panelLeft + this.panelWidth - 36
    this.columnWidth = this.panelWidth / 2 - 72
    this.logTopBase = this.panelTop + 292

    this.titleText = this.host.add
      .text(width / 2, this.panelTop + 24, `戰鬥 ${this.enemy.name}`, { fontSize: '26px', color: '#ffe9a6' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.playerText = this.host.add
      .text(this.contentLeft, this.panelTop + 72, '', {
        fontSize: '16px',
        color: '#cfe',
        lineSpacing: 6,
        wordWrap: { width: this.columnWidth },
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.enemyText = this.host.add
      .text(this.contentRight, this.panelTop + 72, '', {
        fontSize: '16px',
        color: '#fcd',
        lineSpacing: 6,
        wordWrap: { width: this.columnWidth },
        align: 'right',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.logText = this.host.add
      .text(this.contentLeft, this.logTopBase, '', {
        fontSize: '15px',
        color: '#ffe9a6',
        wordWrap: { width: this.panelWidth - 72 },
        lineSpacing: 4,
      })
      .setScrollFactor(0)
      .setDepth(depthBase + 2)

    this.instructionText = this.host.add
      .text(width / 2, this.panelTop + this.panelHeight - 52, '', {
        fontSize: '14px',
        color: '#9fd',
        wordWrap: { width: this.panelWidth - 80 },
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depthBase + 2)
  }

  private updateStatsText() {
    if (!this.playerText || !this.enemyText) return

    const weaponLines: string[] = []
    if (this.playerWeapon) {
      weaponLines.push(`武器：${this.playerWeapon.name}（攻擊 ${this.playerAtkBase}）`)
      if (this.weaponAttributeStates.length) {
        for (const state of this.weaponAttributeStates) {
          const attributeMax = Math.max(state.chargeMax, 1)
          const attributeReady = state.charge >= attributeMax
          weaponLines.push(`屬性 ${state.def.name}`)
          weaponLines.push(`蓄能 ${state.charge}/${attributeMax}${attributeReady ? ' 就緒' : ''}`)
          if (state.def.description) weaponLines.push(state.def.description)
        }
      }
    } else {
      weaponLines.push(`武器：無（攻擊 ${this.playerAtkBase}）`)
      weaponLines.push('屬性：無')
    }

    const armorLines: string[] = []
    if (this.playerArmor) {
      const armorAttributes = getArmorAttributes(this.playerArmor.attributeIds ?? [])
      const armorBonuses = sumArmorAttributeBonuses(armorAttributes)
      const totalDef = this.playerArmor.def + armorBonuses.def
      const bonusText = armorBonuses.def ? `，屬性 +${armorBonuses.def}` : ''
      armorLines.push(`防具：${this.playerArmor.name}（防禦 +${totalDef}${bonusText}）`)
      if (armorAttributes.length) {
        for (const attribute of armorAttributes) {
          armorLines.push(`屬性 ${attribute.name}`)
          armorLines.push(attribute.description)
        }
      }
      if (this.playerArmor.desc) armorLines.push(this.playerArmor.desc)
    }

    const playerStats = this.host.playerStats ?? null
    const playerLines = ['你']
    if (playerStats) {
      playerLines.push(
        `生命：${this.playerHp}/${this.startingHp}`,
        `骨勁：${playerStats.bodyForce ?? 0}`,
        `元脈：${playerStats.essenceVein ?? 0}`,
        `善惡值：${playerStats.morality ?? 0}`
      )
    } else {
      playerLines.push(`生命：${this.playerHp}/${this.startingHp}`)
    }
    playerLines.push(`防禦：${this.playerDef}`)
    playerLines.push(...weaponLines)
    playerLines.push(...armorLines)

    this.playerText.setText(playerLines.join('\n'))

    const enemyLines = [
      this.enemy.name,
      `生命：${Math.max(this.enemyHp, 0)}`,
      `攻擊：${this.enemy.base.atk}`,
      `防禦：${this.enemy.base.def}`
    ]

    this.enemyText.setText(enemyLines.join('\n'))

    const statsBottom = Math.max(
      this.playerText.y + this.playerText.height,
      this.enemyText.y + this.enemyText.height
    )
    const availableBottom = this.panelTop + this.panelHeight - 136
    const baseY = this.logTopBase || (this.panelTop + 292)
    const logY = Math.min(Math.max(baseY, statsBottom + 24), availableBottom)
    this.logText?.setY(logY)

    const logLines = this.logs.length ? this.logs : ['……']
    this.logText?.setText(logLines.join('\n'))

    this.updateInstructions()
  }

  private updateInstructions() {
    if (!this.instructionText) return

    let actionLine: string
    if (this.battleEnded) {
      actionLine = '按 Enter / Space / Esc 結束戰鬥。'
    } else if (!this.battleStarted) {
      actionLine = '按 Enter 或 Space 開始，Esc 撤退。'
    } else {
      actionLine = '按 Enter 或 Space 進入下一回合。'
    }

    const lines = [actionLine]

    if (!this.battleEnded) {
      if (this.autoAdvanceIntervalMs > 0 && this.autoAdvanceEvent) {
        const seconds = this.autoAdvanceIntervalMs === 500 ? '0.5' : (this.autoAdvanceIntervalMs / 1000).toString()
        lines.push(`自動戰鬥啟動：每回合 ${seconds} 秒。按 0 停止。`)
      } else {
        lines.push('按 1 啟動每回合 0.5 秒自動戰鬥，按 2 為 1 秒，按 0 取消。')
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
    let attackPower = baseAtk

    let triggeredAttributes: WeaponAttributeDef[] = []
    let ignoreDefense = false
    let bonusDamage = 0
    let lifeSteal = 0
    if (this.weaponAttributeStates.length) {
      const attributeResult = advanceWeaponAttributeStates(this.weaponAttributeStates)
      this.weaponAttributeStates = attributeResult.states
      triggeredAttributes = attributeResult.triggered
      ignoreDefense = attributeResult.ignoreDefense
      bonusDamage = attributeResult.bonusDamage
      lifeSteal = attributeResult.lifeSteal
    }

    const baseDamage = Math.max(1, ignoreDefense ? attackPower : attackPower - enemyDef)
    const totalDamage = baseDamage + bonusDamage

    this.enemyHp -= totalDamage

    let actualHeal = 0
    if (lifeSteal > 0) {
      const beforeHp = this.playerHp
      this.playerHp = Math.min(this.playerHp + lifeSteal, this.startingHp)
      actualHeal = Math.max(this.playerHp - beforeHp, 0)
    }

    const attackLogParts: string[] = [`你造成 ${totalDamage} 點傷害`]
    if (triggeredAttributes.length) {
      const triggeredNames = triggeredAttributes.map(attribute => `「${attribute.name}」`).join('、')
      attackLogParts.push(`屬性${triggeredNames}生效`)
    }
    if (bonusDamage > 0) {
      attackLogParts.push(`追加 ${bonusDamage} 點屬性傷害`)
    }
    if (actualHeal > 0) {
      attackLogParts.push(`回復 ${actualHeal} 點生命`)
    }
    this.appendLog(`${attackLogParts.join('；')}！`)
    if (this.enemyHp <= 0) {
      this.finishBattle(true)
      if (auto) this.stopAutoAdvance(false)
      return
    }

    const rawEnemyDamage = Math.max(1, this.enemy.base.atk - this.playerDef)
    this.playerHp -= rawEnemyDamage

    const enemyLines: string[] = [`敵人造成 ${rawEnemyDamage} 點傷害`]
    enemyLines.push(`目前生命 ${Math.max(this.playerHp, 0)}`)
    this.appendLog(enemyLines.join('; '))

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
    this.appendLog(victory ? '你贏得勝利！' : '你被擊敗了……')
    this.updateInstructions()
  }

  private resolveAfterBattle() {
    const chargeEntries: Array<[WeaponAttributeId, number]> = this.weaponAttributeStates.map(
      state => [state.def.id, state.charge] as [WeaponAttributeId, number]
    )
    this.close()
    if (this.victory) {
      this.host.finishBattle({
        enemy: this.enemy,
        enemyPos: this.enemyPos,
        remainingHp: this.playerHp,
        weaponAttributeCharges: chargeEntries
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
