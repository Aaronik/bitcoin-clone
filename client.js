// Globals
const CONFIG_PATH = './client-config.json'

const request = require('request-promise')
const readcommand = require('readcommand')
const cryptoUtils = require('crypto-utils')

const fileUtil = require('./file-util')({ CONFIG_PATH })
const config = fileUtil.readConfig()

const getSKByPKFromWallet = (wallet, pk) => {
  const account = wallet.find(account => {
    return account.pk === pk
  })

  if (!account) throw new Error(`account with pk ${pk} not found!`)

  return account.sk
}

async function fetch (path) {
  const returnVal = await request({
    method: 'GET',
    uri: config.serverUrl + '/' + path
  })

  return returnVal
}

async function fetchAndPrint (path) {
  return fetch(path)
    .then(console.log)
    .catch(console.error)
}

async function post (path, data) {
  const returnVal = await request({
    method: 'POST',
    uri: config.serverUrl + '/' + path,
    headers: { "Content-Type": "application/json" },
    body: data,
    json: true
  })

  return returnVal
}

async function postAndPrint (path, data) {
  return post(path, data)
    .then(console.log)
    .catch(console.error)
}

const printHelp = () => {
  console.log(`
  usage:
    supply - fetch supply
    utxos  - fetch utxos
    blocks - fetch blocks
    help   - print this help message
    exit   - exit the process
    transfer - coming soon!
  `)
}

const getAccountNameFromCommand = (str) => {
  return str.substring(15)
}

const getPkFromCommand = (str) => {
  return str.substring(6)
}

const getDeetsFromTransferCommand = (str) => {
  const [unused, amount, account1, account2] = str.split(' ')
  const params = str.split(' ')
  params.shift() // we don't need the first item of str, which will be 'transfer'
  return params
}

async function generateTx (amount, account1, account2) {
  const accounts = JSON.parse(await fetch('accounts')).accounts
  const account1Utxos = JSON.parse(await fetch('utxos/' + account1)).utxos

  let sk

  try {
    sk = getSKByPKFromWallet(accounts, account1)
  } catch (e) {
    console.error(e)
    process.exit(1)
    return
  }

  // gameplan:
  //   start keeping track of how much coin is left needing to be accounted for (remainingUnaccountedFor)
  //   Go through each utxo
  //     add the amount in the utxo to remainingUnaccountedFor
  //     create an input for that utxo for its entire balance
  //     if remainingUnaccountedFor <= 0
  //       we're done going through utxos. Create the output
  //     else
  //       keep going through utxos

  let inputs = []
  let outputs = []
  let unaccountedForCoin = amount

  for (let i = 0; i < account1Utxos.length; i++) {
    const utxo = account1Utxos[i]
    unaccountedForCoin -= utxo.output.value

    // create input sans signature so we can sign it
    const input = {
      prevTx: utxo.txHash,
      index: utxo.index,
    }

    const sig = cryptoUtils.sign(input, sk)

    const inputWithSignature = Object.assign({}, input, { sig })

    inputs.push(inputWithSignature)

    if (unaccountedForCoin <= 0) break

    // if user has run out of coin, we'll have to decline the transaction
    if (i === account1Utxos.length - 1) {
      console.error('user does not have enough coins!')
      process.exit(1)
    }
  }

  const paymentOutput = {
    address: account2,
    value: amount
  }

  const selfOutput = {
    address: account1,
    value: 0 - unaccountedForCoin
  }

  const tx = {
    inputs: inputs,
    outputs: [paymentOutput, selfOutput],
    txNonce: cryptoUtils.randomBits()
  }

  return tx
}

console.log(`Connecting to server at ${config.serverUrl}...`)

// the main REPL
readcommand.loop({ history: ['supply', 'utxos', 'blocks', 'help', 'exit', 'account create', 'account list', 'transfer 5 bob phil'] }, async function (err, args, str, next) {
  if (err) {
    console.error(err)
    process.exit(1)
  }

  switch (true) {
    case str === 'supply':
      await fetchAndPrint(str)
      break
    case str === 'utxos':
      await fetchAndPrint(str)
      break
    case str === 'blocks':
      await fetchAndPrint(str)
      break
    case str === 'accounts':
      await fetchAndPrint(str)
      break
    case str === 'account list':
      await fetchAndPrint('accounts')
      break
    case /account create/.test(str):
      const accountName = getAccountNameFromCommand(str)
      await fetchAndPrint('createaccount/' + accountName)
      break
    case new RegExp('utxos ').test(str):
      const pk = getPkFromCommand(str)
      await fetchAndPrint('utxos/' + pk)
      break
    case new RegExp('transfer ').test(str):
      const [amount, account1, account2] = getDeetsFromTransferCommand(str)
      const tx = await generateTx(amount, account1, account2)
      await postAndPrint('addtx', tx)
      break
    case str === 'help':
      printHelp()
      break
    case str === 'exit':
      process.exit()
  }

  return next()
})
