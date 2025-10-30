/**
 * QualityBadge Component
 * Displays compression quality score with tier-based styling
 */

import React from 'react';

interface QualityBadgeProps {
  score?: number | null;
}

/**
 * Quality badge showing compression quality score
 * Returns null if score is not available
 *
 * Quality tiers:
 * - 90-100: "Excellent" (green)
 * - 80-89: "Good" (blue)
 * - 70-79: "Fair" (yellow)
 * - <70: "Poor" (red)
 */
export function QualityBadge({ score }: QualityBadgeProps): React.ReactElement | null {
  if (score === null || score === undefined) {
    return null;
  }

  const getTierConfig = (value: number) => {
    if (value >= 90) {
      return {
        label: 'Excellent',
        icon: '✓',
        className: 'bg-green-100 text-green-800 border-green-300',
      };
    } else if (value >= 80) {
      return {
        label: 'Good',
        icon: '✓',
        className: 'bg-blue-100 text-blue-800 border-blue-300',
      };
    } else if (value >= 70) {
      return {
        label: 'Fair',
        icon: '⚠',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      };
    } else {
      return {
        label: 'Poor',
        icon: '✗',
        className: 'bg-red-100 text-red-800 border-red-300',
      };
    }
  };

  const config = getTierConfig(score);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      {config.icon} {config.label} ({Math.round(score)})
    </span>
  );
}
