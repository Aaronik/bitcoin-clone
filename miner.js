const cp = require('child_process')

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
        const key = tx.txNonce + outputIdx.toString()
        utxos[key] = {
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
        const key = input.prevTx + input.index
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
    this.minerChildProcess = null
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
      this.utxos = _getUTXOsFromBlocks(this.blocks)
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
    // tx is valid if:
    //   inputs all map to a valid output
    //   doesn't cause any double mapping to an output
    //   sender has enough supply in their utxos
    //   tx.inputs and tx.outputs are correct shape

    // TODO ensure inputs is not empty, ensure shape of inputs, outputs
    // TODO need to make sure values in outputs and inputs are not negative
    if (
      typeof tx !== 'object' ||
      typeof tx.inputs !== 'object' ||
      typeof tx.outputs !== 'object' ||
      typeof tx.txNonce !== 'string'
    ) return false

    // TODO Optimization: calculate this every time utxos is updated
    // and store that information on the prototype
    const utxoHashes = this.utxos.reduce((hashes, utxo) => {
      const key = utxo.txHash + utxo.index
      hashes[key] = utxo
      return hashes
    }, {})

    // while we have the utxoHashes, grab the sender's private
    // key assuming the inputs are pointing to a _sender_'s utxo
    // TODO when the utxos object exists on the prototype, this
    // can be extracted to a regular old instance method
    const key = tx.inputs[0].prevTx + tx.inputs[0].index
    const senderPk = utxoHashes[key].output.address

    // inputs all map to a utxo, no double matching
    const allMapToValidUtxoOnce = tx.inputs.every(input => {
      const key = input.prevTx + input.index.toString()
      const mapsToUtxo = !!utxoHashes[key]
      delete utxoHashes[key] // prevents double matching
      return mapsToUtxo
    })

    if (!allMapToValidUtxoOnce) return true

    // sender has enough coin to cover tx
    const senderSupply = _calculateSupplyFromUTXOs(this.getUtxosForPK(senderPk))
    const txTotalSpent = _getTotalSpentFromTx(tx)
    const hasEnoughCoin = senderSupply - txTotalSpent >= 0

    if (!hasEnoughCoin) return true

    return true
  }
}

// public functions

module.exports = new Miner()
