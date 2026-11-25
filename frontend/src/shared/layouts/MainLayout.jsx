import React, { useContext, useState } from 'react';
import {
  Box,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Outlet } from 'react-router-dom';
import Topbar from './components/Topbar.jsx';
import Sidebar from './components/Sidebar.jsx';
import { useBreadcrumbs } from '../utils/breadcrumbContextValue.js';
import { ThemeContext } from '../theme/themeContextValue.js';
import { useCurrentUser } from '../hooks/useCurrentUser.js';
import ForcePasswordChangeDialog from '../../features/auth/components/ForcePasswordChangeDialog.jsx';
import AdminWalkInIntakeDialog from '../../features/lost_and_found/components/AdminWalkInIntakeDialog.jsx';
import QrScannerDialog from '../../features/lost_and_found/components/QrScannerDialog.jsx';
import QrTagPrintDialog from '../../features/lost_and_found/components/QrTagPrintDialog.jsx';

const MainLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { chromeColors } = useContext(ThemeContext);
  const { data: currentUser } = useCurrentUser();
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { rightPanelContent, rightPanelExpanded, rightPanelWidth } = useBreadcrumbs();

  const handleDrawerToggle = () => {
    if (isMobile) setMobileOpen((prev) => !prev);
    else setOpen((prev) => !prev);
  };

  return (
    <Box
      sx={{
        height: { xs: '100dvh', sm: '100vh' },
        width: '100vw',
        overflow: 'hidden',
        bgcolor: chromeColors.bg,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <Topbar open={open} mobileOpen={mobileOpen} onDrawerToggle={handleDrawerToggle} />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          flex: 1,
          minHeight: 0,
          width: '100vw',
          overflow: 'hidden',
          bgcolor: chromeColors.bg,
        }}
      >
        <Sidebar
          open={open}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        {/* Outer Split-Pane Wrapper */}
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            overflow: 'hidden',
            mr: { xs: 0, sm: 2 },
            mb: { xs: 0, sm: 2 },
            gap: 2,
          }}
        >
          {/* Main Rounded Workspace Sheet (Exact Capstone_Project_Stg2 geometry) */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              display: rightPanelExpanded ? 'none' : 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              bgcolor: 'background.default',
              borderRadius: { xs: 0, sm: '16px' },
              boxShadow: (t) =>
                t.palette.mode === 'light'
                  ? 'inset 0 1px 3px rgba(0,0,0,0.01), 0 1px 3px rgba(0,0,0,0.03)'
                  : 'inset 0 1px 3px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease',
              minWidth: 0,
            }}
          >
            {/* Scrollable Page Content */}
            <Box
              sx={{
                flexGrow: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                px: { xs: 2, sm: 3 },
                pt: { xs: 2.5, sm: 3 },
                pb: { xs: 3, sm: 3 },
              }}
            >
              <Outlet />
            </Box>
          </Box>

          {/* Optional Desktop Right Split Panel */}
          {rightPanelContent && !isMobile && (
            <Box
              sx={{
                width: rightPanelExpanded ? '100%' : rightPanelWidth || '25vw',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                bgcolor: 'background.default',
                borderRadius: '16px',
                boxShadow: (t) =>
                  t.palette.mode === 'light'
                    ? 'inset 0 1px 3px rgba(0,0,0,0.01), 0 1px 3px rgba(0,0,0,0.03)'
                    : 'inset 0 1px 3px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.2)',
              }}
            >
              {rightPanelContent}
            </Box>
          )}
        </Box>
      </Box>

      <QrScannerDialog />
      <QrTagPrintDialog />
      {currentUser?.role === 'ADMIN' && <AdminWalkInIntakeDialog />}
      <ForcePasswordChangeDialog
        open={Boolean(currentUser?.needs_password_change)}
        userEmail={currentUser?.email}
      />
    </Box>
  );
};

export default MainLayout;
