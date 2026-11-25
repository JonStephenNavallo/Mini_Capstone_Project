import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from '@mui/material';

/**
 * DataTable — Shared, standardized table component adapted from the reference
 * StudentDirectory canonical design (Google Workspace-inspired):
 *  • Consistent zebra-striping (even rows slightly tinted)
 *  • Hover highlight + selected-row accent color
 *  • Sticky header with divider below
 *  • Built-in SORT BY footer selector + MUI TablePagination
 *  • Row-click support for detail panel / bottom sheet inspection
 */
const DataTable = ({
  columns,
  rows,
  loading = false,
  emptyMessage = 'No records found.',
  onRowClick = null,
  selectedRowId = null,
  selectedRowIdField = 'id',
  highlightedRowId = null,
  page = 0,
  rowsPerPage = 25,
  totalCount = 0,
  onPageChange = () => {},
  onRowsPerPageChange = () => {},
  rowsPerPageOptions = [10, 25, 50],
  showPagination: customShowPagination,
  orderBy: serverOrderBy = '',
  order: serverOrder = 'asc',
  onSortChange,
  containerSx = {},
}) => {
  const rowSx = (isHighlighted = false) => ({
    cursor: onRowClick ? 'pointer' : 'default',
    transition: 'background-color 0.15s ease',
    ...(isHighlighted && {
      animation: 'm3RowPulseHighlight 2.5s cubic-bezier(0.2, 0, 0, 1) forwards',
      '@keyframes m3RowPulseHighlight': {
        '0%': {
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? 'rgba(13, 110, 253, 0.35)'
              : 'rgba(144, 202, 249, 0.40)',
          boxShadow: (theme) => `inset 0 0 0 2px ${theme.palette.primary.main}`,
        },
        '40%': {
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? 'rgba(13, 110, 253, 0.20)'
              : 'rgba(144, 202, 249, 0.25)',
          boxShadow: (theme) => `inset 0 0 0 2px ${theme.palette.primary.main}`,
        },
        '100%': {
          backgroundColor: 'transparent',
          boxShadow: 'none',
        },
      },
    }),
    '&:nth-of-type(even)': {
      bgcolor: (theme) =>
        theme.palette.mode === 'light'
          ? 'rgba(230, 230, 230, 0.6)'
          : 'rgba(255, 255, 255, 0.015)',
    },
    '&:hover': {
      bgcolor: (theme) =>
        theme.palette.mode === 'light'
          ? 'rgba(0, 0, 0, 0.04) !important'
          : 'rgba(255, 255, 255, 0.05) !important',
    },
    '&.Mui-selected': {
      bgcolor: (theme) =>
        theme.palette.mode === 'light'
          ? '#1b6fff35 !important'
          : 'rgba(255, 255, 255, 0.15) !important',
    },
  });

  const showPagination =
    customShowPagination !== undefined ? customShowPagination : totalCount > 0;
  const isServerSideSort = onSortChange !== undefined;

  const [localOrderBy, setLocalOrderBy] = React.useState('');
  const [localOrder, setLocalOrder] = React.useState('asc');

  const currentOrderBy = isServerSideSort ? serverOrderBy : localOrderBy;
  const currentOrder = isServerSideSort ? serverOrder : localOrder;

  const handleSortRequest = (property) => {
    if (isServerSideSort) {
      const isAsc = serverOrderBy === property && serverOrder === 'asc';
      onSortChange(property, isAsc ? 'desc' : 'asc');
    } else {
      const isAsc = localOrderBy === property && localOrder === 'asc';
      const nextOrder = isAsc ? 'desc' : 'asc';
      setLocalOrder(nextOrder);
      setLocalOrderBy(property);
    }
  };

  React.useEffect(() => {
    if (highlightedRowId) {
      const timer = setTimeout(() => {
        const rowEl = document.getElementById(`datatable-row-${highlightedRowId}`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [highlightedRowId]);

  const safeRows = React.useMemo(
    () =>
      Array.isArray(rows)
        ? rows
        : rows && Array.isArray(rows.results)
          ? rows.results
          : [],
    [rows]
  );

  const sortedRows = React.useMemo(() => {
    if (isServerSideSort || !currentOrderBy) return safeRows;

    return [...safeRows].sort((a, b) => {
      let aVal = a[currentOrderBy];
      let bVal = b[currentOrderBy];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const isDateA = !Number.isNaN(Date.parse(aVal)) && aVal.includes('-');
        const isDateB = !Number.isNaN(Date.parse(bVal)) && bVal.includes('-');
        if (isDateA && isDateB) {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        } else {
          return currentOrder === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
      }

      if (aVal < bVal) return currentOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return currentOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [safeRows, currentOrderBy, currentOrder, isServerSideSort]);

  return (
    <Box
      sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '10px',
        overflow: 'hidden',
        ...containerSx,
      }}
    >
      <TableContainer
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          border: 'none',
          borderColor: 'divider',
          borderRadius: showPagination ? '15px 15px 0 0' : 2,
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        ) : safeRows.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">
              {emptyMessage}
            </Typography>
          </Box>
        ) : (
          <Table
            stickyHeader
            size="small"
            sx={{
              '& .MuiTableCell-root': {
                borderColor: 'divider',
                py: 0.75,
              },
              '& .MuiTableCell-head': {
                bgcolor: 'background.default',
                color: 'text.secondary',
                fontWeight: 600,
                fontSize: '0.78rem',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                borderBottom: '2px solid',
                borderColor: 'divider',
                py: 1,
              },
            }}
          >
            <TableHead>
              <TableRow>
                {columns.map((col) => {
                  const isSortable = col.field !== '_actions' && col.sortable !== false;
                  return (
                    <TableCell
                      key={col.field}
                      align={col.align || 'left'}
                      sortDirection={currentOrderBy === col.field ? currentOrder : false}
                      sx={{ minWidth: col.width, ...col.headerSx }}
                    >
                      {isSortable ? (
                        <TableSortLabel
                          active={currentOrderBy === col.field}
                          direction={currentOrderBy === col.field ? currentOrder : 'asc'}
                          onClick={() => handleSortRequest(col.field)}
                          sx={{
                            fontWeight: 700,
                            '&.MuiTableSortLabel-root': {
                              color: 'text.secondary',
                              '&:hover': {
                                color: 'text.primary',
                              },
                              '&.Mui-active': {
                                color: 'primary.main',
                                '& .MuiTableSortLabel-icon': {
                                  color: 'primary.main',
                                },
                              },
                            },
                          }}
                        >
                          {col.headerName}
                        </TableSortLabel>
                      ) : (
                        col.headerName
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>

            <TableBody>
              {sortedRows.map((row, rowIndex) => {
                const rowId = row[selectedRowIdField];
                const isSelected =
                  selectedRowId !== null &&
                  selectedRowId !== undefined &&
                  rowId === selectedRowId;
                const isHighlighted =
                  highlightedRowId !== null &&
                  highlightedRowId !== undefined &&
                  (rowId === highlightedRowId ||
                    row.tracking_code === highlightedRowId ||
                    row.id === highlightedRowId);

                const tableRow = (
                  <TableRow
                    key={rowId ?? rowIndex}
                    id={rowId ? `datatable-row-${rowId}` : undefined}
                    hover={Boolean(onRowClick)}
                    selected={isSelected}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    sx={rowSx(isHighlighted)}
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={col.field}
                        align={col.align || 'left'}
                        sx={col.cellSx}
                      >
                        {col.renderCell ? col.renderCell(row) : (row[col.field] ?? '—')}
                      </TableCell>
                    ))}
                  </TableRow>
                );

                if (onRowClick) {
                  return (
                    <Tooltip
                      key={rowId ?? rowIndex}
                      title="Click to view details"
                      followCursor
                      enterDelay={600}
                      enterNextDelay={600}
                      slotProps={{
                        popper: {
                          modifiers: [
                            {
                              name: 'offset',
                              options: { offset: [80, -14] },
                            },
                          ],
                        },
                      }}
                    >
                      {tableRow}
                    </Tooltip>
                  );
                }

                return tableRow;
              })}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {showPagination && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
            borderRadius: '0 0 10px 10px',
            bgcolor: 'background.paper',
            px: 2,
            py: 0.5,
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 700,
                fontSize: '0.72rem',
                letterSpacing: 0.5,
              }}
            >
              SORT BY:
            </Typography>
            <Select
              size="small"
              value={currentOrderBy}
              onChange={(e) => {
                const val = e.target.value;
                let defaultOrder = 'asc';
                if (
                  val.includes('date') ||
                  val.includes('time') ||
                  val.includes('created') ||
                  val.includes('status') ||
                  val.includes('updated')
                ) {
                  defaultOrder = 'desc';
                }
                if (isServerSideSort) {
                  onSortChange(val, defaultOrder);
                } else {
                  setLocalOrderBy(val);
                  setLocalOrder(defaultOrder);
                }
              }}
              displayEmpty
              sx={{
                height: 28,
                fontSize: '0.72rem',
                borderRadius: '6px',
                bgcolor: 'background.default',
                minWidth: 120,
                '& .MuiSelect-select': {
                  py: 0.5,
                  px: 1.5,
                },
              }}
            >
              <MenuItem value="" sx={{ fontSize: '0.72rem' }}>
                Default Order
              </MenuItem>
              {columns
                .filter((col) => col.field !== '_actions' && col.sortable !== false)
                .map((col) => (
                  <MenuItem key={col.field} value={col.field} sx={{ fontSize: '0.72rem' }}>
                    {col.headerName}
                  </MenuItem>
                ))}
            </Select>

            {currentOrderBy && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  const nextOrder = currentOrder === 'asc' ? 'desc' : 'asc';
                  if (isServerSideSort) {
                    onSortChange(currentOrderBy, nextOrder);
                  } else {
                    setLocalOrder(nextOrder);
                  }
                }}
                sx={{
                  height: 28,
                  fontSize: '0.68rem',
                  textTransform: 'none',
                  py: 0,
                  px: 1.5,
                  minWidth: 'auto',
                  borderRadius: '6px',
                  borderColor: 'divider',
                  color: 'text.primary',
                  fontWeight: 700,
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                  },
                }}
              >
                {currentOrder === 'asc'
                  ? currentOrderBy.includes('date') ||
                    currentOrderBy.includes('time') ||
                    currentOrderBy.includes('created')
                    ? 'Oldest First'
                    : 'A-Z'
                  : currentOrderBy.includes('date') ||
                      currentOrderBy.includes('time') ||
                      currentOrderBy.includes('created')
                    ? 'Newest First'
                    : 'Z-A'}
              </Button>
            )}
          </Box>

          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={rowsPerPageOptions}
            onPageChange={(_, newPage) => onPageChange(newPage)}
            onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
            sx={{
              border: 'none !important',
              bgcolor: 'transparent !important',
              '.MuiTablePagination-toolbar': {
                minHeight: 44,
                px: 0,
              },
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                fontSize: '0.78rem',
                color: 'text.secondary',
              },
              '.MuiTablePagination-select': {
                fontSize: '0.78rem',
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default DataTable;
