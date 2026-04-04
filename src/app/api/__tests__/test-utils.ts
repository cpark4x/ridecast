type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

type JsonObject = { [key: string]: JsonValue };

interface CreateJsonRequestOptions {
  url?: string;
  headers?: HeadersInit;
}

export function createJsonRequest(
  body: JsonValue,
  { url = 'http://localhost', headers }: CreateJsonRequestOptions = {},
): Request {
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Content-Type', 'application/json');

  return new Request(url, {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify(body),
  });
}
