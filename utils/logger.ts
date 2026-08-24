import { isProd } from '@/constants/common'
import pino from 'pino'

//* DEFAULT PINO LOGGER LEVEL
//* trace - 10
//* debug - 20
//* info - 30
//* warn - 40
//* error - 50
//* fatal - 60
//* silent - infinity

const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  redact: {
    paths: ['*.pass', '*.password', '*.auth.pass', 'req.headers.authorization'],
    censor: '**REDACTED**',
  },
  transport: isProd
    ? undefined //* plain JSON in prod
    : {
        target: 'pino-pretty',
        options: {
          translateTime: 'SYS:mm-dd-yyyy HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
})

export default logger
