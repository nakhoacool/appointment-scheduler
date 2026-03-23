import { z } from 'zod'

export const CreateAppointmentSchema = z.object({
  vehicleId: z.string().min(1),
  serviceTypeId: z.string().min(1),
  dealershipId: z.string().min(1),
  desiredStartTime: z
    .string()
    .datetime({
      offset: true,
      message: 'desiredStartTime must be an ISO 8601 date-time string',
    })
    .transform((s) => new Date(s)),
})

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>
