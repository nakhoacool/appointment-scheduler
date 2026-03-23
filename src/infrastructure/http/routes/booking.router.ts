import {
  Router,
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from 'express'
import { CreateAppointmentSchema } from '../../../domain/model'
import type { BookingUseCase } from '../../../use-cases'
import { ValidationError } from '../../../errors'

export function createBookingRouter(
  service: BookingUseCase,
  requireAuth: RequestHandler,
): Router {
  const router = Router()

  router.use(requireAuth)

  // POST /api/appointments
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    const result = CreateAppointmentSchema.safeParse(req.body)
    if (!result.success) {
      return next(
        new ValidationError('Invalid request body', result.error.flatten()),
      )
    }
    try {
      const appt = await service.createAppointment(
        req.user!.customerId,
        result.data,
      )
      res.status(201).json(appt)
    } catch (err) {
      next(err)
    }
  })

  // GET /api/appointments
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const appointments = await service.listAppointments(req.user!.customerId)
      res.json(appointments)
    } catch (err) {
      next(err)
    }
  })

  // GET /api/appointments/:id
  router.get(
    '/:id',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const appt = await service.getAppointment(
          req.params.id,
          req.user!.customerId,
        )
        res.json(appt)
      } catch (err) {
        next(err)
      }
    },
  )

  // PATCH /api/appointments/:id/cancel
  router.patch(
    '/:id/cancel',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const appt = await service.cancelAppointment(
          req.params.id,
          req.user!.customerId,
        )
        res.json(appt)
      } catch (err) {
        next(err)
      }
    },
  )

  return router
}
