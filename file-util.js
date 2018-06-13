// global declarations
const fs = require('fs');

const { generateKeypair } = require('crypto-utils');

const WALLET_FILE_NAME = './wallet.json'; // where's that wallet being saved

// public functions

// returns a bool of whether a wallet file exists
const walletFileExists = () => {
  return _fileExists(WALLET_FILE_NAME);
};

const createWallet = () => {
  const keyPair = generateKeypair();

  const contents = {
    name: 'miner',
    pk: keyPair.publicKey,
    sk: keyPair.secretKey,
  };

  const writeData = JSON.stringify(contents);

  fs.writeFileSync(WALLET_FILE_NAME, writeData, { encoding: 'utf8' });
};

// private helper functions

const _fileExists = (path) => {
  return fs.existsSync(path);
};

module.exports = { walletFileExists, createWallet };
