/**
 * VenalabsApiClient - REST API client for SDK endpoints
 */

import {
  VenalabsApiClientConfig,
  TokenProvider,
  VenalabsMap,
  VenalabsCourse,
  VenalabsProgress,
  SdkStepCompletionResult,
  SdkStepCompletionRequest,
  VenalabsWalletNonceResponse,
  VenalabsWalletLinkRequest,
  VenalabsWalletLinkResponse,
  VenalabsLinkedWalletResponse,
  VenalabsCheckerVerificationResult,
  VenalabsNftVoucherResponse,
  VenalabsNftVerifyRequest,
} from '../types';
import { VenalabsApiError } from './errors';
import { fetchWithRetry, FetchWithRetryOptions } from './fetchWithRetry';

const DEFAULT_BASE_URL = 'https://api.venalabs.com';
const DEFAULT_TIMEOUT = 30000;

/**
 * API client for communicating with Venalabs SDK endpoints
 *
 * Uses dynamic token authentication with automatic refresh on 401.
 *
 * @example
 * ```typescript
 * const client = new VenalabsApiClient({
 *   apiKey: 'your-api-key',
 *   getAccessToken: async () => {
 *     const response = await fetch('/api/your-backend/token');
 *     const data = await response.json();
 *     return data.accessToken;
 *   },
 * });
 * ```
 */
