import * as fauna from 'faunadb'
const q = fauna.query
const { Get, Paginate, Tokens, Lambda, Var } = q

export async function verifyTokens (t, adminClient, tokenConfig) {
  const allTokens = await adminClient.query(q.Map(Paginate(Tokens()), Lambda(['t'], Get(Var('t')))))
  t.is(allTokens.data.filter((t) => t.data.type === 'refresh').length, tokenConfig.refresh)
  t.is(allTokens.data.filter((t) => t.data.type === 'access').length, tokenConfig.access)
}

export async function verifyRefreshTokensLogout (t, adminClient, loggedOut) {
  const allTokens = await adminClient.query(q.Map(Paginate(Tokens()), Lambda(['t'], Get(Var('t')))))
  t.is(allTokens.data.filter((t) => t.data.type === 'refresh' && t.data.loggedOut).length, loggedOut)
}

export async function getAccessToken (adminClient) {
  const allTokens = await adminClient.query(q.Map(Paginate(Tokens()), Lambda(['t'], Get(Var('t')))))
  return allTokens.data.filter((t) => t.data.type === 'access')[0]
}
