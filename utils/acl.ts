import { AbilityBuilder, Ability } from '@casl/ability'

export type Subject = string
export type Action = string
export type AppAbility = Ability<[Action, Subject]> | undefined

export const AppAbility = Ability as any

export type ACLObj = {
  action: string | string[]
  subject: string | string[]
}

export type DefineRulesUser = {
  roleKey: string
  rolePermissions: { id: string; code: string; actions: string[] }[]
}

//* manage - represent any action
//* all - represent any subject
//* manage & all - grant full access to system

export const defineRulesForUser = ({ roleKey, rolePermissions }: DefineRulesUser) => {
  const { can, rules } = new AbilityBuilder(AppAbility)

  //* Grant full access to system
  if (roleKey === 'admin') can('manage', 'all')

  rolePermissions?.forEach((permission) => {
    can(permission.actions, permission.code)
  })

  return rules
}

export const buildAbilityFor = ({ roleKey, rolePermissions }: DefineRulesUser): AppAbility => {
  return new AppAbility(defineRulesForUser({ roleKey, rolePermissions }), {
    detectSubjectType: (object: Record<string, any>) => object!.type,
  })
}
