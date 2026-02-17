/**
 * NftMintChecker component for venalabs-stellar-sdk
 * Handles the complete NFT minting flow: voucher → mint → verify
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, CheckCircle2, ExternalLink, Wallet } from 'lucide-react';
import { useStellarWallet } from '../../wallet';
import { useTranslation } from '../../i18n';
import { GlassButton } from './GlassCard';
import { WalletLinker } from './WalletLinker';
import type { VenalabsApiClient } from '../../api';
import { VenalabsApiError } from '../../api';
import type { VenalabsChecker, VenalabsNftVoucherResponse } from '../../types';
import { getLocalizedText } from '../../types';
import {
  getSorobanRpcUrl,
  getNetworkPassphrase,
  getExplorerUrl as getExplorerUrlUtil,
} from '../../utils/stellarNetworkUtils';

// Utility function for class names
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface NftMintCheckerProps {
  /** API client instance */
  apiClient: VenalabsApiClient;
  /** Course ID */
  courseId: string;
  /** Step ID */
  stepId: string;
  /** Checker configuration */
  checker: VenalabsChecker;
  /** Whether the step is already completed */
  isCompleted: boolean;
  /** Currently linked wallet address */
  linkedWalletAddress?: string;
  /** Callback when wallet is linked */
  onWalletLinked: (address: string, network: string) => void;
  /** Callback when verification succeeds */
  onVerificationSuccess: () => void;
}

/**
 * Component for handling NFT minting flow in courses
 * Flow:
 * 1. User connects and links wallet
 * 2. User clicks Mint -> fetches voucher -> builds and signs tx -> submits
 * 3. User clicks Verify to complete the step
 */
