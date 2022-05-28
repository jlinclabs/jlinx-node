# jlinx-node

- connects to the hyperswarm and jlinx topic
- doesnt store any keys


## Interface


```js

const node = new JlinxNode({
  storagePath: '...',
})

const ledger = await node.create()
ledger.length

await ledger.append(key, 
  b4a.from(
    JSON.stringify({
      whatever: 'you want',
    })
  )
)

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
