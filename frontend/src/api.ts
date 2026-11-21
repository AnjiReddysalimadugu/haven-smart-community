import axios from 'axios'

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('haven.auth.token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = String(error.config?.url ?? '')
    if (status === 401 && !url.includes('/auth/login') && !url.includes('/auth/otp/') && !url.includes('/auth/me')) {
      window.dispatchEvent(new CustomEvent('haven:unauthorized'))
    }
    return Promise.reject(error)
  },
)

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

export type LoginResponse = {
  accessToken: string
  tokenType: string
  expiresInSeconds: number
  user: AuthUser
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

export type Bill = {
  id: string
  flatId: string
  flatNumber: string
  billType: string
  billingPeriod: string
  amount: number
  paidAmount: number
  balance: number
  dueDate: string
  status: string
}

export type VisitorApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type Visitor = {
  id: string
  flatId: string
  flatNumber: string
  visitorName: string
  mobile: string
  visitType: string
  expiresAt: string
  used: boolean
  entryAt: string | null
  exitAt: string | null
  approvalStatus?: VisitorApprovalStatus
  approvedAt?: string | null
  rejectionReason?: string | null
}

export type ComplaintComment = {
  id: string
  authorUserId: string
  authorName: string
  body: string
  createdAt: string
}

export type ComplaintHistory = {
  id: string
  fromStatus: string | null
  toStatus: string
  actorName: string | null
  note: string | null
  createdAt: string
}

export type Complaint = {
  id: string
  flatId: string
  flatNumber: string
  title: string
  category: string
  description: string
  status: string
  assigneeUserId: string | null
  assigneeName: string | null
  resolutionNotes: string | null
  evidenceUrl?: string | null
  createdAt: string
  comments: ComplaintComment[]
  statusHistory?: ComplaintHistory[]
}

export type FamilyMember = {
  id: string
  flatId: string
  flatNumber: string
  fullName: string
  relation: string
  mobile: string | null
  age: number | null
  active: boolean
  createdAt: string
}

export type Notice = {
  id: string
  apartmentId: string
  title: string
  body: string
  publishedAt: string
  expiresAt: string | null
  active: boolean
  createdAt: string
}

export type EmergencyContact = {
  id: string
  apartmentId: string
  name: string
  roleLabel: string
  phone: string
  sortOrder: number
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

export type Block = { id: string; apartmentId: string; name: string; code: string }
export type Floor = { id: string; blockId: string; floorNumber: number; name: string }
export type Flat = {
  id: string
  floorId: string
  flatNumber: string
  areaSqft: number | null
  bedroomCount: number | null
  status: string
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

export type ManagedUser = {
  id: string
  email: string
  fullName: string
  role: Role
  apartmentId: string | null
  apartmentName: string | null
  flatId: string | null
  flatNumber: string | null
  active: boolean
  createdAt: string
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
