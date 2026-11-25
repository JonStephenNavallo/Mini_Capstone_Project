import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { showMobileHeader } from './mobileHeaderHelper.js';

export const BreadcrumbContext = createContext({
  previewPanelOpen: false,
  setPreviewPanelOpen: () => {},
  rightActions: null,
  setRightActions: () => {},
  rightPanelContent: null,
  setRightPanelContent: () => {},
  rightPanelExpanded: false,
  setRightPanelExpanded: () => {},
  rightPanelWidth: null,
  setRightPanelWidth: () => {},
  rightPanelCloseHandlerRef: { current: null },
  setRightPanelCloseHandler: () => {},
  searchConfig: null,
  setSearchConfig: () => {},
  showMobileHeader,
});

export const useBreadcrumbs = () => useContext(BreadcrumbContext);

export const useHeaderSearch = ({
  value = '',
  onChange,
  placeholder = 'Search in Lost & Found Portal...',
  visible = true,
  suggestions,
  onSelectSuggestion = null,
  suggestionsLoading = false,
  showSuggestionsOnDesktop = false,
} = {}) => {
  const { setSearchConfig } = useBreadcrumbs();
  const onChangeRef = useRef(onChange);
  const onSelectSuggestionRef = useRef(onSelectSuggestion);
  const hasSelectHandler = Boolean(onSelectSuggestion);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onSelectSuggestionRef.current = onSelectSuggestion;
  }, [onSelectSuggestion]);

  const stableOnChange = useCallback((val, ...args) => {
    onChangeRef.current?.(val, ...args);
  }, []);

  const stableOnSelectSuggestion = useCallback((item, ...args) => {
    onSelectSuggestionRef.current?.(item, ...args);
  }, []);

  useEffect(() => {
    if (!visible) {
      setSearchConfig((prev) => (prev === null ? prev : null));
      return;
    }

    const nextSelectHandler = hasSelectHandler ? stableOnSelectSuggestion : null;

    setSearchConfig((prev) => {
      if (
        prev &&
        prev.value === value &&
        prev.placeholder === placeholder &&
        prev.visible === visible &&
        prev.suggestions === suggestions &&
        prev.onSelectSuggestion === nextSelectHandler &&
        prev.suggestionsLoading === suggestionsLoading &&
        prev.showSuggestionsOnDesktop === showSuggestionsOnDesktop
      ) {
        return prev;
      }
      return {
        value,
        onChange: stableOnChange,
        placeholder,
        visible,
        suggestions,
        onSelectSuggestion: nextSelectHandler,
        suggestionsLoading,
        showSuggestionsOnDesktop,
      };
    });
  }, [
    value,
    placeholder,
    visible,
    suggestions,
    hasSelectHandler,
    suggestionsLoading,
    showSuggestionsOnDesktop,
    stableOnChange,
    stableOnSelectSuggestion,
    setSearchConfig,
  ]);

  // Clear header search only on unmount so updating suggestions never remounts SearchBar
  useEffect(
    () => () => {
      setSearchConfig((prev) => (prev === null ? prev : null));
    },
    [setSearchConfig]
  );
};
