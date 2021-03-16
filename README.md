# Fauna blueprints

## What is a Fauna blueprint? 
... todo ...

## Setup
Each blueprint is set up entirely with a tool called fauna-schema-migrate which makes it easy to set up fauna resources and share them with others.
It allows specifying fauna resources as code, generate migrations from them and apply these on your database. 
Resources managed by this tool can be recognizable by a **fauna** folder that contains a **migrations** and **resources** folder.

The **fauna > resources** folder contains fauna resources such as functions, collections, indexes, roles, access providers, etc.
The **fauna > migrations** contains incremental differences which are derived from the resources folder by generating a migration.

To set up the resources in your own database and play around with them. Take a look at the readme of the specific blueprint.

## Contribute
### Testing
... todo ...
### Linting
... todo ...

