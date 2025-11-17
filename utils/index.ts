import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import * as clipboard from 'clipboard-polyfill'
import notify from 'devextreme/ui/notify'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getInitials = (str: string, limit: number = 2) => {
  if (!str) return ''

  return str.split(/\s/).reduce((response, word, index) => {
    if (index < limit) response += word.slice(0, 1)
    return response
  }, '')
}

export function titleCase(str: string) {
  return str
    .toLowerCase()
    .split(' ')
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const copyText = (text: string) => (evt: any) => {
  clipboard.writeText(String(text)).then(
    () => {
      const tipText = 'Text copied'
      notify(
        {
          message: tipText,
          minWidth: `${tipText.length + 2}ch`,
          width: 'auto',
          position: { of: evt.target, offset: '0 -40' },
        },
        'info',
        500
      )
    },
    () => {
      notify(
        {
          message: 'Failed to copy!',
          position: { of: evt.target, offset: '0 -40' },
        },
        'error',
        500
      )
    }
  )
}

export function toKebabCase(text: string, toLowerCase = false) {
  let result = text

  if (!text) return ''

  if (toLowerCase) result = result.toLowerCase()

  return result
    .replace(/[^a-zA-Z0-9-]+/g, '-') //* Replace any character that is not a-z, A-Z, 0-9, or dash with dash
    .replace(/-+/g, '-') //* Collapse multiple dashes
}
