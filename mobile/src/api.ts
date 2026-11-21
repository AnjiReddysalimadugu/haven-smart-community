import axios from 'axios'
import { API_URL_STORAGE_KEY, DEFAULT_API_BASE_URL } from './config'
import { storageDelete, storageGet, storageSet } from './storage'

const TOKEN_KEY = 'haven.mobile.token'

export type Role = 'SUPER_ADMIN' | 'APARTMENT_ADMIN' | 'ADMIN' | 'STAFF' | 'SECURITY' | 'RESIDENT'

export type AuthUser = {
  id: string
  email: string
  fullName: string
  role: Role
  apartmentId: string | null
  apartmentName: string | null
  flatId: string | null
  flatNumber: string | null
}

export type Bill = {
  id: string
  flatNumber: string
  billType: string
  billingPeriod: string
  amount: number
  paidAmount: number
  balance: number
  dueDate: string
  status: string
}

export type Visitor = {
  id: string
  flatNumber: string
  visitorName: string
  visitType: string
  expiresAt: string
  used: boolean
  entryAt: string | null
  exitAt: string | null
}

export type Complaint = {
  id: string
  flatNumber: string
  title: string
  category: string
  description: string
  status: string
  createdAt: string
}

export type Flat = {
  id: string
  floorId: string
  flatNumber: string
  areaSqft: number | null
  bedroomCount: number | null
  status: string
}

export type Occupancy = {
  id: string
  flatId: string
  flatNumber: string | null
  residentUserId: string
  residentName: string | null
  residentEmail: string | null
  occupancyType: 'OWNER' | 'TENANT'
  status: 'ACTIVE' | 'ENDED'
  startedAt: string
  endedAt: string | null
  notes: string | null
}

export type ParkingSlot = {
  id: string
  apartmentId: string
  slotCode: string
  vehicleType: string
  monthlyCharge: number
  active: boolean
  flatId: string | null
  flatNumber: string | null
  vehicleNumber: string | null
  allocatedAt: string | null
  allocated: boolean
}

export type ManagedUser = {
  id: string
  email: string
  fullName: string
  role: Role
  apartmentId: string | null
  apartmentName?: string | null
  flatId: string | null
  flatNumber: string | null
  active: boolean
  createdAt?: string
}

export type Resident = {
  id: string
  email: string
  fullName: string
  apartmentId: string | null
  apartmentName: string | null
  flatId: string | null
  flatNumber: string | null
  active: boolean
  createdAt: string
}

export type Apartment = {
  id: string
  name: string
  address: string
  timezone: string
  status: string
}

export type Receipt = {
  id: string
  receiptNumber: string
  billId: string
  flatId: string
  flatNumber: string
  billType: string
  billingPeriod: string
  amount: number
  method: string
  reference: string
  paidAt: string
  billStatus: string
}

export type DashboardSummary = {
  apartments: number
  blocks: number
  flats: number
  occupiedFlats: number
  availableFlats: number
  totalBilled: number
  collected: number
  pending: number
  openComplaints: number
}

export const api = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

let apiBaseReady: Promise<string> | null = null

export function getApiBaseUrl() {
  return (api.defaults.baseURL || DEFAULT_API_BASE_URL).replace(/\/$/, '')
}

export async function initApiBaseUrl() {
  if (!apiBaseReady) {
    apiBaseReady = (async () => {
      const saved = (await storageGet(API_URL_STORAGE_KEY))?.trim()
      const next = (saved || DEFAULT_API_BASE_URL).replace(/\/$/, '')
      api.defaults.baseURL = next
      return next
    })()
  }
  return apiBaseReady
}

export async function setApiBaseUrl(url: string) {
  const next = url.trim().replace(/\/$/, '')
  if (!/^https?:\/\//i.test(next)) {
    throw new Error('API URL must start with http:// or https://')
  }
  await storageSet(API_URL_STORAGE_KEY, next)
  api.defaults.baseURL = next
  apiBaseReady = Promise.resolve(next)
  return next
}

