### A simple refresh flow blueprint in pure FQL 

#### Functionality:

This blueprint contains the functionality to implement [refresh tokens](https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/) in FQL. 

- **Register** an account
- **Login** with an account based on the provided credentials. Login returns both a short-lived access token as a refresh token. 
- **Logout** the account, which logs out both the refresh as access tokens. 
- **Refresh** tokens to receive a new access token. 

#### Learn

Refresh tokens have [security advantages,](https://stackoverflow.com/questions/3487991/why-does-oauth-v2-have-both-access-and-refresh-tokens?rq=1) in this blueprint, you can learn how to implement refresh tokens in FQL. By going through the code, you can learn how to set up a custom login flow that returns two tokens, one access, and one refresh token. You will learn how to log out two tokens in one transaction and set up roles to provide data access to one token and refresh capabilities to the other. Learning how this blueprint works will help to understand [a more advanced authentication blueprint](https://github.com/fauna-brecht/fauna-blueprints/tree/main/official/auth/refresh-tokens-advanced). In the advanced blueprint, you can learn how to implement refresh token rotation and how to detect leaked refresh tokens. If you like to learn from tests, take a look at the [tests](https://github.com/fauna-brecht/fauna-blueprints/tree/main/official/auth/refresh-tokens-advanced/tests) to learn how the logic in this blueprint should behave.

#### Setup

The resources in a blueprint are ready to be loaded in your database with a few commands. Please refer to the [setup section in the main README](https://github.com/fauna-brecht/fauna-blueprints/blob/main/README.md#set-up-a-blueprint) to learn how to load the resources into your database. 

#### How to use

When you set up this blueprint, these resources will become accessible in your database. To get a complete understanding of the functionality, take a look at the [tests](https://github.com/fauna-brecht/fauna-blueprints/tree/main/official/auth/refresh-tokens-simple/tests). The following explanation shows how to use it from the JavaScript driver, but you can also set it up with the fauna schema migrate tool and call the UDFs from your preferred language.  

##### 1. Register

Create a key using the public role to be able to register. Then use it to create a Fauna client that has access to the register function. In case you'd like to limit how many registers can happen, you can take a look at the [rate-limiting blueprint](https://github.com/fauna-brecht/fauna-blueprints/tree/main/official/rate-limiting).

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
let accessClient = new fauna.Client({ secret: loginResult.tokens.access.secret })
let refreshClient = new fauna.Client({ secret: loginResult.tokens.refresh.secret })
```

> **Note:**  when switching clients, it's a good idea to set the tx timestamp of the accessClient (with syncLastTxnTime(tx)) to the previous client's transaction timestamp (getLastTxnTime()). Another client is not guaranteed to see all other client's writes (serializable is not the same as linearizable). 
>
> ```    accessClient.syncLastTxnTime(client.getLastTxnTime())```

##### 3. Refresh

Refresh by calling the **refresh** UDF by using a client with a refresh token.

```javascript
const refreshResult = await refreshClient.query(Call('refresh'))
```

And update your clients. 

```javascript
accessClient = new fauna.Client({ secret: refreshResult.tokens.access.secret })
refreshClient = new fauna.Client({ secret: refreshResult.tokens.refresh.secret })
```

##### 4. Logout

Call logout either with true or false from the refresh client. True to log out all tokens related to the account, use false to log out only the current refresh/access token (and not log out other browser tabs.)

```javascript
refreshClient.query(Call('logout', true))
```

#### Where to store tokens?

How you use these tokens is up to you. Typically, refresh tokens are stored in a secure environment such as a [secure](https://owasp.org/www-community/controls/SecureCookieAttribute) [httpOnly](https://owasp.org/www-community/HttpOnly) cookie while an access token typically has less strict security requirements. One possible application is to use the short-lived access token in the client. Example applications of this blueprint on a specific backend/frontend framework will come. If you have applied it to your favorite framework, give us a sign, and we might add the link. 

#### What's next?

That's entirely up to you, let us know whether you like the blueprint or how you are using it. Join the conversation <insert forum announcement> and let us know what you would like to see next. Do you have a particular combination of FQL resources you are proud of and want to share? Take a look at the Contributing section in this [README](https://github.com/fauna-brecht/fauna-blueprints#set-up-a-blueprint) and feel free to drop us a PR. 

