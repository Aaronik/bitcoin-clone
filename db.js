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

    // private place to store a handy, internally used data transformation
    this.utxoHashes = {}
  }

  /** Block related stuff **/

  // add a block to the db
  addBlock (block) {
    const headerHash = cryptoUtils.hash(block.header)
    this.blocks[headerHash] = block

    const orderedBlocks = this.getBlocks()

    this.utxoHashes = blockUtil.buildUtxoHashesFromBlocks(orderedBlocks)
    this.utxos = blockUtil.getUtxosFromBlocks(orderedBlocks)
    this.supply = blockUtil.calculateSupplyFromUTXOs(this.utxos)
  }

  // get all blocks from chain in an ordered list
  getBlocks () {
    // We want to return 1) just the blocks on the main chain, and 2) in order
    // First we order _all_ of the blocks. This is an array ordered on height
    // [{...height: 0},{...height: 1}, ...]
    const allBlocksOrdered = Object.values(this.blocks)
      .sort((b1, b2) => b1.height < b2.height ? -1 : 1)

    if (allBlocksOrdered.length === 0) return []

    // Now we populate a list of the blocks we find walking _backwards_
    // down the chain. Anything not in that list is not in our main chain.
    let prunedBlocksOrdered = [_.last(allBlocksOrdered)]

    while (true) {
      const nextBlockHash = prunedBlocksOrdered[0].header.hashPrevHeader
      const nextBlock = this.blocks[nextBlockHash]
      if (!nextBlock) break // we've reached the end of the chain
      prunedBlocksOrdered.unshift(nextBlock)
    }

    return prunedBlocksOrdered
  }

  getBlockRange (startIndex, endIndex) {
    if (startIndex < 0) return null
    if (endIndex > this.getBlocks().length - 1) return null
    return this.getBlocks().slice(startIndex, endIndex)
  }

  getLatestBlockMetaData () {
    if (!this.getBlocks().length) return { index: null, hash: null }

    const lastBlock = _.last(this.getBlocks())

    return {
      index: lastBlock.height,
      hash: cryptoUtils.hash(lastBlock.header)
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
    // if (!exists) console.log('invalid, doesnt exist')
    if (!exists) return false

    const correctSig = cryptoUtils.verify(block.header, block.sig, block.signer)
    // if (!correctSig) console.log('invalid, bad sig')
    if (!correctSig) return false

    const referencesExistingBlock = this.blockExists(block.header.hashPrevHeader)
    // if (!referencesExistingBlock) console.log('invalid, prev block doesnt exist')
    if (!referencesExistingBlock) return false

    const headerHash = cryptoUtils.hash(block.header)
    const alreadyHaveBlock = this.blockExists(headerHash)
    // if (alreadyHaveBlock) console.log('invalid, already have block')
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
