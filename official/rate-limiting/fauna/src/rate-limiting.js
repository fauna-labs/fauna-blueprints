import faunadb from 'faunadb'

const q = faunadb.query
const {
  If,
  Epoch,
  Match,
  Index,
  Collection,
  Let,
  Var,
  Paginate,
  Select,
  TimeDiff,
  Or,
  GTE,
  Abort,
  Create,
  IsEmpty,
  Count,
  LT,
  Now,
  Subtract,
  Do
} = q

const RATE_LIMITING = 'ERROR_RATE_LIMIT'
const CALL_LIMIT = 'ERROR_CALL_LIMIT'

function CreateAccessLogEntry (action, identifier) {
  return Create(Collection('access_logs'), {
    data: {
      action: action,
      identity: identifier
    }
  })
}

export function AddRateLimiting (action, identifier, calls, perMilliSeconds) {
  return Let(
    {
      logsPage: Paginate(Match(Index('access_logs_by_action_and_identity_ordered_by_ts'), action, identifier), {
        size: calls
      })
    },
    // An access logs page from that index looks like { data: [timestamp1, timestamp2,...]},

    If(
      // Either the page is empty or there are less calls than the limit logged.
      Or(IsEmpty(Var('logsPage')), LT(Count(Select(['data'], Var('logsPage'))), calls)),
      // In that case, Create a log and return.
      Do(CreateAccessLogEntry(action, identifier), true),
      // Else verify whether the last timestamp of that page is within the 'perMilliSeconds' timewindow (the index is ordered on ts)
      // If it is, you have done too many calls within the same timewindow and are rate limited.
      Let(
        {

          timestamp: Select(['data', Subtract(calls, 1), 0], Var('logsPage')),
          // transform the Fauna timestamp to a Time object
          time: Epoch(Var('timestamp'), 'microseconds'),
          // How long ago was that event in ms
          ageInMs: TimeDiff(Var('time'), Now(), 'milliseconds')
        },
        If(
          GTE(Var('ageInMs'), perMilliSeconds),
          Do(CreateAccessLogEntry(action, identifier), true),
          // Else.. Abort! Rate-limiting in action
          Abort(RATE_LIMITING)
        )
      )
    )
  )
}

export function AddCallLimit (action, identifier, calls) {
  return Let(
    {
      logsPage: Paginate(Match(Index('access_logs_by_action_and_identity_ordered_by_ts'), action, identifier), {
        size: calls
      })
    },
    If(
      // Either the page is empty or there are less calls than the limit logged.
      Or(IsEmpty(Var('logsPage')), LT(Count(Select(['data'], Var('logsPage'))), calls)),
      // In that case, Create a log and return.
      Do(CreateAccessLogEntry(action, identifier), true),
      Abort(CALL_LIMIT)
    )
  )
}
