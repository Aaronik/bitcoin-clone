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
    // TODO Note: this scheme means that pausing execution on mining of a block
    // and then starting it back up will result in re-testing already tested
    // nonces. ATTOW, a new incoming block, even deep down the chain,
    // will cause an interrupt. This should be made random.
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
