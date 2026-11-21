import { api } from '../api'
import type {
  Apartment, AuthUser, Bill, Block, Complaint, DashboardSummary, EmergencyContact,
  FamilyMember, Flat, Floor, LoginResponse, ManagedUser, Notice, Occupancy,
  ParkingSlot, Receipt, Resident, Role, Visitor,
} from '../api'

export type RequestOtpResponse = {
  message: string
  expiresAt: string
  devOtp?: string | null
}

function scopeParams(apartmentId?: string | null) {
  return apartmentId ? { apartmentId } : undefined
}

export type SearchHit = {
  type: string
  id: string
  label: string
  detail: string
  href: string
}

export const searchApi = {
  query: (q: string, apartmentId?: string | null) =>
    api.get<{ query: string; hits: SearchHit[] }>('/search', {
      params: { q, ...(apartmentId ? { apartmentId } : {}) },
    }).then((r) => r.data),
}

export const authApi = {
  options: () =>
    api.get<{ googleEnabled: boolean; otpEnabled: boolean }>('/auth/options').then((r) => r.data),
  requestOtp: (email: string) =>
    api.post<RequestOtpResponse>('/auth/otp/request', { email }).then((r) => r.data),
  login: (email: string, otp: string) =>
    api.post<LoginResponse>('/auth/login', { email, otp }).then((r) => r.data),
  loginWithGoogle: (idToken: string) =>
    api.post<LoginResponse>('/auth/google', { idToken }).then((r) => r.data),
  me: () => api.get<AuthUser>('/auth/me').then((r) => r.data),
  updateMe: (body: { fullName: string; password?: string | null }) =>
    api.put<AuthUser>('/auth/me', {
      fullName: body.fullName,
      password: body.password?.trim() ? body.password.trim() : null,
    }).then((r) => r.data),
}

export const dashboardApi = {
  summary: (apartmentId?: string | null) =>
    api.get<DashboardSummary>('/dashboard/summary', { params: scopeParams(apartmentId) }).then((r) => r.data),
}

export type PlatformSubscription = {
  id: string | null
  apartmentId: string
  apartmentName: string
  planCode: string
  planName: string
  status: string
  amountMonthly: number
  currency: string
  seatsIncluded: number
  featuresJson: string
  paymentLink?: string | null
  nextDueOn?: string | null
  notes?: string | null
  collectedTotal: number
  activeUsers: number
  totalUsers: number
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
  subscriptions: PlatformSubscription[]
}

export const platformApi = {
  summary: () => api.get<PlatformSummary>('/platform/summary').then((r) => r.data),
  subscriptions: () => api.get<PlatformSubscription[]>('/platform/subscriptions').then((r) => r.data),
  upsertSubscription: (apartmentId: string, body: Record<string, unknown>) =>
    api.put<PlatformSubscription>(`/platform/societies/${apartmentId}/subscription`, body).then((r) => r.data),
  recordPayment: (apartmentId: string, body: {
    amount: number; paidOn: string; method: string; reference?: string; notes?: string
  }) => api.post(`/platform/societies/${apartmentId}/payments`, body).then((r) => r.data),
  payments: (apartmentId: string) =>
    api.get(`/platform/societies/${apartmentId}/payments`).then((r) => r.data),
}

export const propertyApi = {
  apartments: () => api.get<Apartment[]>('/apartments').then((r) => r.data),
  createApartment: (body: object) => api.post<Apartment>('/apartments', body).then((r) => r.data),
  updateApartment: (id: string, body: object) =>
    api.put<Apartment>(`/apartments/${id}`, body).then((r) => r.data),
  archiveApartment: (id: string) =>
    api.post<Apartment>(`/apartments/${id}/archive`).then((r) => r.data),
  blocks: (apartmentId: string) => api.get<Block[]>(`/apartments/${apartmentId}/blocks`).then((r) => r.data),
  createBlock: (body: object) => api.post<Block>('/blocks', body).then((r) => r.data),
  updateBlock: (id: string, body: object) => api.put<Block>(`/blocks/${id}`, body).then((r) => r.data),
  floors: (blockId: string) => api.get<Floor[]>(`/blocks/${blockId}/floors`).then((r) => r.data),
  createFloor: (body: object) => api.post<Floor>('/floors', body).then((r) => r.data),
  updateFloor: (id: string, body: object) => api.put<Floor>(`/floors/${id}`, body).then((r) => r.data),
  flatsByFloor: (floorId: string) => api.get<Flat[]>(`/floors/${floorId}/flats`).then((r) => r.data),
  flats: (apartmentId?: string | null) =>
    api.get<Flat[]>('/flats', { params: scopeParams(apartmentId) }).then((r) => r.data),
  createFlat: (body: object) => api.post<Flat>('/flats', body).then((r) => r.data),
  updateFlat: (id: string, body: object) => api.put<Flat>(`/flats/${id}`, body).then((r) => r.data),
  updateFlatStatus: (id: string, status: string) =>
    api.patch<Flat>(`/flats/${id}/status`, { status }).then((r) => r.data),
}

