"use client"

import { useContext } from "react"
import { AbilityContext } from "./can"

type CanViewProps = {
  children?: React.ReactNode
  action: string | string[]
  subject: string | string[]
  isReturnBoolean?: boolean
}

//* can returned children or a boolean value to tell whether its allowed or not allowed to view/show component
export default function CanView({ children, action, subject, isReturnBoolean }: CanViewProps) {
  const ability = useContext(AbilityContext)

  if (!ability) return null

  const actions = Array.isArray(action) ? action : [action]
  const subjects = Array.isArray(subject) ? subject : [subject]

  //* check if user can perform at least one action on at least one subject
  const canView = actions.some((act) => subjects.some((sub) => ability.can(act, sub)))

  if (isReturnBoolean) return canView

  if (!canView || !children) return null

  return <>{children}</>
}
