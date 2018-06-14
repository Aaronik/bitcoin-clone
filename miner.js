// Globals
const cryptoUtils = require('crypto-utils')
const hashUtil = require('./hash-util')

// we're going to just keep a global db on this miner object for now.
// this'll make for easy information retrieval.
class Db {
  constructor() {
    this.blocks = []
  }

  // add a block to the db
  addBlock(block) {
    this.blocks.push(block)
  }

  // get all blocks from db
  getBlocks() {
    return this.blocks
  }

  // return total monetary supply created in blocks in db
  getSupply() {
    return this.blocks.reduce((supply, block) => {
      // TODO this assumes reward transaction is first transaction in block
      return supply + block.txs[0].outputs[0].value
    }, 0)
  }

  // get all unspent transaction outputs
  getUtxos() {
    return []
  }
}

// private helper methods
const _mineNewBlock = (pk, sk, rewardTx, hashPrevHeader, difficultyLevel) => {
  let blockHeader = {
    hashPrevHeader: hashPrevHeader,
    hashTxs: cryptoUtils.hash(rewardTx),
    bits: difficultyLevel
  }

  blockHeader.nonce = hashUtil.generateProofOfWork(blockHeader, Number(difficultyLevel))

  const block = {
    header: blockHeader,
    txs: [rewardTx],
    signer: pk,
    sig: cryptoUtils.sign({ header: blockHeader }, sk),
    height: 0
  }

  return block
}

// public functions

// start up the mining
const initialize = ({ blockReward, difficultyLevel, pk, sk }) => {
  const rewardTx = {
    inputs: [], // empty for _reward_ tx
    outputs: [{
      address: pk,
      value: blockReward
    }],
    nonce: cryptoUtils.randomBits()
  }

  let lastBlock

  // mine blocks forever!
  while (true) {
    // the genesis block's header starts with all 0's
    let hashPrevHeader = lastBlock
      ? cryptoUtils.hash(lastBlock.header)
      : '0'.repeat(64)

    lastBlock = _mineNewBlock(pk, sk, rewardTx, hashPrevHeader, difficultyLevel)
    console.log(lastBlock)
  }
}


module.exports = { initialize }
