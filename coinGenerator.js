// Globals
const cryptoUtils = require('crypto-utils');

const fileUtil = require('./file-util');

const config = fileUtil.readConfig(); // contents of our config

// the main funk
const main = () => {

  // first we deal with the wallet file
  if (!fileUtil.walletFileExists()) {
    fileUtil.createWallet();
  }

  // TODO optimize by returning from fileUtil.createWallet
  // (or don't optimize b/c this will not be a bottleneck)
  const wallet = fileUtil.readWallet();

  // now let's create that reward tx
  const rewardTx = {
    inputs: [], // empty for _reward_ tx
    outputs: [{
      address: wallet.pk,
      value: config.blockReward
    }],
    nonce: cryptoUtils.randomBits()
  };

  // and now the block containing the reward tx
  const blockHeader = {
    hashPrevHeader: (0).toString(16).repeat(32),
    hashTxs: cryptoUtils.hash(rewardTx),
    bits: config.difficultyLevel,
    nonce: cryptoUtils.randomBits(),
  };

  const block = {
    header: blockHeader,
    txs: [{ transaction: rewardTx }],
    signer: wallet.pk,
    sig: cryptoUtils.sign({ header: blockHeader }, wallet.sk),
    height: 0 // TODO this OK?
  };

  console.log(block);

};

main();
