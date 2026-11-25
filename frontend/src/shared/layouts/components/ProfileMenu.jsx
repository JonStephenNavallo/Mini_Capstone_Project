import React from 'react';
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  Popover,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LoginIcon from '@mui/icons-material/Login';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import { useNavigate } from 'react-router-dom';
import { useLogout } from '../../hooks/useLogout.js';
import { M3SegmentedList, M3SegmentedListItem } from '../../components/data-display/M3SegmentedList.jsx';
import M3PillButton from '../../components/actions/M3PillButton.jsx';
import { CARD_COLORS, CHROME_COLORS } from '../../theme/themeContextValue.js';

/**
 * ProfileMenu - Material 3 Expressive Account Profile Panel
 * Styled with the institutional OSAS / DLL deep-teal & orange accent palette.
 */
const ProfileMenu = ({ anchorEl, open, onClose, currentUser, onOpenAccountSettings }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const logout = useLogout();

  const isAdmin = currentUser?.role === 'ADMIN';
  const avatarLetter = (currentUser?.display_name || currentUser?.email || 'G').charAt(0).toUpperCase();
  const roleName = currentUser
    ? isAdmin
      ? 'OSAS Admin'
      : 'Student'
    : 'Guest Visitor';

  return (
    <Popover
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorReference={isMobile ? 'none' : 'anchorEl'}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          elevation: 0,
          sx: isMobile
            ? {
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                maxWidth: '100vw',
                maxHeight: '100vh',
                borderRadius: 0,
                m: 0,
                p: 2.5,
                pt: 'calc(env(safe-area-inset-top, 0px) + 16px)',
                bgcolor: '#eef2f6',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }
            : {
                mt: 1,
                width: 400,
                maxWidth: 'calc(100vw - 32px)',
                borderRadius: '32px',
                p: 2.5,
                bgcolor: '#eef2f6',
                border: 'none',
                boxShadow: '0 16px 40px -8px rgba(15, 23, 42, 0.16), 0 6px 16px -4px rgba(15, 23, 42, 0.08)',
                overflow: 'hidden',
              },
        },
      }}
    >
      {/* Top Close Row */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 1, pr: 0.25 }}>
        <IconButton
          size="small"
          onClick={onClose}
          aria-label="close profile menu"
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            color: 'text.secondary',
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.06)',
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 22 }} />
        </IconButton>
      </Box>

      {/* Connected M3 Segmented Hero Card */}
      <Box sx={{ mb: 1.5 }}>
        <M3SegmentedList
          orientation="vertical"
          gap="3px"
          containerShape="26px"
          itemShape="8px"
          itemContainerColor={CARD_COLORS.bg}
        >
          <M3SegmentedListItem>
            <Box sx={{ p: 2.25, width: '100%', boxSizing: 'border-box' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Avatar
                  src={currentUser?.profile_photo || undefined}
                  alt={currentUser?.display_name || currentUser?.email || 'User'}
                  sx={{
                    width: 68,
                    height: 68,
                    bgcolor: CHROME_COLORS.sidebarSelectedBg,
                    color: CHROME_COLORS.sidebarSelectedText,
                    border: `2px solid ${CARD_COLORS.accent}`,
                    fontSize: '1.85rem',
                    fontWeight: 700,
                    boxShadow: 'none',
                    flexShrink: 0,
                  }}
                >
                  {avatarLetter}
                </Avatar>

                <Box sx={{ minWidth: 0, flex: 1, pt: 0.5 }}>
                  <Typography
                    sx={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: CARD_COLORS.text,
                      lineHeight: 1.25,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {currentUser ? currentUser.display_name : 'Campus Visitor'}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: CARD_COLORS.secondaryText,
                      fontSize: '0.85rem',
                      lineHeight: 1.3,
                      mt: 0.4,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {currentUser ? currentUser.email : 'Not signed in'}
                  </Typography>

                  <Box sx={{ mt: 1.25, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={roleName}
                      size="small"
                      sx={{
                        height: 24,
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        bgcolor: isAdmin ? CHROME_COLORS.sidebarSelectedBg : 'rgba(36, 120, 168, 0.30)',
                        color: isAdmin ? CHROME_COLORS.sidebarSelectedText : '#bae6fd',
                        borderRadius: '9999px',
                      }}
                    />
                    {currentUser?.student_profile?.student_number && (
                      <Typography variant="caption" sx={{ color: CARD_COLORS.mutedText, fontWeight: 600 }}>
                        ID: {currentUser.student_profile.student_number}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          </M3SegmentedListItem>

          {currentUser && onOpenAccountSettings && (
            <M3SegmentedListItem
              onClick={() => {
                onClose();
                onOpenAccountSettings();
              }}
              leading={<ManageAccountsOutlinedIcon sx={{ fontSize: 22, color: CARD_COLORS.accent, ml: 0.5 }} />}
            >
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: CARD_COLORS.text, py: 0.75 }}>
                Account Settings
              </Typography>
            </M3SegmentedListItem>
          )}

          {isAdmin && (
            <M3SegmentedListItem
              onClick={() => {
                onClose();
                navigate('/admin/settings');
              }}
              leading={<ManageAccountsOutlinedIcon sx={{ fontSize: 22, color: CARD_COLORS.accent, ml: 0.5 }} />}
            >
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: CARD_COLORS.text, py: 0.75 }}>
                OSAS Portal Settings
              </Typography>
            </M3SegmentedListItem>
          )}
        </M3SegmentedList>
      </Box>

      {/* Sign Out or Sign In Action */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mb: 1.5 }}>
        {currentUser ? (
          <M3PillButton
            variant="filled"
            color="primary"
            size="large"
            fullWidth
            startIcon={<LogoutOutlinedIcon sx={{ fontSize: 20 }} />}
            onClick={() => {
              onClose();
              logout.mutate();
            }}
          >
            Sign out
          </M3PillButton>
        ) : (
          <M3PillButton
            variant="filled"
            color="primary"
            size="large"
            fullWidth
            startIcon={<LoginIcon sx={{ fontSize: 20 }} />}
            onClick={() => {
              onClose();
              navigate('/auth/login');
            }}
          >
            Sign in / Student Register
          </M3PillButton>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, pt: 1, pb: 0.5 }}>
        <Typography variant="caption" sx={{ fontSize: '0.725rem', color: 'text.secondary', fontWeight: 500 }}>
          OSAS Lost &amp; Found
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
          •
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.725rem', color: 'text.secondary', fontWeight: 500 }}>
          Campus Custody Policy
        </Typography>
      </Box>
    </Popover>
  );
};

export default ProfileMenu;
