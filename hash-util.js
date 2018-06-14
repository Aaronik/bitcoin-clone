// Globals
const cryptoUtils = require('crypto-utils')

// return a 'nonce' for the given object that results
// in its hash starting with the specified number of 0's.
const generateProofOfWork = (obj, numZeroes) => {
  let nonce = _generateRandomNonce()
  let hash = ''

  while (!_containsSufficientZeroPadding(hash, numZeroes)) {
    nonce = _generateRandomNonce()
    const objClone = Object.assign({ nonce }, obj)
    hash = cryptoUtils.hash(objClone)
  }

  return nonce
}

const _generateRandomNonce = () => {
  return cryptoUtils.randomBits()
}

// private methods

// checks if __in hex__ there is a sufficient number of zeroes
// at the start of the string.
const _containsSufficientZeroPadding = (str, numZeroes) => {
  // turn the string into a trimmed decimal for easy checking
  const binStr = parseInt(str.substr(0, numZeroes * 2), 16).toString()

  return parseInt(binStr, 10) === 0
}

module.exports = { generateProofOfWork }
