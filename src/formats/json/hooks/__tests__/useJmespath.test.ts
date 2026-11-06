import { renderHook, waitFor } from '@testing-library/react';
import { useJmespath } from '../useJmespath';

// Test data
const validJson = JSON.stringify({
  foo: {
    bar: 'baz'
  },
  people: [
    { name: 'Alice', age: 25, status: 'active' },
    { name: 'Bob', age: 35, status: 'active' },
    { name: 'Charlie', age: 28, status: 'inactive' }
  ],
  items: [
    { id: 1, price: 10.5 },
    { id: 2, price: 20.0 }
  ]
});

const invalidJson = '{ "foo": "bar"'; // Missing closing brace

describe('useJmespath', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should return null results and no error for empty query', () => {
    const { result } = renderHook(() => useJmespath(validJson, ''));

    expect(result.current.results).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return null results and no error for whitespace-only query', () => {
    const { result } = renderHook(() => useJmespath(validJson, '   '));

    expect(result.current.results).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should execute a simple JMESPath query', async () => {
    const { result } = renderHook(() => useJmespath(validJson, 'foo.bar'));

    // Wait for debounce
    await waitFor(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.results).toBe('baz');
    expect(result.current.error).toBeNull();
  });

  it('should execute a complex JMESPath query with filtering', async () => {
    const { result } = renderHook(() =>
      useJmespath(validJson, "people[?age > `30`].name")
    );

    // Wait for debounce
    await waitFor(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.results).toEqual(['Bob']);
    expect(result.current.error).toBeNull();
  });

  it('should execute a query that filters by status', async () => {
    const { result } = renderHook(() =>
      useJmespath(validJson, "people[?status=='active'].name")
    );

    // Wait for debounce
    await waitFor(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.results).toEqual(['Alice', 'Bob']);
    expect(result.current.error).toBeNull();
  });

  it('should show a readable error and no result for a doubled dot', async () => {
    const { result } = renderHook(() => useJmespath(validJson, 'people..name'));

    await waitFor(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.results).toBeNull();
    expect(result.current.error).toContain('Query Error: Syntax error');
    expect(result.current.error).not.toContain('Cannot read properties');
  });

  it('should return error for invalid JMESPath query', async () => {
    const { result } = renderHook(() =>
      useJmespath(validJson, 'foo[[[')
    );

    // Wait for debounce
    await waitFor(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.results).toBeNull();
    expect(result.current.error).toBeTruthy();
    expect(result.current.error).toContain('Query Error');
  });

  it('should return error for invalid JSON', async () => {
    const { result } = renderHook(() =>
      useJmespath(invalidJson, 'foo.bar')
    );

    // Wait for debounce
    await waitFor(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.results).toBeNull();
    expect(result.current.error).toBeTruthy();
    expect(result.current.error).toContain('Invalid JSON');
  });

  it('should return null for query that yields no results', async () => {
    const { result } = renderHook(() =>
      useJmespath(validJson, 'nonexistent.key')
    );

    // Wait for debounce
    await waitFor(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.results).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return empty array for filter that matches nothing', async () => {
    const { result } = renderHook(() =>
      useJmespath(validJson, "people[?age > `100`]")
    );

    // Wait for debounce
    await waitFor(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should debounce query changes', async () => {
    const { result, rerender } = renderHook(
      ({ query }) => useJmespath(validJson, query),
      { initialProps: { query: '' } }
    );

    // Initial state (empty query)
    expect(result.current.results).toBeNull();

    // Change query multiple times quickly
    rerender({ query: 'foo' });
    rerender({ query: 'foo.bar' });
    rerender({ query: 'people' });

    // Should still be null because debounce hasn't completed
    expect(result.current.results).toBeNull();

    // Advance timers and wait for update
    jest.advanceTimersByTime(300);

    // Wait for the hook to update with the debounced query
    await waitFor(() => {
      expect(result.current.results).toEqual(JSON.parse(validJson).people);
    });

    expect(result.current.error).toBeNull();
  });

  it('should handle query that returns primitive values', async () => {
    const simpleJson = JSON.stringify({ count: 42 });
    const { result } = renderHook(() => useJmespath(simpleJson, 'count'));

    // Wait for debounce
    await waitFor(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.results).toBe(42);
    expect(result.current.error).toBeNull();
  });

  it('should handle query that returns boolean', async () => {
    const boolJson = JSON.stringify({ active: true });
    const { result } = renderHook(() => useJmespath(boolJson, 'active'));

    // Wait for debounce
    await waitFor(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.results).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should handle nested array queries', async () => {
    const { result } = renderHook(() =>
      useJmespath(validJson, 'items[*].price')
    );

    // Wait for debounce
    await waitFor(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.results).toEqual([10.5, 20.0]);
    expect(result.current.error).toBeNull();
  });

  it('should re-execute query when JSON content changes', async () => {
    const json1 = JSON.stringify({ value: 'first' });
    const json2 = JSON.stringify({ value: 'second' });

    const { result, rerender } = renderHook(
      ({ json }) => useJmespath(json, 'value'),
      { initialProps: { json: json1 } }
    );

    // Wait for initial debounce
    await waitFor(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.results).toBe('first');

    // Change JSON content
    rerender({ json: json2 });

    // Wait for re-execution
    await waitFor(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.results).toBe('second');
  });
});
