const cp = require('child_process')
const _ = require('lodash')

const cryptoUtils = require('crypto-utils')

const _getTotalSpentFromTx = (tx) => {
  return tx.outputs.reduce((total, output) => {
    return total + Number(output.value)
  }, 0)
}

const _calculateSupplyFromUTXOs = (utxos) => {
  return utxos.reduce((supply, utxo) => {
    return supply + Number(utxo.output.value)
  }, 0)
}

const _buildUtxoHashesFromBlocks = (blocks) => {
  let utxoHashes = {} // { hash + index: utxo }

  // gameplan:
  //  go through all outputs.
  //  add each output to hash
  //  go through all inputs.
  //  if output is referenced (by tx hash and index)
  //    remove it from utxoHashes

  blocks.forEach(block => {
    block.txs.forEach(tx => {
      tx.outputs.forEach((output, outputIdx) => {
        const key = tx.txNonce + outputIdx.toString()
        utxoHashes[key] = {
          txHash: tx.txNonce, // string length 64
          index: outputIdx, // number
          spent: false,
          output: output
        }
      })
    })
  })

  // TODO optimization: a utxo can't be referenced before it's
  // made, so we might be able to piggyback off of above loop.
  // Either way, this is certainly very inefficient.
  blocks.forEach(block => {
    block.txs.forEach(tx => {
      tx.inputs.forEach(input => {
        const key = input.prevTx + input.index.toString()
        delete utxoHashes[key]
      })
    })
  })

  return utxoHashes
}

const _transformUtxoHashesToUtxos = (utxoHashes) => {
  return Object.values(utxoHashes)
}

// we're going to just keep a global db on this miner object for now.
// this'll make for easy information retrieval.
class Miner {
  constructor () {
    this.blocks = []
    this.utxos = []
    this.supply = 0
    this.minerChildProcess = null

    // private place to store a handy utxo based data transformation
    this._utxoHashes = {}
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

    this.minerChildProcess = minerChildProcess

    // TODO Optimization: combine supply and utxos calculations
    minerChildProcess.on('message', block => {
      this._addBlock(block)
      this._utxoHashes = _buildUtxoHashesFromBlocks(this.blocks)
      this.utxos = _transformUtxoHashesToUtxos(this._utxoHashes)
      this.supply = _calculateSupplyFromUTXOs(this.utxos)
    })

    // and make sure the miner child stops when this process exits
    const cleanExit = () => {
      console.log('killing mining fork...')
      minerChildProcess.kill()
      process.exit()
    }
    process.on('exit', cleanExit)
    process.on('SIGINT', cleanExit)
    process.on('SIGTERM', cleanExit)
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

  addTx (tx) {
    if (this.minerChildProcess) {
      this.minerChildProcess.send(tx)
    }
  }

  validateTx (tx) {
    // TODO ensure inputs is not empty, ensure shape of inputs, outputs
    // TODO need to make sure values in outputs and inputs are not negative

    /** Shape **/
    if (
      typeof tx !== 'object' ||
      typeof tx.inputs !== 'object' ||
      typeof tx.outputs !== 'object' ||
      typeof tx.txNonce !== 'string'
    ) return false

    /** inputs map to valid utxos once **/

    // duplicate our stored _utxoHashes so we can mangle it
    const utxoHashes = Object.assign({}, this._utxoHashes)

    // inputs all map to a utxo, no double matching
    const allInputsMapToValidUtxoOnce = tx.inputs.every(input => {
      const key = input.prevTx + input.index.toString()
      const mapsToUtxo = !!utxoHashes[key]
      delete utxoHashes[key] // prevents double matching
      return mapsToUtxo
    })

    if (!allInputsMapToValidUtxoOnce) return false

    /** Input !< Output **/
    const inputTotalValue = tx.inputs.reduce((total, input) => {
      const key = input.prevTx + input.index.toString() // TODO abstract
      return total + this._utxoHashes[key].output.value
    }, 0)

    const outputTotalValue = tx.outputs.reduce((total, output) => {
      return total + Number(output.value)
    }, 0)

    const inputIsLessThanOutput = inputTotalValue < outputTotalValue

    if (inputIsLessThanOutput) return false

    /** Enough sender supply **/
    const key = tx.inputs[0].prevTx + tx.inputs[0].index
    const senderPk = this._utxoHashes[key].output.address
    const senderSupply = _calculateSupplyFromUTXOs(this.getUtxosForPK(senderPk))
    const txTotalSpent = _getTotalSpentFromTx(tx)
    const hasEnoughCoin = senderSupply - txTotalSpent >= 0

    if (!hasEnoughCoin) return false

    /** Signature **/
    const hasCorrectSignatures = tx.inputs.every(input => {
      return cryptoUtils.verify(_.omit(input, 'sig'), input.sig, senderPk)
    })

    if (!hasCorrectSignatures) return false

    return true
  }
}

// public functions

module.exports = new Miner()
