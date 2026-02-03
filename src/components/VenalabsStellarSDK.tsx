/**
 * VenalabsStellarSDK - Main SDK Component
 * A black-box React component for displaying Venalabs courses
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from 'react';
import { VenalabsApiClient } from '../api';
import { VenalabsApiError } from '../api/errors';
import { I18nContext, createTranslator, SupportedLocale } from '../i18n';
import { StellarWalletProvider, type StellarNetwork, type StellarWalletsKit } from '../wallet';
import type {
  VenalabsMap,
  VenalabsProgress,
  VenalabsCourse,
  VenalabsMapNode,
  VenalabsCourseStep,
  SdkStepCompletionRequest,
} from '../types';
import { MapView } from './core/MapView';
import { CourseDetailView } from './core/CourseDetailView';
import { StepView } from './core/StepView';
import { EmptyState, LoadingSmooth } from './ui/GlassCard';

// ============================================================
// Props Interface
// ============================================================

/**
 * Token provider function for dynamic authentication
 * Called to get initial token and automatically on 401 for refresh
 */
export type TokenProvider = () => Promise<string>;

export interface VenalabsStellarSDKProps {
  /** API Key provided by Airdroped dashboard */
  apiKey: string;
  /**
   * Token provider function for authentication
   * Called to get initial token and automatically on 401 for refresh
   *
   * @example
   * ```typescript
   * getAccessToken={async () => {
   *   const res = await fetch('/api/your-backend/token', { credentials: 'include' });
   *   const data = await res.json();
   *   return data.accessToken;
   * }}
   * ```
   */
  getAccessToken: TokenProvider;
  /** Language for UI (default: "fr") */
  lang?: 'fr' | 'en';
  /** Stellar network for wallet operations (default: "TESTNET") */
  stellarNetwork?: StellarNetwork;
  /** Minimum height (default: 600px) */
  minHeight?: string | number;
  /** Custom class name for the container */
  className?: string;
  /** Base URL for the API (default: production) */
  baseUrl?: string;
  /** External wallet kit instance (if host app already has one initialized) */
  externalWalletKit?: StellarWalletsKit | null;
}

// ============================================================
// Navigation Types
// ============================================================

type SDKView =
  | { type: 'map' }
  | { type: 'course'; courseId: string }
  | { type: 'step'; courseId: string; stepId: string };

interface SDKNavigationContextValue {
  view: SDKView;
  navigateToMap: () => void;
  navigateToCourse: (courseId: string) => void;
  navigateToStep: (courseId: string, stepId: string) => void;
}

// ============================================================
// SDK Context
// ============================================================

interface SDKContextValue {
  apiClient: VenalabsApiClient;
  maps: VenalabsMap[];
  progress: VenalabsProgress[];
  loading: boolean;
  error: VenalabsApiError | Error | null;
  linkedWalletAddress: string | null;
  refreshMaps: () => Promise<void>;
  refreshProgress: () => Promise<void>;
  getCourse: (courseId: string) => Promise<VenalabsCourse | null>;
  startCourse: (courseId: string) => Promise<void>;
  completeStep: (
    courseId: string,
    stepId: string,
    response?: unknown
  ) => Promise<VenalabsProgress | undefined>;
  onWalletLinked: (address: string, network: string) => void;
}

const SDKContext = createContext<SDKContextValue | null>(null);
const SDKNavigationContext = createContext<SDKNavigationContextValue | null>(null);

function useSDKContext(): SDKContextValue {
  const context = useContext(SDKContext);
  if (!context) {
    throw new Error('useSDKContext must be used within VenalabsStellarSDKProvider');
  }
  return context;
}

function useSDKNavigation(): SDKNavigationContextValue {
  const context = useContext(SDKNavigationContext);
  if (!context) {
    throw new Error('useSDKNavigation must be used within VenalabsStellarSDKProvider');
  }
  return context;
}

// ============================================================
// Error View
// ============================================================

interface SDKErrorViewProps {
  error: VenalabsApiError | Error;
  onRetry?: () => void;
}

