import React from 'react';
import { Box, Divider } from '@mui/material';

/**
 * BrandLogos - Institutional DLL + OSAS dual-logo lockup separated by a vertical divider.
 */
const BrandLogos = ({ height = 40, dividerHeight = 24, gap = 1, dividerColor = 'divider' }) => {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap, flexShrink: 0 }}>
      <Box
        component="img"
        src="/DLL-Logo.png"
        alt="DLL Logo"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
        sx={{
          height,
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
        }}
      />
      <Divider
        orientation="vertical"
        sx={{
          height: dividerHeight,
          alignSelf: 'center',
          borderColor: dividerColor,
        }}
      />
      <Box
        component="img"
        src="/OSAS_Logo.png"
        alt="OSAS Logo"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
        sx={{
          height,
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </Box>
  );
};

export default BrandLogos;
