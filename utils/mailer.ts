import nodemailer from 'nodemailer'
import logger from './logger'
import { safeParseInt } from '.'

const mailerLogger = logger.child({ module: 'mailer' })

//* create reusable transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: safeParseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

//* verify connection config at startup, not on every send
transporter.verify((err) => {
  if (err) {
    mailerLogger.error({ err }, 'SMTP transporter failed to verify connection')
  } else {
    mailerLogger.info('SMTP transporter is ready to send emails')
  }
})

export { transporter, mailerLogger }
