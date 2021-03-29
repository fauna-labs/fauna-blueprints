import faunadb from 'faunadb'
import { CreatePasswordResetToken, InvalidateResetTokens } from './password-reset-tokens'

const q = faunadb.query
const { If, Exists, Let, Match, Index, Var, Select, Paginate, Get, Identity, Update } = q

export const ACCOUNT_NOT_FOUND = {
  code: 'ACCOUNT_NOT_FOUND',
  message: 'The account was not found'
}

function RequestPasswordReset (email, lifetimeSecs) {
  return If(
    Exists(Match(Index('accounts_by_email'), email)),
    Let(
      {
        accountRef: Select([0], Paginate(Match(Index('accounts_by_email'), email))),
        // When a new request is created, previous reset tokens are invalidated.
        invalidate: InvalidateResetTokens(Var('accountRef'))
        // then create the new password reset token
      },
      CreatePasswordResetToken(Var('accountRef'), lifetimeSecs)
    ),
    ACCOUNT_NOT_FOUND
  )
}

function ChangePassword (password) {
  // The token that is used to change the password belongs to a document from the
  // Collection('password_reset_request'), therefore the Identity() reference will point to such a doc.
  // When we created the document we saved the account to it.
  return Let(
    {
      resetRequest: Get(Identity()),
      accountRef: Select(['data', 'account'], Var('resetRequest'))
    },
    Update(Var('accountRef'), { credentials: { password: password } })
  )
}

export { RequestPasswordReset, ChangePassword }
