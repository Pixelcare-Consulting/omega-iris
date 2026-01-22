import fs from 'fs/promises'

//* sanitize filename,
//* remove spaces and replace it with underscore '_'
//* remove unsafe & special characters and only allowed letters (a-z A-Z), numbers (0-9), underscore (_), dash (-), dot (.)
//* this is done to prevent security vulnerabilities and break file access
export function sanitizeFilename(name: string) {
  return name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')
}

export async function fileExists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}
