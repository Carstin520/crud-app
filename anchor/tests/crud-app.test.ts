import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Keypair } from '@solana/web3.js'
import { CrudApp } from '../target/types/crud-app'

describe('crud-app', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const payer = provider.wallet as anchor.Wallet

  const program = anchor.workspace.CrudApp as Program<CrudApp>

  const crudAppKeypair = Keypair.generate()

  it('Initialize CrudApp', async () => {
    await program.methods
      .initialize()
      .accounts({
        crudApp: crudAppKeypair.publicKey,
        payer: payer.publicKey,
      })
      .signers([crudAppKeypair])
      .rpc()

    const currentCount = await program.account.crudApp.fetch(crudAppKeypair.publicKey)

    expect(currentCount.count).toEqual(0)
  })

  it('Increment CrudApp', async () => {
    await program.methods.increment().accounts({ crudApp: crudAppKeypair.publicKey }).rpc()

    const currentCount = await program.account.crudApp.fetch(crudAppKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Increment CrudApp Again', async () => {
    await program.methods.increment().accounts({ crudApp: crudAppKeypair.publicKey }).rpc()

    const currentCount = await program.account.crudApp.fetch(crudAppKeypair.publicKey)

    expect(currentCount.count).toEqual(2)
  })

  it('Decrement CrudApp', async () => {
    await program.methods.decrement().accounts({ crudApp: crudAppKeypair.publicKey }).rpc()

    const currentCount = await program.account.crudApp.fetch(crudAppKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Set crudApp value', async () => {
    await program.methods.set(42).accounts({ crudApp: crudAppKeypair.publicKey }).rpc()

    const currentCount = await program.account.crudApp.fetch(crudAppKeypair.publicKey)

    expect(currentCount.count).toEqual(42)
  })

  it('Set close the crudApp account', async () => {
    await program.methods
      .close()
      .accounts({
        payer: payer.publicKey,
        crudApp: crudAppKeypair.publicKey,
      })
      .rpc()

    // The account should no longer exist, returning null.
    const userAccount = await program.account.crudApp.fetchNullable(crudAppKeypair.publicKey)
    expect(userAccount).toBeNull()
  })
})

