'use server'

import z from 'zod'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { getBpProfileCompanyOptions } from '@/utils/user-bp-profile-db'

//! reads every company on purpose, so only user admins may call it — the client never sends a dbCode
export const getBpProfileCompanyOptionsClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ profileType: z.enum(['C', 'S']) }))
  .action(async ({ ctx, parsedInput: data }) => {
    const canManageUsers = ctx.ability?.can('create', 'p-users') || ctx.ability?.can('edit', 'p-users')
    if (!canManageUsers) throw { code: 403, message: 'No access to user profiles!', action: 'GET_BP_PROFILE_COMPANY_OPTIONS' }

    return getBpProfileCompanyOptions(data.profileType)
  })