export class VenalabsApiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  // Token management
  private readonly tokenProvider: TokenProvider;
  private cachedToken: string | null = null;
  private tokenPromise: Promise<string> | null = null;

  /**
   * Create a new VenalabsApiClient
   * @param config - Client configuration
   */
  constructor(config: VenalabsApiClientConfig) {
    if (!config.apiKey) {
      throw new Error('apiKey is required');
    }
    if (!config.getAccessToken) {
      throw new Error('getAccessToken is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
    this.tokenProvider = config.getAccessToken;
  }

  /**
   * Get the current access token
   * Fetches token if not cached
   */
  private async getToken(): Promise<string> {
    // Return cached token if available
    if (this.cachedToken) {
      return this.cachedToken;
    }

    // Fetch new token using provider
    return this.refreshToken();
  }

  /**
   * Refresh the access token
   * Used on initialization and after 401 responses
   */
  private async refreshToken(): Promise<string> {
    // Prevent multiple concurrent token fetches
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    this.tokenPromise = this.tokenProvider()
      .then((token) => {
        this.cachedToken = token;
        this.tokenPromise = null;
        return token;
      })
      .catch((error) => {
        this.tokenPromise = null;
        throw error;
      });

    return this.tokenPromise;
  }

  /**
   * Clear cached token (called on 401)
   */
  private clearToken(): void {
    this.cachedToken = null;
  }

  /**
   * Build common headers for SDK requests
   */
  private async getHeaders(): Promise<HeadersInit> {
    const token = await this.getToken();
    return {
      'Content-Type': 'application/json',
      'X-Api-Key': this.apiKey,
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * Build fetch retry options
   */
  private getRetryOptions(): FetchWithRetryOptions {
    return {
      timeout: this.timeout,
      retries: 1,
      retryDelay: 2000,
    };
  }

  /**
   * Make a GET request to the SDK API
   */
  private async get<T>(endpoint: string, isRetry = false): Promise<T> {
    const url = `${this.baseUrl}/api/v1/sdk${endpoint}`;

    const response = await fetchWithRetry(
      url,
      {
        method: 'GET',
        headers: await this.getHeaders(),
      },
      this.getRetryOptions()
    );

    // Handle 401 with token refresh
    if (response.status === 401 && !isRetry) {
      this.clearToken();
      await this.refreshToken();
      return this.get<T>(endpoint, true);
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw VenalabsApiError.fromResponse(response.status, body);
    }

    return response.json();
  }

  /**
   * Make a POST request to the SDK API
   */
  private async post<T>(endpoint: string, body?: unknown, isRetry = false): Promise<T> {
    const url = `${this.baseUrl}/api/v1/sdk${endpoint}`;

    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: await this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      },
      this.getRetryOptions()
    );

    // Handle 401 with token refresh
    if (response.status === 401 && !isRetry) {
      this.clearToken();
      await this.refreshToken();
      return this.post<T>(endpoint, body, true);
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw VenalabsApiError.fromResponse(response.status, errorBody);
    }

    // Handle empty responses (204 No Content)
    const contentLength = response.headers.get('content-length');
    if (response.status === 204 || contentLength === '0') {
      return undefined as T;
    }

    return response.json();
  }

  // ============================================================
  // Map Endpoints
  // ============================================================

  /**
   * Get all published maps for the organization
   * @returns Promise resolving to array of maps
   */
  async getMaps(): Promise<VenalabsMap[]> {
    return this.get<VenalabsMap[]>('/maps');
  }

  // ============================================================
  // Course Endpoints
  // ============================================================

  /**
   * Get a specific course by ID
   * @param courseId - The course ID to retrieve
   * @returns Promise resolving to the course
   */
  async getCourse(courseId: string): Promise<VenalabsCourse> {
    if (!courseId) {
      throw new Error('courseId is required');
    }
    return this.get<VenalabsCourse>(`/courses/${encodeURIComponent(courseId)}`);
  }

  /**
   * Start a course for the current user
   * @param courseId - The course ID to start
   * @returns Promise resolving when course is started
   */
  async startCourse(courseId: string): Promise<void> {
    if (!courseId) {
      throw new Error('courseId is required');
    }
    await this.post<void>(`/courses/${encodeURIComponent(courseId)}/start`);
  }

  // ============================================================
  // Step Endpoints
  // ============================================================

  /**
   * Complete a step in a course
   * @param courseId - The course ID containing the step
   * @param stepId - The step ID to complete
   * @param request - Optional request body (for quiz answers, checker data)
   * @returns Promise resolving to step completion result
   */
  async completeStep(
    courseId: string,
    stepId: string,
    request?: SdkStepCompletionRequest
  ): Promise<SdkStepCompletionResult> {
    if (!courseId) {
      throw new Error('courseId is required');
    }
    if (!stepId) {
      throw new Error('stepId is required');
    }
    return this.post<SdkStepCompletionResult>(
      `/courses/${encodeURIComponent(courseId)}/steps/${encodeURIComponent(stepId)}/complete`,
      request
    );
  }

  // ============================================================
  // Progress Endpoints
  // ============================================================

  /**
   * Get the current user's progress across all courses
   * @returns Promise resolving to array of progress records
   */
  async getProgress(): Promise<VenalabsProgress[]> {
    return this.get<VenalabsProgress[]>('/progress');
  }

  /**
   * Get the current user's progress for a specific course
   * @param courseId - The course ID to get progress for
   * @returns Promise resolving to progress for the course, or null if not started
   */
  async getCourseProgress(courseId: string): Promise<VenalabsProgress | null> {
    if (!courseId) {
      throw new Error('courseId is required');
    }
    try {
      return await this.get<VenalabsProgress>(`/progress/${encodeURIComponent(courseId)}`);
    } catch (error) {
      if (error instanceof VenalabsApiError && error.code === 'NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  // ============================================================
  // Wallet Endpoints
  // ============================================================

  /**
   * Get a nonce for wallet signature verification
   * @param walletAddress - The wallet address to generate nonce for
   * @returns Promise resolving to nonce response
   */
  async getWalletNonce(walletAddress: string): Promise<VenalabsWalletNonceResponse> {
    if (!walletAddress) {
      throw new Error('walletAddress is required');
    }
    return this.get<VenalabsWalletNonceResponse>(
      `/wallet/nonce?walletAddress=${encodeURIComponent(walletAddress)}`
    );
  }

  /**
   * Link a Stellar wallet to the user's account
   * @param walletAddress - The wallet address to link
   * @param signature - Signature of the nonce message
   * @returns Promise resolving to wallet link response
   */
  async linkStellarWallet(
    walletAddress: string,
    signature: string
  ): Promise<VenalabsWalletLinkResponse> {
    if (!walletAddress) {
      throw new Error('walletAddress is required');
    }
    if (!signature) {
      throw new Error('signature is required');
    }
    const request: VenalabsWalletLinkRequest = { walletAddress, signature };
    return this.post<VenalabsWalletLinkResponse>('/wallet/stellar/link', request);
  }

  /**
   * Get linked wallets for the current user
   * @returns Promise resolving to linked wallet response
   */
  async getLinkedWallets(): Promise<VenalabsLinkedWalletResponse> {
    return this.get<VenalabsLinkedWalletResponse>('/wallet');
  }

  // ============================================================
  // Verification Endpoints
  // ============================================================

  /**
   * Verify a step's checker
   * @param courseId - The course ID
   * @param stepId - The step ID to verify
   * @returns Promise resolving to verification result
   */
  async verifyStep(
    courseId: string,
    stepId: string
  ): Promise<VenalabsCheckerVerificationResult> {
    if (!courseId) {
      throw new Error('courseId is required');
    }
    if (!stepId) {
      throw new Error('stepId is required');
    }
    return this.post<VenalabsCheckerVerificationResult>(
      `/courses/${encodeURIComponent(courseId)}/steps/${encodeURIComponent(stepId)}/verify`
    );
  }

  // ============================================================
  // NFT Voucher Endpoints
  // ============================================================

  /**
   * Get NFT voucher for a step with NFT_MINT checker
   * @param courseId - The course ID
   * @param stepId - The step ID
   * @returns Promise resolving to NFT voucher response
   */
  async getNftVoucher(
    courseId: string,
    stepId: string
  ): Promise<VenalabsNftVoucherResponse> {
    if (!courseId) {
      throw new Error('courseId is required');
    }
    if (!stepId) {
      throw new Error('stepId is required');
    }
    return this.get<VenalabsNftVoucherResponse>(
      `/courses/${encodeURIComponent(courseId)}/steps/${encodeURIComponent(stepId)}/nft-voucher`
    );
  }

  /**
   * Mark NFT as minted after successful transaction
   * @param courseId - The course ID
   * @param stepId - The step ID
   * @param txHash - Transaction hash from the mint
   * @returns Promise resolving when verification is complete
   */
  async verifyNftMint(
    courseId: string,
    stepId: string,
    txHash: string
  ): Promise<void> {
    if (!courseId) {
      throw new Error('courseId is required');
    }
    if (!stepId) {
      throw new Error('stepId is required');
    }
    if (!txHash) {
      throw new Error('txHash is required');
    }
    const request: VenalabsNftVerifyRequest = { txHash };
    await this.post<void>(
      `/courses/${encodeURIComponent(courseId)}/steps/${encodeURIComponent(stepId)}/nft-verify`,
      request
    );
  }
}
