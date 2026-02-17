/**
 * API-specific type definitions for VenalabsApiClient
 * These types match the backend SDK endpoint responses
 */

import {
  VenalabsMap,
  VenalabsCourse,
  VenalabsProgress,
  VenalabsStepProgress,
  VenalabsProgressStatus,
  VenalabsVerificationResponse,
} from './index';

// Re-export core types for convenience
export type {
  VenalabsMap,
  VenalabsCourse,
  VenalabsProgress,
  VenalabsStepProgress,
  VenalabsProgressStatus,
  VenalabsVerificationResponse,
};

/**
 * Function that returns an access token
 * Called when token is needed or after a 401 response
 */
export type TokenProvider = () => Promise<string>;

/**
 * Configuration for VenalabsApiClient
 */
export interface VenalabsApiClientConfig {
  /** API key for authentication (X-Api-Key header) */
  apiKey: string;
  /**
   * Token provider function for dynamic token mode
   * Called to get initial token and on 401 for refresh
   */
  getAccessToken: TokenProvider;
  /** Base URL for API requests (default: https://api.venalabs.com) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * API response for step completion
 */
export interface SdkStepCompletionResult {
  /** Whether the step was completed successfully */
  success: boolean;
  /** Updated progress after completion */
  progress?: VenalabsProgress;
  /** Verification result if step was an EXE type */
  verification?: VenalabsVerificationResponse;
  /** Error message if completion failed */
  error?: string;
}

/**
 * Request body for completing a quiz step
 */
export interface SdkQuizAnswerRequest {
  /** Index of the selected answer option */
  selectedOptionIndex: number;
}

/**
 * Request body for completing an EXE (checker) step
 */
export interface SdkExeCompletionRequest {
  /** Wallet address to verify */
  walletAddress?: string;
  /** Network for verification */
  network?: string;
}

/**
 * Combined request for step completion
 */
export type SdkStepCompletionRequest = SdkQuizAnswerRequest | SdkExeCompletionRequest | Record<string, never>;

/**
 * API error response structure from backend
 */
export interface ApiErrorResponse {
  code: number;
  type: string;
  message?: string;
}

// ============================================================
// Wallet API Types
// ============================================================

/**
 * Response from wallet nonce endpoint
 */
export interface VenalabsWalletNonceResponse {
  nonce: string;
}

/**
 * Request body for linking a wallet
 */
export interface VenalabsWalletLinkRequest {
  walletAddress: string;
  signature: string;
  network?: string;
}

/**
 * Response from wallet link endpoint
 */
export interface VenalabsWalletLinkResponse {
  success: boolean;
  walletAddresses: Record<string, string>;
  message?: string;
}

/**
 * Response from get linked wallet endpoint
 */
export interface VenalabsLinkedWalletResponse {
  walletAddresses: Record<string, string>;
}

// ============================================================
// Verification API Types
// ============================================================

/**
 * Response from step verification endpoint
 */
export interface VenalabsCheckerVerificationResult {
  checkerId: string;
  checkerName: Record<string, string>;
  type: string;
  passed: boolean;
  message: string;
  details?: Record<string, string>;
}

// ============================================================
// NFT Voucher API Types
// ============================================================

/**
 * Response from NFT voucher endpoint
 */
export interface VenalabsNftVoucherResponse {
  recipient: string;
  nonce: string;
  signature: string;
  status: string;
  txHash?: string;
  contractAddress: string;
  slug: string;
  name: string;
}

/**
 * Request body for verifying NFT mint
 */
export interface VenalabsNftVerifyRequest {
  txHash: string;
}
