export interface DealershipRecord {
  id: string
  name: string
  address: string
  serviceBays: Array<{ id: string; bayNumber: number }>
  _count: { technicians: number }
}

export interface ServiceTypeRecord {
  id: string
  name: string
  durationMinutes: number
  requiredSkill: string
}

export interface IReferenceRepository {
  listDealerships(): Promise<DealershipRecord[]>
  listServiceTypes(): Promise<ServiceTypeRecord[]>
}
