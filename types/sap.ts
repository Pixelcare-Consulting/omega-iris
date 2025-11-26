export type SapCredentials = {
  baseUrl: string
  companyDb: string
  userName: string
  password: string
}

export type SapAuthCookies = {
  b1session: string
  routeid: string
}

export type SapTokenConfig = {
  b1session?: string
  routeid?: string
  generatedAt?: number
}
