
import faunadb from 'faunadb'
import { GetAgeOfRefreshToken } from '../../../fauna/src/refresh'

const q = faunadb.query
const {
  Query,
  Lambda,
  CreateFunction
} = q

export default CreateFunction({
  name: 'get-age-of-refresh-token',
  body: Query(Lambda([], GetAgeOfRefreshToken())),
  role: 'server'
})
