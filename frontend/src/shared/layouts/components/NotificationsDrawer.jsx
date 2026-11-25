import React, { useMemo, useState } from 'react';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import NotificationsOffOutlinedIcon from '@mui/icons-material/NotificationsOffOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { useNavigate } from 'react-router-dom';
import M3PillButton from '../../components/actions/M3PillButton.jsx';
import { useCurrentUser } from '../../hooks/useCurrentUser.js';
import { useNotifications } from '../../hooks/useNotifications.js';

/**
 * Resolve a safe internal route for any notification, normalizing legacy paths
 * (such as old `/claim` claim receipts) and falling back by notification category.
 */
function resolveNotificationRoute(item, role) {
  const raw = (item?.link_path || '').trim();
  if (role === 'ADMIN') {
    if (raw.startsWith('/admin/')) return raw;
    return '/admin/directory';
  }
  if (raw.startsWith('/')) {
    if (raw === '/claim' && item?.category === 'CLAIM') {
      return '/report-lost';
    }
    return raw;
  }
  switch (item?.category) {
    case 'MATCH_ALERT':
    case 'CLAIM':
      return '/report-lost';
    case 'INTAKE':
      return '/leaderboard';
    default:
      return '/explore';
  }
}

function getRouteLabel(path) {
  if (path.startsWith('/report-lost')) return 'View in My Lost Reports';
  if (path.startsWith('/leaderboard')) return 'View Honesty Leaderboard';
  if (path.startsWith('/explore')) return 'Browse Found Items';
  if (path.startsWith('/admin/directory')) return 'Open Items Directory';
  if (path.startsWith('/admin/claim')) return 'Open Claim Counter';
  return 'Open section';
}

function groupNotificationsByRecency(items) {
  if (!items.length) return [];
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const today = [];
  const earlier = [];
  items.forEach((item) => {
    const parsed = item.created_at ? Date.parse(item.created_at) : NaN;
    if (!Number.isNaN(parsed) && parsed < startOfToday) earlier.push(item);
    else today.push(item);
  });
  const groups = [];
  if (today.length) groups.push({ label: 'Today', items: today });
  if (earlier.length) groups.push({ label: 'Earlier', items: earlier });
  return groups;
}

