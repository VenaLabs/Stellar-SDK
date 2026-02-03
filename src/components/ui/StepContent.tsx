/**
 * Step Content component for venalabs-stellar-sdk
 * Adapted from SaasUserStepContent.tsx - removes Next.js dependencies
 */

import { useState, ReactNode } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useTranslation } from '../../i18n';
import type {
  VenalabsCourseStep,
  VenalabsQuizOption,
  VenalabsChecker,
  TranslatedText,
} from '../../types';
import { getLocalizedContent, getLocalizedText } from '../../types';
import {
  GlassButton,
  Celebration,
  MutedText,
  RewardBadge,
  QuizOption,
  Title,
  ImageView,
} from './GlassCard';
import { CheckerVerification } from './CheckerVerification';
import type { VenalabsApiClient } from '../../api';

// Utility function for class names
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface StepContentProps {
  step: VenalabsCourseStep;
  onComplete: (response?: unknown) => void;
  isCompleted: boolean;
  locale?: string;
  /** API client instance for wallet/verification operations */
  apiClient?: VenalabsApiClient;
  /** Course ID for verification */
  courseId?: string;
  /** Step ID for verification */
  stepId?: string;
  /** Checker configuration from step */
  checker?: VenalabsChecker | null;
  /** Currently linked wallet address */
  linkedWalletAddress?: string;
  /** Callback when wallet is linked */
  onWalletLinked?: (address: string, network: string) => void;
}

export function StepContent({
  step,
  onComplete,
  isCompleted,
  locale = 'en',
  apiClient,
  courseId,
  stepId,
  checker,
  linkedWalletAddress,
  onWalletLinked,
}: StepContentProps) {
  const { t } = useTranslation();

  switch (step.type) {
    case 'TEXT':
      return (
        <TextStepContent
          content={getLocalizedContent(step.textContent?.content, locale) as unknown[]}
          onComplete={onComplete}
          isCompleted={isCompleted}
        />
      );
    case 'VIDEO':
      return (
        <VideoStepContent
          videoUrl={step.videoContent?.videoUrl || ''}
          transcript={step.videoContent?.transcript || ''}
          onComplete={onComplete}
          isCompleted={isCompleted}
        />
      );
    case 'QUIZ':
      return (
        <QuizStepContent
          question={getLocalizedText(step.quizContent?.question, locale)}
          options={step.quizContent?.options || []}
          correctOptionIndex={step.quizContent?.correctOptionIndex || 0}
          explanation={getLocalizedText(step.quizContent?.explanation, locale)}
          onComplete={onComplete}
          isCompleted={isCompleted}
          locale={locale}
        />
      );
    case 'EXE':
      return (
        <ExeStepContent
          instructions={getLocalizedContent(step.exeContent?.instructions, locale) as unknown[]}
          onComplete={onComplete}
          isCompleted={isCompleted}
          apiClient={apiClient}
          courseId={courseId}
          stepId={stepId}
          checker={checker}
          linkedWalletAddress={linkedWalletAddress}
          onWalletLinked={onWalletLinked}
        />
      );
    case 'REWARD':
      return (
        <RewardStepContent
          rewards={step.rewardContent?.rewards || []}
          onComplete={onComplete}
          isCompleted={isCompleted}
          locale={locale}
        />
      );
    default:
      return (
        <div className="venalabs-text-muted">
          {t('stepContent.unknownStepType')}
          {step.type}
        </div>
      );
  }
}

// ============================================
// BLOCK NOTE RENDERER (for TEXT/EXE content)
// ============================================

interface BlockItem {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: InlineItem[];
  children?: BlockItem[];
}

interface InlineItem {
  type: string;
  text?: string;
  href?: string;
  styles?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    code?: boolean;
  };
  content?: InlineItem[];
}

