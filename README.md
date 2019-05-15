# QueryTyper
## Description
QueryTyper is a tool for Typescript projects that make extensive use of raw SQL queries. It enables type checking between the SQL file that defines a query and the Typescript statement where the query is executed. This catches several common mistakes at compile-time, such as:
- An argument `X` was added to a query, but the application code was not updated to pass `X`
- The query expects a non-nullable argument `X`, but the application code passes a nullable value for `X`
- The query returns an integer field `Y`, but the application code treats `Y` as a string

## Query directory structure
QueryTyper supports one or more *root directories*.
A root directory can contain one or more *query collection directories*.
A query collection directory can contain one or more *query files*.
Query files should have the name pattern `*.query.sql`

E.g. a root directory could be `server/queries`, a query collection directory could be `server/queries/users`, and a query file could be `server/queries/users/addUsers.query.sql`.

## Query Annotations
Query files can contain single-line annotations using the syntax `-- @annotationName [annotationValue]`.
Every annotation is a SQL comment, so does not affect the query's behavior.
### Available query annotations
#### @arg argName: argType
Defines a query argument `argName` of type `argType`
#### @return fieldName: fieldType
Defines a query return field `fieldName` or type `fieldType`
#### @extendsArgs dt.ArgType
Imports multiple query arguments from a custom type `ArgType`
#### @extendsResults dt.ResultType
Imports multiple query results from a custom type `ResultType`
#### @unique
Marks the query as returning zero or one row

## Configuration file
The configuration file should be named `querytyper.config.json` and should be placed in the npm package root directory.
### Configuration fields
#### rootDirs
Defines the paths of the root directories. Paths are specified relative to the npm package root. 
#### queryTemplatePath
Defines the path to the query template, relative to the npm package root.
#### dataTypesPath
Defines the path to a data types Typescript module, relative to the queries. QueryTyper annotations can use custom types from that module.
#### exportsFileName
QueryTyper will create an exports file inside each query collection directory. `exportsFileName` defines the name of the exports file.

### Example configuration file
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
A query template can contain *symbols* prefixed by `@` which will be replaced by values
### Query template symbols
#### @extraImports
`@extraImports` is replaced with addtional import statements e.g. a custom data types module
#### @helperFunction
`@helperFunction` is replaced with `buildQuery` or `buildQueryWithUniqueResult`
#### @argumentFields
`@argumentFields` is replaced with the argument fields
#### @extendArg
`@extendArg` is replaced with an `extends` statement for the argument type
#### @resultFields
`@resultFields` is replaced with the result fields
#### @extendResult
`@extendResult` is replaced with an `extends` statement for the result type
#### @queryName
`@queryName` is replaced with the query name

### Example query template:
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