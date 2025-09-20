import Phaser from 'phaser'
import { GameScene } from './scenes/GameScene'


new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 1080, // 64px * 11 board + expanded sidebar
  height: 704,
  backgroundColor: '#0a1414',
  pixelArt: true,
  scene: [GameScene],
})


