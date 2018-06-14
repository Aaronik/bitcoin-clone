// This file is the subprocess called to start mining on
// a different thread.
const cryptoUtils = require('crypto-utils')
const hashUtil = require('./hash-util')

const args = JSON.parse(process.argv[2])
const { blockReward, difficultyLevel, pk, sk } = args;

// private helper methods
const _mineNewBlock = (pk, sk, rewardTx, hashPrevHeader, difficultyLevel) => {
  let blockHeader = {
    hashPrevHeader: hashPrevHeader,
    hashTxs: cryptoUtils.hash(rewardTx),
    bits: difficultyLevel
  }

  blockHeader.nonce = hashUtil.generateProofOfWork(blockHeader, Number(difficultyLevel))

  const block = {
    header: blockHeader,
    txs: [rewardTx],
    signer: pk,
    sig: cryptoUtils.sign({ header: blockHeader }, sk),
    height: 0
  }

  return block
}

// public functions

// start up the mining
const rewardTx = {
  inputs: [], // empty for _reward_ tx
  outputs: [{
    address: pk,
    value: blockReward
  }],
  nonce: cryptoUtils.randomBits()
}

let lastBlock

// mine blocks forever!
while (true) {
  // the genesis block's header starts with all 0's
  let hashPrevHeader = lastBlock
    ? cryptoUtils.hash(lastBlock.header)
    : '0'.repeat(64)

  lastBlock = _mineNewBlock(pk, sk, rewardTx, hashPrevHeader, difficultyLevel)
  process.send(lastBlock)
}