function BlockContentView({
  blocks,
  noContentText,
}: {
  blocks: unknown[];
  noContentText?: string;
}) {
  if (!blocks || blocks.length === 0) {
    return <div className="venalabs-text-muted">{noContentText || 'No content'}</div>;
  }

  return (
    <div className="venalabs-block-content">
      {(blocks as BlockItem[]).map((block, index) => (
        <BlockRenderer key={block.id || index} block={block} />
      ))}
    </div>
  );
}

function BlockRenderer({ block, depth = 0 }: { block: BlockItem; depth?: number }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className="venalabs-paragraph">
          {block.content?.map((item, i) => (
            <InlineRenderer key={i} item={item} />
          ))}
        </p>
      );

    case 'heading':
      const level = (block.props?.level as number) || 3;
      const HeadingTag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
      const headingClass =
        level === 1
          ? 'venalabs-heading-1'
          : level === 2
          ? 'venalabs-heading-2'
          : 'venalabs-heading-3';
      return (
        <HeadingTag className={headingClass}>
          {block.content?.map((item, i) => (
            <InlineRenderer key={i} item={item} />
          ))}
        </HeadingTag>
      );

    case 'bulletListItem':
      return (
        <div className="venalabs-list-item" style={{ paddingLeft: `${depth * 1.5}rem` }}>
          <div className="venalabs-list-item__row">
            <span className="venalabs-list-item__bullet">
              {depth === 0 ? '•' : depth === 1 ? '◦' : '▪'}
            </span>
            <span className="venalabs-list-item__text">
              {block.content?.map((item, i) => (
                <InlineRenderer key={i} item={item} />
              ))}
            </span>
          </div>
          {block.children?.map((child, i) => (
            <BlockRenderer key={i} block={child} depth={depth + 1} />
          ))}
        </div>
      );

    case 'numberedListItem':
      return (
        <div className="venalabs-list-item" style={{ paddingLeft: `${depth * 1.5}rem` }}>
          <div className="venalabs-list-item__row">
            <span className="venalabs-list-item__bullet">1.</span>
            <span className="venalabs-list-item__text">
              {block.content?.map((item, i) => (
                <InlineRenderer key={i} item={item} />
              ))}
            </span>
          </div>
          {block.children?.map((child, i) => (
            <BlockRenderer key={i} block={child} depth={depth + 1} />
          ))}
        </div>
      );

    case 'checkListItem':
      return (
        <div className="venalabs-checklist-item">
          <input
            type="checkbox"
            checked={block.props?.checked as boolean}
            readOnly
            className="venalabs-checklist-item__checkbox"
          />
          <span className="venalabs-checklist-item__text">
            {block.content?.map((item, i) => (
              <InlineRenderer key={i} item={item} />
            ))}
          </span>
        </div>
      );

    case 'codeBlock':
      return (
        <pre className="venalabs-code-block">
          <code>
            {block.content?.map((item, i) => (
              <InlineRenderer key={i} item={item} />
            ))}
          </code>
        </pre>
      );

    case 'image':
      return (
        <div className="venalabs-image-block">
          <ImageView
            url={block.props?.url as string}
            alt={(block.props?.caption as string) || 'Image'}
          />
        </div>
      );

    default:
      return null;
  }
}

