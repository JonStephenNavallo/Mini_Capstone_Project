import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api.js';
import { CURRENT_USER_KEY } from '../../../shared/auth/sessionApi.js';

export const USER_ADMIN_KEYS = {
  students: (params) => ['users', 'adminStudents', params],
  studentRecords: (studentId) => ['users', 'adminStudentRecords', studentId],
};

export function useAdminStudents(params = {}) {
  return useQuery({
    queryKey: USER_ADMIN_KEYS.students(params),
    queryFn: async () => {
      const { data } = await api.get('/users/admin/students/', { params });
      return data;
    },
  });
}

export function useAdminStudentRecords(studentId, enabled = true) {
  return useQuery({
    queryKey: USER_ADMIN_KEYS.studentRecords(studentId),
    queryFn: async () => {
      const { data } = await api.get(`/users/admin/students/${studentId}/records/`);
      return data;
    },
    enabled: Boolean(studentId) && enabled,
  });
}

export function useResetStudentPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studentId) => {
      const { data } = await api.post(`/users/admin/students/${studentId}/reset-password/`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users', 'adminStudents'] });
    },
  });
}

export function useToggleStudentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, isActive }) => {
      const { data } = await api.post(`/users/admin/students/${studentId}/toggle-status/`, {
        is_active: isActive,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users', 'adminStudents'] });
    },
  });
}

export function useChangePassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ current_password, new_password, confirm_password }) => {
      const { data } = await api.post('/auth/change-password/', {
        current_password,
        new_password,
        confirm_password,
      });
      return data;
    },
    onSuccess: (updatedUser) => {
      qc.setQueryData(CURRENT_USER_KEY, updatedUser);
    },
  });
}

export function useUpdateMyAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const { data } = await api.patch('/users/me/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (updatedUser) => {
      qc.setQueryData(CURRENT_USER_KEY, updatedUser);
      qc.invalidateQueries({ queryKey: ['users', 'adminStudents'] });
    },
  });
}
