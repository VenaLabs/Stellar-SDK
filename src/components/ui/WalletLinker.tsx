/**
 * WalletLinker component for venalabs-stellar-sdk
 * Handles wallet connection, signing, and linking to the SDK backend
 */

import { useState, useCallback } from 'react';
import { Loader2, Check, Link2, Wallet } from 'lucide-react';
import { useStellarWallet } from '../../wallet';
import { useWalletStore } from '../../store';
import { useTranslation } from '../../i18n';
import { GlassButton } from './GlassCard';
import type { VenalabsApiClient } from '../../api';

import { getNetworkPassphrase } from '../../utils/stellarNetworkUtils';

export interface WalletLinkerProps {
  /** API client instance for making wallet API calls */
  apiClient: VenalabsApiClient;
  /** Network identifier to display */
  network: string;
  /** Currently linked wallet address (if any) */
  linkedWalletAddress?: string;
  /** Callback when wallet is successfully linked */
  onWalletLinked: (address: string, network: string) => void;
}

/**
 * Component for connecting and linking a Stellar wallet
 */
export function WalletLinker({
  apiClient,
  network,
  linkedWalletAddress,
  onWalletLinked,
}: WalletLinkerProps): JSX.Element {
  const { t } = useTranslation();
  const { stellarAddress, isConnected, isConnecting, connect } = useStellarWallet();
  const { signMessage } = useStellarWallet();

  const { setLinkedWalletAddress } = useWalletStore();

  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLinked = linkedWalletAddress && linkedWalletAddress === stellarAddress;
  const hasOtherLinkedWallet = linkedWalletAddress && linkedWalletAddress !== stellarAddress;

  // Handle connect button click
  const handleConnect = useCallback(async () => {
    setError(null);
    try {
      await connect();
    } catch (err) {
      setError(t('wallet.connectionFailed'));
    }
  }, [connect, t]);

  // Handle link wallet
  const handleLinkWallet = useCallback(async () => {
    if (!stellarAddress) return;

    setLinking(true);
    setError(null);

    try {
      // 1. Get nonce from backend
      const nonceResponse = await apiClient.getWalletNonce(stellarAddress);

      // 2. Build message to sign
      // IMPORTANT: This message format must match exactly what the backend expects
      const formattedMessage =
        `www.venalabs.com\n\n` +
        `Sign in request with account:\n` +
        `${stellarAddress}\n\n` +
        `Nonce: ${nonceResponse.nonce}`;

      // 3. Sign message with wallet
      const signature = await signMessage(formattedMessage, getNetworkPassphrase(network));

      // 4. Link wallet on backend
      const linkResponse = await apiClient.linkStellarWallet(stellarAddress, signature, network);

      if (!linkResponse.success) {
        setError(t('wallet.failedLink'));
        setLinking(false);
        return;
      }

      // Success
      setLinkedWalletAddress(stellarAddress);
      onWalletLinked(stellarAddress, network);
    } catch (err) {
      console.error('[WalletLinker] Link failed:', err);
      const errorMessage = err instanceof Error ? err.message : t('wallet.signingFailed');
      setError(errorMessage);
    }

    setLinking(false);
  }, [stellarAddress, apiClient, signMessage, network, onWalletLinked, setLinkedWalletAddress, t]);

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="venalabs-wallet-linker">
      <div className="venalabs-wallet-linker__row">
        {/* Left: Network label + address/connect */}
        <div className="venalabs-wallet-linker__info">
          <div className="venalabs-wallet-linker__network">{network}</div>

          {!isConnected ? (
            <GlassButton
              variant="secondary"
              onClick={handleConnect}
              disabled={isConnecting}
              className="venalabs-wallet-linker__connect-btn"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="venalabs-icon-sm venalabs-animate-spin" />
                  {t('wallet.connecting')}
                </>
              ) : (
                <>
                  <Wallet className="venalabs-icon-sm" />
                  {t('wallet.connect')}
                </>
              )}
            </GlassButton>
          ) : (
            <div className="venalabs-wallet-linker__connected">
              <div className="venalabs-wallet-linker__address">
                {formatAddress(stellarAddress!)}
              </div>

              {/* Status indicator */}
              {isLinked && (
                <div className="venalabs-wallet-linker__status venalabs-wallet-linker__status--linked">
                  <Check className="venalabs-icon-xs" />
                  <span>{t('wallet.linked')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Action button */}
        <div className="venalabs-wallet-linker__actions">
          {isConnected && !isLinked && (
            <GlassButton
              variant="secondary"
              onClick={handleLinkWallet}
              disabled={linking}
              className="venalabs-wallet-linker__link-btn"
            >
              {linking ? (
                <>
                  <Loader2 className="venalabs-icon-sm venalabs-animate-spin" />
                  {t('wallet.linking')}
                </>
              ) : (
                <>
                  <Link2 className="venalabs-icon-sm" />
                  {hasOtherLinkedWallet ? t('wallet.replaceLink') : t('wallet.linkWallet')}
                </>
              )}
            </GlassButton>
          )}
        </div>
      </div>

      {/* Linked wallet info if different from connected */}
      {hasOtherLinkedWallet && (
        <div className="venalabs-wallet-linker__other-linked">
          <span className="venalabs-wallet-linker__other-label">{t('wallet.currentlyLinked')}</span>
          <span className="venalabs-wallet-linker__other-address">
            {formatAddress(linkedWalletAddress)}
          </span>
          <span className="venalabs-wallet-linker__warning">{t('wallet.switchWalletWarning')}</span>
        </div>
      )}

      {/* Error message */}
      {error && <div className="venalabs-wallet-linker__error">{error}</div>}
    </div>
  );
}

export default WalletLinker;