function InlineRenderer({ item }: { item: InlineItem }): ReactNode {
  if (item.type === 'text') {
    let content: ReactNode = item.text;

    if (item.styles?.bold) {
      content = <strong>{content}</strong>;
    }
    if (item.styles?.italic) {
      content = <em>{content}</em>;
    }
    if (item.styles?.underline) {
      content = <u>{content}</u>;
    }
    if (item.styles?.strike) {
      content = <s>{content}</s>;
    }
    if (item.styles?.code) {
      content = <code className="venalabs-inline-code">{content}</code>;
    }

    return <span>{content}</span>;
  }

  if (item.type === 'link') {
    return (
      <a
        href={item.href || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="venalabs-link"
      >
        {item.content?.map((child, i) => (
          <InlineRenderer key={i} item={child} />
        ))}
      </a>
    );
  }

  return null;
}

// ============================================
// TEXT STEP
// ============================================

function TextStepContent({
  content,
  onComplete,
  isCompleted,
}: {
  content: unknown[];
  onComplete: () => void;
  isCompleted: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="venalabs-step-content">
      <BlockContentView blocks={content} noContentText={t('stepContent.noContent')} />
      {!isCompleted && (
        <GlassButton variant="secondary" onClick={() => onComplete()}>
          {t('stepContent.markAsComplete')}
        </GlassButton>
      )}
    </div>
  );
}

// ============================================
// VIDEO STEP
// ============================================

function VideoStepContent({
  videoUrl,
  transcript,
  onComplete,
  isCompleted,
}: {
  videoUrl: string;
  transcript?: string;
  onComplete: () => void;
  isCompleted: boolean;
}) {
  const { t } = useTranslation();

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be')
        ? url.split('/').pop()
        : new URL(url).searchParams.get('v');
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('vimeo.com')) {
      const videoId = url.split('/').pop();
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  return (
    <div className="venalabs-step-content">
      <div className="venalabs-video-container">
        <iframe
          src={getEmbedUrl(videoUrl)}
          className="venalabs-video-iframe"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {transcript && (
        <div className="venalabs-transcript">
          <h4 className="venalabs-transcript__title">{t('stepContent.transcript')}</h4>
          <p className="venalabs-transcript__text">{transcript}</p>
        </div>
      )}

      {!isCompleted && (
        <GlassButton variant="primary" onClick={() => onComplete()}>
          {t('stepContent.markAsComplete')}
        </GlassButton>
      )}
    </div>
  );
}

// ============================================
// QUIZ STEP
// ============================================

function QuizStepContent({
  question,
  options,
  correctOptionIndex,
  explanation,
  onComplete,
  isCompleted,
  locale,
}: {
  question: string;
  options: VenalabsQuizOption[];
  correctOptionIndex: number;
  explanation?: string;
  onComplete: (response: unknown) => void;
  isCompleted: boolean;
  locale: string;
}) {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    isCompleted ? correctOptionIndex : null
  );
  const [submitted, setSubmitted] = useState(isCompleted);
  const isCorrect = selectedIndex === correctOptionIndex;

  const handleSubmit = () => {
    if (selectedIndex === null) return;
    setSubmitted(true);
    if (selectedIndex === correctOptionIndex) {
      onComplete({ selectedIndex, correct: true });
    }
  };

  const handleRetry = () => {
    setSelectedIndex(null);
    setSubmitted(false);
  };

  return (
    <div className="venalabs-step-content">
      <Title>{question}</Title>

      <div className="venalabs-quiz-options">
        {options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const showResult = submitted;
          const isCorrectOption = index === correctOptionIndex;

          return (
            <QuizOption
              key={index}
              onClick={() => !submitted && setSelectedIndex(index)}
              disabled={submitted || isCompleted}
              selected={!submitted && isSelected}
              correct={showResult && isCorrectOption && isSelected}
              incorrect={showResult && isSelected && !isCorrectOption}
              imageUrl={option.imageUrl}
              className={cn(showResult && !isSelected && !isCorrectOption && 'venalabs-opacity-50')}
            >
              {getLocalizedText(option.text, locale)}
            </QuizOption>
          );
        })}
      </div>

      {submitted && explanation && (
        <div
          className={cn(
            'venalabs-quiz-explanation',
            isCorrect ? 'venalabs-quiz-explanation--success' : 'venalabs-quiz-explanation--error'
          )}
        >
          <p>{explanation}</p>
        </div>
      )}

      {!isCompleted && !submitted && (
        <GlassButton variant="primary" onClick={handleSubmit} disabled={selectedIndex === null}>
          {t('stepContent.submitAnswer')}
        </GlassButton>
      )}

      {submitted && !isCorrect && !isCompleted && (
        <GlassButton variant="secondary" onClick={handleRetry}>
          {t('stepContent.tryAgain')}
        </GlassButton>
      )}
    </div>
  );
}

