import type { EventDef } from '../core/Types'

export const events: EventDef[] = [
  {
    id: 'ancient-fountain',
    title: 'Ancient Fountain',
    description: 'A forgotten fountain murmurs with latent magic. The water glows softly beneath the dust.',
    preview: 'A shimmering fountain invites you closer.',
    options: [
      {
        id: 'drink',
        label: 'Drink deeply',
        outcome: {
          message: 'You drink the luminous water and feel life rush back into your veins.',
          hpDelta: 30
        }
      },
      {
        id: 'wash',
        label: 'Wash your weapon',
        outcome: {
          message: 'Your weapon hums as the water courses over it, yet the power strains your body.',
          hpDelta: -10,
          weaponChargeDelta: 2,
          grantStatuses: [{ id: 'battle-focus' }]
        }
      },
      {
        id: 'collect-herbs',
        label: 'Harvest healing moss',
        outcome: {
          message: 'You gather a bundle of glowing moss that smells of rain and earth.',
          grantStatuses: [{ id: 'regeneration' }],
          grantItems: [{ id: 'healing-herb', quantity: 1 }]
        }
      }
    ]
  },
  {
    id: 'forgotten-altar',
    title: 'Forgotten Altar',
    description: 'Candles lie cold around a cracked altar. Offerings from long ago still rest in the dust.',
    preview: 'Ancient prayers hang heavy in the air.',
    minFloor: 2,
    options: [
      {
        id: 'pray',
        label: 'Offer a quick prayer',
        outcome: {
          message: 'A harsh warmth answers you. You feel weakened, but a key materialises in your grasp.',
          hpDelta: -15,
          giveKey: true
        }
      },
      {
        id: 'offer-blood',
        label: 'Spill a few drops of blood',
        outcome: {
          message: 'You score your palm and press it to the stone. A whisper sharpens your weapon arm.',
          hpDelta: -5,
          weaponChargeDelta: 1,
          grantStatuses: [{ id: 'stone-skin' }],
          grantSkills: ["stone-ward"]
        }
      },
      {
        id: 'inspect-offerings',
        label: 'Inspect the old offerings',
        outcome: {
          message: 'Among the faded trinkets you find a crackling crystal, still warm to the touch. A hidden tithe box yields 30 coins.',
          grantItems: [{ id: 'charge-crystal', quantity: 1 }],
          coinDelta: 30
        }
      }
    ]
  },
  {
    id: 'sealed-cache',
    title: 'Sealed Cache',
    description: 'A heavy coffer is chained to the floor, its lock crusted with verdigris.',
    preview: 'Someone hid valuables here long ago.',
    minFloor: 3,
    options: [
      {
        id: 'force-open',
        label: 'Force it open',
        outcome: {
          message: 'The chains snap, but the effort leaves you drained.',
          hpDelta: -20,
          weaponChargeDelta: 3,
          grantStatuses: [{ id: 'poisoned' }]
        }
      },
      {
        id: 'study',
        label: 'Study the mechanism',
        outcome: {
          message: 'You find the bypass rune and ease the lid open. Inside rests a carefully wrapped ration.',
          hpDelta: 20,
          grantItems: [{ id: 'iron-ration', quantity: 1 }]
        }
      }
    ]
  },
  {
    id: 'lost-pack',
    title: 'Lost Pack',
    description: 'A leather satchel lies beside a skeleton, its straps gnawed by time. Supplies spill out in the dust.',
    preview: 'Someone left their gear behind.',
    options: [
      {
        id: 'take-everything',
        label: 'Take everything useful',
        outcome: {
          message: 'You salvage the best of the supplies and stash them away. A few coins jingle loose in the pack.',
          grantItems: [
            { id: 'healing-herb', quantity: 2 },
            { id: 'iron-ration', quantity: 1 }
          ],
          coinDelta: 40
        }
      },
      {
        id: 'share',
        label: 'Leave something for the next delver',
        outcome: {
          message: 'You take only a small bundle, hoping the next traveler finds the rest.',
          grantItems: [{ id: 'healing-herb', quantity: 1 }]
        }
      },
      {
        id: 'search-remains',
        label: 'Search the remains for clues',
        outcome: {
          message: 'A note tucked in the pack teaches you routes through the tower. You feel steadier and spot a forgotten coin purse.',
          hpDelta: 10,
          coinDelta: 25,
          grantSkills: ["renewing-wave"]
        }
      }
    ]
  }
]
