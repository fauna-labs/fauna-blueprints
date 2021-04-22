### A rate-limiting blueprint in pure FQL

#### Functionality:

This blueprint contains the functionality to add identity-based rate-limiting to your FQL functions. Such an identity can be an email, a username or a reference to a document (e.g. a user document).  The blueprint exposes the functionality in the format of three UDFS:

- **rate_limit**: add rate-limiting for a specific action and identity by defining the number of calls that can occur in a given timewindow.
- **call_limit**: define how many calls can be done of a specific action and identity combination.
- **reset_logs:** reset the logs for a given action or identity which resets the limits. 

|            | **action**                                                   | **identity**                                                 | **number of calls** | **time window**    |
| ---------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------- | ------------------ |
| rate_limit | unique identifier for the action you want to rate-limit, e.g. 'regiser', 'login', 'get_data' | unique identifier, this can be an email, user reference or just a static string (e.g. 'public'), | # of accepted calls | time window in ms. |
|            | **action**                                                   | **identity**                                                 | **number of calls** |                    |
| call_limit | same as rate_limit                                           | same as rate_limit                                           | same as rate_limit  | /                  |
|            | **action**                                                   | **identity**                                                 |                     |                    |
| reset_logs | same as rate_limit                                           | same as rate_limit                                           | /                   | /                  |

If the query is called more than is allowed in the given time-window, it will Abort and throw an error with 'ERROR_RATE_LIMIT' in the description, else rate-limiting allows the query to pass. 

#### How to use

You can insert the call of the ratelimit UDF into another query. Please do so in an environment where the user can **not** alter the query. That means, either use it in your backend or insert such a call within another User Defined Function. 

```
Call('rate_limit', 'action', 'identity', 3, 1000)
```

##### Example 1: rate limit heavy queries

Imagine you have FQL logic to retrieve data that is quite expensive. To rate-limit this call to 1 call per minute for a given user we could write the query as follows: 

```
Do(
	Call('rate_limit', 'retrieve-data', CurrentIdentity(), 1, 60000),
	<your quite expensive FQL logic>
)
```

When rate-limiting is triggered, consecutive calls are less expensive and the user is discouraged from further calls. You can manually delete documents from the 'access_logs' collection in order to grant access to the identity again. 

##### Example 2: rate limiting login attempts (in general, not only failed)

Imagine you have a UDF named 'login'. To rate-limit the amount of logins to 1 per minute for a given email, we could write.

```
Do(
	Call('rate_limit', 'login', 'brecht@brechtsdomain.com', 1, 60000),
	Call('login', 'someemail@emaildomain.com', 'password')
)
```

##### Example 3: rate limit register

Imagine you have a UDF named 'register'. A register is typically anonymous, you can therefore use a generic identity such as 'public. To rate-limit the amount of registrations to 100 per hour, you could call two UDFs in the same transaction as follows: 

```
Do(
	Call('rate_limit', 'register', 'public', 100, 3600000),
	Call('register', 'someemail@emaildomain.com', 'password')
)
```

##### Example 4: call limit and resetting the limit with a login action.

A good example for a call limit and resetting the limit is to limit failed attempts of a login action.  Imagine that we have a login UDF which returns false in case it fails. 

```javascript
Let({ loginResult: Call('login', 'someemail@emaildomain.com', 'password') },
  If(
    Equals(Var('loginResult'), false),
    Call('call_limit', 'failed_login', 'someemail@emaildomain.com', 3),
    // clear previous fails and login.
    Do(Call('reset_logs', 'failed_login', 'someemail@emaildomain.com'), Var('loginResult'))
  )
)
```

In case the login fails, a failed_login log will be added. If the login succeeds potential failed_login logs for this user will be removed. 

#### Learn

The code is meant to be educational, feel free to adapt where needed. For example, you could turn the rate-limiting into code to detect consecutive failed password logins. If we remove the time window requirement, remove the TTL  on access_logs and clean up the access_logs on successful logins you can change it to lock accounts upon x consecutive failed logins. 

#### Setup

The resources in a blueprint are ready to be loaded in your database with a few commands. Please refer to the [setup section in the main README](https://github.com/fauna-brecht/fauna-blueprints/blob/main/README.md#set-up-a-blueprint) to learn how to load the resources into your database. 

#### What about IP-based rate-limiting?

This functionality does not provide you with IP-based rate-limiting out-of-the-box. However, if your backend provides IP information to you, you could use an IP as the identity. Alternatively, if you are using third-party auth, you could opt to place the IP on a JWT token for logged-in users and retrieve that identity via the CurrentToken(). For example, Auth0 allows you to do that with custom functions. Of course, for logged-in users, you could also use the CurrentIdentity() instead. 

#### What's next?

That's entirely up to you, let us know whether you like the blueprint or how you are using it. Join the conversation <insert forum announcement> and let us know what you would like to see next. Do you have a particular combination of FQL resources you are proud of and want to share? Take a look at the Contributing section in this [README](https://github.com/fauna-brecht/fauna-blueprints#set-up-a-blueprint) and feel free to drop us a PR. 