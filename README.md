# jlinx-node

AKA jlinx-hypercore-node

this api could be implemented on IPFS

- connects to the hyperswarm and jlinx topic
- doesnt store any keys


## Interface


### create


### getLength


### append


### sub

subscribe to changes



```js

const node = new JlinxNode({
  storagePath: '...',
})

const id = await node.create()
await node.getLength(id) // -> 0
const length = await node.append(id, [
  b4a.from(
    JSON.stringify({
      maybe: 'this is a header?'
    })
  ),
  b4a.from(
    JSON.stringify({
      butWhatever: 'buffers you want'
    })
  )
])
await node.getLength(id) // -> 0
JSON.parse(await node.getEntry(id, 0)) // { maybe: 'this is a header?' }
JSON.parse(await node.getEntry(id, 0)) // { butWhatever: 'buffers you want' }
await node.sub(id, (newLength, id) => {

}) // -> unsubFunction


const header = JSON.parse(await ledger.get(0))

const unsub = ledger.sub(key, event => {

})

```


## RPC


https://github.com/atek-cloud/node-rpc

## REST




## Events


### Idea 

use the core of this swarm node's public key
(or one derivable from it??)
so you can use it to publish events for other
nodes to emit down to its clients

its a core so syncing and catchup is solved



DONT DO THAT! every ledger should be able to
be folled as an event stream.

what we need is push

a jlinc-node should have an ephemeral event bus
and eventually we can route events across all
nodes using that "extension" thing found earler.
