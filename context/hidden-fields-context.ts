import { createContext } from 'react'

type HiddenFieldsContextValue = { hiddenFields?: string[] }

export const HiddenFieldsContext = createContext<HiddenFieldsContextValue>({ hiddenFields: [] })
