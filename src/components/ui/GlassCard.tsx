/**
 * GlassUI components for venalabs-stellar-sdk
 * Adapted from SaasGlassCard.tsx - removes Next.js dependencies
 */

import React, { HTMLAttributes, forwardRef, useState, useEffect } from 'react';
import { ArrowLeft, Loader2, LoaderCircle, Check, X } from 'lucide-react';

// Utility function for class names (replaces cn from @/lib/utils)
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ============================================
// GLASS CARD COMPONENT
// ============================================

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'strong';
  noPadding?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, variant = 'default', noPadding = false, ...props }, ref) => {
    const variantStyles = {
      default: 'venalabs-glass-card venalabs-glass-card--default',
      subtle: 'venalabs-glass-card venalabs-glass-card--subtle',
      strong: 'venalabs-glass-card venalabs-glass-card--strong',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'venalabs-rounded-2xl venalabs-transition-all',
          variantStyles[variant],
          !noPadding && 'venalabs-p-6',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

// ============================================
// GLASS BUTTON COMPONENT
// ============================================

interface GlassButtonProps extends HTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ children, className, variant = 'primary', disabled = false, ...props }, ref) => {
    const variantStyles = {
      primary: 'venalabs-btn venalabs-btn--primary',
      secondary: 'venalabs-btn venalabs-btn--secondary',
      ghost: 'venalabs-btn venalabs-btn--ghost',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'venalabs-btn-base',
          variantStyles[variant],
          disabled && 'venalabs-btn--disabled',
          className
        )}
        {...props}
      >
        <div className="venalabs-flex venalabs-justify-center venalabs-whitespace-nowrap venalabs-gap-2 venalabs-items-center">
          {children}
        </div>
      </button>
    );
  }
);

GlassButton.displayName = 'GlassButton';

// ============================================
// GLASS SECTION COMPONENT
// ============================================

interface GlassSectionProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function GlassSection({ children, title, className, ...props }: GlassSectionProps) {
  return (
    <div className={cn('venalabs-space-y-4', className)} {...props}>
      {title && <h2 className="venalabs-section-title">{title}</h2>}
      {children}
    </div>
  );
}

// ============================================
// GLASS BADGE COMPONENT
// ============================================

interface GlassBadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export function GlassBadge({ children, className, variant = 'default' }: GlassBadgeProps) {
  const variantStyles = {
    default: 'venalabs-badge venalabs-badge--default',
    success: 'venalabs-badge venalabs-badge--success',
    warning: 'venalabs-badge venalabs-badge--warning',
    error: 'venalabs-badge venalabs-badge--error',
  };

  return (
    <span className={cn(variantStyles[variant], className)}>
      {children}
    </span>
  );
}

// ============================================
// GLASS DIVIDER
// ============================================

export function GlassDivider({ className }: { className?: string }) {
  return <div className={cn('venalabs-divider', className)} />;
}

// ============================================
// TEXT COMPONENTS
// ============================================

interface TitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Title({ children, className, size = 'lg', ...props }: TitleProps) {
  const sizeStyles = {
    sm: 'venalabs-text-base',
    md: 'venalabs-text-lg',
    lg: 'venalabs-text-xl',
    xl: 'venalabs-text-2xl',
  };

  return (
    <h1 className={cn('venalabs-title', sizeStyles[size], className)} {...props}>
      {children}
    </h1>
  );
}

interface SubtitleProps extends HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  className?: string;
}

export function Subtitle({ children, className, ...props }: SubtitleProps) {
  return (
    <p className={cn('venalabs-subtitle', className)} {...props}>
      {children}
    </p>
  );
}

interface MutedTextProps extends HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  className?: string;
}

export function MutedText({ children, className, ...props }: MutedTextProps) {
  return (
    <span className={cn('venalabs-muted-text', className)} {...props}>
      {children}
    </span>
  );
}

interface SuccessTextProps extends HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  className?: string;
}

export function SuccessText({ children, className, ...props }: SuccessTextProps) {
  return (
    <span className={cn('venalabs-success-text', className)} {...props}>
      {children}
    </span>
  );
}

interface ErrorTextProps extends HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  className?: string;
}

export function ErrorText({ children, className, ...props }: ErrorTextProps) {
  return (
    <span className={cn('venalabs-error-text', className)} {...props}>
      {children}
    </span>
  );
}

// ============================================
// BACK BUTTON
// ============================================

interface BackButtonProps extends HTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export const BackButton = forwardRef<HTMLButtonElement, BackButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <button ref={ref} className={cn('venalabs-back-btn', className)} {...props}>
        <ArrowLeft className="venalabs-icon-md venalabs-text-muted" />
      </button>
    );
  }
);

BackButton.displayName = 'BackButton';

// ============================================
// ICON CONTAINER
// ============================================

