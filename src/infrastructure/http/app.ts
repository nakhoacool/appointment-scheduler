import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import path from 'path'
import { logger } from '../../logger'
import { AppError, ValidationError } from '../../errors'

import {
  createAuthRouter,
  createBookingRouter,
  createCustomersRouter,
  createReferenceRouter,
} from './routes'
import {
  authService,
  customersService,
  bookingService,
  referenceService,
  requireAuth,
} from '../../container'

const app = express()

app.use(express.json())

// Lightweight request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info({ method: req.method, url: req.url }, 'incoming request')
  next()
})

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() }),
)

// ── OpenAPI spec & Swagger UI ────────────────────────────────────────────────
const OPENAPI_PATH = path.resolve(__dirname, '../../../docs/openapi.yaml')

app.get('/docs', (req: Request, res: Response) => {
  const specUrl = `${req.protocol}://${req.get('host')}/openapi.yaml`
  res.setHeader('Content-Type', 'text/html')
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Appointment Scheduler — API Docs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '${specUrl}',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
    })
  </script>
</body>
</html>`)
})

app.use('/api/auth', createAuthRouter(authService))
app.use('/api/customers', createCustomersRouter(customersService, requireAuth))
app.use('/api/appointments', createBookingRouter(bookingService, requireAuth))
app.use('/api', createReferenceRouter(referenceService))

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found' })
})

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn({ code: err.code, statusCode: err.statusCode }, err.message)
    const body: Record<string, unknown> = {
      error: err.code ?? 'ERROR',
      message: err.message,
    }
    if (err instanceof ValidationError && err.details !== undefined) {
      body.details = err.details
    }
    return res.status(err.statusCode).json(body)
  }
  logger.error({ err }, 'Unhandled error')
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  })
})

export default app
