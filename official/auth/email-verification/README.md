### An email verification blueprint in FQL

#### Functionality:

This blueprint contains example Fauna functionality to implement email verification. It provides two User Defined Functions: 

- **get_account_verification_token** calling this UDF provides you with a token to verify an account. 
- **verify_account** this UDF can be called with a verification token (which are tokens defined on documents from the 'email_verification_request' collection). By executing this UDF, the account will be verified.

The verification is stored as a boolean on the account document itself.

#### Learn

Use the blueprint to learn how to set up Fauna logic with custom tokens or copy (and adapt if needed) the resources to implement an email verification flow in your application. 
The blueprint does not contain any framework specific code to send emails but can serve as a basis or inspiration to write such an email verification flow. For example,
the verification token's secret can be stored inside a link in an email that is sent to the user. Upon clicking the link, the user will be redirected to your backend where the token's secret can be extracted and used to call the 
verify_account UDF.

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