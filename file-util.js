// global declarations
const fs = require('fs')
const cryptoUtils = require('crypto-utils')

// Private helper functions

const _fileExists = (path) => {
  return JSON.parse(fs.existsSync(path))
}

const _readFile = (path) => {
  return JSON.parse(fs.readFileSync(path, { encoding: 'utf8' }))
}

// what's returned is a function that takes the configuration variables.
// This allows us to keep all global config variables in main file.
module.exports = ({ WALLET_PATH, CONFIG_PATH }) => {
  // returns a bool of whether a wallet file exists
  const walletFileExists = () => {
    return _fileExists(WALLET_PATH)
  }

  // creates `WALLET_PATH` and populates it
  const createWallet = () => {
    const keyPair = cryptoUtils.generateKeypair()

    const contents = [{
      name: 'miner',
      pk: keyPair.publicKey,
      sk: keyPair.secretKey
    }]

    const writeData = JSON.stringify(contents)

    fs.writeFileSync(WALLET_PATH, writeData, { encoding: 'utf8' })
  }

  // reads the config from disk and returns an object of its contents
  const readConfig = () => {
    return _readFile(CONFIG_PATH)
  }

  const readWallet = () => {
    return _readFile(WALLET_PATH)
  }

  return { walletFileExists, createWallet, readConfig, readWallet }
}

