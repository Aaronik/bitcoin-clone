// A file containing helper functions around blocks, utxos, supply, etc.

// Return a custom utxo format. Very helpful for many internal calculations.
// Output is not meant to see the outside world.
const buildUtxoHashesFromBlocks = (blocks) => {
  let utxoHashes = {} // { hash + index: utxo }

  // gameplan:
  //  go through all outputs.
  //  add each output to hash
  //  go through all inputs.
  //  if output is referenced (by tx hash and index)
  //    remove it from utxoHashes

  blocks.forEach(block => {
    block.txs.forEach(tx => {
      tx.outputs.forEach((output, outputIdx) => {
        const key = tx.txNonce + outputIdx.toString()
        utxoHashes[key] = {
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
        const key = input.prevTx + input.index.toString()
        delete utxoHashes[key]
      })
    })
  })

  return utxoHashes
}

// take a full list of blocks and return all utxos from them.
const getUtxosFromBlocks = (blocks) => {
  return Object.values(buildUtxoHashesFromBlocks(blocks))
}

// take a list of utxos and calculate available coins
const calculateSupplyFromUTXOs = (utxos) => {
  return utxos.reduce((supply, utxo) => {
    return supply + Number(utxo.output.value)
  }, 0)
}

// recursively calculate the height of a block
const calculateBlockHeight = (block, blocks, height = 0) => {
  if (block.header.hashPrevHeader === '0'.repeat(64)) return height

  const nextBlock = blocks[block.header.hashPrevHeader]
  return calculateBlockHeight(nextBlock, blocks, height + 1)
}

module.exports = { buildUtxoHashesFromBlocks, getUtxosFromBlocks, calculateSupplyFromUTXOs, calculateBlockHeight }