export const residentApi = {
  list: (apartmentId?: string | null) =>
    api.get<Resident[]>('/residents', { params: scopeParams(apartmentId) }).then((r) => r.data),
  get: (id: string) => api.get<Resident>(`/residents/${id}`).then((r) => r.data),
  register: (body: object) => api.post<Resident>('/residents', body).then((r) => r.data),
  update: (id: string, body: object) => api.put<Resident>(`/residents/${id}`, body).then((r) => r.data),
  deactivate: (id: string) => api.post<Resident>(`/residents/${id}/deactivate`).then((r) => r.data),
}

export const userApi = {
  list: (params?: { apartmentId?: string | null; role?: Role | null }) =>
    api.get<ManagedUser[]>('/users', {
      params: {
        ...(params?.apartmentId ? { apartmentId: params.apartmentId } : {}),
        ...(params?.role ? { role: params.role } : {}),
      },
    }).then((r) => r.data),
  create: (body: object) => api.post<ManagedUser>('/users', body).then((r) => r.data),
  update: (id: string, body: object) => api.put<ManagedUser>(`/users/${id}`, body).then((r) => r.data),
  deactivate: (id: string) => api.post<ManagedUser>(`/users/${id}/deactivate`).then((r) => r.data),
  activate: (id: string) => api.post<ManagedUser>(`/users/${id}/activate`).then((r) => r.data),
}

export const occupancyApi = {
  list: (apartmentId?: string | null) =>
    api.get<Occupancy[]>('/occupancies', { params: scopeParams(apartmentId) }).then((r) => r.data),
  current: (flatId: string) => api.get<Occupancy>(`/flats/${flatId}/occupancy`).then((r) => r.data),
  history: (flatId: string) => api.get<Occupancy[]>(`/flats/${flatId}/occupancy/history`).then((r) => r.data),
  allocate: (flatId: string, body: object) =>
    api.post<Occupancy>(`/flats/${flatId}/occupancy`, body).then((r) => r.data),
  release: (flatId: string) =>
    api.post<Occupancy>(`/flats/${flatId}/occupancy/release`).then((r) => r.data),
}

export const billingApi = {
  list: (apartmentId?: string | null) =>
    api.get<Bill[]>('/bills', { params: scopeParams(apartmentId) }).then((r) => r.data),
  create: (body: object) => api.post<Bill>('/bills', body).then((r) => r.data),
  pay: (id: string, body: { amount: number; method: string; reference: string }) =>
    api.post<Bill>(`/bills/${id}/payments`, body).then((r) => r.data),
  refund: (id: string, body: { amount: number; reason: string; reference?: string | null }) =>
    api.post<Bill>(`/bills/${id}/refunds`, body).then((r) => r.data),
}

export const uploadApi = {
  image: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api
      .post<{ url: string; contentType: string; fileName: string }>('/uploads', fd)
      .then((r) => r.data)
  },
}

export const receiptApi = {
  list: (apartmentId?: string | null) =>
    api.get<Receipt[]>('/receipts', { params: scopeParams(apartmentId) }).then((r) => r.data),
}

export const visitorApi = {
  list: (apartmentId?: string | null) =>
    api.get<Visitor[]>('/visitors', { params: scopeParams(apartmentId) }).then((r) => r.data),
  create: (body: object) =>
    api.post<{ id: string; qrToken: string; approvalStatus?: string }>('/visitors', body).then((r) => r.data),
  approve: (id: string) => api.post<Visitor>(`/visitors/${id}/approve`).then((r) => r.data),
  reject: (id: string, reason?: string) =>
    api.post<Visitor>(`/visitors/${id}/reject`, { reason }).then((r) => r.data),
  validate: (qrToken: string) =>
    api.post<{ valid: boolean; message: string; flatNumber?: string; visitorName?: string }>(
      '/visitors/validate',
      { qrToken },
    ).then((r) => r.data),
  exit: (id: string) => api.post<Visitor>(`/visitors/${id}/exit`).then((r) => r.data),
  exitByToken: (qrToken: string) =>
    api.post<Visitor>('/visitors/exit', { qrToken }).then((r) => r.data),
}

