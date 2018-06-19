// This file is the subprocess called to start mining on
// a different thread.

// Globals
const cryptoUtils = require('crypto-utils')
const hashUtil = require('./hash-util')

let lastBlock // we'll store the previous block here for now
let mempool = [] // the calling process will periodically fill this up for us

// get the args passed from the caller (like from the CLI unfortunately)
const args = JSON.parse(process.argv[2])
const { blockReward, difficultyLevel, pk, sk } = args

// private helper methods
const _mineNewBlock = (pk, sk, txs, hashPrevHeader, difficultyLevel) => {
  let blockHeader = {
    hashPrevHeader: hashPrevHeader,
    hashTxs: cryptoUtils.hash(txs),
    bits: difficultyLevel
  }

  blockHeader.nonce = hashUtil.generateProofOfWork(blockHeader, Number(difficultyLevel))

  const block = {
    header: blockHeader,
    txs: txs,
    signer: pk,
    sig: cryptoUtils.sign({ header: blockHeader }, sk),
    height: 0
  }

  return block
}

const _createRewardTx = () => {
  return {
    inputs: [], // empty for _reward_ tx
    outputs: [{
      address: pk,
      value: blockReward
    }],
    txNonce: cryptoUtils.randomBits()
  }
}

// a simple function to let the thread sleep for a second. This is necessary
// to allow our process.on listener to function, bc otherwise the while (true)
// loop will never let up and the listener will never happen
async function sleepBriefly () {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve('resolved')
    }, 1)
  })
}

process.on('message', tx => {
  mempool.push(tx)
})

async function startMining () {
  // mine blocks forever!
  while (true) {
    // the genesis block's header starts with all 0's
    let hashPrevHeader = lastBlock
      ? cryptoUtils.hash(lastBlock.header)
      : '0'.repeat(64)

    const txs = [_createRewardTx()].concat(mempool)
    lastBlock = _mineNewBlock(pk, sk, txs, hashPrevHeader, difficultyLevel)
    process.send(lastBlock)
    mempool = []

    await sleepBriefly()
  }
}

startMining()
