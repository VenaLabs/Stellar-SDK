/**
 * Wallet Store - Manages Stellar wallet state using Zustand
 */

import { create } from 'zustand';

export interface WalletState {
  /** Connected Stellar wallet address */
  stellarAddress: string | null;
  /** Connected wallet ID (e.g., 'freighter') */
  walletId: string | null;
  /** Linked wallets map: network -> address (e.g., { "STELLAR_TESTNET": "G..." }) */
  linkedWallets: Record<string, string>;
  /** Whether wallet is currently connecting */
  isConnecting: boolean;
  /** Whether wallet is currently linking */
  isLinking: boolean;
  /** Connection error message */
  connectionError: string | null;
}

export interface WalletActions {
  /** Set the connected Stellar address */
  setStellarAddress: (address: string | null) => void;
  /** Set the wallet ID */
  setWalletId: (id: string | null) => void;
  /** Replace the entire linked wallets map */
  setLinkedWallets: (wallets: Record<string, string>) => void;
  /** Set a linked wallet for a specific network */
  setLinkedWalletForNetwork: (network: string, address: string) => void;
  /** Set connecting state */
  setIsConnecting: (connecting: boolean) => void;
  /** Set linking state */
  setIsLinking: (linking: boolean) => void;
  /** Set connection error */
  setConnectionError: (error: string | null) => void;
  /** Reset wallet state */
  reset: () => void;
}

export type WalletStore = WalletState & WalletActions;

const initialState: WalletState = {
  stellarAddress: null,
  walletId: null,
  linkedWallets: {},
  isConnecting: false,
  isLinking: false,
  connectionError: null,
};

/**
 * Create a wallet store for managing Stellar wallet state
 */
export const createWalletStore = () =>
  create<WalletStore>((set) => ({
    ...initialState,

    setStellarAddress: (address) => set({ stellarAddress: address, connectionError: null }),
    setWalletId: (id) => set({ walletId: id }),
    setLinkedWallets: (wallets) => set({ linkedWallets: wallets }),
    setLinkedWalletForNetwork: (network, address) =>
      set((state) => ({
        linkedWallets: { ...state.linkedWallets, [network]: address },
      })),
    setIsConnecting: (connecting) => set({ isConnecting: connecting }),
    setIsLinking: (linking) => set({ isLinking: linking }),
    setConnectionError: (error) => set({ connectionError: error, isConnecting: false }),
    reset: () => set(initialState),
  }));

/**
 * Default wallet store instance
 * Can be used outside of React components
 */
export const useWalletStore = createWalletStore();
