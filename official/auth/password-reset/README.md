### A password reset flow blueprint in FQL

#### Functionality:

This blueprint contains the functionality to implement a password reset flow in FQL. I provides two User Defined Functions (UDF):

- **Request password reset**: when a password is forogotten, the UDF named 'request_password_reset' can be used. Using this UDF you can request a token that can be used to initiate a password change. This token can then be sent to your users via the communication of your choice (typically embedded in a link in an email) . By default, they are valid for 30 minutes
- **Reset password** with the UDF named 'reset_password' you can then change the password given that you call the UDF with a password reset token. Such a password reset token is returned by the request_password_reset UDF. 
- **Change password** when the password is known yet we want to change is, the 'change_password' UDF can be used by providing the old and new password. You would typically call this with a client that is logged in. 

#### Learn

Use the blueprint to learn how to set up Fauna logic with custom tokens or copy (and adapt if needed) the resources to implement a password reset flow in your application. 


#### Setup

The resources in a blueprint are ready to be loaded in your database with a few commands. Please refer to the [setup section in the main README](https://github.com/fauna-brecht/fauna-blueprints/blob/main/README.md#set-up-a-blueprint) to learn how to load the resources into your database. 

#### How to use

When you set up this blueprint, these resources will become accessible in your database. To get a complete understanding of the functionality, take a look at the [tests](https://github.com/fauna-brecht/fauna-blueprints/tree/main/official/auth/refresh-tokens-advanced/tests). The following explanation shows how to use it from the JavaScript driver, but you can also set it up with the fauna schema migrate tool and call the UDFs from your preferred language.  

Create a key that has access to the 'request_password_reset' UDF, instantiate a Fauna client with that key and request the token by calling the function. 

```javascript
const reset = await client.query(Call('request_password_reset', 'brecht@brechtsdomain.com'))
```

Create a new Fauna client with the secret and call the 'change_password' UDF.

```javascript
const resetClient = new fauna.Client({ secret: reset.secret })
await resetClient.query(Call('change_password', 'newpassword'))
```

#### How to handle the password reset tokens?

Typically, when a user requests a password reset, your backend would request the token and embed it in a link that is sent via email to the user. When the user opens the link, he would then be redirected to a UI where he can choose a new password. Upon submitting the password change form, the reset token is used to do a Fauna request.  

#### What's next?

That's entirely up to you, let us know whether you like the blueprint or how you are using it. Join the conversation <insert forum announcement> and let us know what you would like to see next. Do you have a particular combination of FQL resources you are proud of and want to share? Take a look at the Contributing section in this [README](https://github.com/fauna-brecht/fauna-blueprints#set-up-a-blueprint) and feel free to drop us a PR. 