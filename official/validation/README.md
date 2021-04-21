### A validation blueprint

#### Functionality:

This blueprint shows two basic examples of validation rules. Currently there are two UDFs with validation rules provided:

- validate_email: verifies whether an email is an actual email. 
- validate_password: verifies whether a password is at least 8 characters long. 

#### How to use

It's typically a good idea to add your validation rules inside the UDF that is doing the manipulation.  You might be tempted to add validation rules in ABAC roles, this is not recommended, ABAC should be reserved for security and not for validation. 

To use the UDFs, add them in your query however you desire. Whenever a validation rule fails the whole query will be aborted so nothing will be executed. Nevertheless it's a good idea to start your query with the validation rules since it can safe a few reads or writes in case invalid data was provided. For example, to validate the email and password before creating an account we could write a new function: 

```

CreateFunction({
  name: 'create_account',
  body: Query(Lambda(['email', 'password'],
    Do(
      Call('validate_email', Var('email')),
      Call('validate_password', Var('password')),
      Create(Collection('accounts'), {
         	data: { email: Var('email') },
         	credentials: { password: Var('password') }
      })
    )
  ))
})
```


#### Learn

The code is meant to be educational, feel free to adapt where needed. There can be many validation rules in an application, if you have validation rules to contribute, please open a pull request and add them directly in this blueprint. 

#### Setup

The resources in a blueprint are ready to be loaded in your database with a few commands. Please refer to the [setup section in the main README](https://github.com/fauna-brecht/fauna-blueprints/blob/main/README.md#set-up-a-blueprint) to learn how to load the resources into your database. 

