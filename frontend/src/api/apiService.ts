import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getToken, clearAuthStorage } from '../utils/security';

// Helper to read cookie value by name
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// ─── Axios instance ───────────────────────────────────────────────────────────

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// ─── Request interceptor: attach token + CSRF header ─────────────────────

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach CSRF Token for mutating HTTP methods
    const csrfToken = getCookie('XSRF-TOKEN') || (window as any).__CSRF_TOKEN__;
    if (csrfToken && ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '')) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: unified error handling ─────────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — wipe auth and redirect
      clearAuthStorage();
      window.dispatchEvent(new CustomEvent('auth:expired'));
      // Only redirect if not already on auth pages
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login?reason=session_expired';
      }
    }

    if (error.response?.status === 403) {
      window.dispatchEvent(new CustomEvent('auth:forbidden'));
    }

    if (error.response?.status === 429) {
      window.dispatchEvent(
        new CustomEvent('auth:ratelimit', {
          detail: { retryAfter: error.response.headers['retry-after'] },
        })
      );
    }

    // Sanitize error message before returning (prevent reflection of server errors with HTML)
    const serverMsg = (error.response?.data as any)?.message;
    const safeMsg = typeof serverMsg === 'string' ? serverMsg.replace(/<[^>]*>/g, '') : null;

    return Promise.reject({
      ...error,
      safeMessage: safeMsg || getDefaultErrorMessage(error.response?.status),
    });
  }
);

