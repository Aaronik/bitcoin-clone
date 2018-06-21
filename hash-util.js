// Globals
const cryptoUtils = require('crypto-utils')
const hex2bin = require('hex-to-binary')

// return a 'nonce' for the given object that results
// in its hash starting with the specified number of 0's.
const generateProofOfWork = (obj, difficultyLevel) => {
  let nonce = 0
  let hash = ''

  while (!_containsSufficientZeroPadding(hash, difficultyLevel)) {
    obj.nonce = nonce
    hash = cryptoUtils.hash(obj)
    nonce += 1
  }

  return nonce
}

// checks if there is a sufficient number of zeroes
// at the start of the string.
const _containsSufficientZeroPadding = (str, difficultyLevel) => {
  const binStr = hex2bin(str)

  for (let i = 0; i < difficultyLevel; i++) {
    if (binStr[i] !== '0') return false
  }

  return true
}

module.exports = { generateProofOfWork }
