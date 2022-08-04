const test = require('brittle')
const { timeout } = require('nonsynchronous')
const _createTestnet = require('@hyperswarm/testnet')
const Hyperswarm = require('hyperswarm')
const Corestore = require('corestore')
const ram = require('random-access-memory')
const tmp = require('tmp-promise')
const fs = require('node:fs/promises')
const {
  keyToString,
  createSigningKeyPair
} = require('jlinx-util')

const JlinxNode = require('../..')

Object.assign(exports, {
  test,
  timeout,
  keyToString,
  createSigningKeyPair,
  createTestnet,
  coreValues,
  JlinxNode,
})

async function createTestnet(t, size = 3){
  const testnet = await _createTestnet(size, t.teardown)

  const newTmpDir = async () => {
    const { path } = await tmp.dir()
    t.teardown(() => {
      fs.rm(path, { recursive: true })
    })
    return path
  }

  testnet.createJlinxNodes = async (size = 2) => {
    const nodes = []
    while(nodes.length < size){
      const node = new JlinxNode({
        topic: Buffer.from('_testing_jlinx_node_on_hypercore'),
        storagePath: await newTmpDir(),
        bootstrap: testnet.bootstrap,
        keyPair: createSigningKeyPair()
      })
      t.teardown(() => { node.destroy() })
      nodes.push(node)
    }
    await Promise.all(
      nodes.map(node => node.connected())
    )
    for (const node of nodes){
      for (const otherNode of nodes){
        if (node === otherNode) continue
        t.ok(node.swarm.peers.has(otherNode.id), `node has peer`)
      }
    }
    for (const node of nodes){
      await node.ready()
    }
    return nodes
  }

  return testnet
}

async function coreValues(core){
  const values = []
  for (let n = 0; n < core.length; n++){
    values[n] = (await core.get(n)).toString()
  }
  return values
}
