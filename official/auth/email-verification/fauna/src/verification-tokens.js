import { And, Equals, Get, CurrentToken, HasCurrentIdentity, Create, Let, Collection, Var, Select, Tokens, TimeAdd, Now, CurrentIdentity } from 'faunadb'

export const EMAIL_VERIFICATION_LIFETIME_SECONDS = 600 // 10 minutes

export function CreateEmailVerificationToken (accountRef, lifetimeSecs) {
  return Let(
    {
      // Todo, invalidate other tokens!

      // first create a document in a collection specifically provided for email verification tokens.
      // If we create a token in a specific collection, we can more easily control
      // with roles what the token can do.
      verification_request: Create(Collection('email_verification_request'), {
        data: {
          account: accountRef
        }
      })
    },
    // Create a token that will provide the permissions of the email_verification_request document.
    // The account is linked to it in the document which will be used in the roles to verify the acount.
    Create(Tokens(), {
      instance: Select(['ref'], Var('verification_request')),
      ttl: TimeAdd(Now(), lifetimeSecs || EMAIL_VERIFICATION_LIFETIME_SECONDS, 'seconds')
    })
  )
}

export function IsCalledWithVerifiedAccount () {
  return And(
    HasCurrentIdentity(),
    Select(['data', 'verified'], Get(CurrentIdentity()), false)
  )
}
