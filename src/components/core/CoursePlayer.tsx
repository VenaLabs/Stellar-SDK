/**
 * CoursePlayer component for venalabs-stellar-sdk
 * Plays through course steps in sequence (preview mode)
 * Adapted from SaasCoursePlayer.tsx - removes Next.js dependencies
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import type {
  VenalabsCourse,
  VenalabsProgress,
  VenalabsStepProgress,
} from '../../types';
import { getLocalizedText } from '../../types';
import {
  GlassButton,
  BackButton,
  LoadingPage,
  EmptyState,
} from '../ui/GlassCard';
import { StepContent } from '../ui/StepContent';

// Utility function for class names
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface CoursePlayerProps {
  course?: VenalabsCourse | null;
  progress?: VenalabsProgress | null;
  loading?: boolean;
  onBack?: () => void;
  onStartCourse?: () => Promise<VenalabsProgress | undefined>;
  onCompleteStep?: (stepId: string, response?: unknown) => Promise<VenalabsProgress | undefined>;
}

export function CoursePlayer({
  course,
  progress,
  loading = false,
  onBack,
  onStartCourse,
  onCompleteStep,
}: CoursePlayerProps) {
  const { t, locale } = useTranslation();
  const [currentProgress, setCurrentProgress] = useState<VenalabsProgress | null>(
    progress || null
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    if (!course || !progress?.stepProgress) return 0;
    const sortedSteps = [...course.steps].sort((a, b) => a.order - b.order);
    const firstIncomplete = sortedSteps.findIndex((step) => {
      const stepProg = progress.stepProgress.find((sp) => sp.stepId === step.id);
      return !stepProg || stepProg.status !== 'COMPLETED';
    });
    return firstIncomplete >= 0 ? firstIncomplete : 0;
  });
  const [completing, setCompleting] = useState(false);

  // Update progress when prop changes
  useEffect(() => {
    if (progress) {
      setCurrentProgress(progress);
    }
  }, [progress]);

  const getStepProgress = useCallback(
    (stepId: string): VenalabsStepProgress | undefined => {
      return currentProgress?.stepProgress?.find((sp) => sp.stepId === stepId);
    },
    [currentProgress]
  );

  const isStepCompleted = useCallback(
    (stepId: string): boolean => {
      return getStepProgress(stepId)?.status === 'COMPLETED';
    },
    [getStepProgress]
  );

  const handleStartCourse = async () => {
    if (!onStartCourse) return;
    setCompleting(true);
    try {
      const result = await onStartCourse();
      if (result) {
        setCurrentProgress(result);
      }
    } finally {
      setCompleting(false);
    }
  };

  const handleCompleteStep = async (response?: unknown) => {
    if (!course || !onCompleteStep) return;

    const sortedSteps = [...course.steps].sort((a, b) => a.order - b.order);
    const step = sortedSteps[currentStepIndex];
    if (!step) return;
    setCompleting(true);

    try {
      const result = await onCompleteStep(step.id, response);
      if (result) {
        setCurrentProgress(result);

        // Move to next step
        if (currentStepIndex < sortedSteps.length - 1) {
          setCurrentStepIndex(currentStepIndex + 1);
        }
      }
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return <LoadingPage className="venalabs-h-96" />;
  }

  if (!course) {
    return <EmptyState emoji="📚" title={t('courses.notFound')} />;
  }

  const sortedSteps = [...course.steps].sort((a, b) => a.order - b.order);
  const currentStep = sortedSteps[currentStepIndex];
  const stepCompleted = currentStep && isStepCompleted(currentStep.id);

  // Course not started yet
  if (!currentProgress || currentProgress.status === 'NOT_STARTED') {
    return (
      <div className="venalabs-course-player venalabs-course-player--not-started">
        {onBack && (
          <div className="venalabs-course-player__nav">
            <BackButton onClick={onBack} />
            <span className="venalabs-text-muted">← {t('courses.backToMap')}</span>
          </div>
        )}

        <div className="venalabs-course-intro">
          {getLocalizedText(course.imageUrl, locale) && (
            <img
              src={getLocalizedText(course.imageUrl, locale)}
              alt={getLocalizedText(course.title, locale)}
              className="venalabs-course-intro__image"
            />
          )}
          <h1 className="venalabs-course-intro__title">
            {getLocalizedText(course.title, locale)}
          </h1>
          {course.description && (
            <p className="venalabs-course-intro__description">
              {getLocalizedText(course.description, locale)}
            </p>
          )}
          <div className="venalabs-course-intro__meta">
            <span>
              {sortedSteps.length} {t('courses.steps').toLowerCase()}
            </span>
          </div>
          <GlassButton
            variant="primary"
            onClick={handleStartCourse}
            disabled={completing}
          >
            {completing ? t('courses.starting') : t('courses.startCourse')}
          </GlassButton>
        </div>
      </div>
    );
  }

  const completedCount =
    currentProgress?.stepProgress?.filter((s) => s.status === 'COMPLETED').length ?? 0;

  return (
    <div className="venalabs-course-player">
      {/* Header */}
      <div className="venalabs-course-player__header">
        {onBack && (
          <div className="venalabs-course-player__nav">
            <BackButton onClick={onBack} />
            <span className="venalabs-text-muted">← {t('courses.backToMap')}</span>
          </div>
        )}
        <div className="venalabs-course-player__progress-text">
          {completedCount} / {sortedSteps.length} {t('courses.completed').toLowerCase()}
        </div>
      </div>

      {/* Progress bar */}
      <div className="venalabs-progress-bar venalabs-progress-bar--player">
        <div
          className="venalabs-progress-bar__fill venalabs-progress-bar__fill--primary"
          style={{
            width: `${(completedCount / sortedSteps.length) * 100}%`,
          }}
        />
      </div>

      {/* Step navigation dots */}
      <div className="venalabs-step-dots">
        {sortedSteps.map((step, index) => {
          const completed = isStepCompleted(step.id);
          const isCurrent = index === currentStepIndex;

          return (
            <button
              key={step.id}
              onClick={() => setCurrentStepIndex(index)}
              className={cn(
                'venalabs-step-dot',
                completed && 'venalabs-step-dot--completed',
                isCurrent && 'venalabs-step-dot--current'
              )}
            >
              {completed ? '✓' : index + 1}
            </button>
          );
        })}
      </div>

      {/* Current step */}
      {currentStep && (
        <div className="venalabs-step-container">
          <div className="venalabs-step-header">
            <span className="venalabs-step-header__icon">
              {currentStep.type === 'TEXT' && '📖'}
              {currentStep.type === 'VIDEO' && '🎬'}
              {currentStep.type === 'QUIZ' && '❓'}
              {currentStep.type === 'EXE' && '⚡'}
              {currentStep.type === 'REWARD' && '🎁'}
            </span>
            <h2 className="venalabs-step-header__title">
              {getLocalizedText(currentStep.title, locale)}
            </h2>
            {stepCompleted && (
              <span className="venalabs-step-header__completed">
                {t('courses.completed')}
              </span>
            )}
          </div>

          {/* Step content */}
          <StepContent
            step={currentStep}
            onComplete={handleCompleteStep}
            isCompleted={stepCompleted ?? false}
            locale={locale}
          />

          {/* Navigation */}
          {stepCompleted && currentStepIndex < sortedSteps.length - 1 && (
            <div className="venalabs-step-nav">
              <GlassButton
                variant="primary"
                onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
              >
                {t('courses.nextStep')} →
              </GlassButton>
            </div>
          )}

          {/* Course completed */}
          {currentProgress.status === 'COMPLETED' && (
            <div className="venalabs-course-completed">
              <div className="venalabs-course-completed__emoji">🎉</div>
              <p className="venalabs-course-completed__text">
                {t('courses.courseCompleted')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CoursePlayer;
