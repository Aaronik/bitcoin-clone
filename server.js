// Globals
const WALLET_PATH = './wallet.json' // where's that wallet being saved
const CONFIG_PATH = './server-config.json' // what's the name of the config file

const app = require('express')()
app.use(require('body-parser').json())

const fileUtil = require('./file-util')({ CONFIG_PATH, WALLET_PATH })
const miner = require('./miner')
const db = require('./db')
const nodeUtil = require('./node-util')

const config = fileUtil.readConfig()

// These are for ease of testing
const PORT = process.argv[2] || config.port
const MINING = process.argv[3] ? JSON.parse(process.argv[3]) : config.mining

// the main funk
const main = () => {
  // first we deal with the wallet file
  if (!fileUtil.walletFileExists()) {
    fileUtil.createWallet()
  }

  // conditionally start the mining
  if (MINING) {
    miner.startMining({
      blockReward: config.blockReward,
      difficultyLevel: config.difficultyLevel,
      pk: fileUtil.readWallet()[0].pk,
      sk: fileUtil.readWallet()[0].sk,
      db: db
    }, block => {
      nodeUtil.broadcastBlock(block, db.getNodeList())
    })
  }

  // define the server routes (here for now)
  app.get('/nodelist', (req, res) => res.json({ nodes: db.getNodeList() }))
  app.get('/supply', (req, res) => res.json({ supply: db.getSupply() }))
  app.get('/utxos', (req, res) => res.json({ utxos: db.getUtxos() }))
  app.get('/utxos/:pk', (req, res) => res.json({ utxos: db.getUtxosForPK(req.params.pk) }))
  app.get('/blocks', (req, res) => res.json({ blocks: db.getBlocks() }))
  app.get('/latestblock', (req, res) => res.json(db.getLatestBlockMetaData()))
  app.get('/accounts', (req, res) => res.json({ accounts: fileUtil.readWallet() }))

  app.get('/blocks/:startIndex/:endIndex', (req, res) => {
    const { startIndex, endIndex } = req.params
    return res.json({
      blocks: db.getBlockRange(Number(startIndex), Number(endIndex))
    })
  })

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
    nodeUtil.broadcastTx(tx, db.getNodeList())
    return res.json({ successful: true })
  })

  app.post('/join', (req, res) => {
    const node = req.body && req.body.node
    if (!db.validateNode(node)) return res.json({ successful: false })
    db.addNode(node)
    return res.json({ successful: true })
  })

  app.post('/addblock', (req, res) => {
    const block = req.body && req.body.block
    if (!db.validateBlock(block)) return res.json({ successful: false })
    db.addBlock(block)
    miner.interrupt()
    return res.json({ successful: true })
  })

  // attach to the rest of the nodes in the world
  if (db.validateNode(config.seedNode)) db.addNode(config.seedNode)
  nodeUtil.fetchNodeList(config.seedNode).then(async function (nodesJson) {
    const nodes = JSON.parse(nodesJson).nodes
    nodes.forEach(node => {
      if (db.validateNode(node)) db.addNode(node)
      nodeUtil.informNodeOfExistence(node, config.ip, PORT)
    })

    const foreignBlocks = await nodeUtil.getSynchronizedBlocks(db.getNodeList(), db.getBlocks())
    foreignBlocks.forEach(block => {
      if (db.validateBlock(block)) db.addBlock(block)
    })
  })

  // fire up the serving
  app.listen(
    PORT,
    () => console.log(`Server started on localhost:${PORT}...`)
  )
}

main()
