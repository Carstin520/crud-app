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

/**
 * Interface defining the arguments needed to create or update a journal entry
 * - title: The title of the journal entry (max 50 characters as per Rust program)
 * - message: The content/message of the journal entry (max 1000 characters as per Rust program)
 * - owner: The PublicKey of the wallet owner creating/updating the entry
 */
interface CreateEntryArgs {
  title: string
  message: string,
  owner: PublicKey
}

/**
 * Main React hook for interacting with the CrudApp Solana program
 * 
 * This hook provides:
 * - Program instance and program ID for direct program access
 * - Query to fetch all journal entries from the blockchain
 * - Query to get program account information
 * - Mutation to create new journal entries on-chain
 * 
 * @returns {Object} Object containing:
 *   - program: The Anchor program instance (for direct method calls)
 *   - programId: The PublicKey of the deployed program
 *   - accounts: React Query result containing all journal entry accounts
 *   - getProgramAccount: React Query result with program account info
 *   - createJournalEntry: Mutation function to create new journal entries
 */
export function useCrudAppProgram() {
  // Get Solana connection from wallet adapter context
  const { connection } = useConnection()
  
  // Get current cluster (devnet/mainnet/localnet) configuration
  const { cluster } = useCluster()
  
  // Hook to display transaction toast notifications
  const transactionToast = useTransactionToast()
  
  // Get Anchor provider (includes wallet and connection) for signing transactions
  const provider = useAnchorProvider()
  
  // Memoize program ID based on cluster to avoid unnecessary recalculations
  // The program ID may differ between devnet/mainnet/localnet
  const programId = useMemo(() => getCrudAppProgramId(cluster.network as Cluster), [cluster])
  
  // Initialize the Anchor program instance with provider and program ID
  // This gives us typed access to all program methods and accounts
  const program = getCrudAppProgram(provider, programId);

  /**
   * React Query to fetch ALL journal entry accounts from the blockchain
   * 
   * Query Key: ['crud-app', 'all', { cluster }]
   * - Includes cluster in key so data is refetched when switching networks
   * 
   * Query Function: Fetches all accounts of type 'journalEntryState' (JournalEntryState)
   * - Uses Anchor's account.all() which scans for all PDAs matching the account type
   * - Returns an array of journal entries with their public keys and data
   */
  const accounts = useQuery({
    queryKey: ['crud-app', 'all', { cluster }],
    queryFn: () => program.account.journalEntryState.all(),
  })

  /**
   * React Query to get the program account information
   * 
   * This fetches metadata about the program itself (not journal entries)
   * Useful for checking if the program is deployed and getting program account details
   */
  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  /**
   * Mutation to create a new journal entry on the Solana blockchain
   * 
   * This calls the create_journal_entry instruction in the Rust program:
   * - Creates a new PDA (Program Derived Address) using title + owner as seeds
   * - Stores the journal entry data on-chain
   * - The owner must sign the transaction (handled by Anchor provider)
   * 
   * @param {CreateEntryArgs} args - Contains title, message, and owner
   * @returns {Promise<string>} Transaction signature string
   * 
   * Flow:
   * 1. User calls createJournalEntry.mutate({ title, message, owner })
   * 2. Anchor generates PDA from seeds: [title bytes, owner public key]
   * 3. Creates and initializes the account on-chain
   * 4. On success: Shows transaction toast and refetches all accounts
   * 5. On error: Shows error toast notification
   */
  const createJournalEntry = useMutation<string, Error, CreateEntryArgs>({
    mutationKey: ['journalEntry', 'create', { cluster }],
    mutationFn: async ({title, message, owner}) => {
        // Call the Anchor program method - Anchor handles:
        // - Finding/deriving the PDA
        // - Building the transaction
        // - Signing with the wallet
        // - Sending to the network
        // Returns the transaction signature
        return program.methods.createJournalEntry(title, message).rpc();
    },
    onSuccess: (signature) => {
        // Show a toast notification with transaction link to Solana Explorer
        transactionToast(signature)
        // Refetch all accounts to show the newly created entry in the UI
        accounts.refetch()
    },
    onError: (error) => {
        // Display error message to user if transaction fails
        toast.error(`Failed to create journal entry: ${error.message}`)
    },
  });

  return { 
    program,           // Direct program access for advanced use cases
    programId,        // Program's public key
    accounts,         // All journal entries query result
    getProgramAccount, // Program account info query result
    createJournalEntry, // Create mutation function
  }
} 

