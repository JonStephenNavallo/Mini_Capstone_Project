import React, { useCallback, useContext, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Box,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LoginIcon from '@mui/icons-material/Login';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getNavItemsByRole } from '../../../config/navigation.jsx';
import { useCurrentUser } from '../../hooks/useCurrentUser.js';
import { useBreadcrumbs } from '../../utils/breadcrumbContextValue.js';
import { ThemeContext } from '../../theme/themeContextValue.js';
import BrandLogos from '../../components/branding/BrandLogos.jsx';
import { useLostFoundUiStore } from '../../../features/lost_and_found/state/lostFoundUiStore.js';

const drawerWidth = 256;
const collapsedWidth = 72;

const Sidebar = ({ open, mobileOpen, onMobileClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { chromeColors } = useContext(ThemeContext);
  const { setRightPanelContent, setRightPanelExpanded } = useBreadcrumbs();
  const effectiveOpen = isMobile ? true : open;
  const location = useLocation();
  const navigate = useNavigate();

  const clearRightPanel = useCallback(() => {
    setRightPanelContent((prev) => (prev === null ? prev : null));
    setRightPanelExpanded((prev) => (prev ? false : prev));
  }, [setRightPanelContent, setRightPanelExpanded]);

  const { data: currentUser } = useCurrentUser();
  const openWalkInIntake = useLostFoundUiStore((s) => s.openWalkInIntake);
  const isAdmin = currentUser?.role === 'ADMIN';
  const navItems = useMemo(() => getNavItemsByRole(currentUser?.role), [currentUser?.role]);
  const roleLabel = currentUser
    ? currentUser.role === 'ADMIN'
      ? 'OSAS Admin'
      : 'Student'
    : 'Lost & Found';

  useEffect(() => {
    if (!isMobile || !mobileOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onMobileClose) onMobileClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, mobileOpen, onMobileClose]);

  const handleBottomAction = useCallback(() => {
    clearRightPanel();
    onMobileClose?.();
    navigate('/auth/login');
  }, [clearRightPanel, onMobileClose, navigate]);

  const renderNavItem = useCallback(
    (item) => {
      const isSelected =
        item.path === '/'
          ? location.pathname === '/'
          : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

      const buttonContent = (
        <ListItemButton
          component={Link}
          to={item.path}
          selected={isSelected}
          onClick={() => {
            clearRightPanel();
            onMobileClose?.();
          }}
          sx={{
            height: isMobile ? 48 : effectiveOpen ? 36 : 32,
            py: 0,
            alignItems: 'center',
            borderRadius: isMobile ? '24px' : effectiveOpen ? '20px' : '16px',
            justifyContent: effectiveOpen ? 'initial' : 'center',
            px: isMobile ? 2.5 : effectiveOpen ? 2.5 : 0,
            mx: effectiveOpen ? 1.5 : 'auto',
            width: effectiveOpen ? 'auto' : 56,
            minWidth: effectiveOpen ? 'auto' : 56,
            maxWidth: effectiveOpen ? 'auto' : 56,
            bgcolor: 'transparent',
            color: chromeColors.text,
            '&:hover': {
              bgcolor: chromeColors.hoverBg,
            },
            ...(isSelected && {
              bgcolor: `${chromeColors.sidebarSelectedBg} !important`,
              color: `${chromeColors.sidebarSelectedText} !important`,
              '&:hover': {
                bgcolor: `${chromeColors.sidebarSelectedHoverBg} !important`,
              },
              '& .MuiListItemIcon-root': {
                color: `${chromeColors.sidebarSelectedText} !important`,
              },
            }),
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              mr: effectiveOpen ? (isMobile ? 2 : 1.5) : 0,
              justifyContent: 'center',
              alignItems: 'center',
              color: isSelected ? chromeColors.sidebarSelectedText : chromeColors.mutedText,
              '& .MuiSvgIcon-root': {
                fontSize: isMobile ? '1.45rem' : '1.25rem',
              },
            }}
          >
            {isSelected && item.activeIcon ? item.activeIcon : item.icon}
          </ListItemIcon>
          <ListItemText
            primary={item.title}
            sx={{
              opacity: isMobile ? 1 : 0,
              display: effectiveOpen ? 'block' : 'none',
              m: 0,
              animation: !isMobile && effectiveOpen ? 'fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) 0.1s forwards' : 'none',
              '@keyframes fadeIn': {
                '0%': { opacity: 0, transform: 'translateX(-6px)' },
                '100%': { opacity: 1, transform: 'translateX(0)' },
              },
              '& .MuiListItemText-primary': {
                fontSize: isMobile ? '0.84rem' : '0.86rem',
                fontWeight: isSelected ? 700 : 500,
                color: isSelected ? chromeColors.sidebarSelectedText : chromeColors.text,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
            }}
          />
        </ListItemButton>
      );

      return (
        <ListItem key={item.path} disablePadding sx={{ display: 'block', mb: effectiveOpen ? 0.5 : 1 }}>
          {!effectiveOpen ? (
            <Tooltip title={item.title} placement="right" arrow>
              {buttonContent}
            </Tooltip>
          ) : (
            buttonContent
          )}
        </ListItem>
      );
    },
    [location.pathname, clearRightPanel, onMobileClose, isMobile, effectiveOpen, chromeColors]
  );

  const drawerContent = useMemo(
    () => (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', pt: 2 }}>
        {/* Desktop Navigation Rail FAB (Gmail / Google Workspace pattern for OSAS Admin Walk-In Intake) */}
        {!isMobile && isAdmin && (
          <Box
            sx={{
              px: effectiveOpen ? 1.5 : 0,
              pb: 1.5,
              display: 'flex',
              justifyContent: effectiveOpen ? 'flex-start' : 'center',
            }}
          >
            <Tooltip title={effectiveOpen ? '' : 'Walk-In Intake'} placement="right" arrow>
              <ListItemButton
                onClick={openWalkInIntake}
                aria-label="Walk-In Intake"
                sx={{
                  flexGrow: 0,
                  height: 52,
                  width: effectiveOpen ? 'auto' : 52,
                  minWidth: 52,
                  px: effectiveOpen ? 2.25 : 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: effectiveOpen ? 1.25 : 0,
                  borderRadius: '16px',
                  bgcolor: chromeColors.fabBg,
                  color: chromeColors.fabText,
                  boxShadow: 'none',
                  transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.15s ease',
                  '&:hover': {
                    bgcolor: chromeColors.fabHoverBg,
                  },
                }}
              >
                <AddIcon sx={{ fontSize: 24, flexShrink: 0 }} />
                {effectiveOpen && (
                  <Typography
                    variant="button"
                    noWrap
                    sx={{
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      color: chromeColors.fabText,
                      textTransform: 'none',
                      lineHeight: 1,
                    }}
                  >
                    Walk-In Intake
                  </Typography>
                )}
              </ListItemButton>
            </Tooltip>
          </Box>
        )}

        <Box
          sx={{
            overflowY: 'auto',
            overflowX: 'hidden',
            flexGrow: 1,
            '&::-webkit-scrollbar': { width: '6px' },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '4px',
            },
          }}
        >
          <List>
            {navItems.map((itemOrGroup, index) => {
              if (itemOrGroup.group) {
                return (
                  <React.Fragment key={itemOrGroup.group}>
                    {index > 0 && <Divider sx={{ my: 1, mx: 2, borderColor: chromeColors.divider }} />}
                    <ListSubheader
                      disableSticky
                      sx={{
                        bgcolor: 'transparent',
                        lineHeight: isMobile ? '40px' : '32px',
                        opacity: isMobile ? 1 : 0,
                        visibility: effectiveOpen ? 'visible' : 'hidden',
                        height: effectiveOpen ? 'auto' : 0,
                        minHeight: effectiveOpen ? 'auto' : 0,
                        fontWeight: 600,
                        color: chromeColors.mutedText,
                        fontSize: isMobile ? '0.72rem' : '0.75rem',
                        textTransform: isMobile ? 'none' : 'uppercase',
                        letterSpacing: isMobile ? 0.1 : 1,
                        px: isMobile ? 3 : 2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        animation: !isMobile && effectiveOpen ? 'fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) 0.1s forwards' : 'none',
                        '@keyframes fadeIn': {
                          '0%': { opacity: 0, transform: 'translateX(-6px)' },
                          '100%': { opacity: 1, transform: 'translateX(0)' },
                        },
                      }}
                    >
                      {itemOrGroup.group}
                    </ListSubheader>
                    {itemOrGroup.items.map((item) => renderNavItem(item))}
                  </React.Fragment>
                );
              }
              return renderNavItem(itemOrGroup);
            })}
          </List>
        </Box>

        {!currentUser && (
          <Box sx={{ pb: 2 }}>
            <Divider sx={{ mb: 1, mx: 2, borderColor: chromeColors.divider }} />
            <List>
              <ListItem disablePadding sx={{ display: 'block' }}>
                {!effectiveOpen ? (
                  <Tooltip title="Sign In / Register" placement="right" arrow>
                    <ListItemButton
                      onClick={handleBottomAction}
                      sx={{
                        height: 32,
                        width: 56,
                        minWidth: 56,
                        maxWidth: 56,
                        py: 0,
                        px: 0,
                        mx: 'auto',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '16px',
                        bgcolor: 'transparent',
                        color: chromeColors.text,
                        '&:hover': { bgcolor: chromeColors.hoverBg },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 0, justifyContent: 'center', color: chromeColors.mutedText }}>
                        <LoginIcon />
                      </ListItemIcon>
                    </ListItemButton>
                  </Tooltip>
                ) : (
                  <ListItemButton
                    onClick={handleBottomAction}
                    sx={{
                      height: isMobile ? 48 : 36,
                      py: 0,
                      alignItems: 'center',
                      justifyContent: 'initial',
                      px: 2.5,
                      mx: 1.5,
                      borderRadius: isMobile ? '24px' : '20px',
                      bgcolor: 'transparent',
                      color: chromeColors.text,
                      '&:hover': { bgcolor: chromeColors.hoverBg },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: isMobile ? 2 : 1.5,
                        justifyContent: 'center',
                        color: chromeColors.mutedText,
                        '& .MuiSvgIcon-root': { fontSize: isMobile ? '1.45rem' : '1.25rem' },
                      }}
                    >
                      <LoginIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Sign In / Register"
                      sx={{
                        m: 0,
                        '& .MuiListItemText-primary': {
                          fontSize: isMobile ? '0.84rem' : '0.8125rem',
                          fontWeight: 500,
                          color: chromeColors.text,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        },
                      }}
                    />
                  </ListItemButton>
                )}
              </ListItem>
            </List>
          </Box>
        )}
      </Box>
    ),
    [navItems, isMobile, isAdmin, openWalkInIntake, effectiveOpen, renderNavItem, handleBottomAction, currentUser, chromeColors]
  );

  if (isMobile) {
    const MOBILE_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';
    const transitionTiming = mobileOpen ? `500ms ${MOBILE_EASING}` : `380ms ${MOBILE_EASING}`;

    return createPortal(
      <Box
        inert={!mobileOpen}
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: (t) => t.zIndex.drawer + 100,
          pointerEvents: mobileOpen ? 'auto' : 'none',
          display: { xs: 'block', sm: 'none' },
        }}
      >
        <Box
          onClick={onMobileClose}
          sx={{
            position: 'fixed',
            inset: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            opacity: mobileOpen ? 1 : 0,
            transition: `opacity ${transitionTiming}`,
            willChange: 'opacity',
          }}
        />
        <Box
          role="dialog"
          aria-modal={mobileOpen ? 'true' : undefined}
          aria-label="Navigation menu"
          className="MuiDrawer-paper"
          sx={{
            position: 'fixed',
            top: 0,
            bottom: 0,
            left: 0,
            boxSizing: 'border-box',
            width: 305,
            maxWidth: '85vw',
            borderRadius: '0px 24px 24px 0px',
            bgcolor: chromeColors.bg,
            color: chromeColors.text,
            py: 1.5,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: mobileOpen ? '0 8px 32px rgba(0, 0, 0, 0.24)' : 'none',
            transform: mobileOpen ? 'translate3d(0, 0, 0)' : 'translate3d(-104%, 0, 0)',
            transition: `transform ${transitionTiming}`,
            willChange: 'transform',
          }}
        >
          <Box sx={{ px: 2.5, pb: 0.5, pt: 1, display: 'flex', alignItems: 'center', gap: 1.25, flexShrink: 0 }}>
            <BrandLogos height={36} dividerHeight={20} gap={0.85} dividerColor={chromeColors.divider} />
            <Typography variant="body1" noWrap sx={{ fontWeight: 700, color: chromeColors.mutedText, fontSize: '0.95rem' }}>
              {roleLabel}
            </Typography>
          </Box>
          {drawerContent}
        </Box>
      </Box>,
      document.body
    );
  }

  return (
    <Box
      component="nav"
      sx={{
        width: { sm: open ? drawerWidth : collapsedWidth },
        flexShrink: { sm: 0 },
        display: { xs: 'none', sm: 'block' },
        height: '100%',
        m: 0.5,
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <Drawer
        variant="permanent"
        open
        sx={{
          height: '100%',
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : collapsedWidth,
            bgcolor: chromeColors.bg,
            color: chromeColors.text,
            transition: 'width 0.3s',
            overflowX: 'hidden',
            boxShadow: 'none',
            borderRight: 'none',
            position: 'static',
            height: '100%',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default React.memo(Sidebar);
