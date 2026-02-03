/**
 * CourseDetailView component for venalabs-stellar-sdk
 * Displays course details with steps list
 * Adapted from SaasUserCourseDetailCore.tsx - removes Next.js dependencies
 */

import { useState } from 'react';
import { Check, Play, Lock, Gift, Loader2 } from 'lucide-react';
import { useTranslation } from '../../i18n';
import type {
  VenalabsCourse,
  VenalabsProgress,
  VenalabsCourseStep,
} from '../../types';
import { getLocalizedText } from '../../types';
import {
  GlassCard,
  GlassButton,
  GlassDivider,
  GlassSection,
  BackButton,
  Title,
  MutedText,
  SuccessText,
  IconContainer,
  EmptyState,
  LoadingSmooth,
} from '../ui/GlassCard';
import { RewardsSection } from '../ui/CourseCard';

// Utility function for class names
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

type StepStatus = 'completed' | 'current' | 'locked';

interface CourseDetailViewProps {
  course?: VenalabsCourse | null;
  progress?: VenalabsProgress | null;
  loading?: boolean;
  onBack?: () => void;
  onStepClick?: (step: VenalabsCourseStep) => void;
  onStartCourse?: () => Promise<void>;
  onContinueCourse?: () => void;
}

export function CourseDetailView({
  course,
  progress,
  loading = false,
  onBack,
  onStepClick,
  onStartCourse,
  onContinueCourse,
}: CourseDetailViewProps) {
  const { t, locale } = useTranslation();
  const [startingCourse, setStartingCourse] = useState(false);

  const handleStartCourse = async () => {
    if (!onStartCourse) return;
    setStartingCourse(true);
    try {
      await onStartCourse();
    } finally {
      setStartingCourse(false);
    }
  };

  const getStepStatus = (step: VenalabsCourseStep): StepStatus => {
    if (!progress) return 'locked';

    const stepProgress = progress.stepProgress?.find((sp) => sp.stepId === step.id);
    if (stepProgress?.status === 'COMPLETED') return 'completed';

    // Check if it's the current step
    const sortedSteps = [...(course?.steps || [])].sort((a, b) => a.order - b.order);
    const stepIndex = sortedSteps.findIndex((s) => s.id === step.id);

    if (stepIndex === 0) return 'current';

    const prevStep = sortedSteps[stepIndex - 1];
    if (!prevStep) return 'locked';
    const prevStepProgress = progress.stepProgress?.find((sp) => sp.stepId === prevStep.id);
    if (prevStepProgress?.status === 'COMPLETED') return 'current';

    return 'locked';
  };

  const handleStepClick = (step: VenalabsCourseStep) => {
    const status = getStepStatus(step);
    if (status === 'locked') return;

    // If no progress yet and clicking first step, start course
    if (!progress && onStartCourse) {
      handleStartCourse();
      return;
    }

    onStepClick?.(step);
  };

  const completedSteps =
    progress?.stepProgress?.filter((sp) => sp.status === 'COMPLETED').length || 0;

  const sortedSteps = [...(course?.steps || [])].sort((a, b) => a.order - b.order);

  if (loading) {
    return (
      <div className="venalabs-course-detail venalabs-loading-container">
        <LoadingSmooth />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="venalabs-course-detail">
        <EmptyState emoji="😕" title={t('courses.notFound')}>
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
    <div className="venalabs-course-detail">
      {/* Header */}
      <GlassCard>
        <div className="venalabs-course-detail__header">
          <div className="venalabs-course-detail__header-row">
            {onBack && <BackButton onClick={onBack} />}
            <Title className="venalabs-flex-1">
              {getLocalizedText(course.title, locale)}
            </Title>

            {/* Completed badge */}
            {progress?.status === 'COMPLETED' && (
              <div className="venalabs-completed-badge">
                <Check className="venalabs-icon-md venalabs-text-success" />
                <SuccessText>{t('courses.completed')}</SuccessText>
              </div>
            )}

            {/* Action button */}
            {progress?.status !== 'COMPLETED' && (
              <div className="venalabs-course-detail__action">
                {!progress || progress.status === 'NOT_STARTED' ? (
                  <GlassButton
                    variant="primary"
                    onClick={handleStartCourse}
                    disabled={startingCourse}
                  >
                    {startingCourse && (
                      <Loader2 className="venalabs-icon-sm venalabs-animate-spin" />
                    )}
                    <Play className="venalabs-icon-sm" />
                    {t('button.start')}
                  </GlassButton>
                ) : (
                  <GlassButton variant="primary" onClick={onContinueCourse}>
                    <Play className="venalabs-icon-sm" />
                    {t('button.continue')}
                  </GlassButton>
                )}
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="venalabs-course-progress">
            <div className="venalabs-course-progress__bar">
              {sortedSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    'venalabs-course-progress__segment',
                    index < completedSteps
                      ? 'venalabs-course-progress__segment--completed'
                      : 'venalabs-course-progress__segment--empty'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Course image and description */}
          <div className="venalabs-course-detail__content">
            {getLocalizedText(course.imageUrl, locale) && (
              <div className="venalabs-course-detail__image-container">
                <img
                  src={getLocalizedText(course.imageUrl, locale)}
                  alt={getLocalizedText(course.title, locale)}
                  className="venalabs-course-detail__image"
                />
              </div>
            )}

            {course.description && (
              <div className="venalabs-course-detail__description">
                <MutedText>{getLocalizedText(course.description, locale)}</MutedText>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      <GlassDivider />

      {/* Steps list */}
      <GlassSection title={t('courses.steps')}>
        <div className="venalabs-steps-list">
          {sortedSteps.map((step, index) => {
            const status = getStepStatus(step);
            const isClickable = status !== 'locked';

            return (
              <button
                key={step.id}
                onClick={() => isClickable && handleStepClick(step)}
                disabled={!isClickable}
                className={cn(
                  'venalabs-step-item',
                  isClickable && 'venalabs-step-item--clickable',
                  !isClickable && 'venalabs-step-item--locked'
                )}
              >
                {/* Step icon */}
                <IconContainer
                  status={
                    status === 'completed'
                      ? 'success'
                      : status === 'current'
                      ? 'primary'
                      : 'locked'
                  }
                >
                  {status === 'completed' ? (
                    <Check className="venalabs-icon-md" />
                  ) : status === 'current' ? (
                    <Play className="venalabs-icon-md" />
                  ) : (
                    <Lock className="venalabs-icon-sm" />
                  )}
                </IconContainer>

                {/* Step info */}
                <div className="venalabs-step-item__info">
                  <div className="venalabs-step-item__meta">
                    <MutedText className="venalabs-step-item__number">
                      {t('courses.step')} {index + 1}
                    </MutedText>
                    {step.type === 'REWARD' ? (
                      <Gift className="venalabs-icon-sm venalabs-text-primary" />
                    ) : (
                      <span className="venalabs-step-item__type">{step.type}</span>
                    )}
                  </div>
                  <div className="venalabs-step-item__title-row">
                    <h3 className="venalabs-step-item__title">
                      {getLocalizedText(step.title, locale)}
                    </h3>
                    {step.rewardContent?.rewards && step.rewardContent.rewards.length > 0 && (
                      <RewardsSection rewards={step.rewardContent.rewards} locale={locale} />
                    )}
                  </div>
                </div>

                {/* Arrow */}
                {isClickable && <MutedText className="venalabs-step-item__arrow">→</MutedText>}
              </button>
            );
          })}
        </div>
      </GlassSection>
    </div>
  );
}

export default CourseDetailView;
