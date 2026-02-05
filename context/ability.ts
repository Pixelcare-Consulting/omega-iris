import { createContext } from 'react'
import { AnyAbility } from '@casl/ability'

export const AbilityContext = createContext<AnyAbility>(undefined!)
