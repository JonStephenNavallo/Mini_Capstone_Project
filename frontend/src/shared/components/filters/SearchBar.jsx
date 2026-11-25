import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, InputBase, Tooltip } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import MobileConnectedSearchSuggestions from './MobileConnectedSearchSuggestions.jsx';

/**
 * Google Workspace Pill SearchBar matching Capstone_Project_Stg2 Topbar aesthetics,
 * with optional mobile-connected live search suggestions dropdown.
 */
const SearchBar = ({
  value = '',
  onChange,
  onFocus,
  onBlur,
  placeholder = 'Search in Lost & Found Portal...',
  debounceMs = 250,
  sx = {},
  disabled = false,
  showClear = true,
  suggestions = [],
  onSelectSuggestion = null,
  suggestionsLoading = false,
  showSuggestionsOnDesktop = false,
}) => {
  // Keep a local input value decoupled from async parent/URL searchParam updates so
  // typing never flickers or drops characters when the debounce callback fires.
  const [localValue, setLocalValue] = useState(value);
  const [prevPropValue, setPrevPropValue] = useState(value);
  const [lastEmittedValue, setLastEmittedValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const timerRef = useRef(null);
  const blurTimerRef = useRef(null);
  const inputRef = useRef(null);

  // Sync only when the parent externally changes `value` (e.g., route navigation or
  // an external "Clear Filters" action), ignoring echoes of our own debounced `onChange`.
  if (value !== prevPropValue) {
    setPrevPropValue(value);
    if (value !== lastEmittedValue) {
      setLocalValue(value);
      setLastEmittedValue(value);
    }
  }

  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      clearTimeout(blurTimerRef.current);
    },
    []
  );

  const handleChange = (e) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    if (onChange) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setLastEmittedValue(newVal);
        onChange(newVal);
      }, debounceMs);
    }
  };

  const handleClear = () => {
    clearTimeout(timerRef.current);
    setLocalValue('');
    setLastEmittedValue('');
    onChange?.('');
    inputRef.current?.focus();
  };

  const handleSelectSuggestion = (item) => {
    clearTimeout(blurTimerRef.current);
    inputRef.current?.blur();
    setIsFocused(false);
    onSelectSuggestion?.(item);
  };

  const hasSuggestions = Array.isArray(suggestions) && suggestions.length > 0;
  const isDebouncing = localValue.trim() !== (value || '').trim();
  const isDropdownOpen =
    isFocused &&
    Boolean(localValue?.trim()) &&
    (hasSuggestions || suggestionsLoading || Boolean(onSelectSuggestion));

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: { xs: '100%', sm: '480px', md: '640px', lg: '720px' },
        ...sx,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: isFocused || isDropdownOpen ? '#ffffff' : '#e8eff5',
          borderRadius: {
            xs: isDropdownOpen ? '24px 24px 0 0' : '28px',
            sm: isDropdownOpen && showSuggestionsOnDesktop ? '24px 24px 0 0' : '28px',
          },
          padding: { xs: '0 10px 0 14px', sm: '0 10px 0 16px' },
          width: '100%',
          height: 46,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          border: '1px solid',
          borderColor: isFocused || isDropdownOpen ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
          borderBottom: isDropdownOpen
            ? { xs: 'none', sm: showSuggestionsOnDesktop ? 'none' : undefined }
            : undefined,
          boxShadow:
            isFocused || isDropdownOpen
              ? '0 4px 16px rgba(1, 31, 47, 0.22), 0 1px 3px rgba(1, 31, 47, 0.14)'
              : 'none',
          '&:hover': {
            backgroundColor: isFocused || isDropdownOpen ? '#ffffff' : '#f2f6fa',
          },
        }}
      >
        <SearchIcon sx={{ color: 'text.secondary', fontSize: 22, mr: { xs: 1, sm: 1.25 }, flexShrink: 0 }} />
        <InputBase
          inputRef={inputRef}
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={(e) => {
            clearTimeout(blurTimerRef.current);
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            // Brief delay so tapping a connected suggestion registers before the dropdown closes
            blurTimerRef.current = setTimeout(() => {
              setIsFocused(false);
              onBlur?.(e);
            }, 180);
          }}
          sx={{
            flex: 1,
            fontSize: '0.92rem',
            color: 'text.primary',
            height: '100%',
            '& .MuiInputBase-input': {
              padding: 0,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              color: 'text.primary',
              '&::placeholder': {
                color: 'text.secondary',
                opacity: 0.8,
                fontSize: '0.92rem',
              },
            },
          }}
        />
        {showClear && Boolean(localValue) && (
          <Tooltip title="Clear search" arrow>
            <IconButton
              size="small"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClear}
              sx={{
                p: 0.5,
                color: 'text.secondary',
                '&:hover': { color: 'text.primary', bgcolor: 'rgba(0, 0, 0, 0.06)' },
              }}
            >
              <ClearIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Seamless Attached Search Suggestions Container (mobile-only by default) */}
      {isDropdownOpen && (
        <Box
          sx={{
            display: showSuggestionsOnDesktop ? 'block' : { xs: 'block', sm: 'none' },
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1400,
          }}
        >
          <MobileConnectedSearchSuggestions
            suggestions={suggestions}
            query={localValue}
            isLoading={suggestionsLoading || isDebouncing}
            onSelect={handleSelectSuggestion}
          />
        </Box>
      )}
    </Box>
  );
};

export default SearchBar;
