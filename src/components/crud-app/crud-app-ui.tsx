'use client'

import { Keypair, PublicKey } from '@solana/web3.js'

import { useCrudAppProgram, useCrudAppProgramAccount } from './crud-app-data-access'
import { useWallet } from '@solana/wallet-adapter-react'
import { useState } from 'react'


export function CrudAppCreate() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const { createJournalEntry } = useCrudAppProgram();
  const { publicKey } = useWallet();

  const isFormValid = title.trim() !== '' && message.trim() !== '';

  const handleSubmit = () => {
    if (isFormValid && publicKey && title) {
      createJournalEntry.mutateAsync({ title, message, owner: publicKey });
    }
  }
  if (!publicKey) {
    return <div>Please connect your wallet to create a journal entry</div>
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="input input-bordered w-full max-w-xs" />
      <textarea placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} className="textarea textarea-bordered w-full max-w-xs" />
      <button onClick={handleSubmit} disabled={createJournalEntry.isPending || !isFormValid} className="btn btn-primary">Create Journal Entry </button>
    </form>
  )
}

export function CrudAppList() {
  const { accounts, getProgramAccount } = useCrudAppProgram()

  if (getProgramAccount.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>
  }
  if (!getProgramAccount.data?.value) {
    return (
      <div className="alert alert-info flex justify-center">
        <span>Program account not found. Make sure you have deployed the program and are on the correct cluster.</span>
      </div>
    )
  }
  return (
    <div className={'space-y-6'}>
      {accounts.isLoading ? (
        <span className="loading loading-spinner loading-lg"></span>
      ) : accounts.data?.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {accounts.data?.map((account) => (
            <CrudAppCard key={account.publicKey.toString()} account={account.publicKey} />
          ))}
        </div>
      ) : (
        <div className="text-center">
          <h2 className={'text-2xl'}>No accounts</h2>
          No accounts found. Create one above to get started.
        </div>
      )}
    </div>
  )
}

function CrudAppCard({ account }: { account: PublicKey }) {
  const {
    accountQuery,
    updateJournalEntry,
    deleteJournalEntry,
  } = useCrudAppProgramAccount({ account });

  const { publicKey } = useWallet();

  const [message, setMessage] = useState('');
  const title = accountQuery.data?.title;

  const isFormValid = message.trim() !== '';

  const handleSubmit = () => {
    if (isFormValid && publicKey) {
      updateJournalEntry.mutateAsync({ title, message, owner: publicKey });
    }
  };

  if (!publicKey) {
    return <div>Please connect your wallet to create a journal entry</div>;
  }

  return accountQuery.isLoading ? (
    <span className="loading loading-spinner loading-lg"></span>
  ) : accountQuery.data ? (
    <div className="card bg-base-300 shadow-xl">
      <div className="card-body items-center text-center">
        <div className="space-y-2">
          <h2
            className="card-title justify-center text-3xl cursor-pointer"
            onClick={() => accountQuery.refetch()}
          >
            {accountQuery.data?.title}
          </h2>
          <p>{accountQuery.data?.message}</p>
          <div className="card-actions justify-around">
            <textarea
              placeholder="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="textarea textarea-bordered w-full max-w-xs"
            />
            <button
              onClick={handleSubmit}
              disabled={updateJournalEntry.isPending || !isFormValid}
              className="btn btn-primary"
            >
              Update Journal Entry
            </button>
            <button
              onClick={() => {
                if (title) {
                  return deleteJournalEntry.mutateAsync(title);
                }
              }}
              className="btn btn-error"
            >
              Delete Journal Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;
}

