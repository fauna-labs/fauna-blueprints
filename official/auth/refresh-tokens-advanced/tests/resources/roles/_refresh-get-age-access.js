
import faunadb from 'faunadb'

const q = faunadb.query
const {
  Collection,
  CreateRole
} = q

export default CreateRole({
  name: 'get-age-access',
  membership: [
    {
      resource: Collection('accounts')
    }
  ],
  privileges: [
    {
      resource: q.Function('get-age-of-refresh-token'),
      actions: {
        call: true
      }
    }
  ]
})
