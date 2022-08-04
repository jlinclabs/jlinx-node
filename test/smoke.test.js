const test = require('brittle')
const { timeout } = require('nonsynchronous')
const createTestnet = require('@hyperswarm/testnet')
const Hyperswarm = require('hyperswarm')
const Corestore = require('corestore')
const ram = require('random-access-memory')

test('smoke', async (t) => {
  const { bootstrap } = await createTestnet(3, t.teardown)

  const swarm1 = new Hyperswarm({ bootstrap })
  const swarm2 = new Hyperswarm({ bootstrap })

  const connected = t.test('connection')
  connected.plan(2)

  swarm1.on('connection', (conn) => {
    conn.on('error', noop)
    connected.pass('swarm1')
    conn.destroy()
  })
  swarm2.on('connection', (conn) => {
    conn.on('error', noop)
    connected.pass('swarm2')
    conn.destroy()
  })

  const topic = Buffer.alloc(32).fill('hello world')

  await swarm1.join(topic).flushed()
  await swarm2.join(topic).flushed()

  await connected

  await swarm1.destroy()
  await swarm2.destroy()
})

test('corestore replication', async (t) => {
  const { bootstrap } = await createTestnet(3, t.teardown)
  const topic = Buffer.alloc(32).fill('hello world')

  const connected = t.test('connection')
  connected.plan(2)

  async function createNode(name){
    const node = {}
    node.swarm = new Hyperswarm({ bootstrap })
    node.cores = new Corestore(ram)
    await node.cores.ready()
    node.swarm.on('connection', (conn) => {
      connected.pass(name)
      node.cores.replicate(conn, {
        keepAlive: true,
      })
    })
    node.destroy = async () => {
      await node.cores.close()
      await node.swarm.clear()
      await node.swarm.destroy()
    }
    await node.swarm.join(topic).flushed()
    await node.swarm.flush()
    return node
  }

  const node1 = await createNode('node1')
  const node2 = await createNode('node2')

  // Why doesnt this work?
  // const [node1, node2] = await Promise.all([
  //   createNode('node1'),
  //   createNode('node2'),
  // ])

  await connected

  await node1.cores.findingPeers()

  const core1 = node1.cores.get({ name: 'alfalpha' })
  await core1.append('one')
  t.is(core1.length, 1)

  const core1copy = node2.cores.get(core1.key)

  await core1copy.update()
  t.alike(core1.key, core1copy.key)
  t.is(core1copy.length, 1)
  t.alike((await core1copy.get(0)).toString(), 'one')

  await core1.append(['two', 'three', 'four'])
  await timeout(10) // why?

  await core1copy.update()
  t.is(core1copy.length, 4, 'core update failed')

  t.alike(await stringAll(core1copy), ['one', 'two', 'three', 'four'])

  const appendEvent = t.test('appendEvent')
  appendEvent.plan(2)

  core1copy.on('append', (...x) => {
    appendEvent.pass()
    t.is(core1copy.length, core1.length)
  })

  await core1.append(['five'])
  await timeout(100) // space out the two report
  await core1.append(['six'])

  await appendEvent

  await node1.destroy()
  await node2.destroy()
})

function noop () {}

async function stringAll(core){
  const values = []
  for (let n = 0; n < core.length; n++){
    values[n] = (await core.get(n)).toString()
  }
  return values
}
