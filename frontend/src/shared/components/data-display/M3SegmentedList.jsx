import React from 'react';
import { Box } from '@mui/material';
import { M3eList, M3eListItem } from '@m3e/react/list';

/**
 * Material 3 Expressive Segmented List Item wrapping @m3e/react/list.
 */
export function M3SegmentedListItem({
  children,
  leading,
  trailing,
  headline,
  supportingText,
  onClick,
  selected = false,
  disabled = false,
  ...rest
}) {
  return (
    <M3eListItem
      onClick={disabled ? undefined : onClick}
      selected={selected}
      disabled={disabled}
      headline={headline}
      supportingText={supportingText}
      style={{
        display: 'block',
        cursor: onClick && !disabled ? 'pointer' : 'default',
        width: '100%',
      }}
      {...rest}
    >
      {leading && (
        <span slot="leading" style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
          {leading}
        </span>
      )}
      {headline || children}
      {supportingText && <span slot="supporting-text">{supportingText}</span>}
      {trailing && (
        <span slot="trailing" style={{ display: 'inline-flex', alignItems: 'center', alignSelf: 'center', margin: 'auto 0', flexShrink: 0 }}>
          {trailing}
        </span>
      )}
    </M3eListItem>
  );
}

/**
 * Material 3 Expressive Segmented List Container wrapping @m3e/react/list.
 */
export function M3SegmentedList({
  children,
  orientation = 'vertical',
  gap = '2px',
  containerShape = '20px',
  itemShape = '4px',
  itemContainerColor,
  sx = {},
  ...rest
}) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <Box
      sx={{
        width: '100%',
        '& m3e-list': {
          display: 'flex',
          flexDirection: isHorizontal ? 'row' : 'column',
          width: '100%',
          overflowX: isHorizontal ? 'auto' : 'visible',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          '--m3e-segmented-list-segment-gap': gap,
          '--m3e-segmented-list-container-shape': containerShape,
          '--m3e-segmented-list-item-container-shape': itemShape,
          '--m3e-segmented-list-item-container-color': (theme) => {
            if (typeof itemContainerColor === 'function') return itemContainerColor(theme);
            if (itemContainerColor) return itemContainerColor;
            return theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff';
          },
          '--m3e-segmented-list-item-hover-container-shape': '16px',
          '--m3e-segmented-list-item-focus-container-shape': '20px',
        },
        '& m3e-list-item': {
          display: 'block',
          width: isHorizontal ? 'auto' : '100%',
          flex: isHorizontal ? '1 1 0px' : 'none',
          minWidth: isHorizontal ? 0 : 'auto',
        },
        ...sx,
      }}
    >
      <M3eList variant="segmented" {...rest}>
        {children}
      </M3eList>
    </Box>
  );
}

export default M3SegmentedList;
