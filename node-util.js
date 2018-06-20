const request = require('request-promise')

// list all the nodes in the world, so says seedNode
const getNodeList = (seedNode) => {
  return request.get('http://' + seedNode + '/nodelist')
    .catch(console.error)
}

// tell node of our local ip and port
const informNodeOfExistence = (node, ip, port) => {
  return request({
    method: 'POST',
    uri: 'http://' + node + '/join',
    body: { node: `${ip}:${port}` },
    json: true
  }).catch(console.error)
}

module.exports = { getNodeList, informNodeOfExistence }
