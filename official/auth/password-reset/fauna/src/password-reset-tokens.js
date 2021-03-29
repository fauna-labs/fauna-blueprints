import faunadb from 'faunadb'
const q = faunadb.query
const { Let, Match, Index, Var, Select, Paginate, Create, Collection, Tokens, TimeAdd, Now, Lambda, Delete, Do } = q

export const RESET_TOKEN_LIFETIME_SECONDS = 1800 // 30 minutes

export function CreatePasswordResetToken (accountRef, lifetimeSecs) {
  return Let(
    {
      // If we create a token in a specific collection, we can more easily control
      // with roles what the token can do.
      reset_request: Create(Collection('password_reset_request'), {
        data: {
          account: accountRef
        }
      })
    },
    // Create a token that will provide the permissions of the accounts_verification_request document.
    // The account is linked to it in the document which will be used in the roles to verify the acount.
    Create(Tokens(), {
      instance: Select(['ref'], Var('reset_request')),
      ttl: TimeAdd(Now(), lifetimeSecs || RESET_TOKEN_LIFETIME_SECONDS, 'seconds')
    })
  )
}

export function InvalidateResetTokens (accountRef) {
  return Let(
    {
      resetRequests: Paginate(Match(Index('password_reset_requests_by_account'), accountRef)),
      resetTokens: q.Map(
        Var('resetRequests'),
        Lambda(['request'], Select([0], Paginate(Match(Index('tokens_by_instance'), Var('request')))))
      )
    },
    Do(
      q.Map(Var('resetTokens'), Lambda(['tokenRef'], Delete(Var('tokenRef')))),
      q.Map(Var('resetRequests'), Lambda(['resetRequestRef'], Delete(Var('resetRequestRef'))))
    )
  )
}
