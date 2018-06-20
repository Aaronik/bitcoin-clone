// This file will be the interface between the app and whatever database
// it's using

const blockUtil = require('./block-util')

class Db {
  constructor () {
    this.blocks = []
    this.utxos = []
    this.supply = 0
    this.mempool = []
    this.minerProcess = null

    // private place to store a handy utxo based data transformation
    this._utxoHashes = {}
  }

  // add a block to the db
  addBlock (block) {
    this.blocks.push(block)
    this.utxos = blockUtil.getUtxosFromBlocks(this.blocks)
    this.supply = blockUtil.calculateSupplyFromUTXOs(this.utxos)
  }

  // get all blocks from db
  getBlocks () {
    return this.blocks
  }

  // return total monetary supply created in blocks in db
  getSupply () {
    return this.supply
  }

  // return how much coin a single user has
  getSupplyForPk (pk) {
    return blockUtil.calculateSupplyFromUTXOs(this.getUtxosForPK(pk))
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

module.exports = new Db()
