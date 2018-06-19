// Globals
const WALLET_PATH = './wallet.json' // where's that wallet being saved
const CONFIG_PATH = './server-config.json' // what's the name of the config file

const app = require('express')()
app.use(require('body-parser').json())

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
    miner.startMining({
      blockReward: config.blockReward,
      difficultyLevel: config.difficultyLevel,
      pk: wallet[0].pk,
      sk: wallet[0].sk
    })
  }

  // define the server routes (here for now)
  app.get('/supply', (req, res) => res.json({ supply: miner.getSupply() }))
  app.get('/utxos', (req, res) => res.json({ utxos: miner.getUtxos() }))
  app.get('/utxos/:pk', (req, res) => res.json({ utxos: miner.getUtxosForPK(req.params.pk) }))
  app.get('/blocks', (req, res) => res.json({ blocks: miner.getBlocks() }))
  app.get('/accounts', (req, res) => res.json({ accounts: fileUtil.readWallet() }))

  app.get('/createaccount/:name', (req, res) => {
    const accountName = req.params.name

    // if an account with that name already exists, return an 'error'
    if (fileUtil.accountAlreadyExists(accountName)) {
      return res.json({ newAccount: false })
    }

    const newAccount = fileUtil.generateAccountFromName(accountName)
    fileUtil.addAccountToWallet(newAccount)
    res.json({ newAccount })
  })

  app.post('/addtx', (req, res) => {
    const tx = req.body && req.body.transact
    if (!miner.validateTx(tx)) return res.json({ successful: false })
    miner.addTx(tx)
    return res.json({ successful: true })
  })

  // fire up the serving
  app.listen(
    config.port,
    () => console.log(`Server started on localhost:${config.port}...`)
  )
}

main()
