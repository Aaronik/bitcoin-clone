// This file is the subprocess called to start mining on
// a different thread. Simply mines a single block.

// Globals
const cryptoUtils = require('crypto-utils')
const hashUtil = require('./hash-util')

// get the args passed from the caller (like from the CLI unfortunately)
const args = JSON.parse(process.argv[2])
const { txs, pk, sk, difficultyLevel, prevBlockMetaData, miner } = args

// the genesis block's header starts with all 0's
const hashPrevHeader = prevBlockMetaData.hash
  ? prevBlockMetaData.hash
  : '0'.repeat(64)

let blockHeader = {
  hashPrevHeader: hashPrevHeader,
  hashTxs: cryptoUtils.hash(txs),
  bits: difficultyLevel
}

blockHeader.nonce = hashUtil.generateProofOfWork(blockHeader, Number(difficultyLevel))

const block = {
  header: blockHeader,
  txs: txs,
  miner: miner,
  signer: pk,
  sig: cryptoUtils.sign(blockHeader, sk),
  height: prevBlockMetaData.index === null ? 0 : prevBlockMetaData.index + 1
}

process.send(block)
