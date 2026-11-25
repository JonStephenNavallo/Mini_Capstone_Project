import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { registerSessionReset } from '../auth/sessionUIReset.js';
import { showMobileHeader } from './mobileHeaderHelper.js';
import { BreadcrumbContext } from './breadcrumbContextValue.js';

export const BreadcrumbProvider = ({ children }) => {
  const [previewPanelOpen, setPreviewPanelOpen] = useState(false);
  const [rightActions, setRightActions] = useState(null);
  const [rightPanelContent, setRightPanelContent] = useState(null);
  const [rightPanelExpanded, setRightPanelExpanded] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(null);
  const [searchConfig, setSearchConfig] = useState(null);
  const rightPanelCloseHandlerRef = useRef(null);

  useEffect(() =>
    registerSessionReset(() => {
      setPreviewPanelOpen(false);
      setRightActions(null);
      setRightPanelContent(null);
      setRightPanelExpanded(false);
      setRightPanelWidth(null);
      setSearchConfig(null);
      rightPanelCloseHandlerRef.current = null;
    }),
  []);

  const setRightPanelCloseHandler = useCallback((handler) => {
    rightPanelCloseHandlerRef.current = handler;
  }, []);

  const value = useMemo(
    () => ({
      previewPanelOpen,
      setPreviewPanelOpen,
      rightActions,
      setRightActions,
      rightPanelContent,
      setRightPanelContent,
      rightPanelExpanded,
      setRightPanelExpanded,
      rightPanelWidth,
      setRightPanelWidth,
      rightPanelCloseHandlerRef,
      setRightPanelCloseHandler,
      searchConfig,
      setSearchConfig,
      showMobileHeader,
    }),
    [
      previewPanelOpen,
      rightActions,
      rightPanelContent,
      rightPanelExpanded,
      rightPanelWidth,
      searchConfig,
      setRightPanelCloseHandler,
    ]
  );

  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
};

export default BreadcrumbProvider;
