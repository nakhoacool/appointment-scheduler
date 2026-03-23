import { z } from 'zod'

export const AvailabilityQuerySchema = z.object({
  serviceTypeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  hour: z.coerce.number().int().min(0).max(23).optional(),
})

export type AvailabilityQueryInput = z.infer<typeof AvailabilityQuerySchema>
