import {
  Router,
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from 'express'
import { AddVehicleSchema } from '../../../domain/model'
import type { CustomersUseCase } from '../../../use-cases'
import { ValidationError } from '../../../errors'

export function createCustomersRouter(
  service: CustomersUseCase,
  requireAuth: RequestHandler,
): Router {
  const router = Router()

  router.use(requireAuth)

  // GET /api/customers/me
  router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await service.getProfile(req.user!.customerId))
    } catch (err) {
      next(err)
    }
  })

  // GET /api/customers/me/vehicles
  router.get(
    '/me/vehicles',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.json(await service.listVehicles(req.user!.customerId))
      } catch (err) {
        next(err)
      }
    },
  )

  // POST /api/customers/me/vehicles
  router.post(
    '/me/vehicles',
    async (req: Request, res: Response, next: NextFunction) => {
      const result = AddVehicleSchema.safeParse(req.body)
      if (!result.success) {
        return next(
          new ValidationError('Invalid request body', result.error.flatten()),
        )
      }
      try {
        const vehicle = await service.addVehicle(
          req.user!.customerId,
          result.data,
        )
        res.status(201).json(vehicle)
      } catch (err) {
        next(err)
      }
    },
  )

  return router
}
