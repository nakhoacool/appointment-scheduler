import 'dotenv/config'
import app from './infrastructure/http/app'
import { logger } from './logger'

const PORT = Number(process.env.PORT ?? 3000)

app.listen(PORT, () => {
  logger.info({ port: PORT }, `🚗  Appointment Scheduler API listening`)
})
