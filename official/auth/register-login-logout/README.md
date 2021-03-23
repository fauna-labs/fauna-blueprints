### A Fauna blueprint containing Register / Login / Logout logic

#### Functionality

This folder contains the most basic authentication blueprint that provides all resources to implement the following functionality. 

- Register an account
- Login with an account given credentials
- Logout the account
- Write access roles to provide access to data to logged in users. 

#### Learn

Although Fauna provides a built-in [Login](https://docs.fauna.com/fauna/current/api/fql/functions/login?lang=javascript) FQL function, this blueprint uses [Identify](https://docs.fauna.com/fauna/current/api/fql/functions/identify?lang=javascript) and Create([Tokens()](https://docs.fauna.com/fauna/current/api/fql/functions/tokens?lang=javascript), ... )  to provide similar behavior. By going through the code, you can learn how to set up a  login flow. You will learn how to create your own login tokens and provide access privileges to these tokens. Learning how this blueprint works will help to understand more advanced authentication blueprints([1](https://github.com/fauna-brecht/fauna-blueprints/tree/main/official/auth/refresh-tokens-simple),[2](https://github.com/fauna-brecht/fauna-blueprints/tree/main/official/auth/refresh-tokens-advanced)). 

#### How to use

Once set up,  you can register and login accounts. The tokens from these accounts can then be used to provide access to your data. Keep these tokens safe, as they provide access to your data. If you intend to access Fauna directly from the client, consider leaving the security to the experts by using [third-party auth](https://fauna.com/blog/setting-up-sso-authentication-in-fauna-with-auth0) or consider implementing a [more advanced approach](https://github.com/fauna-brecht/fauna-blueprints/tree/main/official/auth/refresh-tokens-advanced) with refresh tokens.

#### Setup

The resources in such a blueprint are ready to be loaded in your database with a few commands. Please refer to the [setup section in the main README](https://github.com/fauna-brecht/fauna-blueprints/blob/main/README.md#set-up-a-blueprint) to learn how to load the resources into your database. 

#### What's next?

That's entirely up to you, let us know whether you like the blueprint or how you are using it. Join the conversation <insert forum announcement> and let us know what you would like to see next.