api.interceptors.request.use(async (config) => {
  await initApiBaseUrl()
  const token = await storageGet(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

type UnauthorizedHandler = () => void
let onUnauthorized: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      await storageDelete(TOKEN_KEY)
      onUnauthorized?.()
    }
    return Promise.reject(error)
  },
)

export async function saveToken(token: string) {
  await storageSet(TOKEN_KEY, token)
}

export async function clearToken() {
  await storageDelete(TOKEN_KEY)
}

export async function getToken() {
  return storageGet(TOKEN_KEY)
}

export const authApi = {
  options: () =>
    api.get<{ googleEnabled: boolean; otpEnabled: boolean }>('/auth/options').then((r) => r.data),
  requestOtp: (email: string) =>
    api.post<{ message: string; expiresAt: string; devOtp?: string | null }>('/auth/otp/request', { email }).then((r) => r.data),
  login: (email: string, otp: string) =>
    api.post<{ accessToken: string; user: AuthUser }>('/auth/login', { email, otp }).then((r) => r.data),
  loginWithGoogle: (idToken: string) =>
    api.post<{ accessToken: string; user: AuthUser }>('/auth/google', { idToken }).then((r) => r.data),
  me: () => api.get<AuthUser>('/auth/me').then((r) => r.data),
}

export type PlatformSummary = {
  societiesActive: number
  societiesTotal: number
  usersActive: number
  usersTotal: number
  flatsTotal: number
  mrr: number
  collectedTotal: number
  outstandingEstimate: number
  subscriptionsActive: number
  subscriptionsTrial: number
  subscriptionsPastDue: number
  subscriptions: Array<{
    apartmentId: string
    apartmentName: string
    planCode?: string
    planName: string
    status: string
    amountMonthly: number
    collectedTotal: number
    activeUsers: number
    totalUsers: number
    paymentLink?: string | null
    nextDueOn?: string | null
  }>
}

export const platformApi = {
  summary: () => api.get<PlatformSummary>('/platform/summary').then((r) => r.data),
  upsertSubscription: (
    apartmentId: string,
    body: {
      planCode: string
      planName: string
      status: string
      amountMonthly: number
      seatsIncluded: number
      featuresJson?: string
      paymentLink?: string | null
      nextDueOn?: string | null
      notes?: string | null
    },
  ) => api.put(`/platform/societies/${apartmentId}/subscription`, body).then((r) => r.data),
  recordPayment: (
    apartmentId: string,
    body: { amount: number; paidOn: string; method?: string; reference?: string; notes?: string },
  ) => api.post(`/platform/societies/${apartmentId}/payments`, body).then((r) => r.data),
}

export const billingApi = {
  list: (apartmentId?: string | null) =>
    api.get<Bill[]>('/bills', { params: scopeParams(apartmentId) }).then((r) => r.data),
  pay: (id: string, body: { amount: number; method: string; reference: string }) =>
    api.post<Bill>(`/bills/${id}/payments`, body).then((r) => r.data),
}

export const visitorApi = {
  list: (apartmentId?: string | null) =>
    api.get<Visitor[]>('/visitors', { params: scopeParams(apartmentId) }).then((r) => r.data),
  create: (body: object) =>
    api.post<{ id: string; qrToken: string }>('/visitors', body).then((r) => r.data),
  validate: (qrToken: string) =>
    api.post<{ valid: boolean; message: string; visitorName?: string; flatNumber?: string }>(
      '/visitors/validate',
      { qrToken },
    ).then((r) => r.data),
  exitByToken: (qrToken: string) =>
    api.post<Visitor>('/visitors/exit', { qrToken }).then((r) => r.data),
  exit: (id: string) => api.post<Visitor>(`/visitors/${id}/exit`).then((r) => r.data),
}

export const complaintApi = {
  list: (apartmentId?: string | null) =>
    api.get<Complaint[]>('/complaints', { params: scopeParams(apartmentId) }).then((r) => r.data),
  create: (body: object) => api.post<Complaint>('/complaints', body).then((r) => r.data),
  updateStatus: (id: string, body: { status: string; assigneeUserId?: string | null; resolutionNotes?: string | null }) =>
    api.patch<Complaint>(`/complaints/${id}/status`, body).then((r) => r.data),
  addComment: (id: string, body: string) =>
    api.post(`/complaints/${id}/comments`, { body }).then((r) => r.data),
}

