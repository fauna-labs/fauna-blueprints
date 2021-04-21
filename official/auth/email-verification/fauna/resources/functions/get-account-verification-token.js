import faunadb from 'faunadb'

import { CreateEmailVerificationToken } from '../../src/verification-tokens'

const q = faunadb.query
const { CreateFunction, Query, Lambda, Var } = q

export default CreateFunction({
  name: 'get_account_verification_token',
  body: Query(Lambda(['accountRef'],
    CreateEmailVerificationToken(Var('accountRef'))
  )),
  role: 'server'
})