export function NftMintChecker({
  apiClient,
  courseId,
  stepId,
  checker,
  isCompleted,
  linkedWalletAddress,
  onWalletLinked,
  onVerificationSuccess,
}: NftMintCheckerProps): JSX.Element {
  const { t, locale } = useTranslation();
  const { stellarAddress, isConnected, signTransaction } = useStellarWallet();

  // Mint states
  const [mintLoading, setMintLoading] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Verify states
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  // Voucher state
  const [voucherLoading, setVoucherLoading] = useState(true);
  const [voucherData, setVoucherData] = useState<VenalabsNftVoucherResponse | null>(null);

  // Get network from checker config
  const checkerNetwork = checker.nftMintConfig?.network || 'STELLAR_PUBLIC';

  // Wallet state checks
  const isWalletConnected = isConnected;
  const isWalletLinked = !!linkedWalletAddress && linkedWalletAddress === stellarAddress;
  const canMintOrVerify = isWalletConnected && isWalletLinked;

  // Check if NFT is already minted
  const isAlreadyMinted = voucherData?.status === 'MINTED';
  const mintedByAddress = voucherData?.recipient;
  const isConnectedWithMintedWallet = stellarAddress === mintedByAddress;
  const canVerifyMinted = isConnectedWithMintedWallet && isWalletConnected && isWalletLinked;

  // Load voucher on mount to check mint status
  useEffect(() => {
    const loadVoucher = async () => {
      if (isCompleted) {
        setVoucherLoading(false);
        return;
      }

      setVoucherLoading(true);
      try {
        const response = await apiClient.getNftVoucher(courseId, stepId);
        setVoucherData(response);
        // If already minted, set the states
        if (response.status === 'MINTED') {
          setMintSuccess(true);
          setTxHash(response.txHash || null);
        }
      } catch (error) {
        console.error('[NftMintChecker] Failed to load voucher:', error);
      }
      setVoucherLoading(false);
    };

    loadVoucher();
  }, [apiClient, courseId, stepId, isCompleted]);

  // Handle mint
  const handleMint = useCallback(async () => {
    if (!stellarAddress || !canMintOrVerify) return;

    setMintLoading(true);
    setMintError(null);

    try {
      // 1. Get voucher
      console.log('[NftMintChecker] Step 1: Fetching voucher...');
      let voucher: VenalabsNftVoucherResponse;
      try {
        voucher = await apiClient.getNftVoucher(courseId, stepId);
      } catch (voucherError) {
        console.error('[NftMintChecker] Voucher error:', voucherError);
        if (voucherError instanceof VenalabsApiError) {
          // Handle specific error types
          if (voucherError.code === 'NOT_FOUND') {
            setMintError(t('nft.linkWalletFirst'));
          } else {
            setMintError(t('nft.failedVoucher'));
          }
        } else {
          setMintError(t('nft.failedVoucher'));
        }
        setMintLoading(false);
        return;
      }

      // Check if already minted
      if (voucher.status === 'MINTED') {
        setMintSuccess(true);
        setTxHash(voucher.txHash || null);
        setMintLoading(false);
        return;
      }

      // 2. Build and submit transaction using Stellar SDK
      console.log('[NftMintChecker] Step 2: Building transaction...');

      // Dynamic import of Stellar SDK
      const {
        TransactionBuilder,
        Operation,
        Address,
        rpc: StellarRpc,
        Transaction,
        BASE_FEE,
        xdr,
      } = await import('@stellar/stellar-sdk');

      const rpcUrl = getSorobanRpcUrl(checkerNetwork);
      const passphrase = getNetworkPassphrase(checkerNetwork);

      const RpcServer = new StellarRpc.Server(rpcUrl, {
        allowHttp: true,
      });

      console.log('[NftMintChecker] Fetching account for:', stellarAddress);
      const userAccount = await RpcServer.getAccount(stellarAddress);

      // Convert signature from hex string to Bytes (64 bytes for Ed25519)
      // Use Uint8Array for browser compatibility (Buffer is Node.js only)
      const hexToBytes = (hex: string): Uint8Array => {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
        }
        return bytes;
      };

      const signatureBytes = hexToBytes(voucher.signature);
      if (signatureBytes.length !== 64) {
        throw new Error(`Invalid signature length: ${signatureBytes.length}`);
      }

      // Build transaction with mint_with_voucher function
      const tx = new TransactionBuilder(userAccount, {
        fee: BASE_FEE,
        networkPassphrase: passphrase,
      })
        .addOperation(
          Operation.invokeContractFunction({
            function: 'mint_with_voucher',
            contract: voucher.contractAddress,
            args: [
              xdr.ScVal.scvString(voucher.slug || ''),
              xdr.ScVal.scvString(voucher.name || ''),
              new Address(voucher.recipient).toScVal(),
              xdr.ScVal.scvU64(xdr.Uint64.fromString(voucher.nonce)),
              xdr.ScVal.scvBytes(signatureBytes as unknown as Buffer),
            ],
          })
        )
        .setTimeout(30)
        .build();

      // 3. Simulate transaction
      console.log('[NftMintChecker] Step 3: Simulating transaction...');
      const simResponse = await RpcServer.simulateTransaction(tx);
      const assembledTx = StellarRpc.assembleTransaction(tx, simResponse).build();

      // 4. Sign via wallet
      console.log('[NftMintChecker] Step 4: Opening wallet for signing...');
      const signedTxXdr = await signTransaction(assembledTx.toXDR(), passphrase);
      const signedTx = new Transaction(signedTxXdr, passphrase);

      // 5. Submit transaction
      console.log('[NftMintChecker] Step 5: Submitting transaction...');
      const result = await RpcServer.sendTransaction(signedTx);

      if (result.status === 'ERROR') {
        setMintError(t('nft.transactionFailed'));
        setMintLoading(false);
        return;
      }

      // 6. Mark as minted on backend
      console.log('[NftMintChecker] Step 6: Marking as minted on backend...');
      try {
        await apiClient.verifyNftMint(courseId, stepId, result.hash);
      } catch (err) {
        console.warn('[NftMintChecker] Failed to mark as minted:', err);
        // Don't fail the UI - the tx was successful
      }

      setTxHash(result.hash);
      setMintSuccess(true);
      console.log('[NftMintChecker] Success! TxHash:', result.hash);
    } catch (error: unknown) {
      console.error('[NftMintChecker] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMintError(t('nft.mintingFailed', { error: errorMessage }));
    }

    setMintLoading(false);
  }, [stellarAddress, canMintOrVerify, apiClient, courseId, stepId, signTransaction, t]);

  // Handle verify
  const handleVerify = useCallback(async () => {
    setVerifying(true);
    setVerificationError(null);
    setVerificationSuccess(false);

    try {
      const result = await apiClient.verifyStep(courseId, stepId);

      if (result.passed) {
        setVerificationSuccess(true);
        setTimeout(() => {
          onVerificationSuccess();
        }, 500);
      } else {
        setVerificationError(result.message || t('nft.verificationFailedNft'));
      }
    } catch (error) {
      console.error('[NftMintChecker] Verification error:', error);
      setVerificationError(t('nft.verificationFailed'));
    }

    setVerifying(false);
  }, [apiClient, courseId, stepId, onVerificationSuccess, t]);

  // Get Stellar explorer URL
  const getExplorerUrl = (hash: string) => {
    return getExplorerUrlUtil(checkerNetwork, hash);
  };

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="venalabs-nft-mint-checker">
      {/* Checker info */}
      <div className="venalabs-checker-info">
        <p className="venalabs-checker-info__label">
          {t('verification.label')}{' '}
          <span className="venalabs-checker-info__name">
            {getLocalizedText(checker.name, locale)}
          </span>
        </p>
        {checker.description && (
          <p className="venalabs-checker-info__description">
            {getLocalizedText(checker.description, locale)}
          </p>
        )}
        <div className="venalabs-checker-info__badges">
          <span className="venalabs-checker-badge venalabs-checker-badge--type">
            {t('nft.badge')}
          </span>
          <span className="venalabs-checker-badge venalabs-checker-badge--network">
            {checkerNetwork}
          </span>
        </div>
      </div>

      {/* Wallet section */}
      {!isCompleted && (
        <WalletLinker
          apiClient={apiClient}
          network={checkerNetwork}
          linkedWalletAddress={linkedWalletAddress}
          onWalletLinked={onWalletLinked}
        />
      )}

      {/* Completed state */}
      {isCompleted && (
        <div className="venalabs-success-banner">
          <CheckCircle2 className="venalabs-icon-md venalabs-text-success" />
          <p>{t('nft.nftMintedCompleted')}</p>
        </div>
      )}

      {/* Loading state */}
      {!isCompleted && voucherLoading && (
        <div className="venalabs-loading-state">
          <Loader2 className="venalabs-icon-md venalabs-animate-spin venalabs-text-primary" />
          <p>{t('nft.loadingNftStatus')}</p>
        </div>
      )}

      {/* Already Minted state (not yet verified) */}
      {!isCompleted && !voucherLoading && isAlreadyMinted && (
        <div className="venalabs-nft-already-minted">
          {/* Minted info card */}
          <div className="venalabs-success-banner venalabs-success-banner--with-details">
            <div className="venalabs-success-banner__header">
              <CheckCircle2 className="venalabs-icon-md venalabs-text-success" />
              <p className="venalabs-text-success venalabs-font-medium">{t('nft.alreadyMinted')}</p>
            </div>
            <div className="venalabs-success-banner__content">
              <div className="venalabs-success-banner__details">
                <Wallet className="venalabs-icon-sm" />
                <span>
                  {t('nft.mintedBy')} {formatAddress(mintedByAddress || '')}
                </span>
              </div>
              {txHash && (
                <a
                  href={getExplorerUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="venalabs-link venalabs-link--external"
                >
                  <ExternalLink className="venalabs-icon-sm" />
                  <span>
                    {t('nft.viewTransaction')} {formatAddress(txHash)}
                  </span>
                </a>
              )}
            </div>
          </div>

          {/* Warning if not connected with correct wallet */}
          {!canVerifyMinted && (
            <div className="venalabs-warning-banner">
              <AlertCircle className="venalabs-icon-md venalabs-text-warning" />
              <p>
                {t('nft.connectAndLinkPart1')}{' '}
                <span className="venalabs-font-medium">{formatAddress(mintedByAddress || '')}</span>{' '}
                {t('nft.connectAndLinkPart2')}
              </p>
            </div>
          )}

          {/* Verification messages */}
          {verificationError && (
            <div className="venalabs-error-banner">
              <AlertCircle className="venalabs-icon-md venalabs-text-error" />
              <p>{verificationError}</p>
            </div>
          )}

          {verificationSuccess && (
            <div className="venalabs-success-banner">
              <CheckCircle2 className="venalabs-icon-md venalabs-text-success" />
              <p>{t('verification.passed')}</p>
            </div>
          )}

          {/* Verify button */}
          <GlassButton
            variant="primary"
            onClick={handleVerify}
            disabled={verifying || !canVerifyMinted || verificationSuccess}
          >
            {verifying && <Loader2 className="venalabs-icon-sm venalabs-animate-spin" />}
            {verifying
              ? t('verification.verifying')
              : verificationSuccess
                ? t('verification.verified')
                : t('verification.verifyComplete')}
          </GlassButton>
        </div>
      )}

      {/* Mint/Verify section (not yet minted) */}
      {!isCompleted && !voucherLoading && !isAlreadyMinted && (
        <div className={cn('venalabs-nft-mint-section', !canMintOrVerify && 'venalabs-opacity-50')}>
          {/* Mint error */}
          {mintError && (
            <div className="venalabs-error-banner">
              <AlertCircle className="venalabs-icon-md venalabs-text-error" />
              <p>{mintError}</p>
            </div>
          )}

          {/* Mint success */}
          {mintSuccess && txHash && (
            <div className="venalabs-success-banner venalabs-success-banner--with-details">
              <div className="venalabs-success-banner__header">
                <CheckCircle2 className="venalabs-icon-md venalabs-text-success" />
                <p className="venalabs-font-medium">{t('nft.nftMintedSuccess')}</p>
              </div>
              <div className="venalabs-success-banner__content">
                <a
                  href={getExplorerUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="venalabs-link venalabs-link--external"
                >
                  <ExternalLink className="venalabs-icon-sm" />
                  <span>
                    {t('nft.viewTransaction')} {formatAddress(txHash)}
                  </span>
                </a>
              </div>
            </div>
          )}

          {/* Verification messages */}
          {verificationError && (
            <div className="venalabs-error-banner">
              <AlertCircle className="venalabs-icon-md venalabs-text-error" />
              <p>{verificationError}</p>
            </div>
          )}

          {verificationSuccess && (
            <div className="venalabs-success-banner">
              <CheckCircle2 className="venalabs-icon-md venalabs-text-success" />
              <p>{t('verification.passed')}</p>
            </div>
          )}

          {/* Helper text when actions are disabled */}
          {!canMintOrVerify && (
            <p className="venalabs-helper-text">{t('nft.connectAndLinkToMint')}</p>
          )}

          {/* Action buttons */}
          <div className="venalabs-nft-actions">
            {/* Mint button */}
            <GlassButton
              variant="secondary"
              onClick={handleMint}
              disabled={mintLoading || !canMintOrVerify || mintSuccess}
            >
              {mintLoading && <Loader2 className="venalabs-icon-sm venalabs-animate-spin" />}
              {mintLoading ? t('nft.minting') : mintSuccess ? t('nft.minted') : t('nft.mintNft')}
            </GlassButton>

            {/* Verify button */}
            <GlassButton
              variant="primary"
              onClick={handleVerify}
              disabled={verifying || !canMintOrVerify || !mintSuccess || verificationSuccess}
            >
              {verifying && <Loader2 className="venalabs-icon-sm venalabs-animate-spin" />}
              {verifying
                ? t('verification.verifying')
                : verificationSuccess
                  ? t('verification.verified')
                  : t('verification.verifyComplete')}
            </GlassButton>
          </div>
        </div>
      )}
    </div>
  );
}

export default NftMintChecker;
