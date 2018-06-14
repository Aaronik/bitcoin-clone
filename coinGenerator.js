// Globals
const WALLET_PATH = './wallet.json' // where's that wallet being saved
const CONFIG_PATH = './server-config.json' // what's the name of the config file

const fileUtil = require('./file-util')({ CONFIG_PATH, WALLET_PATH })
const miner = require('./miner')

const config = fileUtil.readConfig() // contents of our config

// the main funk
const main = () => {
  // first we deal with the wallet file
  if (!fileUtil.walletFileExists()) {
    fileUtil.createWallet()
  }

  // TODO optimize by returning from fileUtil.createWallet
  // (or don't optimize b/c this will not be a bottleneck)
  const wallet = fileUtil.readWallet()

  // conditionally start the mining
  if (config.mining) {
    miner({
      blockReward: config.blockReward,
      difficultyLevel: config.difficultyLevel,
      pk: wallet[0].pk,
      sk: wallet[0].sk
    })
  }

}

main()
