/**
 * CoursesView component for venalabs-stellar-sdk
 * Displays courses using the MapView
 * Adapted from SaasUserCoursesCore.tsx - removes Next.js dependencies
 */

import { useTranslation } from '../../i18n';
import type {
  VenalabsMap,
  VenalabsProgress,
  VenalabsMapNode,
} from '../../types';
import { MapView } from './MapView';
import { LoadingSmooth, EmptyState } from '../ui/GlassCard';

interface CoursesViewProps {
  maps?: VenalabsMap[];
  progress?: VenalabsProgress[];
  loading?: boolean;
  onNodeClick?: (node: VenalabsMapNode) => void;
  onMapSelect?: (map: VenalabsMap) => void;
  requiresLogin?: boolean;
  onLoginRequired?: () => void;
}

export function CoursesView({
  maps = [],
  progress = [],
  loading = false,
  onNodeClick,
  onMapSelect,
  requiresLogin = false,
  onLoginRequired,
}: CoursesViewProps) {
  const { t } = useTranslation();

  const handleNodeClick = (node: VenalabsMapNode) => {
    if (requiresLogin && onLoginRequired) {
      onLoginRequired();
      return;
    }
    onNodeClick?.(node);
  };

  if (loading) {
    return (
      <div className="venalabs-courses-view venalabs-loading-container">
        <LoadingSmooth />
      </div>
    );
  }

  if (maps.length === 0) {
    return (
      <div className="venalabs-courses-view venalabs-courses-view--empty">
        <EmptyState
          emoji="📚"
          title={t('courses.noCoursesAvailable')}
          description={t('courses.notPublished')}
        />
      </div>
    );
  }

  return (
    <div className="venalabs-courses-view">
      <MapView
        maps={maps}
        progress={progress}
        onNodeClick={handleNodeClick}
        onMapSelect={onMapSelect}
      />
    </div>
  );
}

export default CoursesView;
