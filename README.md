# Bitcoin Multicoin Client
A library for managing integration test on multicoinjs regtest server

This repo is a clone from the original [regtest-client](https://github.com/bitcoinjs/regtest-client.git) repository, with the addition of support other UTXOs based blockchains.
Currently supports Bitcoin and Litecoin.

## You must specify a server

Default URL is `http://127.0.0.1:5001/1`, and the recommended way to set up a server
is to run a docker container locally.

You can override the URL with `APIURL` environment variable or by using the
optional second arg `new RegtestUtils(bitcoin, { APIURL: 'xxx' })` at runtime.

You can also override the API password (set on the server side) with `APIPASS`
env variable, or `new RegtestUtils(bitcoin, { APIURL: 'xxx', APIPASS: 'yyy' })`

The optional second arg can have either, both, or none of the two overrides.

You can provide a network configuration 

````
export const regtestUtils = new RegtestUtils({
  APIPASS,
  APIURL,
  network: litecoin.networks.regtest,
});
````

## Docker

Check the docker folder on [@bitocin-computer/mutlicoinjs-server](https://github.com/bitcoin-computer/multicoinjs-server)
to run a server locally.

## TypeScript support

Types are automatically generated. Develop in TypeScript, commit JS and types.
Pull requests must all contain TS, JS, and types where needed.

## Usage

```js
// inside an async function to use await

// @bitcoin-computer/bitcoinjs-lib must be the >=5.0.6 to use.
// For @bitcoin-computer/bitcoinjs-lib >=4.0.3, use version v0.0.8 of @bitcoin-computer/multicoinjs-client
const bitcoin = require('@bitcoin-computer/multicoinjs-lib')
const { RegtestUtils } = require('@bitcoin-computer/multicoinjs-client')
const regtestUtils = new RegtestUtils(bitcoin)

const network = regtestUtils.network // regtest network params

const keyPair = bitcoin.ECPair.makeRandom({ network })
const p2pkh = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network })

// Tell the server to send you coins (satoshis)
// Can pass address
const unspent = await regtestUtils.faucet(p2pkh.address, 2e4)

// Tell the server to send you coins (satoshis)
// Can pass Buffer of the scriptPubkey (in case address can not be parsed by bitcoinjs-lib)
// Non-standard outputs will be rejected, though.
const unspentComplex = await regtestUtils.faucetComplex(p2pkh.output, 1e4)

// Get all current unspents of the address.
const unspents = await regtestUtils.unspents(p2pkh.address)

// Get data of a certain transaction
const fetchedTx = await regtestUtils.fetch(unspent.txId)

// Mine 6 blocks, returns an Array of the block hashes
// All of the above faucet payments will confirm
const results = await regtestUtils.mine(6)

// Send our own transaction
const txb = new bitcoin.TransactionBuilder(network)
txb.addInput(unspent.txId, unspent.vout)
txb.addInput(unspentComplex.txId, unspentComplex.vout)
// regtestUtils.RANDOM_ADDRESS is created on first load.
// regtestUtils.randomAddress() will return a new random address every time.
// (You won't have the private key though.)
txb.addOutput(regtestUtils.RANDOM_ADDRESS, 1e4)

txb.sign({
  prevOutScriptType: 'p2pkh',
  vin: 0,
  keyPair,
})
txb.sign({
  prevOutScriptType: 'p2pkh',
  vin: 1,
  keyPair,
})
const tx = txb.build()

// build and broadcast to the Bitcoin Local RegTest server
await regtestUtils.broadcast(tx.toHex())

// This verifies that the vout output of txId transaction is actually for value
// in satoshis and is locked for the address given.
// The utxo can be unconfirmed. We are just verifying it was at least placed in
// the mempool.
await regtestUtils.verify({
  txId: tx.getId(),
  address: regtestUtils.RANDOM_ADDRESS,
  vout: 0,
  value: 1e4
})

```