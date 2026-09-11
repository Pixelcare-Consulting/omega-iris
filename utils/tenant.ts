import { auth } from '@/auth'

//* the SAP database the current session is working in, every tenant query scopes by this
//? auth() reads next/headers, outside a request it throws, so callers get null instead of a crash
export async function getTenantDbCode(): Promise<string | null> {
  try {
    const session = await auth()
    return session?.user?.sapDbCode ?? null
  } catch (error) {
    console.error(`Could not read the session to resolve the tenant database: ${error}`)
    return null
  }
}
