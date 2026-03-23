import { z } from 'zod'

export const AddVehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  licensePlate: z.string().min(1).max(20),
})

export type AddVehicleInput = z.infer<typeof AddVehicleSchema>
