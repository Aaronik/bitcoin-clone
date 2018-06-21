const request = require('request-promise')
const cryptoUtils = require('crypto-utils')
const _ = require('lodash')

const _post = (node, endpoint, data) => {
  return request({
    method: 'POST',
    uri: 'http://' + node + '/' + endpoint,
    body: data,
    json: true
  })
}

// list all the nodes in the world, so says seedNode
const fetchNodeList = (seedNode) => {
  return request.get('http://' + seedNode + '/nodelist')
    .catch(() => { console.error('seed node does not appear to be active!') }) // fail silently
}

// tell node of our local ip and port
const informNodeOfExistence = (node, ip, port) => {
  return _post(node, 'join', { node: `${ip}:${port}` }).catch(() => {})
}

const broadcastTx = (tx, nodeList) => {
  nodeList.forEach(node => {
    _post(node, 'addtx', { transact: tx }).catch(() => {})
  })
}

const broadcastBlock = (block, nodeList) => {
  nodeList.forEach(node => {
    _post(node, 'addblock', { block }).catch(() => {})
  })
}

// get a guaranteed synchronized list of blocks
async function getSynchronizedBlocks (nodeList, blocks) {
  const randomNodes = _.sampleSize(nodeList, 3)

  // this will represent the last block of ours that matches with
  // the global chain. This will be off if we have been mining alone,
  // not listening to anyone else.
  let lastSynchronizedBlockIndex = blocks.length

  for (let i = blocks.length; i > 0; i--) {
    const block = await _getSynchronizedBlockAtIndex(nodeList, i)
    if (cryptoUtils.hash(block.header) === cryptoUtils.hash(blocks[i].header)) {
      lastSynchronizedBlockIndex = i
      break
    }
  }

  const latestBlock = await _getSynchronizedLatestBlock(nodeList)
  const latestBlockIndex = latestBlock.index

  const blocksJson = await _getSynchronizedBlockList(nodeList, lastSynchronizedBlockIndex, latestBlockIndex)
  return _tryToParse(blocksJson).blocks
}

const _tryToParse = (json) => {
  let parsed = json

  try {
    parsed = JSON.parse(json)
  } catch (e) {}

  return parsed
}

const _getLatestBlock = (node) => {
  return request.get('http://' + node + '/latestblock')
    .catch(() => {})
}

const _areLatestBlocksEqual = (latestBlocks) => {
  const hash = latestBlocks[0].hash
  return latestBlocks.every(blockMetaData => blockMetaData.hash === hash)
}

async function _getSynchronizedLatestBlock (nodeList) {
  const latestBlocks = await Promise.all(nodeList.map(_getLatestBlock))
  if (_areLatestBlocksEqual(latestBlocks)) return _tryToParse(latestBlocks[0])
  else return _getSynchronizedLatestBlock(nodeList)
}

const _getBlockAtIndex = (index, node) => {
  return request.get(`http://${node}/blocks/${index}/${index}`)
    .catch(() => {})
}

const _areBlocksEqual = (blocks) => {
  const sig = blocks[0].sig
  return blocks.every(block => block.sig === sig)
}

async function _getSynchronizedBlockAtIndex (nodeList, blockIdx) {
  const blocks = await Promise.all(nodeList.map(_getBlockAtIndex.bind(null, blockIdx)))
  if (_areBlocksEqual(blocks)) return _tryToParse(blocks[0])
  else return _getSynchronizedBlockAtIndex(nodeList, blockIdx)
}

const _getBlocksAtIndices = (node, startIndex, endIndex) => {
  return request.get(`http://${node}/blocks/${startIndex}/${endIndex}`)
    .catch(() => {})
}

async function _getSynchronizedBlockList (nodeList, startIndex, endIndex) {
  // slacking on measuring equality here since the indices are all the same
  const blockList = await _getBlocksAtIndices(nodeList[0], startIndex, endIndex)
  return _tryToParse(blockList)
}

module.exports = { fetchNodeList, informNodeOfExistence, broadcastTx, broadcastBlock, getSynchronizedBlocks }
