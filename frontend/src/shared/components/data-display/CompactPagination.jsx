import React from 'react';
import { Box, TablePagination, useMediaQuery, useTheme } from '@mui/material';

/**
 * CompactPagination — Adapted from the reference StudentDirectory mobile pagination bar.
 * Optimizes text labels and spacing for compact mobile and grid footers without overflow.
 */
export const CompactPagination = ({
  count,
  page,
  onPageChange,
  rowsPerPage,
  onRowsPerPageChange,
  rowsPerPageOptions = [10, 25, 50],
  labelRowsPerPage,
  sx = {},
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        mt: 'auto',
        display: 'flex',
        justifyContent: { xs: 'center', sm: 'flex-end' },
        borderTop: `1px solid ${theme.palette.divider}`,
        flexShrink: 0,
        width: '100%',
        overflow: 'hidden',
        ...sx,
      }}
    >
      <TablePagination
        component="div"
        count={count}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          onRowsPerPageChange(parseInt(e.target.value, 10));
        }}
        rowsPerPageOptions={rowsPerPageOptions}
        labelRowsPerPage={
          labelRowsPerPage !== undefined
            ? labelRowsPerPage
            : isMobile
              ? 'Rows:'
              : 'Rows per page:'
        }
        sx={{
          overflow: 'hidden',
          maxWidth: '100%',
          '& .MuiTablePagination-toolbar': {
            minHeight: { xs: '36px', sm: '40px' },
            p: 0,
            px: { xs: 0.5, sm: 1 },
            gap: { xs: 0.5, sm: 1 },
            justifyContent: { xs: 'center', sm: 'flex-end' },
            overflow: 'hidden',
          },
          '& .MuiTablePagination-spacer': {
            display: { xs: 'none', sm: 'block' },
            flex: { xs: '0 0 auto', sm: '1 1 auto' },
          },
          '& .MuiTablePagination-selectLabel': {
            margin: 0,
            fontSize: { xs: '0.72rem', sm: '0.78rem' },
            fontWeight: 500,
            color: 'text.secondary',
            whiteSpace: 'nowrap',
          },
          '& .MuiTablePagination-input': {
            marginRight: { xs: 0.25, sm: 0.75 },
            marginLeft: { xs: 0.25, sm: 0.5 },
          },
          '& .MuiTablePagination-select': {
            fontSize: { xs: '0.72rem', sm: '0.78rem' },
            fontWeight: 600,
            py: 0.25,
            pl: { xs: 0.5, sm: 1 },
            pr: '20px !important',
          },
          '& .MuiTablePagination-selectIcon': {
            fontSize: { xs: '18px', sm: '20px' },
          },
          '& .MuiTablePagination-displayedRows': {
            margin: 0,
            fontSize: { xs: '0.72rem', sm: '0.78rem' },
            fontWeight: 600,
            color: 'text.secondary',
            whiteSpace: 'nowrap',
          },
          '& .MuiTablePagination-actions': {
            ml: { xs: 0.25, sm: 1 },
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            '& .MuiIconButton-root': {
              p: { xs: 0.5, sm: 0.75 },
            },
          },
        }}
      />
    </Box>
  );
};

export default CompactPagination;
