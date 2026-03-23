import { Router, type Request, type Response, type NextFunction } from 'express'
import { AvailabilityQuerySchema } from '../../../domain/model'
import type { ReferenceUseCase } from '../../../use-cases'
import { ValidationError } from '../../../errors'

export function createReferenceRouter(service: ReferenceUseCase): Router {
  const router = Router()

  // GET /api/dealerships
  router.get(
    '/dealerships',
    async (_req: Request, res: Response, next: NextFunction) => {
      try {
        res.json(await service.listDealerships())
      } catch (err) {
        next(err)
      }
    },
  )

  // GET /api/service-types
  router.get(
    '/service-types',
    async (_req: Request, res: Response, next: NextFunction) => {
      try {
        res.json(await service.listServiceTypes())
      } catch (err) {
        next(err)
      }
    },
  )

  /**
   * GET /api/dealerships/:id/availability?serviceTypeId=...&date=YYYY-MM-DD[&hour=H]
   */
  router.get(
    '/dealerships/:id/availability',
    async (req: Request, res: Response, next: NextFunction) => {
      const result = AvailabilityQuerySchema.safeParse(req.query)
      if (!result.success) {
        return next(
          new ValidationError(
            'Invalid query parameters',
            result.error.flatten(),
          ),
        )
      }
      try {
        const slots = await service.getDealershipAvailability(
          req.params.id,
          result.data,
        )
        res.json({
          dealershipId: req.params.id,
          serviceTypeId: result.data.serviceTypeId,
          date: result.data.date,
          slots,
        })
      } catch (err) {
        next(err)
      }
    },
  )

  return router
}
