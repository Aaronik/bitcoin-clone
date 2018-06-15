const cp = require('child_process')
const _ = require('lodash')

const _calculateSupplyFromBlocks = (blocks) => {
  return blocks.reduce((supply, block) => {
    // TODO this assumes reward transaction is first transaction in block
    return supply + block.txs[0].outputs[0].value
  }, 0)
}

const _getUTXOsFromBlock = (block) => {
  return _.flatten(block.txs.map((tx, txIdx) => {
    return tx.outputs.map((output, outputIdx) => {
      return {
        txHash: tx.nonce, // string length 64
        index: outputIdx, // number
        spent: true,
        output: output
      }
    })
  }))
}

// we're going to just keep a global db on this miner object for now.
// this'll make for easy information retrieval.
class Miner {
  constructor () {
    this.blocks = []
    this.utxos = []
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
      this.utxos = this.utxos.concat(_getUTXOsFromBlock(block))
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
    return this.utxos
  }
}

// public functions

module.exports = new Miner()
