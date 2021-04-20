### A logging blueprint in pure FQL

#### Functionality:

This blueprint defines a User Defined Function 'log' that you can use in your queries to log them. The function returns the calculation of the passed query.
Additionally, you can enable and disable a specific category for logging.

#### How to use

You can use the log UDF and pass a category, a message, and your query.

```
Call('log', 'calculations', 'adding 2 + 2', Add(2, 2)))
```

The UDF will add a log document to the 'logs' collection, continue to execute the passed query, and return the result.
Logs are enabled by default, you can disable a specific category of logs on your collection by updating the 'log' collection.
```
await client.query(Update(Collection('logs'), { data: { calculations: false } }))
```

#### Learn

The code is meant to be educational, feel free to adapt where needed.

#### Setup

The resources in a blueprint are ready to be loaded in your database with a few commands. Please refer to the [setup section in the main README](https://github.com/fauna-brecht/fauna-blueprints/blob/main/README.md#set-up-a-blueprint) to learn how to load the resources into your database. 

#### Searching in logs

Since everyone has different requirements and indexes add writes, the indexes were not provided by default.
You could search through the logs based on category and time with the following index:
```
CreateIndex({
  name: 'logs_by_category_and_ts',
  source: Collection('logs'),
  terms: [
    {
      field: ['category']
    }
  ],
  values: [
    {
      field: ['ts']
    },
    {
      field: ['ref']
    },
    {
      field: ['category']
    },
    {
      field: ['message']
    },
    {
      field: ['value']
    }
  ],
  serialized: false
})
```

Or Search on message and time with the following index:
```
CreateIndex({
  name: 'logs_by_category_and_ts',
  source: Collection('logs'),
  terms: [
    {
      field: ['message']
    }
  ],
  values: [
    {
      field: ['ts']
    },
    {
      field: ['ref']
    },
    {
      field: ['category']
    },
    {
      field: ['message']
    },
    {
      field: ['value']
    }
  ],
  serialized: false
})
```