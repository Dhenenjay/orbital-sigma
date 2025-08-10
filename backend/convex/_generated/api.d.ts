/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as billing from "../billing.js";
import type * as catalog from "../catalog.js";
import type * as clerk from "../clerk.js";
import type * as domainMapping from "../domainMapping.js";
import type * as generateSignals from "../generateSignals.js";
import type * as generateSignalsRealtime from "../generateSignalsRealtime.js";
import type * as globalAOIGenerator from "../globalAOIGenerator.js";
import type * as http from "../http.js";
import type * as magnitudeMapping from "../magnitudeMapping.js";
import type * as marketAnalysis from "../marketAnalysis.js";
import type * as matchAOIs from "../matchAOIs.js";
import type * as parseNaturalLanguageQuery from "../parseNaturalLanguageQuery.js";
import type * as queries from "../queries.js";
import type * as queryDefaults from "../queryDefaults.js";
import type * as queryToApiParams from "../queryToApiParams.js";
import type * as rerunAnalysis from "../rerunAnalysis.js";
import type * as seed from "../seed.js";
import type * as seedImport from "../seedImport.js";
import type * as signals from "../signals.js";
import type * as startQuery from "../startQuery.js";
import type * as test from "../test.js";
import type * as testAOIMatching from "../testAOIMatching.js";
import type * as testQueryParser from "../testQueryParser.js";
import type * as testQueryParsing from "../testQueryParsing.js";
import type * as testRerunAnalysis from "../testRerunAnalysis.js";
import type * as testSignalGeneration from "../testSignalGeneration.js";
import type * as testTradingSignals from "../testTradingSignals.js";
import type * as timeMapping from "../timeMapping.js";
import type * as tokenUsage from "../tokenUsage.js";
import type * as tradingSignals from "../tradingSignals.js";
import type * as types_marketAnalysis from "../types/marketAnalysis.js";
import type * as users from "../users.js";
import type * as validateSignals from "../validateSignals.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  billing: typeof billing;
  catalog: typeof catalog;
  clerk: typeof clerk;
  domainMapping: typeof domainMapping;
  generateSignals: typeof generateSignals;
  generateSignalsRealtime: typeof generateSignalsRealtime;
  globalAOIGenerator: typeof globalAOIGenerator;
  http: typeof http;
  magnitudeMapping: typeof magnitudeMapping;
  marketAnalysis: typeof marketAnalysis;
  matchAOIs: typeof matchAOIs;
  parseNaturalLanguageQuery: typeof parseNaturalLanguageQuery;
  queries: typeof queries;
  queryDefaults: typeof queryDefaults;
  queryToApiParams: typeof queryToApiParams;
  rerunAnalysis: typeof rerunAnalysis;
  seed: typeof seed;
  seedImport: typeof seedImport;
  signals: typeof signals;
  startQuery: typeof startQuery;
  test: typeof test;
  testAOIMatching: typeof testAOIMatching;
  testQueryParser: typeof testQueryParser;
  testQueryParsing: typeof testQueryParsing;
  testRerunAnalysis: typeof testRerunAnalysis;
  testSignalGeneration: typeof testSignalGeneration;
  testTradingSignals: typeof testTradingSignals;
  timeMapping: typeof timeMapping;
  tokenUsage: typeof tokenUsage;
  tradingSignals: typeof tradingSignals;
  "types/marketAnalysis": typeof types_marketAnalysis;
  users: typeof users;
  validateSignals: typeof validateSignals;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
