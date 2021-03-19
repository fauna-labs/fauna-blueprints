import faunadb from 'faunadb'
import { RefreshToken } from '../../../fauna/src/refresh'
export const GRACE_PERIOD_SECONDS = 2 // 2 seconds

const q = faunadb.query
const {
  Query,
  Lambda,
  CreateFunction
} = q

export default CreateFunction({
  name: 'refresh',
  body: Query(Lambda([], RefreshToken(GRACE_PERIOD_SECONDS))),
  role: 'server'
})
