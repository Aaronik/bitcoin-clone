const request = require('request-promise')

const _post = (node, endpoint, data) => {
  return request({
    method: 'POST',
    uri: 'http://' + node + '/' + endpoint,
    body: data,
    json: true
  })
}

// list all the nodes in the world, so says seedNode
const fetchNodeList = (seedNode) => {
  return request.get('http://' + seedNode + '/nodelist')
    .catch(console.error)
}

// tell node of our local ip and port
const informNodeOfExistence = (node, ip, port) => {
  return _post(node, 'join', { node: `${ip}:${port}` }).catch(console.error)
}

const broadcastTx = (tx, nodeList) => {
  nodeList.forEach(node => {
    _post(node, 'addtx', { transact: tx }).catch(console.error)
  })
}

module.exports = { fetchNodeList, informNodeOfExistence, broadcastTx }
