import faunadb from 'faunadb'
import { CreateAccessToken } from './tokens'

const q = faunadb.query
const {
  Let,
  Var,
  Select,
  Match,
  Index,
  If,
  Get,
  Identify,
  Exists
} = q

const failedResult = {
  token: false,
  account: false
}

export function LoginAccount (email, password, accessTtlSeconds) {
  return If(
    // First check whether the account exists
    Exists(Match(Index('accounts_by_email'), email)),
    // If not, we can skip all below.
    Let(
      {
        // Retrieve the account.
        account: Get((Match(Index('accounts_by_email'), email))),
        accountRef: Select(['ref'], Var('account')),
        // The below (Identify + CreateAccessToken) is equivalent of using the Login() functionality in Fauna except that you have
        // more control. The Login function would abort in case the password is wrong and since you might
        // want to call it from the frontend, it ideally doesn't return an error to the user.
        // Verify whether our login credentials are correct with Identify.
        authenticated: Identify(Var('accountRef'), password)
        // Once identified, an access and refresh in case authentication succeeded.
      },
      {
        token: If(Var('authenticated'), CreateAccessToken(Var('accountRef'), accessTtlSeconds), false),
        // Do not provide the end user with information about existance of the account
        account: If(Var('authenticated'), Var('account'), false)
      }
    ),
    // just return false for each in case the account doesn't exist.
    failedResult
  )
}