function scopeParams(apartmentId?: string | null) {
  return apartmentId ? { apartmentId } : undefined
}

export const receiptApi = {
  list: (apartmentId?: string | null) =>
    api.get<Receipt[]>('/receipts', { params: scopeParams(apartmentId) }).then((r) => r.data),
}

export const dashboardApi = {
  summary: (apartmentId?: string | null) =>
    api.get<DashboardSummary>('/dashboard/summary', { params: scopeParams(apartmentId) }).then((r) => r.data),
}

export const propertyApi = {
  flats: (apartmentId?: string | null) =>
    api.get<Flat[]>('/flats', { params: scopeParams(apartmentId) }).then((r) => r.data),
  apartments: () => api.get<Apartment[]>('/apartments').then((r) => r.data),
  createApartment: (body: { name: string; address: string; timezone?: string }) =>
    api.post<Apartment>('/apartments', body).then((r) => r.data),
  updateApartment: (id: string, body: object) =>
    api.put<Apartment>(`/apartments/${id}`, body).then((r) => r.data),
  archiveApartment: (id: string) =>
    api.post<Apartment>(`/apartments/${id}/archive`).then((r) => r.data),
}

export const occupancyApi = {
  list: (apartmentId?: string | null) =>
    api.get<Occupancy[]>('/occupancies', { params: scopeParams(apartmentId) }).then((r) => r.data),
  allocate: (flatId: string, body: { residentUserId: string; occupancyType: string; notes?: string }) =>
    api.post<Occupancy>(`/flats/${flatId}/occupancy`, body).then((r) => r.data),
  release: (flatId: string) =>
    api.post<Occupancy>(`/flats/${flatId}/occupancy/release`).then((r) => r.data),
}

export const parkingApi = {
  list: (apartmentId?: string | null) =>
    api.get<ParkingSlot[]>('/parking-slots', { params: scopeParams(apartmentId) }).then((r) => r.data),
  allocate: (id: string, body: { flatId: string; vehicleNumber?: string }) =>
    api.post<ParkingSlot>(`/parking-slots/${id}/allocate`, body).then((r) => r.data),
  release: (id: string) =>
    api.post<ParkingSlot>(`/parking-slots/${id}/release`).then((r) => r.data),
}

export const userApi = {
  list: (params?: { role?: Role | null; apartmentId?: string | null }) =>
    api.get<ManagedUser[]>('/users', {
      params: {
        ...(params?.role ? { role: params.role } : {}),
        ...(params?.apartmentId ? { apartmentId: params.apartmentId } : {}),
      },
    }).then((r) => r.data),
  create: (body: object) => api.post<ManagedUser>('/users', body).then((r) => r.data),
  update: (id: string, body: object) => api.put<ManagedUser>(`/users/${id}`, body).then((r) => r.data),
  deactivate: (id: string) => api.post<ManagedUser>(`/users/${id}/deactivate`).then((r) => r.data),
  activate: (id: string) => api.post<ManagedUser>(`/users/${id}/activate`).then((r) => r.data),
}

export const residentApi = {
  list: (apartmentId?: string | null) =>
    api.get<Resident[]>('/residents', { params: scopeParams(apartmentId) }).then((r) => r.data),
  register: (body: object) => api.post<Resident>('/residents', body).then((r) => r.data),
  deactivate: (id: string) => api.post<Resident>(`/residents/${id}/deactivate`).then((r) => r.data),
}

export const deviceApi = {
  registerPush: (token: string, platform: string) =>
    api.post('/devices/push-token', { token, platform }).then((r) => r.data),
  unregisterPush: (token: string) =>
    api.delete('/devices/push-token', { params: { token } }).then((r) => r.data),
}

export function money(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  } catch {
    return iso
  }
}

export function apiError(err: unknown, fallback: string) {
  const anyErr = err as { response?: { data?: { message?: string } } }
  return anyErr?.response?.data?.message || fallback
}
