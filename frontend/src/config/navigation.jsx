import React from 'react';
import HomeIcon from '@mui/icons-material/Home';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import SearchIcon from '@mui/icons-material/Search';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import FindInPageOutlinedIcon from '@mui/icons-material/FindInPageOutlined';
import HistoryIcon from '@mui/icons-material/History';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';

// Sidebar contains browsing destinations only; Report Lost & Report Found
// are triggered via desktop Hero CTAs and the mobile M3FabMenu (+) speed-dial.
export const STUDENT_NAV_GROUPS = [
  {
    group: 'Campus Portal',
    items: [
      { title: 'Home', path: '/', icon: <HomeOutlinedIcon />, activeIcon: <HomeIcon /> },
      { title: 'Explore Items', path: '/explore', icon: <SearchOutlinedIcon />, activeIcon: <SearchIcon /> },
      { title: 'Honesty Leaderboard', path: '/leaderboard', icon: <EmojiEventsOutlinedIcon />, activeIcon: <EmojiEventsIcon /> },
      { title: 'Claim Guide & Pass', path: '/claim', icon: <QrCode2Icon />, activeIcon: <QrCode2Icon /> },
    ],
  },
];

export const PERSONAL_STUDENT_NAV_GROUP = [
  {
    group: 'Personal',
    items: [
      {
        title: 'My Lost Reports',
        path: '/report-lost',
        icon: <FindInPageOutlinedIcon />,
        activeIcon: <FindInPageIcon />,
      },
      {
        title: 'My Records',
        path: '/my-records',
        icon: <HistoryOutlinedIcon />,
        activeIcon: <HistoryIcon />,
      },
    ],
  },
];

export const ADMIN_NAV_GROUPS = [
  {
    group: 'OSAS Operations',
    items: [
      { title: 'Dashboard', path: '/admin/dashboard', icon: <DashboardOutlinedIcon />, activeIcon: <DashboardIcon /> },
      { title: 'Claim Counter', path: '/admin/claim', icon: <VerifiedUserOutlinedIcon />, activeIcon: <VerifiedUserIcon /> },
    ],
  },
  {
    group: 'Inventory & Config',
    items: [
      { title: 'Items Directory', path: '/admin/directory', icon: <Inventory2OutlinedIcon />, activeIcon: <Inventory2Icon /> },
      { title: 'Student Accounts', path: '/admin/users', icon: <PeopleAltOutlinedIcon />, activeIcon: <PeopleAltIcon /> },
      { title: 'Configuration', path: '/admin/settings', icon: <SettingsOutlinedIcon />, activeIcon: <SettingsIcon /> },
    ],
  },
];

export function getNavItemsByRole(role) {
  if (role === 'ADMIN') {
    return ADMIN_NAV_GROUPS;
  }
  if (role === 'STUDENT') {
    return [...STUDENT_NAV_GROUPS, ...PERSONAL_STUDENT_NAV_GROUP];
  }
  return STUDENT_NAV_GROUPS;
}
