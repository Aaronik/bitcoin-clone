const cp = require('child_process')

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

// public functions

// start up the mining
const initialize = ({ blockReward, difficultyLevel, pk, sk }) => {
  // fire up miner in separate process
  const minerChildProcess = cp.fork(
    './miner-child-process.js',
    [JSON.stringify({ blockReward, difficultyLevel, pk, sk })]
  )

  minerChildProcess.on('message', console.log)
}

module.exports = { initialize }
