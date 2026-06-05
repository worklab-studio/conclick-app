import { FILTER_COLUMNS, OPERATORS } from '@/lib/constants';
import { Filter, QueryFilters, QueryOptions } from '@/lib/types';

export function parseFilterValue(param: any) {
  if (typeof param === 'string') {
    const operatorValues = Object.values(OPERATORS).join('|');

    const regex = new RegExp(`^(${operatorValues})\\.(.*)$`);

    const [, operator, value] = param.match(regex) || [];

    return { operator: operator || OPERATORS.equals, value: value || param };
  }

  return { operator: OPERATORS.equals, value: param };
}

export function isEqualsOperator(operator: any) {
  return [OPERATORS.equals, OPERATORS.notEquals].includes(operator);
}

export function isSearchOperator(operator: any) {
  return [OPERATORS.contains, OPERATORS.doesNotContain].includes(operator);
}

export function filtersObjectToArray(filters: QueryFilters, options: QueryOptions = {}): Filter[] {
  if (!filters) {
    return [];
  }

  return Object.keys(filters).reduce((arr, key) => {
    const filter = filters[key];

    if (filter === undefined || filter === null) {
      return arr;
    }

    if (filter?.name && filter?.value !== undefined) {
      return arr.concat({ ...filter, column: options?.columns?.[key] ?? FILTER_COLUMNS[key] });
    }

    const { operator, value } = parseFilterValue(filter);

    return arr.concat({
      name: key,
      column: options?.columns?.[key] ?? FILTER_COLUMNS[key],
      operator,
      value,
      prefix: options?.prefix,
    });
  }, []);
}

export function filtersArrayToObject(filters: Filter[]) {
  return filters.reduce((obj, filter: Filter) => {
    const { name, operator, value } = filter;

    obj[name] = `${operator}.${value}`;

    return obj;
  }, {});
}

/**
 * Sanitize a caller-supplied `orderBy` column for safe interpolation into raw
 * SQL. orderBy is a SQL identifier (not a value), so it cannot be passed as a
 * bound parameter — instead we restrict it to an optionally table-qualified
 * column name: letters/digits/underscore, with at most one dot.
 * Anything that doesn't match returns undefined so the caller drops the
 * `order by` clause entirely rather than interpolating arbitrary SQL.
 */
export function sanitizeOrderBy(orderBy: unknown): string | undefined {
  if (typeof orderBy !== 'string') return undefined;
  return /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(orderBy)
    ? orderBy
    : undefined;
}
