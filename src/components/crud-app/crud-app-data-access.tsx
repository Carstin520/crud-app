'use client'

import { getCrudAppProgram, getCrudAppProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import { sign } from 'crypto'

interface CreateEntryArgs {
  title: string
  message: string,
  owner: PublicKey
}

export function useCrudAppProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getCrudAppProgramId(cluster.network as Cluster), [cluster])
  const program = getCrudAppProgram(provider, programId);

  const accounts = useQuery({
    queryKey: ['crud-app', 'all', { cluster }],
    queryFn: () => program.account.crudApp.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const createJournalEntry = useMutation<string, Error, CreateEntryArgs>({
    mutationKey: ['jurnalEntry', 'create', { cluster }],
    mutationFn: async ({title, message, owner}) => {
        return program.methods.createJournalEntry(title, message).rpc();
    },
    onSuccess: (signature) => {
        transactionToast(signature)
        accounts.refetch()
    },
    onError: (error) => {
        toast.error(`Failed to create journal entry: ${error.message}`)
    },
  });

  return { 
    program,
    programId,
    accounts,
    getProgramAccount,
    createJournalEntry,
  }
} 

export function useCrudAppProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, accounts } = useCrudAppProgram()

  const accountQuery = useQuery({
    queryKey: ['crud-app', 'fetch', { cluster, account }],
    queryFn: () => program.account.crudApp.fetch(account),
  })

  const updateJournalEntry = useMutation<string, Error, CreateEntryArgs>({
    mutationKey: ['jurnalEntry', 'update', { cluster }],
    mutationFn: async ({title, message}) => {
        return program.methods.updateJournalEntry(title, message).rpc();
    },
    onSuccess: (signature) => {
        transactionToast(signature)
        accounts.refetch()
    },
    onError: (error) => {
        toast.error(`Failed to update journal entry: ${error.message}`)
    },
  });

  const deleteJournalEntry = useMutation({
    mutationKey: ['jurnalEntry', 'delete', { cluster }],
    mutationFn: async (title : string) => {
        return program.methods.deleteJournalEntry(title).rpc();
    },
    onSuccess: (signature) => {
        transactionToast(signature);
        accounts.refetch();
    }
  });
return {
    accountQuery,
    updateJournalEntry,
    deleteJournalEntry,
}
}

