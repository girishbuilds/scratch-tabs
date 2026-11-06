import { useMemo } from 'react';
import { search } from 'jmespath';
import { useDebounce } from '../../../hooks/useDebounce';

/**
 * The jmespath parser can crash with an internal TypeError (e.g. `users..email`)
 * instead of a parse error. Replace that with a message a user can act on.
 */
function describeQueryError(error: unknown): string {
  if (!(error instanceof Error)) return 'Query Error: Invalid JMESPath expression';
  if (error instanceof TypeError) {
    return "Query Error: Syntax error - check for a doubled '.', a missing name or an incomplete expression";
  }
  return `Query Error: ${error.message}`;
}

interface JmespathResult {
  results: unknown | null;
  error: string | null;
}

/**
 * Custom hook to execute JMESPath queries against JSON data
 *
 * @param jsonString - The JSON string to query against
 * @param query - The JMESPath query expression
 * @param debounceMs - Debounce delay in milliseconds (default: 300)
 * @returns Object containing results or error
 */
export function useJmespath(
  jsonString: string,
  query: string,
  debounceMs: number = 300
): JmespathResult {
  // Debounce the query to avoid excessive re-calculations while typing
  const debouncedQuery = useDebounce(query, debounceMs);

  // Calculate results only when debounced query or source JSON changes
  const result = useMemo<JmespathResult>(() => {
    // Return null if query is empty
    if (!debouncedQuery.trim()) {
      return { results: null, error: null };
    }

    // Parse the JSON string
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonString);
    } catch (parseError) {
      return {
        results: null,
        error: parseError instanceof Error
          ? `Invalid JSON: ${parseError.message}`
          : 'Invalid JSON: Unable to parse'
      };
    }

    // Execute the JMESPath query
    try {
      const queryResult = search(parsedJson, debouncedQuery);
      return { results: queryResult, error: null };
    } catch (jmespathError) {
      return { results: null, error: describeQueryError(jmespathError) };
    }
  }, [debouncedQuery, jsonString]);

  return result;
}
