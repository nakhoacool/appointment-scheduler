// Augment Express Request to carry the authenticated user context
declare namespace Express {
  interface Request {
    user?: {
      customerId: string
      email: string
    }
  }
}
