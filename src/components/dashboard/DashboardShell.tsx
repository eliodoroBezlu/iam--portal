'use client';
import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  AppBar, Toolbar, Typography, IconButton, Avatar, Box,
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Divider, Tooltip, Menu, MenuItem, useTheme, useMediaQuery,
} from '@mui/material';
import {
  DashboardOutlined, PersonOutlined, MenuOutlined,
  LogoutOutlined, SecurityOutlined, ChevronLeftOutlined,
  AdminPanelSettingsOutlined,
} from '@mui/icons-material';
import { logoutAction } from '@/app/actions/auth';

// ── Constants ──────────────────────────────────────────────────────

const DRAWER_WIDTH = 240;

const BASE_NAV_ITEMS = [
  { label: 'Mis servicios', href: '/dashboard',         icon: <DashboardOutlined /> },
  { label: 'Mi perfil',     href: '/dashboard/profile', icon: <PersonOutlined />    },
];

const ADMIN_NAV_ITEMS = [
  { label: 'Administración', href: '/dashboard/admin', icon: <AdminPanelSettingsOutlined /> },
];

// ── Component ──────────────────────────────────────────────────────

interface Props {
  username: string;
  isAdmin?: boolean;
  children: React.ReactNode;
}

export function DashboardShell({ username, isAdmin = false, children }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [drawerOpen,  setDrawerOpen]  = useState(!isMobile);
  const [anchorEl,    setAnchorEl]    = useState<null | HTMLElement>(null);
  const [loggingOut,  setLoggingOut]  = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutAction();
    } finally {
      // Full page reload — el middleware evalúa las cookies limpias desde cero
      window.location.replace('/login');
    }
  };

  // ── Drawer content ─────────────────────────────────────────────

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Brand */}
      <Box
        sx={{
          px: 2.5, py: 2,
          display: 'flex', alignItems: 'center', gap: 1.5,
          background: 'linear-gradient(135deg, #1565C0, #1976D2)',
        }}
      >
        <SecurityOutlined sx={{ color: 'white', fontSize: 26 }} />
        <Typography variant="subtitle1" fontWeight={700} color="white" noWrap>
          IAM Portal
        </Typography>
        {isMobile && (
          <IconButton
            size="small"
            onClick={() => setDrawerOpen(false)}
            sx={{ ml: 'auto', color: 'white' }}
          >
            <ChevronLeftOutlined />
          </IconButton>
        )}
      </Box>

      <Divider />

      {/* Navigation */}
      <List sx={{ flexGrow: 1, pt: 1 }}>
        {[...BASE_NAV_ITEMS, ...(isAdmin ? ADMIN_NAV_ITEMS : [])].map((item) => {
          const active = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <ListItem key={item.href} disablePadding>
              <ListItemButton
                selected={active}
                onClick={() => {
                  router.push(item.href);
                  if (isMobile) setDrawerOpen(false);
                }}
                sx={{
                  mx: 1, borderRadius: 2, mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '& .MuiListItemIcon-root': { color: 'white' },
                    '&:hover': { backgroundColor: 'primary.dark' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* Logout */}
      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            disabled={loggingOut}
            sx={{ mx: 1, borderRadius: 2, mb: 1, color: 'error.main' }}
          >
            <ListItemIcon sx={{ minWidth: 38, color: 'error.main' }}>
              <LogoutOutlined />
            </ListItemIcon>
            <ListItemText primary="Cerrar sesión" />
          </ListItemButton>
        </ListItem>
      </List>

    </Box>
  );

  // ── Render ─────────────────────────────────────────────────────

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>

      {/* AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          background: 'white',
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
          width: { md: `calc(100% - ${drawerOpen ? DRAWER_WIDTH : 0}px)` },
          ml:    { md: drawerOpen ? `${DRAWER_WIDTH}px` : 0 },
          transition: theme.transitions.create(['width', 'margin'], {
            easing:   theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={() => setDrawerOpen((v) => !v)}
            sx={{ mr: 2 }}
            aria-label="Toggle navigation"
          >
            <MenuOutlined />
          </IconButton>

          <Typography variant="h6" fontWeight={600} sx={{ flexGrow: 1 }}>
            Sistema de Gestión San Cristóbal
          </Typography>

          {/* User avatar menu */}
          <Tooltip title={username}>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar
                sx={{
                  width: 36, height: 36,
                  bgcolor: 'primary.main',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                }}
              >
                {username.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={  { horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{ elevation: 3, sx: { mt: 1, minWidth: 160, borderRadius: 2 } }}
          >
            <MenuItem
              onClick={() => { setAnchorEl(null); router.push('/dashboard/profile'); }}
            >
              <PersonOutlined fontSize="small" sx={{ mr: 1.5 }} />
              Mi perfil
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => { setAnchorEl(null); handleLogout(); }}
              sx={{ color: 'error.main' }}
            >
              <LogoutOutlined fontSize="small" sx={{ mr: 1.5 }} />
              Cerrar sesión
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            border: 'none',
            boxShadow: '2px 0 8px rgba(0,0,0,0.08)',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          mt: '64px',
          minHeight: 'calc(100vh - 64px)',
          bgcolor: 'grey.50',
        }}
      >
        {children}
      </Box>

    </Box>
  );
}
