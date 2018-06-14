// Globals
const cryptoUtils = require('crypto-utils');

// return a 'nonce' for the given object that results
// in its hash starting with the specified number of 0's.
const generateProofOfWork = (obj, numZeroes) => {

  let nonce = _generateRandomNonce();
  let hash  = '';

  let tried = 0; // TODO remove

  while (!_containsSufficientZeroPadding(hash, numZeroes)) {
    nonce = _generateRandomNonce();
    objClone = Object.assign({ nonce }, obj);
    hash = cryptoUtils.hash(objClone);
    tried++;
    if (tried % 100000 === 0) console.log('nonce:', nonce, 'hash:', hash, 'count:', tried, 'looking for:', numZeroes);
  }

  console.log('nonce:', nonce, 'hash:', hash, 'count:', tried, 'looked for:', numZeroes);
  return nonce;
};

const _generateRandomNonce = () => {
  return cryptoUtils.randomBits();
};

// checks a given string to see if it starts with zeroes
// const _containsSufficientZeroPadding = (str, numZeroes) => {

//   for (let i = 0; i < numZeroes; i++) {
//     if (str[i] !== '0') return false;
//   }

//   return true;
// };

// checks if __in hex__ there is a sufficient number of zeroes
// at the start of the string.
const _containsSufficientZeroPadding = (str, numZeroes) => {

  // turn the string into a trimmed decimal for easy checking
  const binStr = parseInt(str.substr(0, numZeroes * 2), 16).toString();

  return parseInt(binStr, 10) === 0;
};

module.exports = { generateProofOfWork };
