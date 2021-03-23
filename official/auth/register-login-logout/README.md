### A Fauna blueprint containing Register / Login / Logout logic

#### Functionality:

This folder contains the most basic authentication blueprint that provides all resources to implement the following functionality. 

- Register an account
- Login with an account given credentials
- Logout the account
- Write access roles to provide access to data to logged in users. 

#### Learn

Although Fauna provides a built-in [Login](https://docs.fauna.com/fauna/current/api/fql/functions/login?lang=javascript) FQL function, this blueprint uses [Identify](https://docs.fauna.com/fauna/current/api/fql/functions/identify?lang=javascript) and Create([Tokens()](https://docs.fauna.com/fauna/current/api/fql/functions/tokens?lang=javascript), ... )  to provide similar behavior. By going through the code, you can learn how to set up a  login flow. You will learn how to create your own login tokens and provide access privileges to these tokens. Learning how this blueprint works will help to understand more advanced authentication blueprints. 

#### Setup:

The resources in such a blueprint are ready to be loaded in your database with a few commands. Please refer to the [setup section in the main README](https://github.com/fauna-brecht/fauna-blueprints/blob/main/README.md#set-up-a-blueprint) to learn how to load the resources into your database. 

