import React, { useCallback, useMemo } from 'react';
import {
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import { useNavigate, useSearchParams } from 'react-router-dom';
import M3PillButton from '../../../../shared/components/actions/M3PillButton.jsx';
import M3FabMenu from '../../../../shared/components/actions/M3FabMenu.jsx';
import FilterPillsBar from '../../../../shared/components/filters/FilterPillsBar.jsx';
import M3DateRangeFilter from '../../../../shared/components/filters/M3DateRangeFilter.jsx';
import { SectionSurface } from '../../../../shared/components/dashboard/KpiMetricCard.jsx';
import { useHeaderSearch } from '../../../../shared/utils/breadcrumbContextValue.js';
import { useCategories, usePublicFoundItems } from '../../api/lostFoundApi.js';
import { useLostFoundUiStore } from '../../state/lostFoundUiStore.js';
import FoundItemCard from '../../components/FoundItemCard.jsx';
import ItemDetailDialog from '../../components/ItemDetailDialog.jsx';
import QrTagPrintDialog from '../../components/QrTagPrintDialog.jsx';

const STATUS_FILTER_ITEMS = [
  { key: 'IN_CUSTODY', label: 'In Custody' },
  { key: 'CLAIMED', label: 'Claimed' },
  { key: 'ALL', label: 'All' },
];

export default function ExploreItemsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const openItemDetail = useLostFoundUiStore((s) => s.openItemDetail);

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || 'ALL';
  const status = searchParams.get('status') || 'IN_CUSTODY';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';
  const page = Number(searchParams.get('page') || 1);

  const { data: categories = [] } = useCategories();
  const queryParams = useMemo(() => {
    const p = { page, page_size: 12 };
    if (search.trim()) p.search = search.trim();
    if (category !== 'ALL') p.category = category;
    if (status !== 'ALL') p.status = status;
    if (dateFrom) p.date_from = dateFrom;
    if (dateTo) p.date_to = dateTo;
    return p;
  }, [page, search, category, status, dateFrom, dateTo]);

  const { data, isLoading } = usePublicFoundItems(queryParams);

  const updateParam = useCallback(
    (key, value) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        // For `status`, the default is IN_CUSTODY so `ALL` must stay in the URL rather than being deleted
        if (key === 'status') {
          if (!value || value === 'IN_CUSTODY') {
            next.delete('status');
          } else {
            next.set('status', String(value));
          }
        } else if (!value || value === 'ALL') {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
        if (key !== 'page') next.delete('page');
        return next;
      });
    },
    [setSearchParams]
  );

  const handleDateRangeChange = useCallback(
    ({ dateFrom: nextFrom, dateTo: nextTo }) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (nextFrom) next.set('date_from', nextFrom);
        else next.delete('date_from');
        if (nextTo) next.set('date_to', nextTo);
        else next.delete('date_to');
        next.delete('page');
        return next;
      });
    },
    [setSearchParams]
  );

  // Live connected search recommendations are scoped exclusively to mobile Explore Items
  const mobileSuggestions = useMemo(() => {
    if (!isMobile || !search.trim()) return [];
    return (data?.results || []).slice(0, 6).map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: [item.tracking_code, item.category_name, item.location_label]
        .filter(Boolean)
        .join(' • '),
    }));
  }, [isMobile, search, data]);

  const handleSelectSuggestion = useCallback(
    (suggestion) => {
      if (suggestion?.id) {
        openItemDetail(suggestion.id);
      }
    },
    [openItemDetail]
  );

  useHeaderSearch({
    value: search,
    onChange: (val) => updateParam('search', val),
    placeholder: 'Search found items by title, description, tracking code, or building…',
    visible: true,
    suggestions: mobileSuggestions,
    suggestionsLoading: isMobile && Boolean(search.trim()) && isLoading,
    onSelectSuggestion: isMobile ? handleSelectSuggestion : null,
    showSuggestionsOnDesktop: false,
  });

  const totalPages = Math.max(1, Math.ceil((data?.count || 0) / 12));

  // Mobile-only M3E FAB speed-dial actions matching HomeHeroPage
  const fabMenuItems = useMemo(
    () => [
      {
        key: 'report-lost',
        label: 'Report Lost Item',
        icon: <ReportProblemOutlinedIcon sx={{ fontSize: 20 }} />,
        onClick: () => navigate('/report-lost?new=1'),
      },
      {
        key: 'report-found',
        label: 'Report Found Item',
        icon: <VolunteerActivismOutlinedIcon sx={{ fontSize: 20 }} />,
        onClick: () => navigate('/report-found'),
      },
    ],
    [navigate]
  );

  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { md: 'center' },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Explore Campus Found Items
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Filter items by custody status, category, or date found. Click any item to view details or generate a walk-in OSAS pass.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.25} sx={{ display: { xs: 'none', sm: 'flex' }, flexShrink: 0 }}>
          <M3PillButton
            variant="filled"
            color="accent"
            icon={<ReportProblemIcon fontSize="small" />}
            onClick={() => navigate('/report-lost?new=1')}
          >
            Report Lost Item
          </M3PillButton>
          <M3PillButton
            variant="outlined"
            color="accent"
            icon={<VolunteerActivismIcon fontSize="small" />}
            onClick={() => navigate('/report-found')}
          >
            Report Found Item
          </M3PillButton>
        </Stack>
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        {/* Custody status as M3E Filter Chips (In Custody / Claimed / All) */}
        <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
          <FilterPillsBar
            items={STATUS_FILTER_ITEMS}
            selected={status}
            onSelect={(key) => updateParam('status', key)}
          />
        </Box>

        {/* Scalable Category Dropdown + Date Range Filter */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', flexShrink: 0 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel
              id="explore-category-filter-label"
              sx={{
                fontSize: '0.8rem',
                transform: 'translate(14px, 6px) scale(1)',
                '&.MuiInputLabel-shrink': {
                  transform: 'translate(14px, -4px) scale(0.75)',
                  bgcolor: 'background.default',
                  px: 0.5,
                },
              }}
            >
              Category
            </InputLabel>
            <Select
              labelId="explore-category-filter-label"
              value={category === 'ALL' ? '' : String(category)}
              label="Category"
              onChange={(e) => updateParam('category', e.target.value || 'ALL')}
              sx={{
                height: 32,
                fontSize: '0.8rem',
                borderRadius: '8px',
                bgcolor: 'background.default',
              }}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <M3DateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            label="Date Found"
            onChange={handleDateRangeChange}
          />
        </Box>
      </Box>

      {isLoading ? (
        <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (data?.results || []).length === 0 ? (
        <SectionSurface sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" fontWeight={700}>
            No matching items found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
            Try clearing your filters or file a Personal Lost Item Report for automatic matching alerts.
          </Typography>
          <M3PillButton
            variant="filled"
            color="accent"
            icon={<ReportProblemIcon fontSize="small" />}
            onClick={() => navigate('/report-lost?new=1')}
          >
            Report Lost Item
          </M3PillButton>
        </SectionSurface>
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
              },
              gap: 2,
            }}
          >
            {data.results.map((item) => (
              <FoundItemCard key={item.id} item={item} onSelect={(it) => openItemDetail(it.id)} />
            ))}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              color="primary"
              shape="rounded"
              onChange={(_, nextPage) => updateParam('page', nextPage)}
            />
          </Box>
        </>
      )}

      <ItemDetailDialog />
      <QrTagPrintDialog />

      {/* Mobile-only M3E FAB (+) Speed-Dial for quick Lost/Found reporting */}
      <M3FabMenu
        items={fabMenuItems}
        triggerIcon={<AddIcon sx={{ fontSize: 28 }} />}
        ariaLabel="Report Lost or Found Item"
        mobileOnly
      />
    </Stack>
  );
}
