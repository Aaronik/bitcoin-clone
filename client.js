// Globals
const CONFIG_PATH = './client-config.json'

const request = require('request-promise')
const readcommand = require('readcommand')

const fileUtil = require('./file-util')({ CONFIG_PATH })
const config = fileUtil.readConfig()

// util functions
const buildOptions = (path) => {
  return {
    method: 'GET',
    uri: config.serverUrl + '/' + path
  }
}

async function fetch (path) {
  return request(buildOptions(path))
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

console.log(`Connecting to server at ${config.serverUrl}...`)

// the main REPL
readcommand.loop({ history: ['supply', 'utxos', 'blocks', 'help', 'exit'] }, async function (err, args, str, next) {
  if (err) {
    console.error(err)
    process.exit(1)
  }

  switch (str) {
    case 'supply':
      await fetch(str)
      break
    case 'utxos':
      await fetch(str)
      break
    case 'blocks':
      await fetch(str)
      break
    case 'accounts':
      await fetch(str)
      break
    case 'help':
      printHelp()
      break
    case 'exit':
      process.exit()
  }

  return next()
})
