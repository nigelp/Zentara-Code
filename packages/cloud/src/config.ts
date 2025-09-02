export const PRODUCTION_CLERK_BASE_URL = "https://clerk.zentaracode.com"
export const PRODUCTION_ROO_CODE_API_URL = "https://app.zentaracode.com"

export const getClerkBaseUrl = () => process.env.CLERK_BASE_URL || PRODUCTION_CLERK_BASE_URL

export const getZentaraCodeApiUrl = () => process.env.ROO_CODE_API_URL || PRODUCTION_ROO_CODE_API_URL