function getDefaultErrorMessage(status?: number): string {
  switch (status) {
    case 400: return 'Invalid request. Please check your input.';
    case 401: return 'Your session has expired. Please log in again.';
    case 403: return 'You do not have permission to perform this action.';
    case 404: return 'The requested resource was not found.';
    case 409: return 'A conflict occurred. This resource may already exist.';
    case 422: return 'Validation failed. Please check your input.';
    case 429: return 'Too many requests. Please wait a moment and try again.';
    case 500: return 'A server error occurred. Please try again later.';
    default:  return 'An unexpected error occurred. Please try again.';
  }
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authAPI = {
  getCsrfToken: () => api.get('/auth/csrf-token'),
  register: (name: string, email: string, password: string, phone?: string) =>
    api.post('/auth/register', { name, email, password, phone }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: { name?: string; phone?: string; bio?: string; gender?: string; dateOfBirth?: string; weight?: number; height?: number; profileImage?: string }) =>
    api.put('/auth/profile', data),
  uploadAvatar: (formData: FormData) =>
    api.post('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteAvatar: () =>
    api.delete('/auth/avatar'),
  uploadGalleryImage: (formData: FormData) =>
    api.post('/auth/gallery', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteGalleryImage: (imageId: string) =>
    api.delete(`/auth/gallery/${imageId}`),
  changePassword: (newPassword: string, currentPassword?: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),
  requestPasswordReset: (email: string) =>
    api.post('/auth/forgot-password', { email }),
};

// ─── Exercise API ─────────────────────────────────────────────────────────────

export const exerciseAPI = {
  getAll: () => api.get('/exercises'),
  getById: (id: string) => api.get(`/exercises/${id}`),
  create: (data: unknown) => api.post('/exercises', data),
  update: (id: string, data: unknown) => api.put(`/exercises/${id}`, data),
  delete: (id: string) => api.delete(`/exercises/${id}`),
};

// ─── Package API ──────────────────────────────────────────────────────────────

export const packageAPI = {
  getAll: () => api.get('/packages'),
  getById: (id: string) => api.get(`/packages/${id}`),
  create: (data: unknown) => api.post('/packages', data),
  update: (id: string, data: unknown) => api.put(`/packages/${id}`, data),
  delete: (id: string) => api.delete(`/packages/${id}`),
  
  // Exercise management
  getExercises: (packageId: string) => api.get(`/packages/${packageId}/exercises`),
  addExercise: (packageId: string, data: unknown) => api.post(`/packages/${packageId}/exercises`, data),
  updateExercise: (packageId: string, exerciseId: string, data: unknown) => 
    api.put(`/packages/${packageId}/exercises/${exerciseId}`, data),
  removeExercise: (packageId: string, exerciseId: string) => 
    api.delete(`/packages/${packageId}/exercises/${exerciseId}`),
  reorderExercises: (packageId: string, data: unknown) => 
    api.put(`/packages/${packageId}/exercises/reorder`, data),
};

// ─── Purchase API ─────────────────────────────────────────────────────────────

export const purchaseAPI = {
  getAll: () => api.get('/purchases'),
  getMy: () => api.get('/purchases/my-purchases'),
  getMyPurchases: () => api.get('/purchases/my-purchases'),
  create: (packageId: string, price: number) =>
    api.post('/purchases', { packageId, price }),
  cardPayment: (data: { packageId: string; price: number }) => api.post('/purchases/card', data),
  bankTransferPayment: (data: { packageId: string; price: number; bankTransferReference?: string; transferSlipUrl?: string }) => api.post('/purchases/bank-transfer', data),
  createWithPayment: (packageId: string, paymentIntentId: string) =>
    api.post('/purchases/payment', { packageId, paymentIntentId }),
  updateStatus: (id: string, status: string) =>
    api.put(`/purchases/${id}/status`, { status }),
};

// ─── Payment API ──────────────────────────────────────────────────────────────

export const paymentAPI = {
  createPaymentIntent: (packageId: string, amount: number) =>
    api.post('/payments/intent', { packageId, amount }),
  confirmPayment: (paymentIntentId: string) =>
    api.post('/payments/confirm', { paymentIntentId }),
  getHistory: () => api.get('/payments/history'),
  refund: (paymentIntentId: string) =>
    api.post('/payments/refund', { paymentIntentId }),
};

// ─── Completed Exercise API ───────────────────────────────────────────────────

export const completedExerciseAPI = {
  markComplete: (exerciseId: string) =>
    api.post('/completed-exercises', { exerciseId }),
  getMy: () => api.get('/completed-exercises/my-completed'),
};

// ─── User API (Admin) ─────────────────────────────────────────────────────────

export const userAPI = {
  getAll: () => api.get('/users'),
  create: (data: { name: string; email: string; password?: string; role: string; phone?: string }) => api.post('/users', data),
  toggleStatus: (id: string, isActive?: boolean) => api.put(`/users/${id}/status`, { isActive }),
};

// ─── Admin API ────────────────────────────────────────────────────────────────

export const adminAPI = {
  getAllUsers: () => api.get('/users'),
  updateUserRole: (id: string, role: string) =>
    api.put(`/users/${id}/role`, { role }),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  getAllPackages: () => api.get('/packages'),
  getAllPurchases: () => api.get('/purchases'),
  approveBankTransfer: (purchaseId: string) => api.put(`/purchases/${purchaseId}/approve-bank-transfer`),
  rejectBankTransfer: (purchaseId: string) => api.put(`/purchases/${purchaseId}/reject-bank-transfer`),
  getAllExercises: () => api.get('/exercises'),
  createPackage: (data: unknown) => api.post('/packages', data),
  updatePackage: (id: string, data: unknown) => api.put(`/packages/${id}`, data),
  deletePackage: (id: string) => api.delete(`/packages/${id}`),
  createExercise: (data: unknown) => api.post('/exercises', data),
  updateExercise: (id: string, data: unknown) => api.put(`/exercises/${id}`, data),
  deleteExercise: (id: string) => api.delete(`/exercises/${id}`),
};

// ─── Workout API ──────────────────────────────────────────────────────────────

export const workoutAPI = {
  getAll: () => api.get('/workouts'),
  getById: (id: string) => api.get(`/workouts/${id}`),
  create: (data: {
    exerciseId: string;
    duration: number;
    sets?: number | null;
    reps?: number | null;
    date: string;
    difficulty?: string | null; // beginner | intermediate | advanced
  }) => api.post('/workouts', data),
  update: (id: string, data: unknown) => api.put(`/workouts/${id}`, data),
  delete: (id: string) => api.delete(`/workouts/${id}`),
  getMy: () => api.get('/workouts/my-workouts'),
};

// ─── Notification API ───────────────────────────────────────────────────────────

export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  create: (data: unknown) => api.post('/notifications', data),
  update: (id: string, data: unknown) => api.put(`/notifications/${id}`, data),
  delete: (id: string) => api.delete(`/notifications/${id}`),
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
};

// ─── Membership API ────────────────────────────────────────────────────────────

export const membershipAPI = {
  getPlans: () => api.get('/memberships/plans'),
  getPlanById: (id: string) => api.get(`/memberships/plans/${id}`),
  createPlan: (data: unknown) => api.post('/memberships/plans', data),
  updatePlan: (id: string, data: unknown) => api.put(`/memberships/plans/${id}`, data),
  deletePlan: (id: string) => api.delete(`/memberships/plans/${id}`),
  getMyMembership: () => api.get('/memberships/my'),
  purchaseMembership: (planId: string, paymentMethod?: string) => api.post('/memberships/purchase', { planId, paymentMethod }),
};

// ─── Classes API ───────────────────────────────────────────────────────────────

export const classAPI = {
  getAll: () => api.get('/classes'),
  getById: (id: string) => api.get(`/classes/${id}`),
  getSchedules: (classId?: string) => api.get('/classes/schedules', { params: { classId } }),
  bookClass: (scheduleId: string) => api.post('/classes/bookings', { scheduleId }),
  cancelBooking: (bookingId: string) => api.delete(`/classes/bookings/${bookingId}`),
  getMyBookings: () => api.get('/classes/my-bookings'),
  createClass: (data: unknown) => api.post('/classes', data),
  createSchedule: (data: unknown) => api.post('/classes/schedules', data),
};

// ─── Trainers & PT API ─────────────────────────────────────────────────────────

export const trainerAPI = {
  getAll: (params?: { search?: string; specialization?: string }) => api.get('/trainers', { params }),
  getById: (id: string) => api.get(`/trainers/${id}`),
  getEligibility: () => api.get('/trainers/eligibility'),
  selectTrainer: (trainerId: string) => api.post('/trainers/select', { trainerId }),
  getMyTrainer: () => api.get('/trainers/my-trainer'),
  getAvailability: (trainerId: string, date?: string) => api.get(`/trainers/${trainerId}/availability`, { params: { date } }),
  getWeeklySlots: (trainerId: string, date?: string) => api.get(`/trainers/${trainerId}/weekly-slots`, { params: { date } }),
  bookSession: (data: { trainerId: string; date?: string; sessionDate?: string; timeSlot?: string; startTime?: string; endTime?: string; focusArea?: string; notes?: string }) =>
    api.post('/trainers/book', data),
  multiBookSessions: (data: { trainerId: string; sessions: Array<{ date?: string; sessionDate?: string; dayOfWeek?: number; recurring?: boolean; timeSlot?: string; startTime?: string; endTime?: string; focusArea?: string; notes?: string }> }) =>
    api.post('/trainers/multi-book', data),
  cancelBooking: (bookingId: string) => api.delete(`/trainers/bookings/${bookingId}`),
  // Cancel all future occurrences of a recurring weekly slot selection
  cancelRecurringSlot: (recurringSlotId: string) => api.delete(`/trainers/recurring-slots/${recurringSlotId}`),
  updateBookingStatus: (bookingId: string, status: string) => api.patch(`/trainers/bookings/${bookingId}/status`, { status }),
  getMyBookings: () => api.get('/trainers/my-bookings'),

  // Coach Portal APIs
  getCoachWeeklyAvailability: () => api.get('/trainers/weekly-availability'),
  updateCoachWeeklyAvailability: (schedule: Array<{ dayOfWeek: number; isAvailable: boolean; startTime: string; endTime: string }>) =>
    api.put('/trainers/weekly-availability', { schedule }),
  getCoachTrainingSpace: () => api.get('/trainers/training-space'),
  getProfile: () => api.get('/trainers/profile'),
  updateProfile: (data: unknown) => api.put('/trainers/profile', data),
};


// ─── Attendance & QR API ───────────────────────────────────────────────────────

export const attendanceAPI = {
  getQRCode: () => api.get('/attendance/my-qr'),
  checkInQR: (qrData: string) => api.post('/attendance/scan-qr', { qrData }),
  manualCheckIn: (memberId: string) => api.post('/attendance/check-in', { memberId }),
  checkOut: (attendanceId: string) => api.post('/attendance/check-out', { attendanceId }),
  getMyHistory: () => api.get('/attendance/my-history'),
  getStats: () => api.get('/attendance/stats'),
};

// ─── Nutrition API ─────────────────────────────────────────────────────────────

export const nutritionAPI = {
  getMyPlan: () => api.get('/nutrition/my-plan'),
  logMeal: (data: { mealType: string; foodName: string; calories: number; protein?: number; carbs?: number; fat?: number }) => api.post('/nutrition/log', data),
  getMyLogs: () => api.get('/nutrition/my-logs'),
};

// ─── AI Service API ─────────────────────────────────────────────────────────────

export const aiAPI = {
  getHealth: () => api.get('/ai/health'),
  getConversations: () => api.get('/ai/conversations'),
  getMessages: (conversationId: string) => api.get(`/ai/conversations/${conversationId}/messages`),
  sendMessage: (message: string, conversationId?: string) => api.post('/ai/chat', { message, conversationId }),
  clearHistory: () => api.delete('/ai/conversations'),
};

export default api;
