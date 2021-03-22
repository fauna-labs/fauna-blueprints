import faunadb from 'faunadb'
const q = faunadb.query
const { Do, Create, Collection, CurrentToken, CurrentIdentity } = q

export const REFRESH_TOKEN_REUSE_ERROR = {
  code: 'REFRESH_TOKEN_REUSE',
  message: 'The refresh token was used outside of the grace period which indicates that it was leaked'
}

export const REFRESH_TOKEN_EXPIRED = {
  code: 'REFRESH_TOKEN_EXPIRED',
  message: 'The refresh token was expired'
}

export const REFRESH_TOKEN_USED_AFTER_LOGOUT = {
  code: 'REFRESH_TOKEN_USED_AFTER_LOGOUT',
  message: 'The refresh token was used after logging out'
}

export function LogAnomaly (error, action) {
  return Do(
    // Log the anomaly
    Create(Collection('anomalies'), {
      data: {
        error: error,
        token: CurrentToken(),
        account: CurrentIdentity(),
        action: action
      }
    }),
    // Return the error
    error
  )
}
