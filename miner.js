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

const _getUTXOsFromBlocks = (blocks) => {
  let utxos = {} // { hash + index: utxo }

  // gameplan:
  //  go through all outputs.
  //  add each output to hash
  //  go through all inputs.
  //  if output is referenced (by tx hash and index)
  //    remove it from utxos
  //  return the values of remaining utxos

  blocks.forEach(block => {
    block.txs.forEach(tx => {
      tx.outputs.forEach((output, outputIdx) => {
        const key = tx.nonce + outputIdx
        console.log('adding utxo for key:', key)
        utxos[key] = output
      })
    })
  })

  // TODO optimization: a utxo can't be referenced before it's
  // made, so we might be able to piggyback off of above loop.
  // Either way, this is certainly very inefficient.
  blocks.forEach(block => {
    block.txs.forEach(tx => {
      tx.inputs.forEach(input => {
        const key = input.prevTx + input.index
        console.log('removing utxo for key:', key)
        delete utxos[key]
      })
    })
  })

  return Object.values(utxos)
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

    // TODO Optimization: combine supply and utxos calculations
    minerChildProcess.on('message', (block) => {
      console.log('miner just created block:', block)
      this._addBlock(block)
      this.supply = _calculateSupplyFromBlocks(this.blocks)
      // this.utxos = this.utxos.concat(_getUTXOsFromBlock(block))
      this.utxos = _getUTXOsFromBlocks(this.blocks)
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

  // get all utxos for a specific PK
  getUtxosForPK (pk) {
    return this.utxos.filter(utxo => utxo.output.address === pk)
  }
}

// public functions

module.exports = new Miner()
