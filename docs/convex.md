# Convex Guidelines

Best practices for building Convex projects, including database schema design, queries, mutations, and real-world examples.

## Function Guidelines

### New Function Syntax

ALWAYS use the new function syntax for Convex functions:

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const f = query({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    // Function body
  },
});
```

### HTTP Endpoint Syntax

HTTP endpoints are defined in `convex/http.ts` and require an `httpAction` decorator:

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/echo",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.bytes();
    return new Response(body, { status: 200 });
  }),
});
```

### Validators

Array validator example:

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export default mutation({
  args: {
    simpleArray: v.array(v.union(v.string(), v.number())),
  },
  handler: async (ctx, args) => {
    //...
  },
});
```

Discriminated union type example:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  results: defineTable(
    v.union(
      v.object({
        kind: v.literal("error"),
        errorMessage: v.string(),
      }),
      v.object({
        kind: v.literal("success"),
        value: v.number(),
      }),
    ),
  )
});
```

**Always use `v.null()` when returning a null value:**

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const exampleQuery = query({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("This query returns a null value");
    return null;
  },
});
```

### Valid Convex Types

| Convex Type | TS/JS type  | Example Usage         | Validator                        |
| ----------- | ----------- | --------------------- | -------------------------------- |
| Id          | string      | `doc._id`             | `v.id(tableName)`                |
| Null        | null        | `null`                | `v.null()`                       |
| Int64       | bigint      | `3n`                  | `v.int64()`                      |
| Float64     | number      | `3.1`                 | `v.number()`                     |
| Boolean     | boolean     | `true`                | `v.boolean()`                    |
| String      | string      | `"abc"`               | `v.string()`                     |
| Bytes       | ArrayBuffer | `new ArrayBuffer(8)`  | `v.bytes()`                      |
| Array       | Array       | `[1, 3.2, "abc"]`     | `v.array(values)`                |
| Object      | Object      | `{a: "abc"}`          | `v.object({property: value})`    |
| Record      | Record      | `{"a": "1", "b": "2"}`| `v.record(keys, values)`         |

### Function Registration

- Use `internalQuery`, `internalMutation`, and `internalAction` for internal (private) functions
- Use `query`, `mutation`, and `action` for public functions
- **ALWAYS include argument and return validators** for all Convex functions
- If a function doesn't return anything, use `returns: v.null()`

### Function Calling

- Use `ctx.runQuery` to call a query from a query, mutation, or action
- Use `ctx.runMutation` to call a mutation from a mutation or action
- Use `ctx.runAction` to call an action from an action
- **ONLY call an action from another action if you need to cross runtimes** (e.g. from V8 to Node)
- All calls take in a `FunctionReference` - do NOT pass the callee function directly

When calling a function in the same file, specify a type annotation:

```typescript
export const f = query({
  args: { name: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    return "Hello " + args.name;
  },
});

