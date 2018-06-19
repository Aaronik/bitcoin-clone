// Globals
const CONFIG_PATH = './client-config.json'

const request = require('request-promise')
const readcommand = require('readcommand')
const cryptoUtils = require('crypto-utils')

const fileUtil = require('./file-util')({ CONFIG_PATH })
const config = fileUtil.readConfig()

const getAccountByName = (accounts, name) => {
  const account = accounts.find(account => {
    return account.name === name
  })

  if (!account) throw new Error(`account for ${name} not found!`)

  return account
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

const getAccountNameFromCreateAccountCommand = (str) => {
  return str.substring(15)
}

const getPkFromUtxosCommand = (str) => {
  return str.substring(6)
}

const getDeetsFromTransferCommand = (str) => {
  const params = str.split(' ')
  params.shift() // we don't need the first item of str, which will be 'transfer'
  return params
}

async function getAccountList () {
  const utxos = JSON.parse(await fetch('utxos')).utxos
  const accounts = JSON.parse(await fetch('accounts')).accounts

  // we'll store the accountList differently for speed and conveniency's
  // sakes, then transfer it to list type later
  let accountHash = {} // { <pk>: balance, name }

  // initialize the accountHash
  accounts.forEach(account => {
    accountHash[account.pk] = { balance: '0', name: account.name }
  })

  // populate the list
  utxos.forEach(utxo => {
    const pk = utxo.output.address

    // incremement the balance. Note the indirection is b/c we need balance to be a string
    accountHash[pk].balance = (Number(accountHash[pk].balance) + Number(utxo.output.value)).toString()
  })

  // now transform the accountHash into list form
  let accountList = []

  Object.keys(accountHash).forEach(pk => {
    const { name, balance } = accountHash[pk]
    accountList.push({ pk, name, balance })
  })

  return accountList
}

async function generateTx (amount, senderName, receiverName) {
  const accounts = JSON.parse(await fetch('accounts')).accounts

  let senderAccount, receiverAccount

  try {
    senderAccount = getAccountByName(accounts, senderName)
    receiverAccount = getAccountByName(accounts, receiverName)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }

  const account1Utxos = JSON.parse(await fetch('utxos/' + senderAccount.pk)).utxos

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
  let unaccountedForCoin = amount

  for (let i = 0; i < account1Utxos.length; i++) {
    const utxo = account1Utxos[i]
    unaccountedForCoin -= utxo.output.value

    // create input sans signature so we can sign it
    const input = {
      prevTx: utxo.txHash,
      index: utxo.index
    }

    const sig = cryptoUtils.sign(input, senderAccount.sk)

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
    address: receiverAccount.pk,
    value: amount
  }

  const selfOutput = {
    address: senderAccount.pk,
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
readcommand.loop({ history: ['supply', 'utxos', 'blocks', 'help', 'exit', 'account create', 'account list', 'transfer 55 miner goku'] }, async function (err, args, str, next) {
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
      const accountList = await getAccountList()
      console.log(JSON.stringify(accountList))
      break
    case /account create/.test(str):
      const accountName = getAccountNameFromCreateAccountCommand(str)
      await fetchAndPrint('createaccount/' + accountName)
      break
    case new RegExp('utxos ').test(str):
      const pk = getPkFromUtxosCommand(str)
      await fetchAndPrint('utxos/' + pk)
      break
    case new RegExp('transfer ').test(str):
      const [amount, senderName, receiverName] = getDeetsFromTransferCommand(str)
      const tx = await generateTx(amount, senderName, receiverName)
      const resp = await post('addtx', tx)
      console.log(JSON.stringify(resp))
      break
    case str === 'help':
      printHelp()
      break
    case str === 'exit':
      process.exit()
  }

  return next()
})
