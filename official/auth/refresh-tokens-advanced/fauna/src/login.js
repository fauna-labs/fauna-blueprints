import faunadb from 'faunadb'
import { CreateAccessAndRefreshToken } from './tokens'

const q = faunadb.query
const { Let, Var, Select, Match, Index, If, Get, Identify, Exists, And } = q

export function LoginAccount (email, password, accessTtlSeconds, refreshLifetimeSeconds, refreshReclaimtimeSeconds) {
  return If(
    // First check whether the account exists and the account can be identified with the email/password
    And(
      VerifyAccountExists(email),
      IdentifyAccount(email, password)
    ),
    CreateTokensForAccount(email, accessTtlSeconds, refreshLifetimeSeconds, refreshReclaimtimeSeconds),
    // if not, return false
    false
  )
}

function GetAccountByEmail (email) {
  return Get(Match(Index('accounts_by_email'), email))
}

function VerifyAccountExists (email) {
  return Exists(Match(Index('accounts_by_email'), email))
}

function IdentifyAccount (email, password) {
  return Identify(Select(['ref'], GetAccountByEmail(email)), password)
}

function CreateTokensForAccount (email, accessTtlSeconds, refreshLifetimeSeconds, refreshReclaimtimeSeconds) {
  return Let(
    {
      account: GetAccountByEmail(email),
      accountRef: Select(['ref'], Var('account')),
      // Verify whether our login credentials are correct with Identify.
      // Then we make an access and refresh in case authentication succeeded.
      tokens: CreateAccessAndRefreshToken(Var('accountRef'), accessTtlSeconds, refreshLifetimeSeconds, refreshReclaimtimeSeconds)
    },
    {
      tokens: Var('tokens'),
      account: Var('account')
    }
  )
}
