### An advanced refresh flow blueprint in pure FQL

#### Functionality:

This blueprint contains the functionality to implement [refresh tokens](https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/) in FQL. 

- **Register** an account
- **Login** with an account based on the provided credentials. Login returns both a short-lived access token as a refresh token. 
- **Logout** the account, which logs out both the refresh as access tokens. 
- **Refresh** tokens to receive a new access token. 

#### Learn

Refresh tokens have [security advantages,](https://stackoverflow.com/questions/3487991/why-does-oauth-v2-have-both-access-and-refresh-tokens?rq=1) in [another blueprint](https://github.com/fauna-brecht/fauna-blueprints/tree/main/official/auth/refresh-tokens-simple), you can learn the basics of implementing refresh tokens in FQL. This blueprints improves upon the basic by implementing  refresh tokens rotation and the detection of leaked tokens.

#### How to use

How you use these tokens is up to you but typically a refresh token will be stored in a secure environment such as a [secure](https://owasp.org/www-community/controls/SecureCookieAttribute) [httpOnly](https://owasp.org/www-community/HttpOnly) cookie while an access token typically has less strict security requirements. One possible application is to use the short-lived access token in the client. Example applications of this blueprint on a specific backend/frontend framework will come. If you have applied it to your favorite framework, give us a sign and we might add the link. 

#### Setup

The resources in a blueprint are ready to be loaded in your database with a few commands. Please refer to the [setup section in the main README](https://github.com/fauna-brecht/fauna-blueprints/blob/main/README.md#set-up-a-blueprint) to learn how to load the resources into your database. 

#### What's next?

That's entirely up to you, let us know whether you like the blueprint or how you are using it. Join the conversation <insert forum announcement> and let us know what you would like to see next.

