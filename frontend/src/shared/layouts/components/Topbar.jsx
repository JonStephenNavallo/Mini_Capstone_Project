import React, { useContext, useState } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import ProfileMenu from './ProfileMenu.jsx';
import NotificationsDrawer from './NotificationsDrawer.jsx';
import BrandLogos from '../../components/branding/BrandLogos.jsx';
import SearchBar from '../../components/filters/SearchBar.jsx';
import { useBreadcrumbs } from '../../utils/breadcrumbContextValue.js';
import { ThemeContext } from '../../theme/themeContextValue.js';
import { useCurrentUser } from '../../hooks/useCurrentUser.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import AccountSettingsDialog from '../../../features/users/components/AccountSettingsDialog.jsx';

const Topbar = ({ open, mobileOpen = false, onDrawerToggle }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { chromeColors } = useContext(ThemeContext);
  const isDrawerOpen = isMobile ? Boolean(mobileOpen) : Boolean(open);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const { searchConfig, rightPanelContent, rightPanelExpanded, rightPanelWidth } = useBreadcrumbs();
  const { data: currentUser } = useCurrentUser();
  const { unreadCount: badgeCount } = useNotifications(currentUser);
  const isSearchActive = isSearchFocused || Boolean(searchConfig?.value);
  const roleLabel = currentUser
    ? currentUser.role === 'ADMIN'
      ? 'OSAS Admin'
      : 'Student'
    : 'Lost&Found';
  const avatarLetter = (currentUser?.display_name || currentUser?.email || 'G').charAt(0).toUpperCase();

  return (
    <AppBar
      position="sticky"
      elevation={0}
      data-search-active={isSearchActive ? 'true' : undefined}
      sx={{
        bgcolor: chromeColors.bg,
        color: chromeColors.text,
        borderBottom: 'none',
        boxShadow: 'none',
        overflow: 'visible',
        zIndex: 1200,
        height: 64,
        flexShrink: 0,
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          minHeight: { xs: 64, sm: 64 },
          pl: { xs: 1.5, sm: 3 },
          pr: { xs: 1.5, sm: 2 },
          gap: { xs: 1, sm: 2 },
          overflow: 'visible',
        }}
      >
        {/* Left: Hamburger + Brand Logo + Role Badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Tooltip title={isDrawerOpen ? 'Collapse menu' : 'Expand menu'} placement="right" arrow>
            <IconButton
              color="inherit"
              aria-label={isDrawerOpen ? 'collapse drawer' : 'open drawer'}
              onClick={onDrawerToggle}
              sx={{
                color: chromeColors.mutedText,
                p: 0.5,
                mr: { xs: 0.5, sm: 1 },
                borderRadius: '50%',
                '&:hover': { bgcolor: chromeColors.hoverBg, color: chromeColors.text },
              }}
            >
              {isDrawerOpen ? <MenuOpenIcon sx={{ fontSize: 24 }} /> : <MenuIcon sx={{ fontSize: 24 }} />}
            </IconButton>
          </Tooltip>

          <Box
            sx={{
              display:
                searchConfig && searchConfig.visible !== false
                  ? { xs: 'none', sm: open ? 'flex' : 'none' }
                  : open
                    ? 'flex'
                    : 'none',
              alignItems: 'center',
              gap: 1.1,
            }}
          >
            <BrandLogos height={38} dividerHeight={22} gap={1} dividerColor={chromeColors.divider} />
            <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <Typography
                noWrap
                sx={{
                  fontWeight: 700,
                  color: chromeColors.mutedText,
                  letterSpacing: '0.3px',
                  lineHeight: 1.1,
                  fontSize: '0.78rem',
                }}
              >
                {roleLabel}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Center/Left: Google Workspace Pill SearchBar pinned to workspace edges on desktop & expanding on mobile */}
        {searchConfig && searchConfig.visible !== false ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flex: { xs: 1, sm: 'none' },
              position: { xs: 'static', sm: 'absolute' },
              left: { sm: open ? 264 : 80 },
              right: {
                xs: 'auto',
                sm:
                  rightPanelContent && !rightPanelExpanded
                    ? `calc(${rightPanelWidth || '25vw'} + 32px)`
                    : 140,
              },
              transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              minWidth: 0,
              mx: { xs: isSearchActive ? 0 : 0.5, sm: 0 },
              zIndex: isSearchFocused ? 1300 : 1,
            }}
          >
            <SearchBar
              value={searchConfig.value || ''}
              onChange={searchConfig.onChange}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder={searchConfig.placeholder || 'Search in Lost & Found Portal...'}
              suggestions={searchConfig.suggestions}
              onSelectSuggestion={searchConfig.onSelectSuggestion}
              suggestionsLoading={searchConfig.suggestionsLoading}
              showSuggestionsOnDesktop={searchConfig.showSuggestionsOnDesktop}
              sx={{ maxWidth: { xs: '100%', sm: '100%' }, width: '100%' }}
            />
          </Box>
        ) : (
          <Box sx={{ flexGrow: 1 }} />
        )}

        {/* Right: Notification Bell (collapses on mobile when search is active) + Circular Avatar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: isSearchActive ? 0 : 1, sm: 1.5 },
            flexShrink: 0,
            position: 'relative',
            zIndex: 2,
            ml: 'auto',
            transition: 'gap 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Notification Button — smoothly collapses on mobile when search is focused/active so SearchBar extends rightwards */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: { xs: isSearchActive ? 0 : 'auto', sm: 'auto' },
              maxWidth: { xs: isSearchActive ? 0 : 48, sm: 'none' },
              opacity: { xs: isSearchActive ? 0 : 1, sm: 1 },
              transform: { xs: isSearchActive ? 'scale(0.7)' : 'scale(1)', sm: 'none' },
              overflow: { xs: isSearchActive ? 'hidden' : 'visible', sm: 'visible' },
              pointerEvents: { xs: isSearchActive ? 'none' : 'auto', sm: 'auto' },
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <Tooltip title="Notifications">
              <IconButton
                onClick={() => setNotificationsOpen(true)}
                size="small"
                sx={{
                  color: chromeColors.mutedText,
                  p: 1,
                  borderRadius: '50%',
                  overflow: 'visible',
                  '&:hover': { bgcolor: chromeColors.hoverBg, color: chromeColors.text },
                }}
              >
                <Badge
                  color="error"
                  badgeContent={badgeCount}
                  max={99}
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      height: 18,
                      minWidth: 18,
                      px: 0.5,
                      borderRadius: '9999px',
                      border: `2px solid ${chromeColors.bg}`,
                      top: 2,
                      right: 0,
                      transform: 'scale(1) translate(55%, -45%)',
                    },
                  }}
                >
                  <NotificationsNoneIcon sx={{ fontSize: 24 }} />
                </Badge>
              </IconButton>
            </Tooltip>
          </Box>

          {/* Standalone Circular Avatar with Orange Tonal Ring & Letter */}
          <Box
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              width: 46,
              height: 46,
              boxSizing: 'border-box',
              p: '2px',
              borderRadius: '50%',
              border: `2px solid ${chromeColors.fabBg}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              bgcolor: 'transparent',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'scale(1.05)',
                borderColor: chromeColors.sidebarSelectedText,
              },
            }}
          >
            <Avatar
              src={currentUser?.profile_photo || undefined}
              alt={currentUser?.display_name || currentUser?.email || 'User'}
              sx={{
                width: 38,
                height: 38,
                bgcolor: chromeColors.sidebarSelectedBg,
                color: chromeColors.sidebarSelectedText,
                fontSize: '1.1rem',
                fontWeight: 700,
              }}
            >
              {avatarLetter}
            </Avatar>
          </Box>

          <NotificationsDrawer open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
          <ProfileMenu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            currentUser={currentUser}
            onOpenAccountSettings={() => setAccountSettingsOpen(true)}
          />
          <AccountSettingsDialog
            open={accountSettingsOpen}
            onClose={() => setAccountSettingsOpen(false)}
            currentUser={currentUser}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
