/**
 * Stellar Wallet Provider for venalabs-stellar-sdk
 * Provides wallet connection and signing capabilities via stellar-wallets-kit
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import type { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
import { useWalletStore } from '../store';

export type StellarNetwork = 'TESTNET' | 'PUBLIC';

export interface StellarWalletContextValue {
  /** The wallet kit instance */
  kit: StellarWalletsKit | null;
  /** Whether the wallet kit is initialized */
  isInitialized: boolean;
  /** The currently connected wallet address */
  stellarAddress: string | null;
  /** Whether wallet is connected */
  isConnected: boolean;
  /** Whether wallet is currently connecting */
  isConnecting: boolean;
  /** Open wallet modal and connect */
  connect: () => Promise<string | null>;
  /** Disconnect the wallet */
  disconnect: () => void;
  /** Sign a message with the connected wallet */
  signMessage: (message: string) => Promise<string>;
  /** Sign a transaction XDR */
  signTransaction: (xdr: string) => Promise<string>;
  /** The configured network */
  network: StellarNetwork;
}

const StellarWalletContext = createContext<StellarWalletContextValue | null>(null);

export interface StellarWalletProviderProps {
  children: ReactNode;
  /** Stellar network to use (default: TESTNET) */
  network?: StellarNetwork;
  /** External wallet kit instance (if provided, skips internal initialization) */
  externalKit?: StellarWalletsKit | null;
}

/**
 * Provider component that initializes and manages Stellar wallet connection
 */
export function StellarWalletProvider({
  children,
  network = 'TESTNET',
  externalKit,
}: StellarWalletProviderProps): JSX.Element {
  const [kit, setKit] = useState<StellarWalletsKit | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [networkPassphrase, setNetworkPassphrase] = useState<string>('');

  const {
    stellarAddress,
    setStellarAddress,
    setWalletId,
    isConnecting,
    setIsConnecting,
    setConnectionError,
    reset,
  } = useWalletStore();

  // Initialize wallet kit on mount
  useEffect(() => {
    if (kit) {
      console.debug('[StellarWalletProvider] Wallet kit already initialized');
      return;
    }

    const passphrase =
      network === 'PUBLIC'
        ? 'Public Global Stellar Network ; September 2015'
        : 'Test SDF Network ; September 2015';

    // Use external kit if provided
    if (externalKit) {
      console.debug('[StellarWalletProvider] Using external wallet kit');
      setNetworkPassphrase(passphrase);
      setKit(externalKit);
      setIsInitialized(true);
      return;
    }

    // Otherwise, initialize our own kit via dynamic import
    const initKit = async () => {
      try {
        const { StellarWalletsKit, WalletNetwork, FREIGHTER_ID, FreighterModule } =
          await import('@creit.tech/stellar-wallets-kit');

        const walletNetwork = network === 'PUBLIC' ? WalletNetwork.PUBLIC : WalletNetwork.TESTNET;

        const instance = new StellarWalletsKit({
          network: walletNetwork,
          selectedWalletId: FREIGHTER_ID,
          modules: [new FreighterModule()],
        });

        setNetworkPassphrase(passphrase);
        setKit(instance);
        setIsInitialized(true);
      } catch (error) {
        console.error('[StellarWalletProvider] Failed to initialize wallet kit:', error);
        setConnectionError('Failed to initialize wallet');
      }
    };

    initKit();
  }, [network, setConnectionError, kit, externalKit]);

  // Connect wallet
  const connect = useCallback(async (): Promise<string | null> => {
    if (!kit) {
      setConnectionError('Wallet kit not initialized');
      return null;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      await kit.openModal({
        onWalletSelected: async (option: { id: string }) => {
          kit.setWallet(option.id);
          setWalletId(option.id);
        },
      });

      const { address } = await kit.getAddress();
      setStellarAddress(address);
      setIsConnecting(false);
      return address;
    } catch (error) {
      console.error('[StellarWalletProvider] Connection failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setConnectionError(errorMessage);
      setIsConnecting(false);
      return null;
    }
  }, [kit, setStellarAddress, setWalletId, setIsConnecting, setConnectionError]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    if (kit) {
      try {
        kit.disconnect();
      } catch (error) {
        console.warn('[StellarWalletProvider] Disconnect error:', error);
      }
    }
    reset();
  }, [kit, reset]);

  // Sign a message
  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!kit || !stellarAddress) {
        throw new Error('Wallet not connected');
      }

      const result = await kit.signMessage(message, {
        address: stellarAddress,
        networkPassphrase,
      });

      return result.signedMessage;
    },
    [kit, stellarAddress, networkPassphrase]
  );

  // Sign a transaction
  const signTransaction = useCallback(
    async (xdr: string): Promise<string> => {
      if (!kit) {
        throw new Error('Wallet not connected');
      }

      const result = await kit.signTransaction(xdr);
      return result.signedTxXdr;
    },
    [kit]
  );

  const contextValue = useMemo<StellarWalletContextValue>(
    () => ({
      kit,
      isInitialized,
      stellarAddress,
      isConnected: !!stellarAddress,
      isConnecting,
      connect,
      disconnect,
      signMessage,
      signTransaction,
      network,
    }),
    [
      kit,
      isInitialized,
      stellarAddress,
      isConnecting,
      connect,
      disconnect,
      signMessage,
      signTransaction,
      network,
    ]
  );

  return (
    <StellarWalletContext.Provider value={contextValue}>{children}</StellarWalletContext.Provider>
  );
}

/**
 * Hook to access Stellar wallet functionality
 */
export function useStellarWallet(): StellarWalletContextValue {
  const context = useContext(StellarWalletContext);
  if (!context) {
    throw new Error('useStellarWallet must be used within a StellarWalletProvider');
  }
  return context;
}

export default StellarWalletProvider;
