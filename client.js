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

const fetch = (path) => {
  request(buildOptions(path))
    .then(body => console.log(JSON.stringify(body)))
    .catch(console.error)
}

const printHelp = () => {
  console.log('usage:')
  console.log('  supply - fetch supply')
  console.log('  utxos  - fetch utxos')
  console.log('  blocks - fetch blocks')
  console.log('  help   - print this help message')
  console.log('  exit   - exit the process')
}

console.log(`Connecting to server at ${config.serverUrl}...`)

// the main REPL
readcommand.loop({ history: ['supply', 'utxos', 'blocks', 'help', 'exit'] }, (err, args, str, next) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }

  switch (str) {
    case 'supply':
      fetch(str)
      break
    case 'utxos':
      fetch(str)
      break
    case 'blocks':
      fetch(str)
      break
    case 'help':
      printHelp()
      break
    case 'exit':
      process.exit()
  }

  return next()
})