/**
 * React hook for interacting with a SPECIFIC journal entry account
 * 
 * This hook is used when you have a specific account's PublicKey and want to:
 * - Fetch that account's data
 * - Update the journal entry
 * - Delete the journal entry
 * 
 * @param {Object} params - Object containing:
 *   - account: PublicKey of the specific journal entry account to interact with
 * 
 * @returns {Object} Object containing:
 *   - accountQuery: React Query result with the fetched account data
 *   - updateJournalEntry: Mutation function to update the entry's message
 *   - deleteJournalEntry: Mutation function to delete/close the account
 */
export function useCrudAppProgramAccount({ account }: { account: PublicKey }) {
  // Get cluster configuration for query keys
  const { cluster } = useCluster()
  
  // Hook to display transaction toast notifications
  const transactionToast = useTransactionToast()
  
  // Get the program instance and accounts query from the main hook
  // We reuse accounts to refetch the list after updates/deletes
  const { program, accounts } = useCrudAppProgram()

  /**
   * React Query to fetch a SPECIFIC journal entry account by its PublicKey
   * 
   * Query Key: ['crud-app', 'fetch', { cluster, account }]
   * - Includes both cluster and account in key for proper caching
   * 
   * Query Function: Fetches the account data from the blockchain
   * - Returns the JournalEntryState with owner, title, and message
   */
  const accountQuery = useQuery({
    queryKey: ['crud-app', 'fetch', { cluster, account }],
    queryFn: () => program.account.journalEntryState.fetch(account),
  })

  /**
   * Mutation to update an existing journal entry's message
   * 
   * This calls the update_journal_entry instruction in the Rust program:
   * - Finds the PDA using title + owner as seeds
   * - Updates the message field (title cannot be changed)
   * - Reallocates account space if needed
   * 
   * Note: The title parameter is used to find the account, but the Rust program
   * doesn't update the title (it's part of the PDA seeds, so it can't change)
   * 
   * @param {CreateEntryArgs} args - Contains title (to find account), message (to update), and owner
   * @returns {Promise<string>} Transaction signature string
   */
  const updateJournalEntry = useMutation<string, Error, CreateEntryArgs>({
    mutationKey: ['jurnalEntry', 'update', { cluster }],
    mutationFn: async ({title, message}) => {
        // Call the Anchor program method to update the journal entry
        // Anchor uses title to derive the PDA and updates the message field
        return program.methods.updateJournalEntry(title, message).rpc();
    },
    onSuccess: (signature) => {
        // Show transaction toast and refetch all accounts to reflect changes
        transactionToast(signature)
        accounts.refetch()
    },
    onError: (error) => {
        // Display error if update fails
        toast.error(`Failed to update journal entry: ${error.message}`)
    },
  });

  /**
   * Mutation to delete/close a journal entry account
   * 
   * This calls the delete_journal_entry instruction in the Rust program:
   * - Finds the PDA using title + owner as seeds
   * - Closes the account (deallocates space and returns rent to owner)
   * - The account is permanently deleted from the blockchain
   * 
   * @param {string} title - The title of the journal entry to delete
   *                         (used with owner to derive the PDA)
   * @returns {Promise<string>} Transaction signature string
   */
  const deleteJournalEntry = useMutation({
    mutationKey: ['jurnalEntry', 'delete', { cluster }],
    mutationFn: async (title : string) => {
        // Call the Anchor program method to delete/close the account
        // Anchor derives the PDA from title + owner and closes it
        return program.methods.deleteJournalEntry(title).rpc();
    },
    onSuccess: (signature) => {
        // Show transaction toast
        transactionToast(signature);
        // Refetch all accounts to remove the deleted entry from the list
        accounts.refetch();
    }
  });
  
  return {
    accountQuery,        // The fetched account data (with loading/error states)
    updateJournalEntry,  // Update mutation function
    deleteJournalEntry,  // Delete mutation function
}
}

