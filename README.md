# QueryTyper
## Description
QueryTyper is a tool for Typescript projects that make extensive use of raw SQL queries. It enables type checking between the SQL file that defines a query and the Typescript statement where the query is executed. This catches several common mistakes at compile-time, such as:
- An argument `X` was added to a query, but the application code was not updated to pass `X`
- The query expects a non-nullable argument `X`, but the application code passes a nullable value for `X`
- The query returns an integer field `Y`, but the application code treats `Y` as a string

## Configuration file
The configuration file should be named `querytyper.config.json` and should be placed in the package root directory.

Here is an example configuration file:
```json
{
    "rootDirs": ["server/queries", "tests/queries"],
    "queryTemplatePath": "server/queries/query.ts.template",
    "dataTypesPath": "../../../common/DataTypes",
    "exportsFileName": "index.ts"
}
```
## Query template
The query template defines how to create a Typescript stub from the extracted QueryTyper annotations.
Here is an example query template:
```ts
/* tslint:disable */
@extraImports
import { @helperFunction } from '../queryHelper';

export interface Arguments @extendArg {
@argumentFields
}

export interface Result @extendResult {
@resultFields
}

export const @queryName = @helperFunction<Arguments, Result>(__filename);
```