export const complaintApi = {
  list: (apartmentId?: string | null, mine = false) =>
    api.get<Complaint[]>('/complaints', {
      params: { ...(apartmentId ? { apartmentId } : {}), ...(mine ? { mine: true } : {}) },
    }).then((r) => r.data),
  create: (body: object) => api.post<Complaint>('/complaints', body).then((r) => r.data),
  updateStatus: (id: string, body: {
    status: string
    assigneeUserId?: string | null
    resolutionNotes?: string | null
    evidenceUrl?: string | null
  }) => api.patch<Complaint>(`/complaints/${id}/status`, body).then((r) => r.data),
  addComment: (id: string, body: string) =>
    api.post(`/complaints/${id}/comments`, { body }).then((r) => r.data),
}

export const familyApi = {
  list: (params?: { apartmentId?: string | null; flatId?: string | null }) =>
    api.get<FamilyMember[]>('/family-members', {
      params: {
        ...(params?.apartmentId ? { apartmentId: params.apartmentId } : {}),
        ...(params?.flatId ? { flatId: params.flatId } : {}),
      },
    }).then((r) => r.data),
  create: (body: object) => api.post<FamilyMember>('/family-members', body).then((r) => r.data),
  update: (id: string, body: object) => api.put<FamilyMember>(`/family-members/${id}`, body).then((r) => r.data),
  deactivate: (id: string) => api.post<FamilyMember>(`/family-members/${id}/deactivate`).then((r) => r.data),
}

export const noticeApi = {
  list: (apartmentId?: string | null) =>
    api.get<Notice[]>('/notices', { params: scopeParams(apartmentId) }).then((r) => r.data),
  create: (body: object) => api.post<Notice>('/notices', body).then((r) => r.data),
  update: (id: string, body: object) => api.put<Notice>(`/notices/${id}`, body).then((r) => r.data),
  deactivate: (id: string) => api.post<Notice>(`/notices/${id}/deactivate`).then((r) => r.data),
}

export const emergencyApi = {
  list: (apartmentId?: string | null) =>
    api.get<EmergencyContact[]>('/emergency-contacts', { params: scopeParams(apartmentId) }).then((r) => r.data),
  create: (body: object) => api.post<EmergencyContact>('/emergency-contacts', body).then((r) => r.data),
  update: (id: string, body: object) =>
    api.put<EmergencyContact>(`/emergency-contacts/${id}`, body).then((r) => r.data),
  deactivate: (id: string) =>
    api.post<EmergencyContact>(`/emergency-contacts/${id}/deactivate`).then((r) => r.data),
}

export const parkingApi = {
  list: (apartmentId?: string | null) =>
    api.get<ParkingSlot[]>('/parking-slots', { params: scopeParams(apartmentId) }).then((r) => r.data),
  create: (body: object) => api.post<ParkingSlot>('/parking-slots', body).then((r) => r.data),
  update: (id: string, body: object) => api.put<ParkingSlot>(`/parking-slots/${id}`, body).then((r) => r.data),
  allocate: (id: string, body: { flatId: string; vehicleNumber?: string }) =>
    api.post<ParkingSlot>(`/parking-slots/${id}/allocate`, body).then((r) => r.data),
  release: (id: string) =>
    api.post<ParkingSlot>(`/parking-slots/${id}/release`).then((r) => r.data),
  deactivate: (id: string) =>
    api.post<ParkingSlot>(`/parking-slots/${id}/deactivate`).then((r) => r.data),
}

export type AuditEvent = {
  id: string
  action: string
  entityType: string
  entityId: string | null
  summary: string
  actorName: string | null
  apartmentId: string | null
  createdAt: string
}

export const auditApi = {
  list: (apartmentId?: string | null) =>
    api.get<AuditEvent[]>('/audit-events', { params: scopeParams(apartmentId) }).then((r) => r.data),
}

export const deviceApi = {
  registerPush: (token: string, platform: string) =>
    api.post('/devices/push-token', { token, platform }).then((r) => r.data),
  unregisterPush: (token: string) =>
    api.delete('/devices/push-token', { params: { token } }).then((r) => r.data),
  vapidPublicKey: () =>
    api.get<{ publicKey: string | null }>('/devices/vapid-public-key').then((r) => r.data),
}
