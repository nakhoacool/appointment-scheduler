export interface AvailabilityInput {
  dealershipId: string
  serviceTypeId: string
  desiredStartTime: Date
}

export interface AvailabilityResult {
  bayId: string
  technicianId: string
  startTime: Date
  endTime: Date
}

export interface IAvailabilityRepository {
  getServiceType(
    id: string,
  ): Promise<{ durationMinutes: number; requiredSkill: string }>
  getOverlappingSlots(
    dealershipId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<Array<{ serviceBayId: string; technicianId: string }>>
  findFreeServiceBay(
    dealershipId: string,
    excludedIds: string[],
  ): Promise<{ id: string } | null>
  findCandidateTechnicians(
    dealershipId: string,
    excludedIds: string[],
  ): Promise<Array<{ id: string; skills: string }>>
}