interface IconContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  status?: 'default' | 'success' | 'primary' | 'locked' | 'error' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function IconContainer({
  children,
  status = 'default',
  size = 'md',
  className,
  ...props
}: IconContainerProps) {
  const statusStyles = {
    default: 'venalabs-icon-container--default',
    primary: 'venalabs-icon-container--primary',
    success: 'venalabs-icon-container--success',
    locked: 'venalabs-icon-container--locked',
    error: 'venalabs-icon-container--error',
    warning: 'venalabs-icon-container--warning',
  };

  const sizeStyles = {
    sm: 'venalabs-icon-container--sm',
    md: 'venalabs-icon-container--md',
    lg: 'venalabs-icon-container--lg',
  };

  return (
    <div
      className={cn('venalabs-icon-container', statusStyles[status], sizeStyles[size], className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================
// EMPTY STATE
// ============================================

interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  emoji = '📭',
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <GlassCard className={cn('venalabs-empty-state', className)}>
      <div className="venalabs-empty-state__emoji">{emoji}</div>
      <h2 className="venalabs-empty-state__title">{title}</h2>
      {description && <p className="venalabs-empty-state__description">{description}</p>}
      {children}
    </GlassCard>
  );
}

// ============================================
// CELEBRATION
// ============================================

interface CelebrationProps {
  emoji?: string;
  title?: string;
  className?: string;
  children?: React.ReactNode;
}

export function Celebration({
  emoji = '🎉',
  title = 'Congratulations!',
  className,
  children,
}: CelebrationProps) {
  return (
    <div className={cn('venalabs-celebration', className)}>
      <div className="venalabs-celebration__emoji">{emoji}</div>
      <h3 className="venalabs-celebration__title">{title}</h3>
      {children}
    </div>
  );
}

// ============================================
// REWARD BADGE
// ============================================

interface RewardBadgeProps extends HTMLAttributes<HTMLDivElement> {
  amount: number;
  name?: string;
  iconUrl?: string;
  className?: string;
}

export function RewardBadge({ amount, name, iconUrl, className, ...props }: RewardBadgeProps) {
  return (
    <div className={cn('venalabs-reward-badge', className)} {...props}>
      {iconUrl ? (
        <img src={iconUrl} alt={name || 'Reward'} className="venalabs-reward-badge__icon" />
      ) : (
        <div className="venalabs-reward-badge__icon-placeholder">
          <span>🎁</span>
        </div>
      )}
      <span className="venalabs-reward-badge__amount">+{amount}</span>
      {name && <span className="venalabs-reward-badge__name">{name}</span>}
    </div>
  );
}

// ============================================
// QUIZ OPTION
// ============================================

interface QuizOptionProps extends HTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  selected?: boolean;
  correct?: boolean;
  incorrect?: boolean;
  disabled?: boolean;
  imageUrl?: string;
  className?: string;
}

export const QuizOption = forwardRef<HTMLButtonElement, QuizOptionProps>(
  (
    {
      children,
      selected = false,
      correct = false,
      incorrect = false,
      disabled = false,
      imageUrl,
      className,
      ...props
    },
    ref
  ) => {
    const getStateClass = () => {
      if (correct) return 'venalabs-quiz-option--correct';
      if (incorrect) return 'venalabs-quiz-option--incorrect';
      if (selected) return 'venalabs-quiz-option--selected';
      return '';
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'venalabs-quiz-option',
          getStateClass(),
          disabled && 'venalabs-quiz-option--disabled',
          className
        )}
        {...props}
      >
        {imageUrl && <img src={imageUrl} alt="" className="venalabs-quiz-option__image" />}
        <span className="venalabs-quiz-option__text">{children}</span>
        {correct && <Check className="venalabs-icon-sm venalabs-text-success" />}
        {incorrect && <X className="venalabs-icon-sm venalabs-text-error" />}
      </button>
    );
  }
);

QuizOption.displayName = 'QuizOption';

// ============================================
// LOADING COMPONENTS
// ============================================

interface LoadingProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Loading({ className, size = 'md' }: LoadingProps) {
  const sizeStyles = {
    sm: 'venalabs-loading--sm',
    md: 'venalabs-loading--md',
    lg: 'venalabs-loading--lg',
  };

  return <Loader2 className={cn('venalabs-loading', sizeStyles[size], className)} />;
}

export function LoadingPage({ className }: { className?: string }) {
  return (
    <div className={cn('venalabs-loading-page', className)}>
      <Loading size="lg" />
    </div>
  );
}

interface LoadingSmoothProps {
  className?: string;
  size?: number;
}

export function LoadingSmooth({ className, size = 50 }: LoadingSmoothProps) {
  return (
    <div className={cn('venalabs-loading-smooth', className)}>
      <LoaderCircle
        strokeWidth={1}
        className="venalabs-loading-smooth__icon"
        width={size}
        height={size}
      />
    </div>
  );
}

// ============================================
// IMAGE VIEW
// ============================================

interface ImageViewProps {
  url: string;
  alt?: string;
  className?: string;
}

export function ImageView({ url, alt = 'Image', className }: ImageViewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [url]);

  return (
    <div className={cn('venalabs-image-view', !imageLoaded && 'venalabs-image-view--loading', className)}>
      <img
        className={cn('venalabs-image-view__img', imageLoaded && 'venalabs-image-view__img--loaded')}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        loading="lazy"
        src={url || ''}
        alt={alt}
      />
      {!imageLoaded && !imageError && (
        <div className="venalabs-image-view__loader">
          <LoadingSmooth size={40} />
        </div>
      )}
      {!imageLoaded && imageError && (
        <div className="venalabs-image-view__error">Failed to load image</div>
      )}
    </div>
  );
}

// ============================================
// PROGRESS BAR
// ============================================

interface ProgressBarProps {
  value: number;
  className?: string;
  variant?: 'primary' | 'success' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  value,
  className,
  variant = 'primary',
  size = 'md',
}: ProgressBarProps) {
  const variantStyles = {
    primary: 'venalabs-progress-bar__fill--primary',
    success: 'venalabs-progress-bar__fill--success',
    secondary: 'venalabs-progress-bar__fill--secondary',
  };

  const sizeStyles = {
    sm: 'venalabs-progress-bar--sm',
    md: 'venalabs-progress-bar--md',
    lg: 'venalabs-progress-bar--lg',
  };

  return (
    <div className={cn('venalabs-progress-bar', sizeStyles[size], className)}>
      <div className="venalabs-progress-bar__track">
        <div
          className={cn('venalabs-progress-bar__fill', variantStyles[variant])}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
