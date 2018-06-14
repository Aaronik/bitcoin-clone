// Globals
const cryptoUtils = require('crypto-utils')

const hashUtil = require('./hash-util')
const fileUtil = require('./file-util')

const config = fileUtil.readConfig() // contents of our config

const mineNewBlock = (pk, sk, rewardTx, hashPrevHeader) => {
  let blockHeader = {
    hashPrevHeader: hashPrevHeader,
    hashTxs: cryptoUtils.hash(rewardTx),
    bits: config.difficultyLevel
  }

  blockHeader.nonce = hashUtil.generateProofOfWork(blockHeader, Number(config.difficultyLevel))

  const block = {
    header: blockHeader,
    txs: [rewardTx],
    signer: pk,
    sig: cryptoUtils.sign({ header: blockHeader }, sk),
    height: 0 // TODO this OK?
  }

  return block
}

// the main funk
const main = () => {
  // first we deal with the wallet file
  if (!fileUtil.walletFileExists()) {
    fileUtil.createWallet()
  }

  // TODO optimize by returning from fileUtil.createWallet
  // (or don't optimize b/c this will not be a bottleneck)
  const wallet = fileUtil.readWallet()

  // now let's create that reward tx
  const rewardTx = {
    inputs: [], // empty for _reward_ tx
    outputs: [{
      address: wallet[0].pk,
      value: config.blockReward
    }],
    nonce: cryptoUtils.randomBits()
  }

  let lastBlock

  // now we just mine blocks forever!
  while (true) {
    // the genesis block's header starts with all 0's
    let hashPrevHeader = lastBlock
      ? cryptoUtils.hash(lastBlock.header)
      : '0'.repeat(64)

    lastBlock = mineNewBlock(wallet[0].pk, wallet[0].sk, rewardTx, hashPrevHeader)
    console.log(JSON.stringify(lastBlock))
  }
}

main()
