/**
 * StepView component for venalabs-stellar-sdk
 * Individual step view with navigation
 * Adapted from SaasUserStepCore.tsx - removes Next.js dependencies
 */

import { useState, useMemo, useEffect } from 'react';
import { Check, ChevronLeft, ChevronRight, Gift } from 'lucide-react';
import { useTranslation } from '../../i18n';
import type {
  VenalabsCourse,
  VenalabsProgress,
  VenalabsChecker,
} from '../../types';
import { getLocalizedText } from '../../types';
import {
  GlassCard,
  GlassButton,
  GlassDivider,
  BackButton,
  Title,
  Subtitle,
  MutedText,
  EmptyState,
  LoadingSmooth,
} from '../ui/GlassCard';
import { StepContent } from '../ui/StepContent';
import type { VenalabsApiClient } from '../../api';

// Utility function for class names
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface StepViewProps {
  course?: VenalabsCourse | null;
  stepId?: string;
  progress?: VenalabsProgress | null;
  loading?: boolean;
  /** API client for wallet/verification operations */
  apiClient?: VenalabsApiClient;
  /** Linked wallet address for verification */
  linkedWalletAddress?: string;
  /** Callback when wallet is linked */
  onWalletLinked?: (address: string, network: string) => void;
  onBack?: () => void;
  onStepChange?: (stepId: string) => void;
  onComplete?: (stepId: string, response?: unknown) => Promise<VenalabsProgress | undefined>;
  /** Callback when user finishes the course (clicks "Finish" on last step) */
  onFinishCourse?: () => void;
}

