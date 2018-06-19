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

const _writeFile = (path, data) => {
  fs.writeFileSync(path, data, { encoding: 'utf8' })
}

// what's returned is a function that takes the configuration variables.
// This allows us to keep all global config variables in main file.
module.exports = ({ WALLET_PATH, CONFIG_PATH }) => {
  // returns a bool of whether a wallet file exists
  const walletFileExists = () => {
    return _fileExists(WALLET_PATH)
  }

  // creates file at `WALLET_PATH` and populates it with miner account
  const createWallet = () => {
    const minerAccount = [generateAccountFromName('miner')]
    const writeData = JSON.stringify(minerAccount)
    _writeFile(WALLET_PATH, writeData)
  }

  // reads the config from disk and returns its contents
  const readConfig = () => {
    return _readFile(CONFIG_PATH)
  }

  const readWallet = () => {
    return _readFile(WALLET_PATH)
  }

  const generateAccountFromName = (name) => {
    const keyPair = cryptoUtils.generateKeypair()

    return {
      name: name,
      pk: keyPair.publicKey,
      sk: keyPair.secretKey
    }
  }

  // Add an account to the wallet. Note: this assumes a wallet already exists. If not,
  // use 'createWallet'
  const addAccountToWallet = (account) => {
    const existingAccounts = readWallet()
    const allAccounts = existingAccounts.concat([account])
    const writeData = JSON.stringify(allAccounts)
    _writeFile(WALLET_PATH, writeData)
  }

  const accountAlreadyExists = (name) => {
    const accounts = readWallet()
    return accounts.some(account => account.name === name)
  }

  return {
    walletFileExists,
    createWallet,
    readConfig,
    readWallet,
    addAccountToWallet,
    generateAccountFromName,
    accountAlreadyExists
  }
}