// ============================================
// EXE STEP (Execution/Verification)
// ============================================

function ExeStepContent({
  instructions,
  onComplete,
  isCompleted,
  apiClient,
  courseId,
  stepId,
  checker,
  linkedWalletAddress,
  onWalletLinked,
}: {
  instructions: unknown[];
  onComplete: () => void;
  isCompleted: boolean;
  apiClient?: VenalabsApiClient;
  courseId?: string;
  stepId?: string;
  checker?: VenalabsChecker | null;
  linkedWalletAddress?: string;
  onWalletLinked?: (address: string, network: string) => void;
}) {
  const { t, locale } = useTranslation();

  // If we have a checker and apiClient, use CheckerVerification
  if (checker && apiClient && courseId && stepId && onWalletLinked) {
    return (
      <div className="venalabs-step-content">
        <BlockContentView blocks={instructions} noContentText={t('stepContent.noContent')} />

        <CheckerVerification
          apiClient={apiClient}
          courseId={courseId}
          stepId={stepId}
          checker={checker}
          isCompleted={isCompleted}
          linkedWalletAddress={linkedWalletAddress}
          onWalletLinked={onWalletLinked}
          onVerificationSuccess={onComplete}
        />
      </div>
    );
  }

  // Fallback: simple completion button (no checker or missing props)
  return (
    <div className="venalabs-step-content">
      <BlockContentView blocks={instructions} noContentText={t('stepContent.noContent')} />

      {checker && (
        <div className="venalabs-checker-info">
          <p className="venalabs-checker-info__label">
            {t('verification.label')}{' '}
            <span className="venalabs-checker-info__name">
              {getLocalizedText(checker.name, locale)}
            </span>
          </p>
          <div className="venalabs-checker-info__badges">
            <span className="venalabs-checker-badge">{checker.type}</span>
          </div>
        </div>
      )}

      {!isCompleted && (
        <GlassButton variant="primary" onClick={() => onComplete()}>
          {t('stepContent.markAsComplete')}
        </GlassButton>
      )}

      {isCompleted && (
        <div className="venalabs-success-message">
          <Check className="venalabs-icon-md venalabs-text-success" />
          <p>{t('stepContent.stepCompleted')}</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// REWARD STEP
// ============================================

function RewardStepContent({
  rewards,
  onComplete,
  isCompleted,
  locale,
}: {
  rewards: Array<{
    rewardId: string;
    rewardName?: TranslatedText;
    rewardIconUrl?: string;
    amount: number;
  }>;
  onComplete: () => void;
  isCompleted: boolean;
  locale: string;
}) {
  const { t } = useTranslation();
  const [claiming, setClaiming] = useState(false);

  const handleClaim = () => {
    setClaiming(true);
    Promise.resolve(onComplete()).finally(() => {
      setClaiming(false);
    });
  };

  return (
    <Celebration title={t('stepContent.congratulations')}>
      <MutedText>
        {isCompleted ? t('stepContent.rewardsClaimed') : t('stepContent.rewardsEarned')}
      </MutedText>

      <div className="venalabs-rewards-grid">
        {rewards.map((reward, index) => (
          <div key={index} className="venalabs-reward-item">
            <RewardBadge
              amount={reward.amount}
              name={getLocalizedText(reward.rewardName, locale)}
              iconUrl={reward.rewardIconUrl}
            />
            {isCompleted && (
              <div className="venalabs-reward-item__check">
                <Check className="venalabs-icon-xs venalabs-text-background" />
              </div>
            )}
          </div>
        ))}
      </div>

      {!isCompleted && (
        <GlassButton variant="primary" onClick={handleClaim} disabled={claiming}>
          {claiming && <Loader2 className="venalabs-icon-sm venalabs-animate-spin" />}
          {claiming ? t('stepContent.claiming') : t('courses.claimRewards')}
        </GlassButton>
      )}
    </Celebration>
  );
}

export default StepContent;
