// Wallet exports
export {
  StellarWalletProvider,
  useStellarWallet,
  default as StellarWalletProviderDefault,
} from './StellarWalletProvider';
export type {
  StellarWalletProviderProps,
  StellarWalletContextValue,
  StellarNetwork,
} from './StellarWalletProvider';

// Re-export the kit type for external usage
export type { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
