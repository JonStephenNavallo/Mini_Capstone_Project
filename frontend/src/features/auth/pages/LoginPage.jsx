import React, { useState } from 'react';
import {
  Alert,
  Box,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../../services/api.js';
import { performLogin } from '../../../shared/auth/sessionApi.js';
import M3PillButton from '../../../shared/components/actions/M3PillButton.jsx';
import BrandLogos from '../../../shared/components/branding/BrandLogos.jsx';
import { DEPARTMENT_COURSES } from '../../lost_and_found/constants/departments.js';

export default function LoginPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '';

  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sign-in fields (supports Email or Student Number)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Student registration fields
  const [regForm, setRegForm] = useState({
    email: '',
    password: '',
    confirm_password: '',
    student_number: '',
    first_name: '',
    last_name: '',
    department: '',
    contact_number: '',
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await performLogin({
        queryClient,
        authenticate: () =>
          api.post(
            '/auth/login/',
            { identifier: identifier.trim(), password },
            { sessionControl: true }
          ),
        navigate,
        redirectTo,
      });
    } catch (err) {
      setError(
        err.userFacingMessage ||
          err.response?.data?.detail ||
          'Sign-in failed. Please verify your email/student number and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    const normalizedStudentNumber = regForm.student_number.trim().toUpperCase();
    if (!/^\d{3}[A-Z]-\d{5}$/.test(normalizedStudentNumber)) {
      setError('Student number must follow the format 026A-11745 (3 digits, 1 letter, hyphen, 5 digits).');
      return;
    }
    if (!regForm.department) {
      setError('Please select your department.');
      return;
    }
    if (regForm.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (regForm.password !== regForm.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await performLogin({
        queryClient,
        authenticate: () =>
          api.post(
            '/auth/register/',
            {
              ...regForm,
              student_number: normalizedStudentNumber,
              program_year: regForm.department,
            },
            { sessionControl: true }
          ),
        navigate,
        redirectTo,
      });
    } catch (err) {
      const data = err.response?.data;
      const msg =
        data?.detail ||
        data?.email?.[0] ||
        data?.student_number?.[0] ||
        data?.department?.[0] ||
        data?.confirm_password?.[0] ||
        data?.password?.[0] ||
        'Registration failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: '100dvh',
        width: '100vw',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'center',
        px: { xs: 1.5, sm: 2.5 },
        py: { xs: 2, sm: 4 },
        bgcolor: '#f0f4f9',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: { xs: '100%', sm: 480 },
          borderRadius: { xs: '22px', sm: '28px' },
          p: { xs: 2.25, sm: 4 },
          my: 'auto',
          bgcolor: '#ffffff',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack spacing={{ xs: 2, sm: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <M3PillButton
              variant="text"
              color="neutral"
              size="small"
              icon={<ArrowBackIcon fontSize="small" />}
              onClick={() => navigate('/')}
            >
              Portal Home
            </M3PillButton>
            <BrandLogos height={50} dividerHeight={20} gap={0.85} />
          </Box>

          <Box>
            <Typography
              variant="h5"
              fontWeight={800}
              sx={{ fontSize: { xs: '1.35rem', sm: '1.5rem' }, lineHeight: 1.2 }}
            >
              {tab === 0 ? 'Welcome back' : 'Create Student Account'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: { xs: '0.84rem', sm: '0.875rem' } }}>
              {tab === 0
                ? 'Sign in with your email or student number to report lost property or manage OSAS custody.'
                : 'Register with your student number and department to track lost items and earn department honesty points.'}
            </Typography>
          </Box>

          <Tabs
            value={tab}
            onChange={(_, v) => {
              setTab(v);
              setError('');
            }}
            variant="fullWidth"
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                minHeight: 40,
                fontWeight: 700,
                fontSize: { xs: '0.82rem', sm: '0.875rem' },
                textTransform: 'none',
              },
            }}
          >
            <Tab label="Sign In" />
            <Tab label="Student Sign Up" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ borderRadius: '12px' }}>
              {error}
            </Alert>
          )}

          {tab === 0 ? (
            <Box component="form" onSubmit={handleLogin}>
              <Stack spacing={2}>
                <TextField
                  label="Email or Student Number"
                  placeholder="e.g. student@campus.edu or 026A-11745"
                  type="text"
                  autoComplete="username"
                  required
                  fullWidth
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
                <TextField
                  label="Password"
                  type={showLoginPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                            onClick={() => setShowLoginPassword((prev) => !prev)}
                            edge="end"
                          >
                            {showLoginPassword ? (
                              <VisibilityOffIcon fontSize="small" />
                            ) : (
                              <VisibilityIcon fontSize="small" />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <M3PillButton
                  type="submit"
                  variant="filled"
                  fullWidth
                  loading={loading}
                  icon={<LoginIcon fontSize="small" />}
                >
                  Sign In
                </M3PillButton>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', lineHeight: 1.5 }}>
                  Forgot your password? Visit the OSAS Office with your Student ID for a one-time password reset.
                </Typography>
              </Stack>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleRegister}>
              <Stack spacing={1.75}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    label="First Name"
                    autoComplete="given-name"
                    required
                    fullWidth
                    value={regForm.first_name}
                    onChange={(e) => setRegForm((p) => ({ ...p, first_name: e.target.value }))}
                  />
                  <TextField
                    label="Last Name"
                    autoComplete="family-name"
                    required
                    fullWidth
                    value={regForm.last_name}
                    onChange={(e) => setRegForm((p) => ({ ...p, last_name: e.target.value }))}
                  />
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    label="Student Number"
                    placeholder="e.g. 026A-11745"
                    helperText="Format: 026A-11745"
                    required
                    fullWidth
                    slotProps={{ htmlInput: { maxLength: 10, pattern: '[0-9]{3}[A-Z]-[0-9]{5}' } }}
                    value={regForm.student_number}
                    onChange={(e) =>
                      setRegForm((p) => ({
                        ...p,
                        student_number: e.target.value.toUpperCase(),
                      }))
                    }
                  />

                  <TextField
                    select
                    label="Department"
                    required
                    fullWidth
                    value={regForm.department}
                    onChange={(e) => setRegForm((p) => ({ ...p, department: e.target.value }))}
                  >
                    {DEPARTMENT_COURSES.map((dept) => (
                      <MenuItem key={dept.value} value={dept.value}>
                        {dept.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    label="Email"
                    type="email"
                    autoComplete="email"
                    required
                    fullWidth
                    value={regForm.email}
                    onChange={(e) => setRegForm((p) => ({ ...p, email: e.target.value }))}
                  />
                  <TextField
                    label="Contact Number (Optional)"
                    placeholder="e.g. 09171234567"
                    type="tel"
                    autoComplete="tel"
                    fullWidth
                    slotProps={{ htmlInput: { maxLength: 25 } }}
                    value={regForm.contact_number}
                    onChange={(e) => setRegForm((p) => ({ ...p, contact_number: e.target.value }))}
                  />
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    label="Password (min 8 chars)"
                    type={showRegPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    fullWidth
                    value={regForm.password}
                    onChange={(e) => setRegForm((p) => ({ ...p, password: e.target.value }))}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                              onClick={() => setShowRegPassword((prev) => !prev)}
                              edge="end"
                            >
                              {showRegPassword ? (
                                <VisibilityOffIcon fontSize="small" />
                              ) : (
                                <VisibilityIcon fontSize="small" />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  <TextField
                    label="Confirm Password"
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    fullWidth
                    error={
                      Boolean(regForm.confirm_password) &&
                      regForm.password !== regForm.confirm_password
                    }
                    helperText={
                      Boolean(regForm.confirm_password) &&
                      regForm.password !== regForm.confirm_password
                        ? 'Passwords do not match'
                        : ''
                    }
                    value={regForm.confirm_password}
                    onChange={(e) => setRegForm((p) => ({ ...p, confirm_password: e.target.value }))}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              aria-label={showRegConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                              onClick={() => setShowRegConfirmPassword((prev) => !prev)}
                              edge="end"
                            >
                              {showRegConfirmPassword ? (
                                <VisibilityOffIcon fontSize="small" />
                              ) : (
                                <VisibilityIcon fontSize="small" />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Stack>

                <M3PillButton
                  type="submit"
                  variant="filled"
                  fullWidth
                  loading={loading}
                  icon={<PersonAddIcon fontSize="small" />}
                >
                  Create Student Account
                </M3PillButton>
              </Stack>
            </Box>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
