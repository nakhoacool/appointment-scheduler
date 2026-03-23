export interface ServiceBayDto {
  id: string
  bayNumber: number
}

export interface DealershipDto {
  id: string
  name: string
  address: string
  serviceBays: ServiceBayDto[]
  technicianCount: number
}

export interface ServiceTypeDto {
  id: string
  name: string
  durationMinutes: number
  requiredSkill: string
}

export interface AvailabilitySlotDto {
  startTime: string
  endTime: string
  available: boolean
}
