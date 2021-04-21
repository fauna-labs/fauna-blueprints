import faunadb from 'faunadb'
import { IsCalledWithVerifiedAccount } from '../../src/verification-tokens'

const q = faunadb.query
const {
  Query,
  Lambda,
  Collection,
  CreateRole,
  Var,
  CurrentIdentity,
  Equals
} = q

export default CreateRole({
  name: 'loggedin',
  membership: [
    {
      // The accounts collection gets access
      resource: Collection('accounts'),
      // If the token used is an access token or which we'll use a reusable snippet of FQL
      // returned by 'IsCalledWithAccessToken'
      predicate: Query(Lambda(ref => IsCalledWithVerifiedAccount()))
    }
  ],
  privileges: [
    {
      // provide access to something, in this case, let's provide read access to it's own account
      resource: Collection('accounts'),
      actions: {
        read: Query(Lambda('accountRef', Equals(
          CurrentIdentity(), // logged in user
          Var('accountRef')
        )))
      }
    }
  ]
})
