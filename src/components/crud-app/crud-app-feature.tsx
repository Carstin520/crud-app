'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '../solana/solana-provider'
import { ExplorerLink } from '../cluster/cluster-ui'
import { useCrudAppProgram } from './crud-app-data-access'
import { CrudAppCreate, CrudAppList } from './crud-app-ui'
import { AppHero } from '../app-hero'
import { ellipsify } from '@/lib/utils'

export default function CrudAppFeature() {
  const { publicKey } = useWallet()
  const { programId } = useCrudAppProgram()

  return publicKey ? (
    <div>
      <AppHero
        title="CrudApp"
        subtitle={
          'Create a new account by clicking the "Create" button. The state of a account is stored on-chain and can be manipulated by calling the program\'s methods (increment, decrement, set, and close).'
        }
      >
        <p className="mb-6">
          <ExplorerLink path={`account/${programId}`} label={ellipsify(programId.toString())} />
        </p>
        <CrudAppCreate />
      </AppHero>
      <CrudAppList />
    </div>
  ) : (
    <div className="max-w-4xl mx-auto">
      <div className="hero py-[64px]">
        <div className="hero-content text-center">
          <WalletButton />
        </div>
      </div>
    </div>
  )
}

