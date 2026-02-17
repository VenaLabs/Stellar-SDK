/**
 * Checker Verification component for venalabs-stellar-sdk
 * Handles checker verification flow with wallet connection/linking
 */

import { useState, useCallback } from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStellarWallet } from '../../wallet';
import { useTranslation } from '../../i18n';
import type { VenalabsChecker } from '../../types';
import { getLocalizedText } from '../../types';
import { GlassButton } from './GlassCard';
import { WalletLinker } from './WalletLinker';
import { NftMintChecker } from './NftMintChecker';
import type { VenalabsApiClient } from '../../api';

// Utility function for class names
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface CheckerVerificationProps {
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
 * Component that handles checker verification flow including:
 * - Wallet connection (if needed)
 * - Wallet linking (if needed)
 * - Verification button with proper disabled state
 * - Success/error messages
 */
export function CheckerVerification({
  apiClient,
  courseId,
  stepId,
  checker,
  isCompleted,
  linkedWalletAddress,
  onWalletLinked,
  onVerificationSuccess,
}: CheckerVerificationProps): JSX.Element {
  const { t, locale } = useTranslation();
  const { stellarAddress, isConnected } = useStellarWallet();

  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verificationDetails, setVerificationDetails] = useState<{
    message: string;
    details?: Record<string, string>;
  } | null>(null);

  // For NFT_MINT checkers, use the dedicated component
  if (checker.type === 'NFT_MINT') {
    return (
      <NftMintChecker
        apiClient={apiClient}
        courseId={courseId}
        stepId={stepId}
        checker={checker}
        isCompleted={isCompleted}
        linkedWalletAddress={linkedWalletAddress}
        onWalletLinked={onWalletLinked}
        onVerificationSuccess={onVerificationSuccess}
      />
    );
  }

  // Get network from checker config
  const getCheckerNetwork = (): string => {
    if (checker.linkedConfig?.network) return checker.linkedConfig.network;
    if (checker.balanceConfig?.network) return checker.balanceConfig.network;
    if (checker.transactionConfig?.network) return checker.transactionConfig.network;
    return 'STELLAR_PUBLIC';
  };

  const checkerNetwork = getCheckerNetwork();

  // Check if this checker requires wallet connection
  const requiresWallet =
    checker.type === 'LINKED' || checker.type === 'BALANCE' || checker.type === 'TRANSACTION';

  // Wallet state
  const isWalletConnected = isConnected;
  const isWalletLinked = !!linkedWalletAddress && linkedWalletAddress === stellarAddress;

  // Can verify if:
  // - Checker doesn't require wallet, OR
  // - Wallet is connected AND linked
  const canVerify = !requiresWallet || (isWalletConnected && isWalletLinked);

  const handleVerify = useCallback(async () => {
    setVerifying(true);
    setVerificationError(null);
    setVerificationSuccess(false);

    try {
      const result = await apiClient.verifyStep(courseId, stepId);

      if (result.passed) {
        setVerificationSuccess(true);
        setVerificationDetails({
          message: result.message || t('verification.passed'),
          details: result.details,
        });
        setTimeout(() => {
          onVerificationSuccess();
        }, 500);
      } else {
        setVerificationError(result.message || t('verification.checkRequirements'));
      }
    } catch {
      setVerificationError(t('verification.failed'));
    }

    setVerifying(false);
  }, [apiClient, courseId, stepId, onVerificationSuccess, t]);

  // Helper message based on state
  const getHelperMessage = (): string | null => {
    if (!requiresWallet) return null;
    if (!isWalletConnected) return t('verification.connectWallet');
    if (!isWalletLinked) return t('verification.linkWallet');
    return null;
  };

  const helperMessage = getHelperMessage();

  return (
    <div className="venalabs-checker-verification">
      {/* Checker info */}
      <CheckerInfo checker={checker} locale={locale} />

      {/* Wallet section for checkers that require it */}
      {requiresWallet && !isCompleted && (
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
          <p>
            {verificationDetails ? verificationDetails.message : t('verification.stepVerified')}
          </p>
        </div>
      )}

      {/* Verification section */}
      {!isCompleted && (
        <div className={cn('venalabs-verification-section', !canVerify && 'venalabs-opacity-50')}>
          {/* Error message */}
          {verificationError && (
            <div className="venalabs-error-banner">
              <AlertCircle className="venalabs-icon-md venalabs-text-error" />
              <p>{verificationError}</p>
            </div>
          )}

          {/* Success message */}
          {verificationSuccess && verificationDetails && (
            <div className="venalabs-success-banner">
              <CheckCircle2 className="venalabs-icon-md venalabs-text-success" />
              <p>{verificationDetails.message}</p>
            </div>
          )}

          {/* Helper text when verification is disabled */}
          {helperMessage && <p className="venalabs-helper-text">{helperMessage}</p>}

          {/* Verify button */}
          <GlassButton
            variant="primary"
            onClick={handleVerify}
            disabled={verifying || !canVerify || verificationSuccess}
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
    </div>
  );
}

/**
 * Displays checker info card
 */
function CheckerInfo({
  checker,
  locale,
}: {
  checker: VenalabsChecker;
  locale: string;
}): JSX.Element {
  const { t } = useTranslation();

  const getCheckerNetwork = (): string | null => {
    if (checker.linkedConfig?.network) return checker.linkedConfig.network;
    if (checker.balanceConfig?.network) return checker.balanceConfig.network;
    if (checker.transactionConfig?.network) return checker.transactionConfig.network;
    if (checker.nftMintConfig?.network) return checker.nftMintConfig.network;
    return null;
  };

  return (
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
        <span className="venalabs-checker-badge venalabs-checker-badge--type">{checker.type}</span>
        {getCheckerNetwork() && (
          <span className="venalabs-checker-badge venalabs-checker-badge--network">
            {getCheckerNetwork()}
          </span>
        )}
      </div>
    </div>
  );
}

export default CheckerVerification;
