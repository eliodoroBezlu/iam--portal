'use client';
import React, { useState } from 'react';
import {
  Box, Tabs, Tab, Typography,
} from '@mui/material';
import {
  PeopleOutlined, MiscellaneousServicesOutlined,
  VpnKeyOutlined, HistoryOutlined, BadgeOutlined, AppsOutlined,
} from '@mui/icons-material';
import { UsersTab }    from './UsersTab';
import { ServicesTab } from './ServicesTab';
import { ApiKeysTab }  from './ApiKeysTab';
import { AuditTab }    from './AuditTab';
import { WorkersTab }  from './WorkersTab';
import { OAuthClientsTab } from './OAuthClientsTab';

interface TabPanelProps {
  children: React.ReactNode;
  index:    number;
  value:    number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ pt: 3 }}>
      {value === index && children}
    </Box>
  );
}

const TABS = [
  { label: 'Usuarios',      icon: <PeopleOutlined />                    },
  { label: 'Servicios',     icon: <MiscellaneousServicesOutlined />      },
  { label: 'API Keys',      icon: <VpnKeyOutlined />                    },
  { label: 'OAuth Clients', icon: <AppsOutlined />                      },
  { label: 'Auditoría',     icon: <HistoryOutlined />                   },
  { label: 'Trabajadores',  icon: <BadgeOutlined />                     },
];

export function AdminPanel() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={0.5}>
        Panel de Administración
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Gestiona usuarios, servicios, API Keys y revisa la auditoría del sistema.
      </Typography>

      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'white',
          borderRadius: '12px 12px 0 0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          px: 2,
        }}
      >
        <Tabs
          value={tab}
          onChange={(_: React.SyntheticEvent, v: number) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {TABS.map((t) => (
            <Tab
              key={t.label}
              label={t.label}
              icon={t.icon}
              iconPosition="start"
              sx={{ minHeight: 56, fontWeight: 600, fontSize: '0.875rem' }}
            />
          ))}
        </Tabs>
      </Box>

      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: '0 0 12px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          p: 3,
          minHeight: 400,
        }}
      >
        <TabPanel value={tab} index={0}><UsersTab /></TabPanel>
        <TabPanel value={tab} index={1}><ServicesTab /></TabPanel>
        <TabPanel value={tab} index={2}><ApiKeysTab /></TabPanel>
        <TabPanel value={tab} index={3}><OAuthClientsTab /></TabPanel>
        <TabPanel value={tab} index={4}><AuditTab /></TabPanel>
        <TabPanel value={tab} index={5}><WorkersTab /></TabPanel>
      </Box>
    </Box>
  );
}
