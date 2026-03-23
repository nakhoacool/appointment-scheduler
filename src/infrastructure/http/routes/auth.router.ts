import { Router, type Request, type Response, type NextFunction } from 'express'
import { RegisterSchema, LoginSchema } from '../../../domain/model'
import type { AuthUseCase } from '../../../use-cases'
import { ValidationError } from '../../../errors'

export function createAuthRouter(service: AuthUseCase): Router {
  const router = Router()

  // POST /api/auth/register
  router.post(
    '/register',
    async (req: Request, res: Response, next: NextFunction) => {
      const result = RegisterSchema.safeParse(req.body)
      if (!result.success) {
        return next(
          new ValidationError('Invalid request body', result.error.flatten()),
        )
      }
      try {
        const data = await service.register(result.data)
        res.status(201).json(data)
      } catch (err) {
        next(err)
      }
    },
  )

  // POST /api/auth/login
  router.post(
    '/login',
    async (req: Request, res: Response, next: NextFunction) => {
      const result = LoginSchema.safeParse(req.body)
      if (!result.success) {
        return next(
          new ValidationError('Invalid request body', result.error.flatten()),
        )
      }
      try {
        const data = await service.login(result.data)
        res.json(data)
      } catch (err) {
        next(err)
      }
    },
  )

  return router
}
