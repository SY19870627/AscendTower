import Phaser from 'phaser'
import { GameScene } from './scenes/GameScene'
import { TitleScene } from './scenes/TitleScene'


new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 1600, // 64px * 11 board + sidebar + right info panel
  height: 896, // keep taller canvas for bottom history panel
  backgroundColor: '#0a1414',
  pixelArt: true,
  scene: [TitleScene, GameScene],
})