export function StepView({
  course,
  stepId,
  progress,
  loading = false,
  apiClient,
  linkedWalletAddress,
  onWalletLinked,
  onBack,
  onStepChange,
  onComplete,
  onFinishCourse,
}: StepViewProps) {
  const { t, locale } = useTranslation();
  const [currentProgress, setCurrentProgress] = useState<VenalabsProgress | null>(
    progress || null
  );

  // Update progress when prop changes
  useEffect(() => {
    if (progress) {
      setCurrentProgress(progress);
    }
  }, [progress]);

  // Get sorted steps and current step info
  const { sortedSteps, currentStep, currentStepIndex, prevStep, nextStep } = useMemo(() => {
    if (!course?.steps) {
      return {
        sortedSteps: [],
        currentStep: null,
        currentStepIndex: -1,
        prevStep: null,
        nextStep: null,
      };
    }

    const sorted = [...course.steps].sort((a, b) => a.order - b.order);
    const current = sorted.find((s) => s.id === stepId) || null;
    const index = sorted.findIndex((s) => s.id === stepId);
    const prev = index > 0 ? sorted[index - 1] : null;
    const next = index < sorted.length - 1 ? sorted[index + 1] : null;

    return {
      sortedSteps: sorted,
      currentStep: current,
      currentStepIndex: index,
      prevStep: prev,
      nextStep: next,
    };
  }, [course, stepId]);

  const stepProgress = currentProgress?.stepProgress?.find((sp) => sp.stepId === stepId);
  const isCompleted = stepProgress?.status === 'COMPLETED';

  // Get checker for current step
  const getCheckerForStep = (): VenalabsChecker | null => {
    if (!currentStep || currentStep.type !== 'EXE' || !currentStep.exeContent?.checkerType) {
      return null;
    }
    return {
      id: currentStep.exeContent.checkerId || '',
      organizationId: course?.organizationId || '',
      name: currentStep.exeContent.checkerName || {},
      description: currentStep.exeContent.checkerDescription || {},
      type: currentStep.exeContent.checkerType,
      linkedConfig: currentStep.exeContent.checkerLinkedConfig,
      balanceConfig: currentStep.exeContent.checkerBalanceConfig,
      transactionConfig: currentStep.exeContent.checkerTransactionConfig,
      nftMintConfig: currentStep.exeContent.checkerNftMintConfig,
      status: 'ACTIVE',
      createdOn: '',
    };
  };

  const handleComplete = async (response?: unknown) => {
    if (!stepId || !onComplete || isCompleted) return;

    const result = await onComplete(stepId, response);
    if (result) {
      setCurrentProgress(result);
    }
  };

  const handlePrevStep = () => {
    if (prevStep && onStepChange) {
      onStepChange(prevStep.id);
    }
  };

  const handleNextStep = () => {
    if (nextStep && onStepChange) {
      onStepChange(nextStep.id);
    } else if (onFinishCourse) {
      // Last step - finish course and go to map
      onFinishCourse();
    } else if (onBack) {
      onBack();
    }
  };

  if (loading) {
    return (
      <div className="venalabs-step-view venalabs-loading-container">
        <LoadingSmooth />
      </div>
    );
  }

  if (!course || !currentStep) {
    return (
      <div className="venalabs-step-view">
        <EmptyState emoji="😕" title="Step not found">
          {onBack && (
            <GlassButton variant="primary" onClick={onBack}>
              {t('courses.goBack')}
            </GlassButton>
          )}
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="venalabs-step-view">
      {/* Header */}
      <GlassCard>
        <div className="venalabs-step-view__header">
          {onBack && <BackButton onClick={onBack} />}
          <div className="venalabs-step-view__header-info">
            <Subtitle>{getLocalizedText(course.title, locale)}</Subtitle>
            <Title className="venalabs-step-view__title">
              {getLocalizedText(currentStep.title, locale)}
              {isCompleted && <Check className="venalabs-icon-md venalabs-text-success" />}
            </Title>
          </div>
          <MutedText className="venalabs-step-view__counter">
            {t('courses.step')} {currentStepIndex + 1} / {sortedSteps.length}
          </MutedText>
        </div>

        {/* Progress indicator */}
        <div className="venalabs-step-view__progress">
          <div className="venalabs-step-view__progress-bar">
            {sortedSteps.map((step, index) => {
              const stepProg = currentProgress?.stepProgress?.find(
                (sp) => sp.stepId === step.id
              );
              const isStepCompleted = stepProg?.status === 'COMPLETED';
              const isCurrent = index === currentStepIndex;

              return (
                <div
                  key={step.id}
                  className={cn(
                    'venalabs-step-view__progress-segment',
                    isStepCompleted && 'venalabs-step-view__progress-segment--completed',
                    isCurrent && !isStepCompleted && 'venalabs-step-view__progress-segment--current',
                    !isCurrent && !isStepCompleted && 'venalabs-step-view__progress-segment--empty'
                  )}
                />
              );
            })}
          </div>
          {/* Reward icons */}
          <div className="venalabs-step-view__rewards-row">
            {sortedSteps.map((step) => {
              const stepProg = currentProgress?.stepProgress?.find(
                (sp) => sp.stepId === step.id
              );
              const isStepCompleted = stepProg?.status === 'COMPLETED';
              const hasRewards =
                step.rewardContent?.rewards && step.rewardContent.rewards.length > 0;

              return (
                <div key={step.id} className="venalabs-step-view__reward-slot">
                  {hasRewards && (
                    <Gift
                      className={cn(
                        'venalabs-icon-sm',
                        isStepCompleted ? 'venalabs-text-primary' : 'venalabs-text-primary-muted'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </GlassCard>

      <GlassDivider />

      {/* Step content */}
      <GlassCard className="venalabs-step-view__content">
        <StepContent
          step={currentStep}
          onComplete={handleComplete}
          isCompleted={isCompleted}
          locale={locale}
          apiClient={apiClient}
          courseId={course.id}
          stepId={stepId}
          checker={getCheckerForStep()}
          linkedWalletAddress={linkedWalletAddress}
          onWalletLinked={onWalletLinked}
        />
      </GlassCard>

      {/* Navigation */}
      <div className="venalabs-step-view__nav">
        <div>
          {prevStep && (
            <GlassButton variant="secondary" onClick={handlePrevStep}>
              <ChevronLeft className="venalabs-icon-sm" />
              {t('button.previous')}
            </GlassButton>
          )}
        </div>

        <div>
          {isCompleted && (
            <GlassButton variant="primary" onClick={handleNextStep}>
              {nextStep ? (
                <>
                  {t('button.next')}
                  <ChevronRight className="venalabs-icon-sm" />
                </>
              ) : (
                t('button.finish')
              )}
            </GlassButton>
          )}
        </div>
      </div>
    </div>
  );
}

export default StepView;
