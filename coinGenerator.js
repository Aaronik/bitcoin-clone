const fileUtil = require('./file-util');

const main = () => {

  // first we deal with the wallet file
  if (!fileUtil.walletFileExists()) {
    fileUtil.createWallet();
  }
};

main();