export const g = query({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    const result: string = await ctx.runQuery(api.example.f, { name: "Bob" });
    return null;
  },
});
```

### Function References

- Use `api` object for public functions (`query`, `mutation`, `action`)
- Use `internal` object for private functions (`internalQuery`, `internalMutation`, `internalAction`)
- File-based routing: `convex/example.ts` function `f` → `api.example.f`
- Nested: `convex/messages/access.ts` function `h` → `api.messages.access.h`

### Pagination

```typescript
import { v } from "convex/values";
import { query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";

export const listWithExtraArg = query({
  args: { paginationOpts: paginationOptsValidator, author: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_author", (q) => q.eq("author", args.author))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
```

`paginationOpts` properties:
- `numItems`: max documents to return (`v.number()`)
- `cursor`: cursor for next page (`v.union(v.string(), v.null())`)

Returns:
- `page`: array of documents
- `isDone`: boolean for last page
- `continueCursor`: cursor for next page

## Validator Guidelines

- `v.bigint()` is deprecated - use `v.int64()` instead
- Use `v.record()` for record types - `v.map()` and `v.set()` are NOT supported

## Schema Guidelines

- Always define schema in `convex/schema.ts`
- Import schema functions from `convex/server`
- System fields `_creationTime` (`v.number()`) and `_id` (`v.id(tableName)`) are added automatically
- **Include all index fields in index name**: `["field1", "field2"]` → `"by_field1_and_field2"`
- Index fields must be queried in order they are defined

## TypeScript Guidelines

- Use `Id<'tableName'>` for document IDs
- Be strict with types, especially IDs
- Always use `as const` for string literals in discriminated unions
- Define arrays as `const array: Array<T> = [...];`
- Define records as `const record: Record<KeyType, ValueType> = {...};`

Example with Record and Id:

```typescript
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const exampleQuery = query({
  args: { userIds: v.array(v.id("users")) },
  returns: v.record(v.id("users"), v.string()),
  handler: async (ctx, args) => {
    const idToUsername: Record<Id<"users">, string> = {};
    for (const userId of args.userIds) {
      const user = await ctx.db.get(userId);
      if (user) {
        idToUsername[user._id] = user.username;
      }
    }
    return idToUsername;
  },
});
```

## Query Guidelines

- **Do NOT use `filter`** - define an index and use `withIndex` instead
- **ALWAYS use indexes for searching on large tables** - queries without indexes scan the entire table which is slow and expensive
- **Use pagination instead of `.collect()` on large tables** - `.collect()` loads all documents into memory which can cause timeouts and memory issues. Use `.paginate()` or `.take(n)` instead
- Convex queries do NOT support `.delete()` - use `.collect()` and iterate with `ctx.db.delete(row._id)`
- Use `.unique()` to get a single document (throws if multiple match)
- For async iteration, use `for await (const row of query)` instead of `.collect()`

### Large Table Best Practices

```typescript
// BAD - scans entire table, loads all into memory
const allUsers = await ctx.db.query("users").collect();
const filtered = allUsers.filter(u => u.status === "active");

// GOOD - uses index, returns only matching documents
const activeUsers = await ctx.db
  .query("users")
  .withIndex("by_status", (q) => q.eq("status", "active"))
  .take(100); // or use .paginate()

// BAD - collects all documents
const messages = await ctx.db.query("messages").collect();

// GOOD - paginated query
const messages = await ctx.db
  .query("messages")
  .withIndex("by_channel", (q) => q.eq("channelId", channelId))
  .order("desc")
  .paginate(paginationOpts);
```

### Ordering

- Default order: ascending `_creationTime`
- Use `.order('asc')` or `.order('desc')` to specify order
- Queries with indexes are ordered based on index columns

## Mutation Guidelines

- `ctx.db.replace` - fully replace document (throws if not exists)
- `ctx.db.patch` - shallow merge updates (throws if not exists)

## Action Guidelines

- Add `"use node";` at top of files using Node.js built-in modules
- **Never use `ctx.db` inside actions** - actions don't have database access

```typescript
import { action } from "./_generated/server";

export const exampleAction = action({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("This action does not return anything");
    return null;
  },
});
```

## Scheduling Guidelines

### Cron Jobs

- Only use `crons.interval` or `crons.cron` methods
- Both methods take a FunctionReference - do NOT pass function directly
- If cron calls internal function, always import `internal` from `_generated/api`

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const empty = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("empty");
  },
});

const crons = cronJobs();

crons.interval("delete inactive users", { hours: 2 }, internal.crons.empty, {});

export default crons;
```

## Workpool Guidelines

When multiple users can trigger the same operation simultaneously (e.g., sending emails, processing payments, API calls), use **Convex Workpool** to manage parallelism and retries.

### Installation

```bash
bun add @convex-dev/workpool
```

### Configuration

Add workpool to `convex/convex.config.ts`:

```typescript
import { defineApp } from "convex/server";
import workpool from "@convex-dev/workpool/convex.config.js";

const app = defineApp();
app.use(workpool, { name: "emailWorkpool" });
app.use(workpool, { name: "apiWorkpool" });
export default app;
```

### When to Use Workpool

- **Multiple users triggering concurrent operations** - e.g., many users sending emails at once
- **External API calls with rate limits** - throttle requests to avoid hitting limits
- **Retryable operations** - automatically retry failed actions with backoff
- **Separating workloads by priority** - critical emails vs. background scraping
- **Reducing OCC errors** - limit parallelism for mutations that write to same data

### Basic Usage

```typescript
import { Workpool } from "@convex-dev/workpool";
import { components } from "./_generated/api";

const emailPool = new Workpool(components.emailWorkpool, {
  maxParallelism: 10,
});

export const sendWelcomeEmail = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await emailPool.enqueueAction(ctx, internal.email.send, {
      userId: args.userId,
    });
    return null;
  },
});
```

### Retries with Backoff

For idempotent actions (safe to retry), configure automatic retries:

```typescript
const pool = new Workpool(components.emailWorkpool, {
  maxParallelism: 10,
  retryActionsByDefault: true,
  defaultRetryBehavior: {
    maxAttempts: 3,
    initialBackoffMs: 1000,
    base: 2, // exponential backoff
  },
});

// Override per-call
await pool.enqueueAction(ctx, internal.api.call, args, {
  retry: { maxAttempts: 5, initialBackoffMs: 500, base: 2 },
});
```

### Completion Handlers

React to job completion (success, failure, or cancellation):

```typescript
import { vOnCompleteValidator } from "@convex-dev/workpool";

await pool.enqueueAction(ctx, internal.email.send, args, {
  onComplete: internal.email.handleResult,
  context: { userId: args.userId },
});

export const handleResult = internalMutation({
  args: vOnCompleteValidator(v.object({ userId: v.id("users") })),
  handler: async (ctx, { context, result }) => {
    if (result.kind === "success") {
      await ctx.db.patch(context.userId, { emailSent: true });
    } else if (result.kind === "failed") {
      console.error("Email failed:", result.error);
    }
  },
});
```

### Batching

Enqueue multiple jobs efficiently:

```typescript
await pool.enqueueActionBatch(ctx, internal.notifications.send, [
  { userId: user1 },
  { userId: user2 },
  { userId: user3 },
]);
```

### Parallelism Guidelines

- **Free plan**: Keep total maxParallelism across all pools ≤ 20
- **Pro plan**: Keep total maxParallelism across all pools ≤ 100
- Use `maxParallelism: 1` to serialize operations that conflict with each other

## File Storage Guidelines

- Use `ctx.storage.getUrl()` for signed URLs (returns `null` if file doesn't exist)
- Do NOT use deprecated `ctx.storage.getMetadata`
- Query `_storage` system table instead:

```typescript
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

type FileMetadata = {
  _id: Id<"_storage">;
  _creationTime: number;
  contentType?: string;
  sha256: string;
  size: number;
}

export const exampleQuery = query({
  args: { fileId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const metadata: FileMetadata | null = await ctx.db.system.get(args.fileId);
    console.log(metadata);
    return null;
  },
});
```

## Full Text Search

```typescript
const messages = await ctx.db
  .query("messages")
  .withSearchIndex("search_body", (q) =>
    q.search("body", "hello hi").eq("channel", "#general"),
  )
  .take(10);
```
