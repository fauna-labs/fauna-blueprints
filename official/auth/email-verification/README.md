### An email verification blueprint in FQL

#### Functionality:

This blueprint contains example Fauna functionality to implement email verification. It provides two User Defined Functions: 

- **get_account_verification_token** calling this UDF provides you with a token to verify an account. 
- **verify_account** this UDF can be called with a verification token (which are tokens defined on documents from the 'email_verification_request' collection). By executing this UDF, the account will be verified.

The verification is stored as a boolean on the account document itself.

#### Learn

Use the blueprint to learn how to set up Fauna logic with custom tokens or copy (and adapt if needed) the resources to implement an email verification flow in your application. The blueprint does not contain any framework specific code to send emails but can serve as a basis or inspiration to write such an email verification flow. 

For example, the verification token's secret can be stored inside a link in an email that is sent to the user. Upon clicking the link, the user will be redirected to your backend where the token's secret can be extracted and used to call the **verify_account** UDF. Since the token only has access to that UDF and has a default TTL of 10 minutes, the risk is minimal. 

An example based on this and other blueprints might be provided later. 

#### Setup

The resources in a blueprint are ready to be loaded in your database with a few commands. Please refer to the [setup section in the main README](https://github.com/fauna-brecht/fauna-blueprints/blob/main/README.md#set-up-a-blueprint) to learn how to load the resources into your database. 

#### How to use

When you set up this blueprint, these resources will become accessible in your database. To get a complete understanding of the functionality, take a look at the [tests](https://github.com/fauna-brecht/fauna-blueprints/tree/main/official/auth/email-verification/tests). The following explanation shows how to use it from the JavaScript driver, but you can also set it up with the fauna schema migrate tool and call the UDFs from your preferred language.  

The example below assumes that you have a key that can create accounts and has access to the 'get_account_verification_token' UDF, instantiate a Fauna client with that key and request the token by calling the function.  You could create an account and immediately create a verification token. 

```javascript
const verificationToken = await client.query(
  Do(
    Create(Collection('accounts'), {
      data: {
        email: 'brecht@brechtsdomain.com',
        verified: false
      }
    }),
    Call('get_account_verification_token', account.ref)
  )
)
```

Find a way to provide that secret to the user via email, either send him the token, embed it in an URL and make sure that they can provide that secret as a proof that this is truly their email (either by copy pasting the token or clicking the URL you constructed for them which has the token embedded).

Once you receive the token in your backend, create a new Fauna client with that token and verify the account.

```javascript
  const verificationClient = getClient(fauna, verificationToken.secret)
  await verificationClient.query(Call('verify_account'))
```

The client is now verified, which means that the 'verified' boolean is set to true. It's up to you to decide how to use that boolean. There are two roles provided as an example which only provide verified users access to a given resource. 

#### What's next?

That's entirely up to you, let us know whether you like the blueprint or how you are using it. Join the conversation <insert forum announcement> and let us know what you would like to see next. Do you have a particular combination of FQL resources you are proud of and want to share? Take a look at the Contributing section in this [README](https://github.com/fauna-brecht/fauna-blueprints#set-up-a-blueprint) and feel free to drop us a PR. 