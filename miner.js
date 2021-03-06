const cp = require('child_process')
const _ = require('lodash')
const cryptoUtils = require('crypto-utils')

const blockUtil = require('./block-util')

const _createRewardTx = (pk, blockReward) => {
  return {
    inputs: [],
    outputs: [{
      address: pk,
      value: blockReward
    }],
    txNonce: cryptoUtils.randomBits()
  }
}

const _getTotalSpentFromTx = (tx) => {
  return tx.outputs.reduce((total, output) => {
    return total + Number(output.value)
  }, 0)
}

// we're going to just keep a global db on this miner object for now.
// this'll make for easy information retrieval.
class Miner {
  constructor () {
    this.mempool = []
    this.minerProcess = null
  }

  // start up the mining
  startMining ({ blockReward, difficultyLevel, pk, sk, db }, onMineBlock) {
    this.blockReward = blockReward
    this.difficultyLevel = difficultyLevel
    this.pk = pk
    this.sk = sk
    this.db = db
    this.onMineBlock = onMineBlock
    this.minerProcess = null
    this._startMinerProcess()
  }

  // call this to interrupt the mining process and start anew
  interrupt () {
    this._restartMinerProcess()
  }

  addTx (tx) {
    this.mempool.push(tx)
    this._restartMinerProcess()
  }

  // just a shortcut to add a tx if it's valid or silently drop it
  addTxIfValid (tx) {
    if (this.validateTx(tx)) this.addTx(tx)
  }

  validateTx (tx) {
    // TODO ensure inputs is not empty, ensure shape of inputs, outputs
    // TODO need to make sure values in outputs and inputs are not negative

    /** Shape **/
    const isWrongShape = (
      typeof tx !== 'object' ||
      typeof tx.inputs !== 'object' ||
      typeof tx.outputs !== 'object' ||
      typeof tx.txNonce !== 'string'
    )

    if (isWrongShape) return false

    /** inputs map to valid utxos once **/

    // duplicate our stored utxoHashes so we can mangle it
    const utxoHashes = Object.assign({}, this.db.utxoHashes)

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
      return total + this.db.utxoHashes[key].output.value
    }, 0)

    const outputTotalValue = tx.outputs.reduce((total, output) => {
      return total + Number(output.value)
    }, 0)

    const inputIsLessThanOutput = inputTotalValue < outputTotalValue

    if (inputIsLessThanOutput) return false

    /** Enough sender supply **/
    const key = tx.inputs[0].prevTx + tx.inputs[0].index
    const senderPk = this.db.utxoHashes[key].output.address
    const senderSupply = blockUtil.calculateSupplyFromUTXOs(this.db.getUtxosForPK(senderPk))
    const txTotalSpent = _getTotalSpentFromTx(tx)
    const hasEnoughCoin = senderSupply - txTotalSpent >= 0

    if (!hasEnoughCoin) return false

    /** Signature **/
    const hasCorrectSignatures = tx.inputs.every(input => {
      return cryptoUtils.verify(_.omit(input, 'sig'), input.sig, senderPk)
    })

    if (!hasCorrectSignatures) return false

    const alreadyExists = this.mempool.some(t => tx.txNonce === t.txNonce)
    if (alreadyExists) return false

    return true
  }

  _startMinerProcess () {
    const args = {
      txs: [_createRewardTx(this.pk, this.blockReward)].concat(this.mempool),
      pk: this.pk,
      sk: this.sk,
      blockReward: this.blockReward,
      difficultyLevel: this.difficultyLevel,
      miner: process.argv[2],
      prevBlockMetaData: this.db.getLatestBlockMetaData()
    }

    // fire up miner in separate process
    this.minerProcess = cp.fork('./miner-child-process.js', [JSON.stringify(args)])

    this.minerProcess.on('message', block => {
      this._startMinerProcess()
      this.onMineBlock(block)
    })
  }

  _killMinerProcess () {
    this.minerProcess.kill()
  }

  _restartMinerProcess () {
    if (this.minerProcess) {
      this._killMinerProcess()
      this._startMinerProcess()
    }
  }
}

// public functions

module.exports = new Miner()
