/**
 * An array of routes that are accessible to public.
 * These routes does not require authentication.
 * @type {string[]}
 */
export const publicRoutes = ['/examples', '/unauthorized']

/**
 * An array of routes that are used for authentication.
 * These routes does not require authentication.
 * @type {string[]}
 */
export const authRoutes = ['/signin']

/**
 * An array of routes that are accessible to authenticated users.
 * These routes requires authentication.
 * @type {string[]}
 */
export const protectedRoutes = ['/dashboard', '/users', '/profile', '/security/roles', 'project/groups', 'project/individuals']

/**
 * The prefix for all API routes that is used for authentication.
 * Routes that starts with this prefix are used for authentication.
 * @type {string}
 */
export const authApiPrefix = '/api/auth'

export const DEFAULT_SIGNIN_REDIRECT = '/dashboard'
