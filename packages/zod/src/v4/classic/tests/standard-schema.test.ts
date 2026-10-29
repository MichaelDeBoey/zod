import { expect, test } from "vitest";

import * as z from "zod/v4";

test("length checks", async () => {
  const schema = z.string();
  const result = await schema["~standard"].validate(12);
  expect(result).toMatchInlineSnapshot(`
    {
      "issues": [
        {
          "code": "invalid_type",
          "expected": "string",
          "message": "Invalid input: expected string, received number",
          "path": [],
        },
      ],
    }
  `);
});

test("length checks", async () => {
  const schema = z.string();
  const result = await schema["~standard"].validate("asdf");
  expect(result).toMatchInlineSnapshot(`
    {
      "value": "asdf",
    }
  `);
});

test("length checks", async () => {
  const schema = z.string().refine(async (val) => val.length > 5);
  const result = await schema["~standard"].validate(12);
  expect(result).toMatchInlineSnapshot(`
    {
      "issues": [
        {
          "code": "invalid_type",
          "expected": "string",
          "message": "Invalid input: expected string, received number",
          "path": [],
        },
      ],
    }
  `);
});

test("length checks", async () => {
  const schema = z.string().refine(async (val) => val.length > 5);
  const result = await schema["~standard"].validate("234134134");
  expect(result).toMatchInlineSnapshot(`
    {
      "value": "234134134",
    }
  `);
});

test("schemas conform to StandardJSONSchemaV1", async () => {
  const schema = z.codec(z.string(), z.number(), {
    decode: (str) => Number.parseFloat(str),
    encode: (num) => num.toString(),
  });
  expect(schema["~standard"].validate).toBeTypeOf("function");
  expect(await schema["~standard"].validate("42")).toMatchInlineSnapshot(`
		{
		  "value": 42,
		}
	`);
  expect(schema["~standard"].jsonSchema.input({ target: "draft-2020-12" })).toMatchInlineSnapshot(`
		{
		  "$schema": "https://json-schema.org/draft/2020-12/schema",
		  "type": "string",
		}
	`);
  expect(schema["~standard"].jsonSchema.output({ target: "draft-2020-12" })).toMatchInlineSnapshot(`
		{
		  "$schema": "https://json-schema.org/draft/2020-12/schema",
		  "type": "number",
		}
	`);
});

test(".toJSONSchema() returns StandardJSONSchemaV1", async () => {
  const codec = z.codec(z.string(), z.number(), {
    decode: (str) => Number.parseFloat(str),
    encode: (num) => num.toString(),
  });
  const result = codec.toJSONSchema();
  expect(result["~standard"].validate).toBeTypeOf("function");
  expect(await result["~standard"].validate("42")).toMatchInlineSnapshot(`
		{
		  "value": 42,
		}
	`);
  expect(result["~standard"].jsonSchema.input({ target: "draft-2020-12" })).toMatchInlineSnapshot(`
		{
		  "$schema": "https://json-schema.org/draft/2020-12/schema",
		  "type": "string",
		}
	`);
  expect(result["~standard"].jsonSchema.output({ target: "draft-2020-12" })).toMatchInlineSnapshot(`
		{
		  "$schema": "https://json-schema.org/draft/2020-12/schema",
		  "type": "number",
		}
	`);
});

test("z.toJSONSchema() returns StandardJSONSchemaV1", async () => {
  const codec = z.codec(z.string(), z.number(), {
    decode: (str) => Number.parseFloat(str),
    encode: (num) => num.toString(),
  });
  const result = z.toJSONSchema(codec);
  expect(result["~standard"].validate).toBeTypeOf("function");
  expect(await result["~standard"].validate("42")).toMatchInlineSnapshot(`
		{
		  "value": 42,
		}
	`);
  expect(result["~standard"].jsonSchema.input({ target: "draft-2020-12" })).toMatchInlineSnapshot(`
		{
		  "$schema": "https://json-schema.org/draft/2020-12/schema",
		  "type": "string",
		}
	`);
  expect(result["~standard"].jsonSchema.output({ target: "draft-2020-12" })).toMatchInlineSnapshot(`
		{
		  "$schema": "https://json-schema.org/draft/2020-12/schema",
		  "type": "number",
		}
	`);
});

test("~standard.jsonSchema throws for an unsupported target", () => {
  const schema = z.object({ title: z.string() });
  const { jsonSchema } = schema["~standard"];
  expect(() => jsonSchema.input({ target: "draft-03" })).toThrow('JSON Schema target "draft-03" is not supported');
  expect(() => jsonSchema.output({ target: "openapi-3.1" })).toThrow(
    'JSON Schema target "openapi-3.1" is not supported'
  );
  expect(() => z.toJSONSchema(schema)["~standard"].jsonSchema.input({ target: "draft-03" })).toThrow();
  expect(jsonSchema.input({ target: "draft-7" }).$schema).toBe("http://json-schema.org/draft-07/schema#");
  expect(jsonSchema.input({ target: "openapi-3.0" })).not.toHaveProperty("$schema");
  // `z.toJSONSchema()` keeps accepting arbitrary targets
  expect(z.toJSONSchema(schema, { target: "draft-03" })).not.toHaveProperty("$schema");
});

test("a failing validate reports the same issues as safeParse, without a ZodError", async () => {
  const schema = z.object({ name: z.string().min(3), age: z.number().refine(async (n) => n > 0) });
  const input = { name: "ab", age: -1 };
  const result = (await schema["~standard"].validate(input)) as { issues: unknown[] };
  expect(result.issues).toEqual((await schema.safeParseAsync(input)).error!.issues);
  expect(result).not.toHaveProperty("error");
  const sync = z.string().min(3)["~standard"].validate("ab") as { issues: unknown[] };
  expect(sync.issues).toEqual(z.string().min(3).safeParse("ab").error!.issues);
});

test("a synchronously throwing check rejects through ~standard instead of throwing", async () => {
  const schema = z.string().refine(() => {
    throw new Error("boom");
  });
  const result = schema["~standard"].validate("abc");
  expect(result).toBeInstanceOf(Promise);
  await expect(result as Promise<unknown>).rejects.toThrow("boom");
});
