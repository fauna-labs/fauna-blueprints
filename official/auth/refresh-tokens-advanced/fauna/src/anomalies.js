import faunadb from 'faunadb'
const q = faunadb.query
const { Do, Create, Collection } = q

export const REFRESH_TOKEN_REUSE_ERROR = {
  code: 'REFRESH_TOKEN_REUSE',
  message: 'The refresh token was used outside of the grace period which indicates that it was leaked'
}

export function LogRefreshTokenReuseAnomaly (tokenRef, accountRef) {
  return Do(
    // Log the anomaly
    Create(Collection('anomalies'), {
      data: {
        error: REFRESH_TOKEN_REUSE_ERROR,
        token: tokenRef,
        account: accountRef
      }
    }),
    // Return the error
    REFRESH_TOKEN_REUSE_ERROR
  )
}