function SDKErrorView({ error, onRetry }: SDKErrorViewProps) {
  let message = 'An error occurred';
  let emoji = '❌';

  if (error instanceof VenalabsApiError) {
    switch (error.code) {
      case 'INVALID_API_KEY':
        message = 'Invalid API key. Please check your configuration.';
        emoji = '🔑';
        break;
      case 'INVALID_TOKEN':
      case 'TOKEN_EXPIRED':
        message = 'Invalid or expired user token.';
        emoji = '🔐';
        break;
      case 'NOT_FOUND':
        message = 'Resource not found.';
        emoji = '🔍';
        break;
      case 'RATE_LIMITED':
        message = 'Too many requests. Please try again later.';
        emoji = '⏳';
        break;
      case 'SERVER_ERROR':
        message = 'Server error. Please try again later.';
        emoji = '🔧';
        break;
      case 'NETWORK_ERROR':
        message = 'Network error. Please check your connection.';
        emoji = '📡';
        break;
      default:
        message = error.message || 'An error occurred';
    }
  } else {
    message = error.message || 'An unexpected error occurred';
  }

  return (
    <div className="venalabs-sdk-error">
      <EmptyState emoji={emoji} title={message}>
        {onRetry && (
          <button onClick={onRetry} className="venalabs-btn-base venalabs-btn--primary">
            Try Again
          </button>
        )}
      </EmptyState>
    </div>
  );
}

// ============================================================
// SDK Provider
// ============================================================

interface VenalabsStellarSDKProviderProps {
  apiKey: string;
  getAccessToken: TokenProvider;
  lang: SupportedLocale;
  baseUrl?: string;
  children: ReactNode;
}

function VenalabsStellarSDKProvider({
  apiKey,
  getAccessToken,
  lang,
  baseUrl,
  children,
}: VenalabsStellarSDKProviderProps) {
  // Create API client
  const apiClient = useMemo(
    () =>
      new VenalabsApiClient({
        apiKey,
        getAccessToken,
        baseUrl,
      }),
    [apiKey, getAccessToken, baseUrl]
  );

  // Create i18n context value
  const i18nValue = useMemo(
    () => ({
      locale: lang,
      t: createTranslator(lang),
    }),
    [lang]
  );

  // State
  const [maps, setMaps] = useState<VenalabsMap[]>([]);
  const [progress, setProgress] = useState<VenalabsProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<VenalabsApiError | Error | null>(null);
  const [linkedWalletAddress, setLinkedWalletAddress] = useState<string | null>(null);

  // Wallet linked handler
  const onWalletLinked = useCallback((address: string, _network: string) => {
    setLinkedWalletAddress(address);
  }, []);

  // Fetch linked wallet helper
  const fetchLinkedWallet = useCallback(async () => {
    try {
      const response = await apiClient.getLinkedWallets();
      // Get the Stellar wallet address if available
      const stellarAddress =
        response.walletAddresses?.['STELLAR_TESTNET'] ||
        response.walletAddresses?.['STELLAR_PUBLIC'] ||
        response.walletAddresses?.['STELLAR'] ||
        null;
      setLinkedWalletAddress(stellarAddress);
    } catch (err) {
      // Ignore errors - wallet may not be linked yet
      console.debug('No linked wallet found:', err);
    }
  }, [apiClient]);

  // Course cache
  const courseCache = useMemo(() => new Map<string, VenalabsCourse>(), []);

  // Refresh functions
  const refreshMaps = useCallback(async () => {
    try {
      const fetchedMaps = await apiClient.getMaps();
      setMaps(fetchedMaps);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch maps'));
    }
  }, [apiClient]);

  const refreshProgress = useCallback(async () => {
    try {
      const fetchedProgress = await apiClient.getProgress();
      setProgress(fetchedProgress);
    } catch (err) {
      // Progress fetch failure is not critical, just log it
      console.warn('Failed to fetch progress:', err);
    }
  }, [apiClient]);

  // Get course with caching
  const getCourse = useCallback(
    async (courseId: string): Promise<VenalabsCourse | null> => {
      // Check cache first
      if (courseCache.has(courseId)) {
        return courseCache.get(courseId)!;
      }

      try {
        const course = await apiClient.getCourse(courseId);
        courseCache.set(courseId, course);
        return course;
      } catch (err) {
        console.error('Failed to fetch course:', err);
        return null;
      }
    },
    [apiClient, courseCache]
  );

  // Start course
  const startCourse = useCallback(
    async (courseId: string): Promise<void> => {
      await apiClient.startCourse(courseId);
      // Refresh progress after starting
      await refreshProgress();
    },
    [apiClient, refreshProgress]
  );

  // Complete step
  const completeStep = useCallback(
    async (
      courseId: string,
      stepId: string,
      response?: unknown
    ): Promise<VenalabsProgress | undefined> => {
      try {
        await apiClient.completeStep(
          courseId,
          stepId,
          response as SdkStepCompletionRequest | undefined
        );
        // Refresh progress after completing
        await refreshProgress();
        // Return updated progress for the course
        const updatedProgress = await apiClient.getCourseProgress(courseId);
        return updatedProgress || undefined;
      } catch (err) {
        console.error('Failed to complete step:', err);
        throw err;
      }
    },
    [apiClient, refreshProgress]
  );

  // Initial fetch
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([refreshMaps(), refreshProgress()]);
        // Fetch linked wallet after auth is verified (maps/progress succeeded)
        fetchLinkedWallet();
      } catch (err) {
        // Error is already set in refreshMaps
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [refreshMaps, refreshProgress, fetchLinkedWallet]);

  // SDK context value
  const sdkValue = useMemo(
    () => ({
      apiClient,
      maps,
      progress,
      loading,
      error,
      linkedWalletAddress,
      refreshMaps,
      refreshProgress,
      getCourse,
      startCourse,
      completeStep,
      onWalletLinked,
    }),
    [
      apiClient,
      maps,
      progress,
      loading,
      error,
      linkedWalletAddress,
      refreshMaps,
      refreshProgress,
      getCourse,
      startCourse,
      completeStep,
      onWalletLinked,
    ]
  );

  return (
    <I18nContext.Provider value={i18nValue}>
      <SDKContext.Provider value={sdkValue}>{children}</SDKContext.Provider>
    </I18nContext.Provider>
  );
}