const NotificationsDrawer = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const { data: user } = useCurrentUser();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllRead,
    deleteNotification,
    clearAllNotifications,
    isMarkingAllRead,
    isDeleting,
    isClearingAll,
    notificationPermission,
    requestDeviceNotificationPermission,
  } = useNotifications(user);

  const displayed = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications),
    [notifications, filter]
  );
  const groups = useMemo(() => groupNotificationsByRecency(displayed), [displayed]);

  const panelSurface = '#ffffff';
  const headerSurface = '#f0f4f9';
  const bodySurface = '#f8fafd';

  const getCategoryStyle = (item) => {
    const titleLower = (item?.title || '').toLowerCase();
    // Claim reversals require immediate student action -> red warning icon
    if (titleLower.includes('reversed') || titleLower.includes('action required')) {
      return {
        icon: <WarningAmberRoundedIcon sx={{ fontSize: 20 }} />,
        color: '#c62828',
        bg: '#fdf2f2',
      };
    }
    // Match alerts or items claimed by another owner -> amber warning icon
    if (
      item?.category === 'MATCH_ALERT' ||
      titleLower.includes('suggested match claimed') ||
      titleLower.includes('already claimed')
    ) {
      return {
        icon: <WarningAmberRoundedIcon sx={{ fontSize: 20 }} />,
        color: '#e65100',
        bg: '#fff4e5',
      };
    }
    if (item?.category === 'CLAIM' || item?.category === 'INTAKE') {
      return {
        icon: <CheckCircleOutlinedIcon sx={{ fontSize: 20 }} />,
        color: '#2e7d32',
        bg: '#edf8f1',
      };
    }
    return {
      icon: <InfoOutlinedIcon sx={{ fontSize: 20 }} />,
      color: theme.palette.primary.main,
      bg: '#edf4ff',
    };
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      transitionDuration={{ enter: 220, exit: 170 }}
      slotProps={{
        backdrop: {
          sx: {
            // Avoid backdrop-filter blur during Drawer slide animation to keep 60fps on desktop & mobile
            backgroundColor: isMobile
              ? 'rgba(1, 31, 47, 0.36)'
              : 'rgba(1, 31, 47, 0.24)',
          },
        },
        paper: {
          elevation: 0,
          sx: {
            width: isMobile ? '100vw' : 420,
            maxWidth: '100vw',
            height: isMobile ? '100dvh' : '100vh',
            m: 0,
            borderRadius: isMobile ? 0 : '24px 0 0 24px',
            bgcolor: panelSurface,
            color: 'text.primary',
            backgroundImage: 'none',
            borderLeft: isMobile ? 'none' : '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: isMobile ? 'none' : '-4px 0 18px rgba(15, 23, 42, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: { xs: 1.5, sm: 2.5 },
          pt: { xs: 'calc(env(safe-area-inset-top, 0px) + 12px)', sm: 2.25 },
          pb: 1.5,
          bgcolor: headerSurface,
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isMobile && (
              <IconButton size="small" onClick={onClose} aria-label="Close notifications" sx={{ color: 'text.primary' }}>
                <ArrowBackIcon />
              </IconButton>
            )}
            <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.1rem', color: 'text.primary' }}>
              Notifications
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {unreadCount > 0 && (
              <Tooltip title="Mark all as read">
                <IconButton
                  size="small"
                  onClick={() => markAllRead()}
                  disabled={isMarkingAllRead}
                  sx={{ color: 'text.secondary' }}
                >
                  <DoneAllIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {notifications.length > 0 && (
              <Tooltip title="Clear all notifications">
                <IconButton
                  size="small"
                  onClick={() => setConfirmClearOpen(true)}
                  disabled={isClearingAll}
                  aria-label="Clear all notifications"
                  sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                >
                  <DeleteSweepOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {!isMobile && (
              <IconButton size="small" onClick={onClose} aria-label="Close notifications" sx={{ color: 'text.secondary' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>

        <Tabs
          value={filter}
          onChange={(_, v) => setFilter(v)}
          sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5, fontWeight: 700, fontSize: '0.82rem' } }}
        >
          <Tab value="all" label={`All (${notifications.length})`} />
          <Tab value="unread" label={`Unread (${unreadCount})`} />
        </Tabs>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: bodySurface, p: 2 }}>
        {/* User-gesture tap banner for mobile Chrome & iOS PWA notification permission */}
        {user && notificationPermission === 'default' && (
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: '16px',
              bgcolor: '#edf4ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.25,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  bgcolor: 'rgba(13, 75, 110, 0.12)',
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <NotificationsActiveOutlinedIcon fontSize="small" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" fontWeight={800} sx={{ display: 'block', lineHeight: 1.25 }}>
                  Enable Device Notifications
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem' }}>
                  Get instant phone alerts for matches and claims.
                </Typography>
              </Box>
            </Box>
            <M3PillButton
              size="small"
              variant="filled"
              onClick={requestDeviceNotificationPermission}
              sx={{ flexShrink: 0 }}
            >
              Enable
            </M3PillButton>
          </Box>
        )}

        {!user ? (
          <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
            <NotificationsOffOutlinedIcon sx={{ fontSize: 44, opacity: 0.4, mb: 1 }} />
            <Typography variant="body2">Sign in to receive auto-match and custody notifications.</Typography>
          </Box>
        ) : isLoading ? (
          <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : groups.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
            <NotificationsOffOutlinedIcon sx={{ fontSize: 44, opacity: 0.4, mb: 1 }} />
            <Typography variant="body2">
              {filter === 'unread' ? 'All caught up! No unread alerts.' : 'No notifications yet.'}
            </Typography>
          </Box>
        ) : (
          groups.map((group) => (
            <Box key={group.label} sx={{ mb: 2.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'block',
                  mb: 1,
                  px: 0.5,
                }}
              >
                {group.label}
              </Typography>
              {group.items.map((item) => {
                const st = getCategoryStyle(item);
                const targetRoute = resolveNotificationRoute(item, user?.role);
                const routeLabel = getRouteLabel(targetRoute);
                return (
                  <Box
                    key={item.id}
                    onClick={() => {
                      if (!item.is_read) markAsRead(item.id);
                      onClose();
                      navigate(targetRoute);
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                      p: 1.5,
                      mb: 1,
                      borderRadius: '16px',
                      cursor: 'pointer',
                      bgcolor: item.is_read ? panelSurface : '#edf4ff',
                      '&:hover': { bgcolor: '#e3eefc' },
                    }}
                  >
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: '12px',
                        bgcolor: st.bg,
                        color: st.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {st.icon}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        fontWeight={item.is_read ? 600 : 800}
                        sx={{ lineHeight: 1.3, color: 'text.primary' }}
                      >
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.4, lineHeight: 1.4 }}>
                        {item.message}
                      </Typography>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.25,
                          mt: 0.65,
                          color: 'primary.main',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                          {routeLabel}
                        </Typography>
                        <ChevronRightIcon sx={{ fontSize: 15 }} />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      {!item.is_read && (
                        <Tooltip title="Mark read">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(item.id);
                            }}
                          >
                            <DoneIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete notification">
                        <IconButton
                          size="small"
                          aria-label="Delete notification"
                          disabled={isDeleting}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(item.id);
                          }}
                          sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                        >
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ))
        )}
      </Box>

      {/* M3 Confirmation Dialog for Clear All Notifications */}
      <Dialog
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backdropFilter: 'blur(6px)',
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
            },
          },
          paper: {
            elevation: 0,
            sx: {
              borderRadius: '28px',
              bgcolor: '#ffffff',
              backgroundImage: 'none',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.12)',
              overflow: 'hidden',
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, px: 2.5, pt: 2.5, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              bgcolor: 'rgba(211, 47, 47, 0.08)',
              color: 'error.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <DeleteSweepOutlinedIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
              Clear all notifications?
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'} will be removed
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: 2.5, pt: '20px !important', pb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.86rem', lineHeight: 1.6 }}>
            This permanently deletes all notifications from your inbox. Your lost reports and claim history will not be affected.
          </Typography>
        </DialogContent>
        <DialogActions
          disableSpacing
          sx={{
            px: 2.5,
            pb: 2,
            pt: 1,
            gap: 1.25,
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            justifyContent: 'flex-end',
          }}
        >
          <M3PillButton variant="text" color="neutral" fullWidth={isMobile} onClick={() => setConfirmClearOpen(false)}>
            Cancel
          </M3PillButton>
          <M3PillButton
            variant="filled"
            color="error"
            fullWidth={isMobile}
            disabled={isClearingAll}
            onClick={() => {
              clearAllNotifications(undefined, {
                onSuccess: () => setConfirmClearOpen(false),
              });
            }}
          >
            Clear All
          </M3PillButton>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
};

export default NotificationsDrawer;
