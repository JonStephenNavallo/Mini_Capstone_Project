import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useAdminDeleteFoundItem,
  useAdminFoundItems,
  useAdminUpdateFoundItem,
  useApproveIntake,
  useCategories,
  useLocations,
  useVoidMistakenClaim,
} from '../api/lostFoundApi.js';

export const ITEM_STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'PENDING_SURRENDER', label: 'Pending Intake' },
  { value: 'IN_CUSTODY', label: 'In Custody' },
  { value: 'CLAIMED', label: 'Claimed' },
  { value: 'DONATED', label: 'Donated' },
  { value: 'DISPOSED', label: 'Disposed' },
];

/**
 * Custom hook encapsulating URL-synced directory state (view mode, filters,
 * pagination, selected item) and TanStack Query calls for AdminItemsDirectoryPage.
 * Mirrors the reference useStudentDirectory architecture.
 */
export function useAdminItemsDirectory() {
  const [searchParams, setSearchParams] = useSearchParams();

  const viewMode = searchParams.get('view') === 'grid' ? 'grid' : 'table';
  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || '';
  const categoryFilter = searchParams.get('category') || '';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';
  const page = Math.max(0, Number(searchParams.get('page') || 0));
  const pageSize = Number(searchParams.get('page_size') || 10);
  const selectedItemIdParam = searchParams.get('item') || '';

  const [approveTarget, setApproveTarget] = useState(null);
  const [shelfBin, setShelfBin] = useState('');
  const [secretNote, setSecretNote] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editError, setEditError] = useState('');
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('');

  // Functional setSearchParams updater to prevent callback identity churn
  const updateParams = useCallback(
    (updates, replace = false) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '' || value === 'ALL') {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          });
          return next;
        },
        { replace }
      );
    },
    [setSearchParams]
  );

  // Convert 0-indexed MUI pagination page to 1-indexed DRF page
  const queryParams = useMemo(() => {
    const params = { page: page + 1, page_size: pageSize };
    if (search.trim()) params.search = search.trim();
    if (statusFilter) params.status = statusFilter;
    if (categoryFilter) params.category = categoryFilter;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  }, [page, pageSize, search, statusFilter, categoryFilter, dateFrom, dateTo]);

  const { data, isLoading } = useAdminFoundItems(queryParams);
  const { data: categoriesData } = useCategories();
  const { data: locationsData } = useLocations();
  const approveIntake = useApproveIntake();
  const updateItem = useAdminUpdateFoundItem();
  const deleteItem = useAdminDeleteFoundItem();
  const voidClaim = useVoidMistakenClaim();

  const items = useMemo(() => data?.results || [], [data]);
  const totalCount = data?.count || 0;
  const categories = useMemo(
    () => (Array.isArray(categoriesData) ? categoriesData : categoriesData?.results || []),
    [categoriesData]
  );
  const locations = useMemo(
    () => (Array.isArray(locationsData) ? locationsData : locationsData?.results || []),
    [locationsData]
  );

  const selectedItem = useMemo(() => {
    if (!selectedItemIdParam) return null;
    return items.find((it) => String(it.id) === String(selectedItemIdParam)) || null;
  }, [items, selectedItemIdParam]);

  const handleRowClick = useCallback(
    (item) => {
      if (!item) return;
      const isSame = String(item.id) === String(selectedItemIdParam);
      updateParams({ item: isSame ? null : item.id });
    },
    [selectedItemIdParam, updateParams]
  );

  const handleClosePanel = useCallback(() => {
    updateParams({ item: null });
  }, [updateParams]);

  const openApproveDialog = useCallback((item) => {
    setApproveTarget(item);
    setShelfBin(item?.storage_shelf_bin || '');
    setSecretNote(item?.secret_identifiers || '');
  }, []);

  const closeApproveDialog = useCallback(() => {
    setApproveTarget(null);
    setShelfBin('');
    setSecretNote('');
  }, []);

  const handleConfirmApprove = useCallback(async () => {
    if (!approveTarget) return;
    await approveIntake.mutateAsync({
      id: approveTarget.id,
      storage_shelf_bin: shelfBin,
      secret_identifiers: secretNote,
    });
    closeApproveDialog();
  }, [approveTarget, approveIntake, shelfBin, secretNote, closeApproveDialog]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const deletedId = deleteTarget.id;
    await deleteItem.mutateAsync(deletedId);
    setDeleteTarget(null);
    if (String(selectedItemIdParam) === String(deletedId)) {
      updateParams({ item: null });
    }
  }, [deleteTarget, deleteItem, selectedItemIdParam, updateParams]);

  const openEditDialog = useCallback((item) => {
    setEditError('');
    setEditTarget(item);
  }, []);

  const closeEditDialog = useCallback(() => {
    setEditTarget(null);
    setEditError('');
  }, []);

  const handleConfirmEdit = useCallback(
    async (payload) => {
      if (!editTarget) return;
      setEditError('');
      try {
        await updateItem.mutateAsync({ id: editTarget.id, payload });
        closeEditDialog();
      } catch (err) {
        const d = err?.response?.data;
        setEditError(
          d?.detail ||
            d?.custody_status?.[0] ||
            d?.title?.[0] ||
            'Unable to save item changes.'
        );
      }
    },
    [editTarget, updateItem, closeEditDialog]
  );

  const openVoidDialog = useCallback((item) => {
    setVoidTarget(item);
    setVoidReason('');
  }, []);

  const closeVoidDialog = useCallback(() => {
    setVoidTarget(null);
    setVoidReason('');
  }, []);

  const handleConfirmVoidClaim = useCallback(async () => {
    if (!voidTarget || !voidReason.trim()) return;
    await voidClaim.mutateAsync({
      itemId: voidTarget.id,
      voidReason: voidReason.trim(),
    });
    closeVoidDialog();
  }, [voidTarget, voidReason, voidClaim, closeVoidDialog]);

  const activeFiltersCount = useMemo(
    () => [categoryFilter, statusFilter, dateFrom || dateTo].filter(Boolean).length,
    [categoryFilter, statusFilter, dateFrom, dateTo]
  );

  return {
    viewMode,
    search,
    statusFilter,
    categoryFilter,
    dateFrom,
    dateTo,
    page,
    pageSize,
    items,
    totalCount,
    categories,
    locations,
    loading: isLoading,
    selectedItem,
    activeFiltersCount,
    updateParams,
    handleRowClick,
    handleClosePanel,
    approveTarget,
    shelfBin,
    setShelfBin,
    secretNote,
    setSecretNote,
    openApproveDialog,
    closeApproveDialog,
    handleConfirmApprove,
    isApproving: approveIntake.isPending,
    deleteTarget,
    setDeleteTarget,
    handleConfirmDelete,
    isDeleting: deleteItem.isPending,
    editTarget,
    editError,
    openEditDialog,
    closeEditDialog,
    handleConfirmEdit,
    isUpdatingItem: updateItem.isPending,
    voidTarget,
    voidReason,
    setVoidReason,
    openVoidDialog,
    closeVoidDialog,
    handleConfirmVoidClaim,
    isVoidingClaim: voidClaim.isPending,
  };
}
