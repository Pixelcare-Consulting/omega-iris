'use server'

import fs from 'fs'
import path from 'path'
import { mailerLogger, transporter } from '@/utils/mailer'
import logger from '@/utils/logger'
import Handlebars from 'handlebars'

type MailOptions = {
  to: string
  subject: string
  template: string
  data: Record<string, unknown>
}

const TEMPLATES_DIR = path.join(process.cwd(), 'components/email-templates')
const PARTIALS_DIR = path.join(TEMPLATES_DIR, 'partials')

export async function sendEmail({ to, subject, template, data }: MailOptions) {
  try {
    const html = await renderTemplate(template, data)

    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html,
    })

    mailerLogger.info({ messageId: info.messageId, to: to, subject: subject }, 'Email sent successfully')

    return info
  } catch (err) {
    mailerLogger.error({ err, to: to, subject: subject }, 'Failed to send email')
    throw err
  }
}

//* cache compiled templates so we don't re-read/re-compile from disk on every send
const templateCache = new Map<string, HandlebarsTemplateDelegate>()
const templateLogger = logger.child({ module: 'templateRenderer' })
let partialsRegistered = false

//* register every .hbs in the partials dir once, so templates can use e.g. {{> header}} / {{> footer}}
function registerPartials() {
  if (partialsRegistered) return

  //* check if partials directory exists
  if (!fs.existsSync(PARTIALS_DIR)) {
    templateLogger.warn({ partialsDir: PARTIALS_DIR }, 'Partials directory not found, skipping registration')
    partialsRegistered = true
    return
  }

  const files = fs.readdirSync(PARTIALS_DIR).filter((file) => file.endsWith('.hbs'))

  //* register each partial
  for (const file of files) {
    const partialName = path.basename(file, '.hbs')
    const source = fs.readFileSync(path.join(PARTIALS_DIR, file), 'utf-8')

    Handlebars.registerPartial(partialName, source)
  }

  partialsRegistered = true

  templateLogger.info({ partials: files.length }, 'Partials registered')
}

//* renders a template with the given data
export async function renderTemplate(templateName: string, data: Record<string, unknown>) {
  registerPartials()

  //* initialize with template cache, if exists
  let template = templateCache.get(templateName)

  //* check if template exists
  if (!template) {
    const filePath = path.join(TEMPLATES_DIR, `${templateName}.hbs`)

    if (!fs.existsSync(filePath)) {
      templateLogger.error({ templateName, filePath }, 'Template file not found')
      throw new Error(`Email template "${templateName}" not found`)
    }

    const source = fs.readFileSync(filePath, 'utf-8')
    template = Handlebars.compile(source)

    //* cache compiled template
    templateCache.set(templateName, template)

    templateLogger.info({ templateName }, 'Template compiled and cached')
  }

  //* defaults every template can rely on, overridable by the caller's data
  return template({ year: new Date().getFullYear(), ...data })
}