// ============================================================
// SDK Router
// ============================================================

function SDKRouter() {
  const {
    maps,
    progress,
    loading,
    error,
    refreshMaps,
    getCourse,
    startCourse,
    completeStep,
    apiClient,
    linkedWalletAddress,
    onWalletLinked,
  } = useSDKContext();
  const { view, navigateToMap, navigateToCourse, navigateToStep } = useSDKNavigation();

  // Course state for course and step views
  const [currentCourse, setCurrentCourse] = useState<VenalabsCourse | null>(null);
  const [courseLoading, setCourseLoading] = useState(false);

  // Get progress for current course
  const currentCourseProgress = useMemo(() => {
    if (view.type === 'map') return null;
    return progress.find((p) => p.courseId === view.courseId) || null;
  }, [view, progress]);

  // Load course when navigating to course or step view
  useEffect(() => {
    if (view.type === 'map') {
      setCurrentCourse(null);
      return;
    }

    const loadCourse = async () => {
      setCourseLoading(true);
      const course = await getCourse(view.courseId);
      setCurrentCourse(course);
      setCourseLoading(false);
    };
    loadCourse();
  }, [view, getCourse]);

  // Handle node click from map
  const handleNodeClick = useCallback(
    (node: VenalabsMapNode) => {
      navigateToCourse(node.courseId);
    },
    [navigateToCourse]
  );

  // Handle step click from course detail
  const handleStepClick = useCallback(
    (step: VenalabsCourseStep) => {
      if (view.type !== 'map' && 'courseId' in view) {
        navigateToStep(view.courseId, step.id);
      }
    },
    [view, navigateToStep]
  );

  // Handle start course
  const handleStartCourse = useCallback(async () => {
    if (view.type !== 'map' && 'courseId' in view && currentCourse) {
      await startCourse(view.courseId);
      // Navigate to first step
      const sortedSteps = [...currentCourse.steps].sort((a, b) => a.order - b.order);
      const firstStep = sortedSteps[0];
      if (firstStep) {
        navigateToStep(view.courseId, firstStep.id);
      }
    }
  }, [view, currentCourse, startCourse, navigateToStep]);

  // Handle continue course
  const handleContinueCourse = useCallback(() => {
    if (view.type !== 'map' && 'courseId' in view && currentCourse && currentCourseProgress) {
      // Find first incomplete step
      const sortedSteps = [...currentCourse.steps].sort((a, b) => a.order - b.order);
      const firstIncomplete = sortedSteps.find((step) => {
        const stepProgress = currentCourseProgress.stepProgress?.find(
          (sp) => sp.stepId === step.id
        );
        return stepProgress?.status !== 'COMPLETED';
      });
      if (firstIncomplete) {
        navigateToStep(view.courseId, firstIncomplete.id);
      }
    }
  }, [view, currentCourse, currentCourseProgress, navigateToStep]);

  // Handle step change
  const handleStepChange = useCallback(
    (stepId: string) => {
      if (view.type !== 'map' && 'courseId' in view) {
        navigateToStep(view.courseId, stepId);
      }
    },
    [view, navigateToStep]
  );

  // Handle step complete
  const handleStepComplete = useCallback(
    async (stepId: string, response?: unknown): Promise<VenalabsProgress | undefined> => {
      if (view.type !== 'map' && 'courseId' in view) {
        return completeStep(view.courseId, stepId, response);
      }
      return undefined;
    },
    [view, completeStep]
  );

  // Handle back navigation
  const handleBackToCourse = useCallback(() => {
    if (view.type === 'step') {
      navigateToCourse(view.courseId);
    }
  }, [view, navigateToCourse]);

  // Handle finish course - go directly to map
  const handleFinishCourse = useCallback(() => {
    navigateToMap();
  }, [navigateToMap]);

  // Loading state
  if (loading) {
    return (
      <div className="venalabs-sdk-loading">
        <LoadingSmooth />
      </div>
    );
  }

  // Error state
  if (error) {
    return <SDKErrorView error={error} onRetry={refreshMaps} />;
  }

  // Map view
  if (view.type === 'map') {
    return <MapView maps={maps} progress={progress} onNodeClick={handleNodeClick} />;
  }

  // Course detail view
  if (view.type === 'course') {
    return (
      <CourseDetailView
        course={currentCourse}
        progress={currentCourseProgress}
        loading={courseLoading}
        onBack={navigateToMap}
        onStepClick={handleStepClick}
        onStartCourse={handleStartCourse}
        onContinueCourse={handleContinueCourse}
      />
    );
  }

  // Step view
  if (view.type === 'step') {
    return (
      <StepView
        course={currentCourse}
        stepId={view.stepId}
        progress={currentCourseProgress}
        loading={courseLoading}
        apiClient={apiClient}
        linkedWalletAddress={linkedWalletAddress || undefined}
        onWalletLinked={onWalletLinked}
        onBack={handleBackToCourse}
        onStepChange={handleStepChange}
        onComplete={handleStepComplete}
        onFinishCourse={handleFinishCourse}
      />
    );
  }

  return null;
}

