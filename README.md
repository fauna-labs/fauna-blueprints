

# Fauna blueprints

### What is a Fauna blueprint? 

FQL is extremely powerful in many ways. You can use FQL to set up resources from code such as [Collections](https://docs.fauna.com/fauna/current/api/fql/collections), [Indexes](https://docs.fauna.com/fauna/current/api/fql/indexes?lang=javascript), [User Defined Roles](https://docs.fauna.com/fauna/current/security/roles.html), [User Defined Functions,](https://docs.fauna.com/fauna/current/api/graphql/functions) [AccessProviders](https://docs.fauna.com/fauna/current/security/external/access_provider.html) and [Databases](https://docs.fauna.com/fauna/current/api/fql/databases). What if we add an opinionated way of defining Fauna resources to that capability? If you have such an opinionated form, you can package and share patterns implemented in pure FQL which other users can reuse. 

The unofficial [fauna-schema-migrate](https://github.com/fauna-brecht/fauna-schema-migrate) tool provides such an opinionated format and allows you to load these resources in your database with minimal effort. Therefore, a Fauna blueprint is a package of resources defined in pure FQL which can easily be shared and loaded with the fauna-schema-migrate tool. 

### Anatomy of a blueprint
Each blueprint is set up in a format that the [fauna-schema-migrate](https://github.com/fauna-brecht/fauna-schema-migrate) understands. Resources managed by this tool can be recognizable by a **fauna** folder that contains a **migrations** and **resources** folder.

- **fauna > resources** folder contains fauna resources such as functions, collections, indexes, roles, access providers, etc.
- **fauna > migrations** contains incremental differences which are derived from the resources folder by generating a migration.

To load the blueprint resources in your database, refer to the following section in this README. To learn more about how this works, take a look at the README of the unofficial [fauna-schema-migrate](https://github.com/fauna-brecht/fauna-schema-migrate) tool.

### Set up a blueprint

#### 1. Clone the repository

Use your favorite tool to clone the repository.

```
git clone https://github.com/fauna-brecht/fauna-blueprints
```

#### 2. Browse to the blueprint

Open your terminal and go to the folder of the blueprint that you want to try out. For example, on unix based terminals, to test out the refresh-tokens-simple blueprint: 

```
cd official/auth/refresh-tokens-simple/
```

#### 3. Grab a Fauna administrator key

Create or log in to your Fauna account at [dashboard.fauna.com](https://dashboard.fauna.com/)  and grab an Admin key. Create a key by by either: 

- Going to the **Security** tab, select **Keys** and selecting the **NEW KEY** button. Make sure to set the role to Admin.
- Or go to the dashboard shell by selecting the **Shell** tab and run the following FQL: `CreateKey({ role: 'admin' })`

Make sure to copy this key somewhere safely, this is a very powerful key needed to set up your fauna resources. To use the key, you can either export the key as the **FAUNA_ADMIN_KEY** environment variable or paste it in when the tool [fauna-schema-migrate](https://github.com/fauna-brecht/fauna-schema-migrate) asks you for it (see later)

#### 4. Load the blueprint into your database

Run the `npm install` command in the blueprint's folder to set up the project. Each blueprint contains the fauna-schema-migrate tool as a dev dependency to easily apply the blueprint. After running `npm install` can now start the tool interactively by running:

```npx fauna-schema-migrate run```

And are greeted by the tool which provides a number of commands. 

```
 █▀▀ ▄▀█ █ █ █▄ █ ▄▀█ 
 █▀  █▀█ █▄█ █ ▀█ █▀█   Schema Migrate 2.0.0
 ──────────────────────────────────────────────────
❯ init                  Initializing folders and config
  state
  generate
  rollback
  apply
```

To set up your Fauna database with the blueprint, you need to: 

- **Generate the migration:** by selecting the generate command. It will create a migration in the migrations folder for you. 
- **Apply the migration**: once the migration is generated, select apply to push the migration to Fauna. 

Alternatively you can run it as a command-line tool and run both steps in one command. In a unix based terminal that can be done with the following command:
```npx fauna-schema-migrate generate && npx fauna-schema-migrate```

#### 5. Removing the resources from your database

To remove resources from your database, select the rollback command. Rollback is the opposite of apply and will reverse the migration. You can either run it via the interactive menu started with ```npx fauna-schema-migrate run``` or run it immediately via the command-line tool. 

```npx fauna-schema-migrate rollback```

### Contributing
#### 1. Set up a new blueprint folder

To set up a blueprint yourself, there are only a few steps to follow.

- [x] **Pick name & path:** choose an appropriate name and appropriate location in the fauna-blueprints/community folder.

- [x] **Copy the template:** the [blueprint example template folder](https://github.com/fauna-brecht/fauna-blueprints/tree/master/util/blueprint-template) to the  folder and rename it. 

- [x] **Configure and install libraries:** the package.json name/description/author as desired, ideally keeping the minimum library configuration and run `npm install` to install the libraries. 

- [x] **Code:** add the resources you want to share in the '**fauna/resources**' folder either in pure .fql files or .js/.ts files with a default export. Take a look at the [fauna-schema-migrate](https://github.com/fauna-brecht/fauna-schema-migrate) README to read more about the input it accepts. 

#### 2. Test your code

The blueprints repository provides a few helpers to easily set up integration tests. In this context, an integration test which runs tests with a real Fauna database (either locally via a [docker image](https://hub.docker.com/r/fauna/faunadb) or a cloud Fauna database) 

- [x] **Run the example test:** the libraries to run tests live in the package.json that came along with the  [blueprint example template](https://github.com/fauna-brecht/fauna-blueprints/tree/master/util/blueprint-template). Therefore, if you followed along and copied the blueprint template and installed the libraries, you should be ready to run the example test.  To verify whether everything works, run `npm test`
- [x] **Write your tests:** write tests that verify whether your Fauna blueprint does what it intends to do. Look at the example test to learn how to set up your fauna resources which uses the programmatic API of the fauna-schema-migrate tool. 

#### 3. Lint your code

Basic linting rules were set up for all templates. The configuration of these rules lives in the ROOT folder of the fauna-blueprints repository. Before committing, make sure to format your code according to these rules. 

- [x] **Install libraries**: install the eslint libraries by running `npm install` in the ROOT folder. 

- [x] **Lint:** verify that the linter agrees with your code with: `node ./node_modules/.bin/eslint community/<pathtoyourcontribution>` or alternative use [eslint integration in your favorite IDE](https://eslint.org/docs/user-guide/integrations). 
- [x] **Fix errors/warnings:** fix formatting automatically by adding --fix to the previous command and/or manually fix the remaining issues. 

#### 4. Create a pull request

- [x] Create a pull request to conclude your excellent contribution and receive gratitude from the Fauna community. 


