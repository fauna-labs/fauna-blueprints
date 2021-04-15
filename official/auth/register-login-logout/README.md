### A Fauna blueprint containing Register / Login / Logout logic

#### Functionality

This folder contains the most basic authentication blueprint that provides all resources to implement the following functionality. 

- Register an account
- Login with an account given credentials
- Logout the account
- Write access roles to provide access to data to logged-in users. 

#### Learn

Although Fauna provides a built-in [Login](https://docs.fauna.com/fauna/current/api/fql/functions/login?lang=javascript) FQL function, this blueprint uses [Identify](https://docs.fauna.com/fauna/current/api/fql/functions/identify?lang=javascript) and Create([Tokens()](https://docs.fauna.com/fauna/current/api/fql/functions/tokens?lang=javascript), ... )  to provide similar behavior. By going through the code, you can learn how to set up a  login flow. You will learn how to create your own login tokens and provide access privileges to these tokens. Learning how this blueprint works will help to understand more advanced authentication blueprints([1](https://github.com/fauna-brecht/fauna-blueprints/tree/main/official/auth/refresh-tokens-simple),[2](https://github.com/fauna-brecht/fauna-blueprints/tree/main/official/auth/refresh-tokens-advanced)). 

#### Setup

The resources in such a blueprint are ready to be loaded in your database with a few commands. Please refer to the [setup section in the main README](https://github.com/fauna-brecht/fauna-blueprints/blob/main/README.md#set-up-a-blueprint) to learn how to load the resources into your database. 

#### How to use

Once set up,  you can register and login accounts. Upon successful login, you will receive a token for the account and can use it to access the account's data. Keep these tokens safe, as they provide access to your data. If you intend to access Fauna directly from the client, consider leaving the security to the experts by using [third-party auth](https://fauna.com/blog/setting-up-sso-authentication-in-fauna-with-auth0) or consider implementing a [more advanced approach](https://github.com/fauna-brecht/fauna-blueprints/tree/main/official/auth/refresh-tokens-advanced) with refresh tokens. To get a complete understanding of the functionality, take a look at the [tests](https://github.com/fauna-brecht/fauna-blueprints/tree/main/official/auth/register-login-logout/tests).

##### 1. Register

Create a key using the public role to get permissions to register for an anonymous user. Then use it to create a Fauna client that has access to the register function. In case you'd like to limit how many registers can happen, you can take a look at the [rate-limiting blueprint](https://github.com/fauna-brecht/fauna-blueprints/tree/main/official/rate-limiting).

```javascript
const publicKey = await client.query(CreateKey({ role: Role('public') }))
```

Create a fauna key with that key's secret and call the **register** UDF to create an account as follows:

```javascript
const publicClient = new fauna.Client({ secret: publicKey.secret })
await publicClient.query(Call('register', 'brecht@brechtsdomain.be', 'verysecure'))
```

##### 2. Login

Login by calling the **login** UDF.

```javascript
const loginResult = await publicClient.query(Call('login', 'brecht@brechtsdomain.be', 'verysecure'))
```

You now have received both an access token and a refresh token linked to this account; use it as follows to create a new Fauna account. 

```javascript
const accessClient = new fauna.Client({ secret: loginResult.token.secret })
```

> **Note:**  when switching clients, it's a good idea to set the tx timestamp of the accessClient (with syncLastTxnTime(tx)) to the previous client's transaction timestamp (getLastTxnTime()). Another client is not guaranteed to see all other client's writes (serializable is not the same as linearizable). 
>
> ```    accessClient.syncLastTxnTime(client.getLastTxnTime())```

An access role was provided as an example, adapt it for your own data needs

##### 3. Logout

Call logout either with true or false from the refresh client. True to log out all tokens related to the account, use false to log out only the current refresh/access token (and not log out other browser tabs.)

```javascript
accessClient.query(Call('logout', true))
```

#### What's next?

That's entirely up to you, let us know whether you like the blueprint or how you are using it. Join the conversation <insert forum announcement> and let us know what you would like to see next. Do you have a particular combination of FQL resources you are proud of and want to share? Take a look at the Contributing section in this [README](https://github.com/fauna-brecht/fauna-blueprints#set-up-a-blueprint) and feel free to drop us a PR. 