// ============================================================
// Main Component
// ============================================================

export function VenalabsStellarSDK({
  apiKey,
  getAccessToken,
  lang = 'en',
  stellarNetwork = 'TESTNET',
  minHeight = 600,
  className = '',
  baseUrl,
  externalWalletKit,
}: VenalabsStellarSDKProps): JSX.Element {
  // Navigation state
  const [view, setView] = useState<SDKView>({ type: 'map' });

  // Navigation functions
  const navigationValue = useMemo<SDKNavigationContextValue>(
    () => ({
      view,
      navigateToMap: () => setView({ type: 'map' }),
      navigateToCourse: (courseId: string) => setView({ type: 'course', courseId }),
      navigateToStep: (courseId: string, stepId: string) =>
        setView({ type: 'step', courseId, stepId }),
    }),
    [view]
  );

  // Parse minHeight
  const minHeightStyle = typeof minHeight === 'number' ? `${minHeight}px` : minHeight;

  return (
    <div
      className={`venalabs-sdk-container ${className}`.trim()}
      style={{ minHeight: minHeightStyle }}
    >
      <StellarWalletProvider network={stellarNetwork} externalKit={externalWalletKit}>
        <VenalabsStellarSDKProvider
          apiKey={apiKey}
          getAccessToken={getAccessToken}
          lang={lang}
          baseUrl={baseUrl}
        >
          <SDKNavigationContext.Provider value={navigationValue}>
            <SDKRouter />
          </SDKNavigationContext.Provider>
        </VenalabsStellarSDKProvider>
      </StellarWalletProvider>
    </div>
  );
}

export default VenalabsStellarSDK;
