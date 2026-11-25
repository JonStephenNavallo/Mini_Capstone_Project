import React from 'react';
import { Chip } from '@mui/material';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import VisibilityIcon from '@mui/icons-material/Visibility';
import M3MediaCard from '../../../shared/components/data-display/M3MediaCard.jsx';
import { STATUS_CHIP_STYLES } from '../constants/statusStyles.js';

const SENSITIVE_CATEGORY_PATTERN = /\b(id|ids|document|documents|wallet|card)\b/i;

export default function FoundItemCard({ item, onSelect, maskSensitivePhoto = false }) {
  const badge = STATUS_CHIP_STYLES[item.custody_status] || {
    label: item.custody_status,
    color: 'default',
  };

  // OSAS anti-fraud & privacy guardrail: mask raw photos of IDs/documents on public spotlights
  const isSensitive = maskSensitivePhoto && SENSITIVE_CATEGORY_PATTERN.test(item.category_name || '');

  // For Claimed & Returned items, prefer the optional consented public handover photo;
  // otherwise fall back to the item's default primary photo.
  const displayMediaSrc =
    item.custody_status === 'CLAIMED' && item.public_handover_photo
      ? item.public_handover_photo
      : isSensitive
        ? null
        : item.primary_photo;

  return (
    <M3MediaCard
      mediaSrc={displayMediaSrc}
      mediaFallbackIcon={
        isSensitive ? (
          <BadgeOutlinedIcon sx={{ fontSize: 44, color: 'rgba(255, 255, 255, 0.42)' }} />
        ) : undefined
      }
      mediaAlt={item.title}
      onClick={() => onSelect?.(item)}
      topLeftBadge={
        <Chip
          size="small"
          label={badge.label}
          color={badge.color}
          sx={{
            fontWeight: 700,
            fontSize: '0.7rem',
            borderRadius: '9999px',
          }}
        />
      }
      overline={item.category_name}
      title={item.title}
      description={item.general_description}
      metaItems={[
        {
          key: 'location',
          icon: <LocationOnIcon sx={{ fontSize: 15 }} />,
          label: item.location_label,
        },
        {
          key: 'date',
          icon: <CalendarTodayIcon sx={{ fontSize: 14 }} />,
          label: `Found ${item.date_found}`,
        },
      ]}
      actionLabel="View Details"
      actionIcon={<VisibilityIcon fontSize="small" />}
      onActionClick={() => onSelect?.(item)}
    />
  );
}
