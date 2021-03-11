
import faunadb from 'faunadb'
import { IsCalledWithAccessToken } from '../../src/tokens'

const q = faunadb.query
const {
  Query,
  Lambda,
  Collection,
  CreateRole
} = q

export default CreateRole({
  name: 'loggedin',
  membership: [
    {
      // The accounts collection gets access
      resource: Collection('accounts'),
      // If the token used is an access token or which we'll use a reusable snippet of FQL
      // returned by 'IsCalledWithAccessToken'
      predicate: Query(Lambda(ref => IsCalledWithAccessToken()))
    }
  ],
  privileges: [
    {
      resource: Collection('dinos'),
      actions: {
        read: true
      }
    }
  ]
})
