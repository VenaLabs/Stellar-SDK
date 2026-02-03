/**
 * Type definitions for venalabs-stellar-sdk
 * Adapted from airdroped-app SaasTypes
 */

// Localized field types
export type TranslatedText = Record<string, string>; // {"en": "Title", "fr": "Titre"}
export type TranslatedContent = Record<string, unknown[]>; // {"en": [...blocks], "fr": [...blocks]}

// Helper functions for localization
export function getLocalizedText(
  field: TranslatedText | string | undefined,
  lang: string = 'en'
): string {
  if (!field) return '';
  if (typeof field === 'string') return field; // Legacy support
  return field[lang] || Object.values(field)[0] || '';
}

export function getLocalizedContent(
  field: TranslatedContent | unknown[] | undefined,
  lang: string = 'en'
): unknown[] {
  if (!field) return [];
  if (Array.isArray(field)) return field; // Legacy support
  return field[lang] || Object.values(field)[0] || [];
}

// Organization Types
export interface VenalabsOrganization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  settings?: VenalabsOrganizationSettings;
}

export interface VenalabsOrganizationSettings {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  backgroundColorA?: string;
  textColor?: string;
  successColor?: string;
  warningColor?: string;
  errorColor?: string;
  infoColor?: string;
  stellarNetwork?: string;
}

// Reward Types
export type VenalabsRewardType = 'POINT' | 'OPENABLE_OBJECT' | 'NORMAL_OBJECT';

export interface VenalabsStepReward {
  rewardId: string;
  rewardName?: TranslatedText;
  rewardIconUrl?: string;
  amount: number;
}

// Course Types
export type VenalabsStepType = 'TEXT' | 'VIDEO' | 'QUIZ' | 'EXE' | 'REWARD';
export type VenalabsCourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface VenalabsTextContent {
  content: TranslatedContent;
}

export interface VenalabsVideoContent {
  videoUrl: string;
  videoProvider?: string;
  transcript?: string;
}

export interface VenalabsQuizOption {
  text: TranslatedText;
  imageUrl?: string;
}

export interface VenalabsQuizContent {
  question: TranslatedText;
  options: VenalabsQuizOption[];
  correctOptionIndex: number;
  explanation?: TranslatedText;
}

export interface VenalabsExeContent {
  instructions: TranslatedContent;
  checkerId?: string;
  checkerName?: TranslatedText;
  checkerType?: VenalabsCheckerType;
  checkerDescription?: TranslatedText;
  checkerLinkedConfig?: VenalabsLinkedConfig;
  checkerBalanceConfig?: VenalabsBalanceConfig;
  checkerTransactionConfig?: VenalabsTransactionConfig;
  checkerNftMintConfig?: VenalabsNftMintConfig;
}

export interface VenalabsRewardContent {
  rewards: VenalabsStepReward[];
}

export interface VenalabsCourseStep {
  id: string;
  title: TranslatedText;
  type: VenalabsStepType;
  order: number;
  textContent?: VenalabsTextContent;
  videoContent?: VenalabsVideoContent;
  quizContent?: VenalabsQuizContent;
  exeContent?: VenalabsExeContent;
  rewardContent?: VenalabsRewardContent;
}

export interface VenalabsCourse {
  id: string;
  organizationId: string;
  title: TranslatedText;
  description?: TranslatedText;
  imageUrl?: TranslatedText;
  steps: VenalabsCourseStep[];
  status: VenalabsCourseStatus;
  createdOn: string;
  updatedOn?: string;
}

// Checker Types
export type VenalabsCheckerType = 'LINKED' | 'BALANCE' | 'TRANSACTION' | 'NFT_MINT';

export interface VenalabsLinkedConfig {
  network: string;
}

export interface VenalabsBalanceConfig {
  network: string;
  tokenCode: string;
  tokenIssuer?: string;
  contractAddress?: string;
  minBalance?: string;
  maxBalance?: string;
}

export interface VenalabsTransactionConfig {
  network: string;
  destinationAddress?: string;
  tokenCode?: string;
  tokenIssuer?: string;
  minAmount?: string;
  memoType?: string;
  memoValue?: string;
  contractAddress?: string;
  functionName?: string;
}

export interface VenalabsNftMintConfig {
  network: string;
  slug?: string;
  name?: string;
  contractAddress?: string;
}

export interface VenalabsChecker {
  id: string;
  organizationId: string;
  name: TranslatedText;
  description?: TranslatedText;
  type: VenalabsCheckerType;
  linkedConfig?: VenalabsLinkedConfig;
  balanceConfig?: VenalabsBalanceConfig;
  transactionConfig?: VenalabsTransactionConfig;
  nftMintConfig?: VenalabsNftMintConfig;
  status: string;
  createdOn: string;
  updatedOn?: string;
}

// Map Types
export type VenalabsMapStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type VenalabsConnectionSide = 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';

export interface VenalabsMapNode {
  id: string;
  courseId: string;
  courseName?: TranslatedText;
  courseImageUrl?: TranslatedText;
  courseRewards?: VenalabsStepReward[];
  totalSteps?: number;
  x: number;
  y: number;
}

export interface VenalabsMapConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  required: boolean;
  fromSide?: VenalabsConnectionSide;
  toSide?: VenalabsConnectionSide;
}

export interface VenalabsMap {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  nodes: VenalabsMapNode[];
  connections: VenalabsMapConnection[];
  status: VenalabsMapStatus;
  createdOn: string;
  updatedOn?: string;
}

// Progress Types
export type VenalabsProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface VenalabsStepProgress {
  stepId: string;
  stepTitle?: TranslatedText;
  status: VenalabsProgressStatus;
  completedOn?: string;
  response?: unknown;
  correctAnswer?: number;
}

export interface VenalabsProgress {
  id: string;
  organizationId: string;
  externalUserId: string;
  courseId: string;
  courseName?: TranslatedText;
  courseImageUrl?: string;
  status: VenalabsProgressStatus;
  stepProgress: VenalabsStepProgress[];
  startedOn?: string;
  completedOn?: string;
  lastActivityOn?: string;
}

// Verification Types
export interface VenalabsVerificationResponse {
  checkerId: string;
  checkerName: TranslatedText;
  type: VenalabsCheckerType;
  passed: boolean;
  message: string;
  details?: Record<string, string>;
}

// Action Error
export type ActionError = {
  error: {
    code: number;
    type: string;
  };
};

export function isActionError(response: unknown): response is ActionError {
  return (
    response !== null &&
    typeof response === 'object' &&
    'error' in response
  );
}

// Course Card Status (for UI)
export type CourseCardStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';

// API Types
export * from './api';
