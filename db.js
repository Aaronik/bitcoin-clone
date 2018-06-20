// This file will be the interface between the app and whatever database
// it's using

const _ = require('lodash')
const cryptoUtils = require('crypto-utils')

const blockUtil = require('./block-util')

class Db {
  constructor () {
    this.blocks = []
    this.utxos = []
    this.supply = 0
    this.nodeList = []
  }

  /** Block related stuff **/

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

  getLatestBlockMetaData () {
    if (!this.blocks.length) return { index: null, hash: null }

    return {
      index: this.blocks.length - 1,
      hash: cryptoUtils.hash(_.last(this.blocks).header)
    }
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

  /** Other stuff **/

  // add another bitcoin client in the form '<ip>:<port>'
  addNode (node) {
    this.nodeList.push(node)
  }

  // validate whether a node is legit or not
  validateNode (node) {
    const exists = !!node
    if (!exists) return false

    const isStr = typeof node === 'string'
    if (!isStr) return false

    const correctShape = node.split(':').length === 2
    if (!correctShape) return false

    const alreadyExists = _.includes(this.nodeList, node)
    if (alreadyExists) return false

    return true
  }

  // return list of other bitcoin nodes
  getNodeList () {
    return this.nodeList
  }
}

module.exports = new Db()
