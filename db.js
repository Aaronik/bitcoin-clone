// This file will be the interface between the app and whatever database
// it's using

const _ = require('lodash')
const cryptoUtils = require('crypto-utils')

const blockUtil = require('./block-util')

class Db {
  constructor () {
    this.blocks = {}
    this.utxos = []
    this.supply = 0
    this.nodeList = []
  }

  /** Block related stuff **/

  // add a block to the db
  addBlock (block) {
    const headerHash = cryptoUtils.hash(block.header)
    this.blocks[headerHash] = block
    this.utxos = blockUtil.getUtxosFromBlocks(this.getBlocks())
    this.supply = blockUtil.calculateSupplyFromUTXOs(this.utxos)
    // console.log('just finished adding a block:', block)
  }

  // get all blocks from db in a list
  getBlocks () {
    return Object.values(this.blocks)
  }

  getBlockRange (startIndex, endIndex) {
    if (startIndex < 0) return null
    if (endIndex > this.getBlocks().length - 1) return null
    return this.getBlocks().slice(startIndex, endIndex)
  }

  getLatestBlockMetaData () {
    if (!this.getBlocks().length) return { index: null, hash: null }

    return {
      index: this.getBlocks().length - 1,
      hash: cryptoUtils.hash(_.last(this.getBlocks()).header)
    }
  }

  blockExists (headerHash) {
    // the pre-genesis block is always real :)
    if (headerHash === '0'.repeat(64)) return true
    return !!this.blocks[headerHash]
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

  validateBlock (block) {
    const exists = !!block
    if (!exists) console.log('invalid, doesnt exist')
    if (!exists) return false

    const correctSig = cryptoUtils.verify(block.header, block.sig, block.signer)
    if (!correctSig) console.log('invalid, bad sig')
    if (!correctSig) return false

    const referencesExistingBlock = this.blockExists(block.header.hashPrevHeader)
    if (!referencesExistingBlock) console.log('invalid, prev block doesnt exist')
    if (!referencesExistingBlock) return false

    const headerHash = cryptoUtils.hash(block.header)
    const alreadyHaveBlock = this.blockExists(headerHash)
    if (alreadyHaveBlock) console.log('invalid, already have block')
    if (alreadyHaveBlock) return false

    return true
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
