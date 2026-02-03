/**
 * Course Card component for venalabs-stellar-sdk
 * Adapted from SaasCourseCard.tsx - removes Next.js dependencies
 */

import { Lock, Sparkles, Trophy, Zap, Gift } from 'lucide-react';
import { useTranslation } from '../../i18n';
import type { VenalabsStepReward, CourseCardStatus } from '../../types';
import { getLocalizedText } from '../../types';

// Utility function for class names
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface CourseCardProps {
  courseId: string;
  title: string;
  imageUrl?: string;
  status: CourseCardStatus;
  rewards?: VenalabsStepReward[];
  unlockCost?: number;
  stepProgress?: { completed: number; total: number };
  onClick?: () => void;
  onUnlock?: () => void;
}

// ============================================
// STATUS BADGE COMPONENT
// ============================================

const StatusBadge = ({ status }: { status: CourseCardStatus }) => {
  const { t } = useTranslation();

  const config = {
    LOCKED: {
      icon: Lock,
      label: t('courseCard.status.locked'),
      className: 'venalabs-status-badge--locked',
    },
    AVAILABLE: {
      icon: Sparkles,
      label: t('courseCard.status.available'),
      className: 'venalabs-status-badge--available',
    },
    IN_PROGRESS: {
      icon: Zap,
      label: t('courseCard.status.inProgress'),
      className: 'venalabs-status-badge--in-progress',
    },
    COMPLETED: {
      icon: Trophy,
      label: t('courseCard.status.completed'),
      className: 'venalabs-status-badge--completed',
    },
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <div className={cn('venalabs-status-badge', className)}>
      <Icon className="venalabs-icon-xs" />
      <span>{label}</span>
    </div>
  );
};

// ============================================
// REWARD PILL COMPONENT
// ============================================

const RewardPill = ({ reward, locale }: { reward: VenalabsStepReward; locale: string }) => {
  return (
    <div className="venalabs-reward-pill">
      <div className="venalabs-reward-pill__icon">
        {reward.rewardIconUrl ? (
          <img
            src={reward.rewardIconUrl}
            alt={getLocalizedText(reward.rewardName, locale) || 'reward'}
            className="venalabs-reward-pill__img"
          />
        ) : (
          <Gift className="venalabs-icon-sm venalabs-text-primary" />
        )}
      </div>
      <span className="venalabs-reward-pill__amount">+{reward.amount}</span>
    </div>
  );
};

// ============================================
// REWARDS SECTION COMPONENT
// ============================================

export const RewardsSection = ({
  rewards,
  locale,
}: {
  rewards: VenalabsStepReward[];
  locale: string;
}) => {
  if (!rewards || rewards.length === 0) return null;

  const hasMore = rewards.length >= 4;
  const displayRewards = hasMore ? rewards.slice(0, 2) : rewards;
  const remainingCount = rewards.length - 2;

  return (
    <div className="venalabs-rewards-section">
      <div className="venalabs-rewards-section__grid">
        {displayRewards.map((reward, index) => (
          <RewardPill key={reward.rewardId || index} reward={reward} locale={locale} />
        ))}
        {hasMore && (
          <div className="venalabs-reward-pill venalabs-reward-pill--more">
            <span className="venalabs-reward-pill__amount--muted">+{remainingCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// PROGRESS BAR COMPONENT
// ============================================

const SteppedProgressBar = ({
  completed,
  total,
  status,
}: {
  completed: number;
  total: number;
  status: CourseCardStatus;
}) => {
  return (
    <div className="venalabs-stepped-progress">
      <div className="venalabs-stepped-progress__bar">
        {Array.from({ length: total }, (_, index) => (
          <div
            key={index}
            className={cn(
              'venalabs-stepped-progress__segment',
              index < completed
                ? status === 'COMPLETED'
                  ? 'venalabs-stepped-progress__segment--success'
                  : 'venalabs-stepped-progress__segment--primary'
                : 'venalabs-stepped-progress__segment--empty'
            )}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================
// MAIN COURSE CARD COMPONENT
// ============================================

export function CourseCard({
  title,
  imageUrl,
  status,
  rewards,
  stepProgress,
  onClick,
  onUnlock,
}: CourseCardProps) {
  const { locale } = useTranslation();
  const isLocked = status === 'LOCKED';
  const isAvailable = status === 'AVAILABLE';
  const isInProgress = status === 'IN_PROGRESS';
  const isCompleted = status === 'COMPLETED';

  const handleClick = () => {
    if (isLocked) return;
    if (isAvailable && onUnlock) {
      onUnlock();
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'venalabs-course-card',
        isLocked && 'venalabs-course-card--locked',
        isAvailable && 'venalabs-course-card--available',
        isInProgress && 'venalabs-course-card--in-progress',
        isCompleted && 'venalabs-course-card--completed'
      )}
    >
      {/* Status Badge */}
      <StatusBadge status={status} />

      {/* Image Section with Overlay */}
      <div className="venalabs-course-card__image-container">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className="venalabs-course-card__image"
          />
        ) : (
          <div className="venalabs-course-card__image-placeholder">
            <div className="venalabs-course-card__image-emoji">📚</div>
          </div>
        )}

        {/* Locked Overlay */}
        {isLocked && <div className="venalabs-course-card__locked-overlay" />}
      </div>

      {/* Content Section */}
      <div className="venalabs-course-card__content">
        {/* Title */}
        <h3 className="venalabs-course-card__title">{title}</h3>

        {/* Progress Bar */}
        {stepProgress && stepProgress.total > 0 && (
          <div className="venalabs-course-card__progress">
            <SteppedProgressBar
              completed={stepProgress.completed}
              total={stepProgress.total}
              status={status}
            />
          </div>
        )}

        {/* Rewards Section */}
        {rewards && rewards.length > 0 && (
          <div className="venalabs-course-card__rewards">
            <RewardsSection rewards={rewards} locale={locale} />
          </div>
        )}
      </div>
    </div>
  );
}

export default CourseCard;
