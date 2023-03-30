const { describe, it } = require('mocha')
const assert = require('assert')
const bitcoin = require('@bitcoin-computer/multicoinjs-lib')
const { RegtestUtils } = require('..')
const regtestUtils = new RegtestUtils()
const { network } = regtestUtils
const { ECPairFactory } = require('ecpair');
const tinysecp = require('tiny-secp256k1');

const ECPair = ECPairFactory(tinysecp);

const sleep = ms => new Promise(r => setTimeout(r, ms))

describe('regtest utils', () => {
  it('should receive response 200 from /', async () => {
    const response = await regtestUtils.dhttp({
      method: 'GET',
      url: `${regtestUtils._APIURL}/`,
    })
    assert.strictEqual(response, 'regtest')
  })
  it('should get the current height', async () => {
    assert.strictEqual(typeof (await regtestUtils.height()), 'number')
  })
  it('should mine blocks', async () => {
    const results = await regtestUtils.mine(2)
    assert.strictEqual(Array.isArray(results), true)
    assert.strictEqual(!!results[0].match(/^[0-9a-f]+$/), true)
  })
  it('should get random address', async () => {
    assert.strictEqual(typeof regtestUtils.randomAddress(), 'string')
  })
  it('should have random address', async () => {
    assert.strictEqual(typeof regtestUtils.RANDOM_ADDRESS, 'string')
  })

  it('should get faucet, broadcast, verify', async () => {
    const keyPair = ECPair.makeRandom({ network })
    const p2pkh = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network })

    const unspent = await regtestUtils.faucet(p2pkh.address, 2e4)

    const unspentComplex = await regtestUtils.faucetComplex(p2pkh.output, 1e4)

    await sleep(100);

    const unspents = await regtestUtils.unspents(p2pkh.address)

    const fetchedTx = await regtestUtils.fetch(unspent.txId)
    const fetchedTxComplex = await regtestUtils.fetch(unspentComplex.txId)

    assert.strictEqual(fetchedTx.txId, unspent.txId)

    assert.deepStrictEqual(
      unspent,
      unspents.filter(v => v.value === unspent.value)[0],
      'unspents must be equal'
    )

    assert.deepStrictEqual(
      unspentComplex,
      unspents.filter(v => v.value === unspentComplex.value)[0],
      'unspents must be equal'
    )

    const txb = new bitcoin.Psbt({network})
    txb.addInput({hash: unspent.txId, index: unspent.vout, sequence: 0, nonWitnessUtxo: Buffer.from(fetchedTx.txHex, 'hex')})
    txb.addInput({hash: unspentComplex.txId, index: unspentComplex.vout, sequence: 0, nonWitnessUtxo: Buffer.from(fetchedTxComplex.txHex, 'hex')})
    txb.addOutput({address:regtestUtils.RANDOM_ADDRESS, value: 1e4})

    txb.signInput(0, keyPair);
    txb.signInput(1, keyPair);

    txb.finalizeAllInputs();

    const tx = txb.extractTransaction()

    // build and broadcast to the Bitcoin RegTest network
    await regtestUtils.broadcast(tx.toHex())

    await regtestUtils.verify({
      txId: tx.getId(),
      address: regtestUtils.RANDOM_ADDRESS,
      vout: 0,
      value: 1e4
    })
  })
})
