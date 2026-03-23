import type { Request, Response, NextFunction, RequestHandler } from 'express'
import type { AuthUseCase } from '../../../use-cases/auth/auth.use-case'
import { UnauthorizedError } from '../../../errors'

export function createAuthMiddleware(authUseCase: AuthUseCase): RequestHandler {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return next(
        new UnauthorizedError('Missing or malformed Authorization header'),
      )
    }
    try {
      req.user = await authUseCase.verifyToken(header.slice(7))
      next()
    } catch {
      next(new UnauthorizedError('Invalid or expired token'))
    }
  }
}
