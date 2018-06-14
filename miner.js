const cp = require('child_process')

const _calculateSupplyFromBlocks = (blocks) => {
  return blocks.reduce((supply, block) => {
    // TODO this assumes reward transaction is first transaction in block
    return supply + block.txs[0].outputs[0].value
  }, 0)
}

// we're going to just keep a global db on this miner object for now.
// this'll make for easy information retrieval.
class Miner {
  constructor () {
    this.blocks = []
    this.supply = 0
  }

  // private: add a block to the db
  _addBlock (block) {
    this.blocks.push(block)
  }

  // start up the mining
  initialize ({ blockReward, difficultyLevel, pk, sk }) {
    // fire up miner in separate process
    const minerChildProcess = cp.fork(
      './miner-child-process.js',
      [JSON.stringify({ blockReward, difficultyLevel, pk, sk })]
    )

    minerChildProcess.on('message', (block) => {
      this._addBlock(block)
      this.supply = _calculateSupplyFromBlocks(this.blocks)

      console.log('got new block:', block)
      console.log('current supply:', this.supply)
      console.log('num blocks:', this.blocks.length)
    })
  }

  // get all blocks from db
  getBlocks () {
    return this.blocks
  }

  // return total monetary supply created in blocks in db
  getSupply () {
    return this.supply
  }

  // get all unspent transaction outputs
  getUtxos () {
    return []
  }
}

// public functions

module.exports = new Miner()
