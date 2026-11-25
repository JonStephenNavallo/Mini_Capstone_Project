"""Shared DRF pagination classes."""
from rest_framework.pagination import PageNumberPagination


class StandardPageNumberPagination(PageNumberPagination):
    """Standard page-number paginator for large-dataset endpoints."""

    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 100
    page_query_param = 'page'


class OptionalPageNumberPagination(StandardPageNumberPagination):
    """Bypasses pagination when ?all=true is supplied (for dropdowns/options)."""

    def paginate_queryset(self, queryset, request, view=None):
        if request.query_params.get('all') == 'true':
            return None
        return super().paginate_queryset(queryset, request, view)
