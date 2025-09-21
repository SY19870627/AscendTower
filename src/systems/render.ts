import { TILE, COLORS, GLYPH } from '../content/tilesets'
import type { SkillDef } from '../core/Types'
import { enemies } from '../content/enemies'
import { simulateCombat, getEffectiveCombatStats, describeDirection } from './combat'

const SKILL_HOTKEYS = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U']

export function addTextOnce(scene: any, id: string, x: number, y: number, text: string, color: string) {
  const key = `txt_${id}`
  const existing = scene.children.getByName(key) as Phaser.GameObjects.Text | undefined
  if (existing) {
    existing.setText(text).setPosition(x, y).setColor(color).setDepth(1)
    return existing
  }
  const t = scene.add.text(x, y, text, { fontSize: '14px', color }).setName(key).setDepth(1)
  return t
}

export function draw(scene: any) {
  scene.gfx.clear()
  const s = TILE.size
  const baseX = scene.gridOrigin.x
  const baseY = scene.gridOrigin.y

  const enemyInfoBlocks: { lines: string[]; canWin: boolean }[] = []
  const weaponInfoBlocks: string[] = []
  const armorInfoBlocks: string[] = []
  const eventInfoBlocks: string[] = []
  const shopInfoBlocks: string[] = []
  const itemInfoBlocks: string[] = []
  const playerCombat = getEffectiveCombatStats(scene)

  for (let y = 0; y < scene.grid.h; y++) {
    for (let x = 0; x < scene.grid.w; x++) {
      const t = scene.grid.tiles[y][x]
      const c = COLORS[t as keyof typeof COLORS] ?? COLORS.floor
      const drawX = baseX + x * s
      const drawY = baseY + y * s

      // tile background
      scene.gfx.fillStyle(c, 1).fillRect(drawX, drawY, s - 1, s - 1)

      if (t === 'door') {
        scene.gfx.lineStyle(2, 0xffffff, 0.9)
        scene.gfx.strokeRect(drawX + 2, drawY + 2, s - 5, s - 5)
      }

      const glyph = (GLYPH as any)[t] ?? ''
      const id = `glyph_${x}_${y}`
      const gx = drawX + (s / 2 - 10)
      const gy = drawY + (s / 2 - 12)
      addTextOnce(scene, id, gx, gy, glyph, '#ffffff')

      if (t === 'enemy') {
        const adj = Math.abs(x - scene.grid.playerPos.x) + Math.abs(y - scene.grid.playerPos.y) === 1
        const pid = `prev_${x}_${y}`
        if (adj) {
          const e = enemies[0]
          const prev = simulateCombat(scene, e)
          const dx = x - scene.grid.playerPos.x
          const dy = y - scene.grid.playerPos.y
          const dirLabel = describeDirection(dx, dy)
          const txt = `${prev.canWin ? 'WIN' : 'LOSE'}:-${prev.lossHp}`
          addTextOnce(scene, pid, drawX + 6, drawY + 4, txt, prev.canWin ? '#8ef' : '#f88')

          const infoLines = [
            `Enemy(${dirLabel}): ${e.name}`,
            `HP ${e.base.hp}`,
            `ATK ${e.base.atk}`,
            `DEF ${e.base.def}`,
            `Outcome: ${prev.canWin ? 'Win' : 'Lose'} (-${prev.lossHp} HP)`
          ]
          const special = scene.playerWeapon?.special
          if (special) {
            const currentCharge = Math.min(scene.weaponCharge, special.chargeMax)
            const projectedCharge = prev.canWin ? Math.min(prev.finalCharge ?? currentCharge, special.chargeMax) : currentCharge
            infoLines.push(`Special uses: ${prev.specialUses ?? 0}`)
            infoLines.push(`${prev.canWin ? 'Charge after' : 'Charge now'}: ${projectedCharge}/${special.chargeMax}`)
          }
          const armorShield = scene.playerArmor?.shield ?? 0
          if (armorShield > 0) {
            const shieldAfter = prev.canWin ? (prev.shieldRemaining ?? armorShield) : armorShield
            const shieldClamped = Math.max(Math.min(shieldAfter, armorShield), 0)
            infoLines.push(`Shield after: ${shieldClamped}/${armorShield}`)
            const shieldUsed = Math.max(0, armorShield - shieldClamped)
            if (shieldUsed > 0) infoLines.push(`Shield used: ${shieldUsed}`)
          }
          enemyInfoBlocks.push({ lines: infoLines, canWin: prev.canWin })
        } else {
          addTextOnce(scene, pid, drawX + 6, drawY + 4, '', '#000')
        }
      }

      if (t === 'weapon') {
        const weapon = scene.weaponDrops.get(`${x},${y}`)
        if (!weapon) continue
        const adj = Math.abs(x - scene.grid.playerPos.x) + Math.abs(y - scene.grid.playerPos.y) === 1
        if (adj) {
          const dx = x - scene.grid.playerPos.x
          const dy = y - scene.grid.playerPos.y
          const dirLabel = describeDirection(dx, dy)
          const lines = [
            `Weapon(${dirLabel}): ${weapon.name}`,
            `Base ATK ${weapon.atk}`,
            `Special ${weapon.special.name}: DMG ${weapon.special.damage}`,
            `Charge ${weapon.special.chargeMax} hits`
          ]
          if (weapon.desc) lines.push(weapon.desc)
          if (weapon.special.desc) lines.push(weapon.special.desc)
          weaponInfoBlocks.push(lines.join('\n'))
        }
      }

      if (t === 'armor') {
        const armor = scene.armorDrops.get(`${x},${y}`)
        if (!armor) continue
        const adj = Math.abs(x - scene.grid.playerPos.x) + Math.abs(y - scene.grid.playerPos.y) === 1
        if (adj) {
          const dx = x - scene.grid.playerPos.x
          const dy = y - scene.grid.playerPos.y
          const dirLabel = describeDirection(dx, dy)
          const lines = [
            `Armor(${dirLabel}): ${armor.name}`,
            `+DEF ${armor.def}`
          ]
          if (typeof armor.shield === 'number') lines.push(`Shield HP ${armor.shield}`)
          if (armor.desc) lines.push(armor.desc)
          armorInfoBlocks.push(lines.join('\n'))
        }
      }

      if (t === 'shop') {
        const shop = scene.shopNodes?.get(`${x},${y}`)
        if (shop) {
          const adj = Math.abs(x - scene.grid.playerPos.x) + Math.abs(y - scene.grid.playerPos.y) === 1
          if (adj) {
            const dx = x - scene.grid.playerPos.x
            const dy = y - scene.grid.playerPos.y
            const dirLabel = describeDirection(dx, dy)
            const lines = [
              `Shop(${dirLabel}): ${shop.title}`,
              shop.description
            ]
            shopInfoBlocks.push(lines.join('\n'))
          }
        }
      }

      if (t === 'event') {
        const event = scene.eventNodes?.get(`${x},${y}`)
        if (event) {
          const adj = Math.abs(x - scene.grid.playerPos.x) + Math.abs(y - scene.grid.playerPos.y) === 1
          if (adj) {
            const dx = x - scene.grid.playerPos.x
            const dy = y - scene.grid.playerPos.y
            const dirLabel = describeDirection(dx, dy)
            const lines = [
              `Event(${dirLabel}): ${event.title}`,
              event.preview ?? event.description
            ]
            eventInfoBlocks.push(lines.join('\n'))
          }
        }
      }

      if (t === 'item') {
        const item = scene.itemDrops?.get(`${x},${y}`)
        if (item) {
          const adj = Math.abs(x - scene.grid.playerPos.x) + Math.abs(y - scene.grid.playerPos.y) === 1
          if (adj) {
            const dx = x - scene.grid.playerPos.x
            const dy = y - scene.grid.playerPos.y
            const dirLabel = describeDirection(dx, dy)
            const lines = [
              `Item(${dirLabel}): ${item.name}`,
              item.description ?? item.effect.message
            ]
            itemInfoBlocks.push(lines.join('\n'))
          }
        }
      }
    }
  }

  const enemyInfoText = enemyInfoBlocks.length
    ? enemyInfoBlocks.map(block => block.lines.join('\n')).join('\n\n')
    : 'Enemies nearby: none'
  const enemyInfoColor = enemyInfoBlocks.length
    ? (enemyInfoBlocks.some(block => !block.canWin) ? '#f88' : '#8ef')
    : '#888'

  const weaponInfoText = weaponInfoBlocks.length
    ? weaponInfoBlocks.join('\n\n')
    : 'Weapons nearby: none'
  const weaponInfoColor = weaponInfoBlocks.length
    ? (scene.playerWeapon?.special && Math.min(scene.weaponCharge, scene.playerWeapon.special.chargeMax) >= scene.playerWeapon.special.chargeMax ? '#ffe9a6' : '#cfe')
    : '#888'

  const armorInfoText = armorInfoBlocks.length
    ? armorInfoBlocks.join('\n\n')
    : 'Armor nearby: none'
  const armorInfoColor = armorInfoBlocks.length ? '#cde' : '#888'

  const eventInfoText = eventInfoBlocks.length
    ? eventInfoBlocks.join('\n\n')
    : 'Events nearby: none'
  const eventInfoColor = eventInfoBlocks.length ? '#ffe9a6' : '#888'

  const shopInfoText = shopInfoBlocks.length
    ? shopInfoBlocks.join('\n\n')
    : 'Shops nearby: none'
  const shopInfoColor = shopInfoBlocks.length ? '#ffd27f' : '#888'

  const itemInfoText = itemInfoBlocks.length
    ? itemInfoBlocks.join('\n\n')
    : 'Items nearby: none'
  const itemInfoColor = itemInfoBlocks.length ? '#ffd27f' : '#888'

  const totalItems = scene.inventory?.reduce((sum: number, stack: any) => sum + (stack.quantity ?? 0), 0) ?? 0

  const statsLines = [
    `FLOOR ${scene.floor}`,
    `HP ${scene.playerStats.hp}`,
    `ATK ${playerCombat.atk}`,
    `DEF ${playerCombat.def}`,
    `KEY ${scene.hasKey ? 'Y' : 'N'}`,
    `COINS ${scene.coins}`,
    `WEAPON ${scene.playerWeapon ? scene.playerWeapon.name : 'None'}`,
    `ARMOR ${scene.playerArmor ? scene.playerArmor.name : 'None'}`,
    `ITEMS ${totalItems}`
  ]
  if (scene.playerWeapon) {
    const special = scene.playerWeapon.special
    const currentCharge = Math.min(scene.weaponCharge, special.chargeMax)
    statsLines.push(`  +ATK ${scene.playerWeapon.atk}`)
    statsLines.push(`  Special ${special.name}: DMG ${special.damage}`)
    statsLines.push(`  Charge ${currentCharge}/${special.chargeMax}`)
    if (currentCharge >= special.chargeMax) statsLines.push('  Special READY')
    if (special.desc) statsLines.push(`  ${special.desc}`)
  }
  if (scene.playerArmor) {
    statsLines.push(`  +DEF ${scene.playerArmor.def}`)
    if (typeof scene.playerArmor.shield === 'number') statsLines.push(`  Shield HP ${scene.playerArmor.shield}`)
    if (scene.playerArmor.desc) statsLines.push(`  ${scene.playerArmor.desc}`)
  }

  const lineHeight = 18
  const sectionGap = 12
  const sidebarX = scene.sidebarPadding
  let currentY = scene.sidebarPadding

  const statsText = statsLines.join('\n')
  addTextOnce(scene, 'ui', sidebarX, currentY, statsText, '#ffffff')
  currentY += statsText.split('\n').length * lineHeight + sectionGap

  const statusLinesRaw = (scene.activeStatuses ?? []).map((entry: { def: any; remaining: number }) => {
    const effectBits: string[] = []
    if (entry.def?.atkBonus) effectBits.push(`ATK ${entry.def.atkBonus >= 0 ? '+' : ''}${entry.def.atkBonus}`)
    if (entry.def?.defBonus) effectBits.push(`DEF ${entry.def.defBonus >= 0 ? '+' : ''}${entry.def.defBonus}`)
    if (entry.def?.hpPerTurn) effectBits.push(`HP ${entry.def.hpPerTurn >= 0 ? '+' : ''}${entry.def.hpPerTurn}/turn`)
    const effectSummary = effectBits.length ? ` [${effectBits.join(', ')}]` : ''
    return `${entry.def.name} (${entry.remaining})${effectSummary}`
  })
  const statusHeader = 'Statuses:'
  const statusText = statusLinesRaw.length ? [statusHeader, ...statusLinesRaw].join('\n') : `${statusHeader} none`
  const statusColor = statusLinesRaw.length
    ? (scene.activeStatuses.some((entry: { def: any }) => entry.def.type === 'debuff') ? '#f9a6a6' : '#cfe')
    : '#888'
  addTextOnce(scene, 'status_info', sidebarX, currentY, statusText, statusColor)
  currentY += Math.max(statusText.split('\n').length, 1) * lineHeight + sectionGap

  const knownSkills: SkillDef[] = scene.knownSkills ?? []
  const skillLines = knownSkills.map((skill, idx) => {
    const hotkey = SKILL_HOTKEYS[idx] ?? `#${idx + 1}`
    const cooldown = typeof scene.getSkillCooldown === 'function'
      ? scene.getSkillCooldown(skill.id)
      : (scene.skillCooldowns?.get(skill.id) ?? 0)
    const state = cooldown > 0 ? `CD ${cooldown}` : 'READY'
    return `${hotkey} ${skill.name} (${state})`
  })
  const skillHeader = 'Skills:'
  const skillText = skillLines.length ? [skillHeader, ...skillLines].join('\n') : `${skillHeader} none`
  const skillColor = skillLines.some(line => line.includes('CD')) ? '#ffd27f' : '#cfe'
  addTextOnce(scene, 'skill_info', sidebarX, currentY, skillText, skillColor)
  currentY += Math.max(skillText.split('\n').length, 1) * lineHeight + sectionGap

  const enemyLinesCount = Math.max(enemyInfoText.split('\n').length, 1)
  addTextOnce(scene, 'enemy_info', sidebarX, currentY, enemyInfoText, enemyInfoColor)
  currentY += enemyLinesCount * lineHeight + sectionGap

  const weaponLinesCount = Math.max(weaponInfoText.split('\n').length, 1)
  addTextOnce(scene, 'weapon_info', sidebarX, currentY, weaponInfoText, weaponInfoColor)
  currentY += weaponLinesCount * lineHeight + sectionGap

  const armorLinesCount = Math.max(armorInfoText.split('\n').length, 1)
  addTextOnce(scene, 'armor_info', sidebarX, currentY, armorInfoText, armorInfoColor)
  currentY += armorLinesCount * lineHeight + sectionGap

  const eventLinesCount = Math.max(eventInfoText.split('\n').length, 1)
  addTextOnce(scene, 'event_info', sidebarX, currentY, eventInfoText, eventInfoColor)
  currentY += eventLinesCount * lineHeight + sectionGap

  const shopLinesCount = Math.max(shopInfoText.split('\n').length, 1)
  addTextOnce(scene, 'shop_info', sidebarX, currentY, shopInfoText, shopInfoColor)
  currentY += shopLinesCount * lineHeight + sectionGap

  const itemLinesCount = Math.max(itemInfoText.split('\n').length, 1)
  addTextOnce(scene, 'item_info', sidebarX, currentY, itemInfoText, itemInfoColor)
  currentY += itemLinesCount * lineHeight + sectionGap

  const inventoryStacks: any[] = scene.inventory ?? []
  const inventoryLines = inventoryStacks.length
    ? inventoryStacks.map((stack: any, idx: number) => {
        const qty = stack.quantity > 1 ? ` x${stack.quantity}` : ''
        const label = stack.def?.name ?? stack.name ?? 'Unknown'
        return `${idx + 1}. ${label}${qty}`
      })
    : ['(empty)']
  const inventoryHeader = 'Inventory (1-9 to use)'
  const inventoryText = [inventoryHeader, ...inventoryLines].join('\n')
  const inventoryColor = inventoryStacks.length ? '#cfe' : '#888'
  const inventoryLinesCount = Math.max(inventoryText.split('\n').length, 1)
  addTextOnce(scene, 'inventory', sidebarX, currentY, inventoryText, inventoryColor)
  currentY += inventoryLinesCount * lineHeight + sectionGap

  const lastMessage = (scene.lastActionMessage ?? '').trim()
  const lastActionText = ['Last action:', lastMessage.length ? lastMessage : 'None'].join('\n')
  const actionLinesCount = Math.max(lastActionText.split('\n').length, 1)
  addTextOnce(scene, 'last_action', sidebarX, currentY, lastActionText, '#ffe9a6')
  currentY += actionLinesCount * lineHeight + sectionGap
}
