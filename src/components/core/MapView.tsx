/**
 * MapView component for venalabs-stellar-sdk
 * Displays a learning map with course nodes and connections
 * Adapted from SaasUserMapView.tsx - removes Next.js dependencies
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { Focus } from 'lucide-react';
import { useTranslation } from '../../i18n';
import type {
  VenalabsMap,
  VenalabsMapNode,
  VenalabsProgress,
  VenalabsConnectionSide,
  CourseCardStatus,
} from '../../types';
import { getLocalizedText } from '../../types';
import { CourseCard } from '../ui/CourseCard';
import { LoadingPage, EmptyState } from '../ui/GlassCard';

// LocalStorage helpers
const getLastVisitedKey = (mapId: string) => `venalabs_map_${mapId}_lastVisited`;

function getLocalStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item !== null ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
}

// Utility function for class names
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Card dimensions
const CARD_WIDTH = 264;
const CARD_HEIGHT = 260;
const GAP = 50;

export interface MapViewProps {
  maps?: VenalabsMap[];
  selectedMapId?: string;
  progress?: VenalabsProgress[];
  loading?: boolean;
  onNodeClick?: (node: VenalabsMapNode) => void;
  onMapSelect?: (map: VenalabsMap) => void;
  hideHeader?: boolean;
  hideBackground?: boolean;
  hideLegend?: boolean;
}

function getAnchorPoint(node: VenalabsMapNode, side: VenalabsConnectionSide) {
  const cardX = node.x * (CARD_WIDTH + GAP);
  const cardY = node.y * (CARD_HEIGHT + GAP);
  const centerX = cardX + CARD_WIDTH / 2;
  const centerY = cardY + CARD_HEIGHT / 2;

  switch (side) {
    case 'TOP':
      return { x: centerX, y: cardY };
    case 'BOTTOM':
      return { x: centerX, y: cardY + CARD_HEIGHT };
    case 'LEFT':
      return { x: cardX, y: centerY };
    case 'RIGHT':
      return { x: cardX + CARD_WIDTH, y: centerY };
  }
}

function getDefaultSide(
  fromNode: VenalabsMapNode,
  toNode: VenalabsMapNode,
  isFrom: boolean
): VenalabsConnectionSide {
  const dx = toNode.x - fromNode.x;
  const dy = toNode.y - fromNode.y;

  if (Math.abs(dy) >= Math.abs(dx)) {
    return isFrom ? (dy > 0 ? 'BOTTOM' : 'TOP') : dy > 0 ? 'TOP' : 'BOTTOM';
  } else {
    return isFrom ? (dx > 0 ? 'RIGHT' : 'LEFT') : dx > 0 ? 'LEFT' : 'RIGHT';
  }
}

export function MapView({
  maps = [],
  selectedMapId,
  progress = [],
  loading = false,
  onNodeClick,
  onMapSelect,
  hideHeader = false,
  hideBackground = false,
  hideLegend = false,
}: MapViewProps) {
  const { locale } = useTranslation();
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const [lastVisitedNodeId, setLastVisitedNodeId] = useState<string | null>(null);

  // Find selected map or default to first
  const selectedMap = selectedMapId ? maps.find((m) => m.id === selectedMapId) || maps[0] : maps[0];

  // Load last visited node from localStorage when map changes
  useEffect(() => {
    if (selectedMap) {
      const lastVisited = getLocalStorage<string | null>(getLastVisitedKey(selectedMap.id), null);
      setLastVisitedNodeId(lastVisited);
    }
  }, [selectedMap?.id]);

  const getNodeProgress = useCallback(
    (courseId: string) => {
      return progress.find((p) => p.courseId === courseId);
    },
    [progress]
  );

  const isNodeUnlocked = useCallback(
    (node: VenalabsMapNode): boolean => {
      if (!selectedMap) return false;

      const incomingConnections = selectedMap.connections.filter(
        (c) => c.toNodeId === node.id && c.required
      );

      if (incomingConnections.length === 0) return true;

      return incomingConnections.every((conn) => {
        const fromNode = selectedMap.nodes.find((n) => n.id === conn.fromNodeId);
        if (!fromNode) return false;
        const fromProgress = getNodeProgress(fromNode.courseId);
        return fromProgress?.status === 'COMPLETED';
      });
    },
    [selectedMap, getNodeProgress]
  );

  const getNodeStatus = useCallback(
    (node: VenalabsMapNode): CourseCardStatus => {
      const nodeProgress = getNodeProgress(node.courseId);
      if (!nodeProgress) {
        return isNodeUnlocked(node) ? 'AVAILABLE' : 'LOCKED';
      }
      if (nodeProgress.status === 'COMPLETED') return 'COMPLETED';
      if (nodeProgress.status === 'IN_PROGRESS') return 'IN_PROGRESS';
      return isNodeUnlocked(node) ? 'AVAILABLE' : 'LOCKED';
    },
    [getNodeProgress, isNodeUnlocked]
  );

  const getTargetNode = useCallback(() => {
    if (!selectedMap || selectedMap.nodes.length === 0) return null;

    const sortedNodes = [...selectedMap.nodes].sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      return a.y - b.y;
    });

    // Find first IN_PROGRESS
    let targetNode = sortedNodes.find((n) => getNodeStatus(n) === 'IN_PROGRESS');
    // Then first AVAILABLE
    if (!targetNode) {
      targetNode = sortedNodes.find((n) => getNodeStatus(n) === 'AVAILABLE');
    }
    // Then first node
    if (!targetNode) {
      targetNode = sortedNodes[0];
    }
    return targetNode;
  }, [selectedMap, getNodeStatus]);

  const handleTransformInit = (instance: ReactZoomPanPinchRef) => {
    transformRef.current = instance;

    // Priority: last visited node > in progress > available > first node
    const lastVisited = selectedMap
      ? getLocalStorage<string | null>(getLastVisitedKey(selectedMap.id), null)
      : null;

    let targetNode: VenalabsMapNode | null = null;

    // First try last visited node
    if (lastVisited && selectedMap) {
      targetNode = selectedMap.nodes.find((n) => n.id === lastVisited) ?? null;
    }

    // Fallback to getTargetNode (IN_PROGRESS > AVAILABLE > first)
    if (!targetNode) {
      targetNode = getTargetNode() ?? null;
    }

    if (!targetNode) return;

    const targetId = `venalabs-node-${targetNode.id}`;
    setTimeout(() => {
      instance.zoomToElement(targetId, 0.8, 500);
    }, 100);
  };

  const handleRecenter = () => {
    if (!transformRef.current) return;

    // Priority: last visited node > in progress > available > first node
    let targetNode: VenalabsMapNode | null = null;

    if (lastVisitedNodeId && selectedMap) {
      targetNode = selectedMap.nodes.find((n) => n.id === lastVisitedNodeId) ?? null;
    }

    if (!targetNode) {
      targetNode = getTargetNode() ?? null;
    }

    if (!targetNode) return;

    const targetId = `venalabs-node-${targetNode.id}`;
    transformRef.current.zoomToElement(targetId, 0.8, 500);
  };

  const handleNodeClick = useCallback(
    (node: VenalabsMapNode) => {
      // Save last visited node to localStorage
      if (selectedMap) {
        setLocalStorage(getLastVisitedKey(selectedMap.id), node.id);
        setLastVisitedNodeId(node.id);
      }
      onNodeClick?.(node);
    },
    [selectedMap, onNodeClick]
  );

  if (loading) {
    return <LoadingPage className="venalabs-h-96" />;
  }

  if (!selectedMap) {
    return <EmptyState emoji="🗺️" title="No learning maps available" />;
  }

  // Calculate grid dimensions
  const maxX = Math.max(...selectedMap.nodes.map((n) => n.x), 0);
  const maxY = Math.max(...selectedMap.nodes.map((n) => n.y), 0);
  const gridWidth = (maxX + 1) * (CARD_WIDTH + GAP);
  const gridHeight = (maxY + 1) * (CARD_HEIGHT + GAP);

  return (
    <div className="venalabs-map-view">
      {/* Header */}
      {!hideHeader && (
        <div className="venalabs-map-view__header">
          {/* Map selector if multiple maps */}
          {maps.length > 1 && (
            <div className="venalabs-map-selector">
              {maps.map((map) => (
                <button
                  key={map.id}
                  onClick={() => onMapSelect?.(map)}
                  className={cn(
                    'venalabs-map-selector__btn',
                    selectedMap.id === map.id && 'venalabs-map-selector__btn--active'
                  )}
                >
                  {map.name}
                </button>
              ))}
            </div>
          )}

          {/* Map info */}
          <div className="venalabs-map-info">
            <h2 className="venalabs-map-info__title">{selectedMap.name}</h2>
            {selectedMap.description && (
              <p className="venalabs-map-info__description">{selectedMap.description}</p>
            )}
          </div>
        </div>
      )}

      {/* Map grid */}
      <div
        className={cn(
          'venalabs-map-view__grid',
          !hideBackground && 'venalabs-map-view__grid--with-bg'
        )}
      >
        {/* Recenter button */}
        <button onClick={handleRecenter} className="venalabs-recenter-btn" title="Recenter">
          <Focus className="venalabs-icon-md" />
        </button>

        <TransformWrapper
          key={`venalabs-map-${selectedMap.id}`}
          onInit={handleTransformInit}
          pinch={{ disabled: false }}
          centerOnInit={true}
          minScale={0.25}
          maxScale={2}
          initialScale={0.5}
          limitToBounds={false}
        >
          <TransformComponent
            contentClass="venalabs-cursor-grab"
            wrapperClass="venalabs-transform-wrapper"
          >
            <div
              className="venalabs-map-canvas"
              style={{
                width: gridWidth + 100,
                height: gridHeight + 100,
                padding: 50,
              }}
            >
              {/* SVG connections */}
              <svg
                className="venalabs-map-connections"
                style={{ width: gridWidth, height: gridHeight }}
              >
                <defs>
                  <marker
                    id="venalabs-arrowhead-locked"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5.25"
                    refY="3"
                    orient="auto"
                  >
                    <polygon
                      points="0.75 0.4, 5.25 3, 0.75 5.6"
                      className="venalabs-arrow--locked"
                    />
                  </marker>
                  <marker
                    id="venalabs-arrowhead-primary"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5.25"
                    refY="3"
                    orient="auto"
                  >
                    <polygon
                      points="0.75 0.4, 5.25 3, 0.75 5.6"
                      className="venalabs-arrow--primary"
                    />
                  </marker>
                </defs>

                {selectedMap.connections.map((conn) => {
                  const fromNode = selectedMap.nodes.find((n) => n.id === conn.fromNodeId);
                  const toNode = selectedMap.nodes.find((n) => n.id === conn.toNodeId);
                  if (!fromNode || !toNode) return null;

                  const fromSide = conn.fromSide || getDefaultSide(fromNode, toNode, true);
                  const toSide = conn.toSide || getDefaultSide(fromNode, toNode, false);

                  const fromAnchor = getAnchorPoint(fromNode, fromSide);
                  const toAnchor = getAnchorPoint(toNode, toSide);

                  const { x: fromX, y: fromY } = fromAnchor;
                  const { x: toX, y: toY } = toAnchor;

                  const toStatus = getNodeStatus(toNode);
                  const isLocked = toStatus === 'LOCKED';
                  const isCompleted = toStatus === 'COMPLETED';
                  const strokeDasharray = isCompleted ? 'none' : '10,10';
                  const markerId = isLocked
                    ? 'venalabs-arrowhead-locked'
                    : 'venalabs-arrowhead-primary';

                  // Generate path
                  const isFromVertical = fromSide === 'TOP' || fromSide === 'BOTTOM';
                  const isToVertical = toSide === 'TOP' || toSide === 'BOTTOM';

                  let path: string;
                  if (isFromVertical && isToVertical) {
                    const pathMidY = (fromY + toY) / 2;
                    path = `M ${fromX} ${fromY} Q ${fromX} ${pathMidY}, ${(fromX + toX) / 2} ${pathMidY} Q ${toX} ${pathMidY}, ${toX} ${toY}`;
                  } else if (!isFromVertical && !isToVertical) {
                    const pathMidX = (fromX + toX) / 2;
                    path = `M ${fromX} ${fromY} Q ${pathMidX} ${fromY}, ${pathMidX} ${(fromY + toY) / 2} Q ${pathMidX} ${toY}, ${toX} ${toY}`;
                  } else if (isFromVertical) {
                    path = `M ${fromX} ${fromY} Q ${fromX} ${toY}, ${toX} ${toY}`;
                  } else {
                    path = `M ${fromX} ${fromY} Q ${toX} ${fromY}, ${toX} ${toY}`;
                  }

                  return (
                    <g key={conn.id}>
                      <path
                        d={path}
                        fill="none"
                        className={cn(
                          'venalabs-connection-path',
                          isLocked
                            ? 'venalabs-connection-path--locked'
                            : 'venalabs-connection-path--primary'
                        )}
                        strokeWidth="3"
                        strokeDasharray={strokeDasharray}
                        markerEnd={`url(#${markerId})`}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Course cards */}
              {selectedMap.nodes.map((node) => {
                const status = getNodeStatus(node);
                const nodeProgress = getNodeProgress(node.courseId);

                const cardX = node.x * (CARD_WIDTH + GAP);
                const cardY = node.y * (CARD_HEIGHT + GAP);

                const stepProgress = node.totalSteps
                  ? {
                      completed: nodeProgress?.stepProgress
                        ? nodeProgress.stepProgress.filter((s) => s.status === 'COMPLETED').length
                        : 0,
                      total: node.totalSteps,
                    }
                  : undefined;

                return (
                  <div
                    key={node.id}
                    id={`venalabs-node-${node.id}`}
                    className="venalabs-map-node"
                    style={{
                      left: cardX,
                      top: cardY,
                      width: CARD_WIDTH,
                      height: CARD_HEIGHT,
                    }}
                  >
                    <CourseCard
                      courseId={node.courseId}
                      title={getLocalizedText(node.courseName, locale) || 'Course'}
                      imageUrl={getLocalizedText(node.courseImageUrl, locale)}
                      status={status}
                      rewards={node.courseRewards || []}
                      stepProgress={stepProgress}
                      onClick={() => handleNodeClick(node)}
                      onUnlock={() => handleNodeClick(node)}
                    />
                  </div>
                );
              })}
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>

      {/* Legend */}
      {!hideLegend && (
        <div className="venalabs-map-legend">
          <div className="venalabs-map-legend__item">
            <div className="venalabs-map-legend__dot venalabs-map-legend__dot--locked" />
            <span>Locked</span>
          </div>
          <div className="venalabs-map-legend__item">
            <div className="venalabs-map-legend__dot venalabs-map-legend__dot--available" />
            <span>Available</span>
          </div>
          <div className="venalabs-map-legend__item">
            <div className="venalabs-map-legend__dot venalabs-map-legend__dot--in-progress" />
            <span>In Progress</span>
          </div>
          <div className="venalabs-map-legend__item">
            <div className="venalabs-map-legend__dot venalabs-map-legend__dot--completed" />
            <span>Completed</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapView;
