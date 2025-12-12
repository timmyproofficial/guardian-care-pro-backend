/**
 * Type declarations for papaparse
 * This file provides type definitions for the papaparse library
 */

declare module 'papaparse' {
  export interface ParseConfig<T = any> {
    delimiter?: string;
    newline?: string;
    quoteChar?: string;
    escapeChar?: string;
    header?: boolean;
    transformHeader?: (header: string, index: number) => string;
    dynamicTyping?: boolean | { [key: string]: boolean } | ((field: string | number) => boolean);
    preview?: number;
    encoding?: string;
    worker?: boolean;
    comments?: boolean | string;
    step?: (results: ParseResult<T>, parser: Parser) => void;
    complete?: (results: ParseResult<T>, file?: File) => void;
    error?: (error: ParseError, file?: File) => void;
    download?: boolean;
    downloadRequestHeaders?: { [key: string]: string };
    downloadRequestBody?: Blob | BufferSource | FormData | URLSearchParams | string;
    skipEmptyLines?: boolean | 'greedy';
    chunk?: (results: ParseResult<T>, parser: Parser) => void;
    fastMode?: boolean;
    beforeFirstChunk?: (chunk: string) => string | void;
    withCredentials?: boolean;
    transform?: (value: string, field: string | number) => any;
    delimitersToGuess?: string[];
  }

  export interface ParseError {
    type: string;
    code: string;
    message: string;
    row?: number;
  }

  export interface ParseMeta {
    delimiter: string;
    linebreak: string;
    aborted: boolean;
    truncated: boolean;
    cursor: number;
    fields?: string[];
  }

  export interface ParseResult<T = any> {
    data: T[];
    errors: ParseError[];
    meta: ParseMeta;
  }

  export interface Parser {
    abort: () => void;
    pause: () => void;
    resume: () => void;
  }

  export interface UnparseConfig {
    quotes?: boolean | boolean[] | ((value: any) => boolean);
    quoteChar?: string;
    escapeChar?: string;
    delimiter?: string;
    header?: boolean;
    newline?: string;
    skipEmptyLines?: boolean | 'greedy';
    columns?: string[];
  }

  export interface UnparseObject {
    fields: string[];
    data: any[][];
  }

  export function parse<T = any>(input: string | File | NodeJS.ReadableStream, config?: ParseConfig<T>): ParseResult<T>;
  export function unparse(data: any[] | UnparseObject, config?: UnparseConfig): string;

  const Papa: {
    parse: typeof parse;
    unparse: typeof unparse;
    BAD_DELIMITERS: string[];
    RECORD_SEP: string;
    UNIT_SEP: string;
    WORKERS_SUPPORTED: boolean;
    LocalChunkSize: number;
    RemoteChunkSize: number;
    DefaultDelimiter: string;
  };

  export default Papa;
}

