import { AsyncLocalStorage } from 'node:async_hooks';
import { id, now } from './lib.mjs';
const store=new AsyncLocalStorage();
export function traceFrom(req){return {traceId:String(req.headers['x-jarvis-trace']||id('trace')),startedAt:now(),spanId:id('span')};}
export function withTrace(ctx,fn){return store.run(ctx,fn)}
export function trace(){return store.getStore()||{traceId:'',spanId:''}}
export function traceHeaders(extra={}){const t=trace();return {'x-jarvis-trace':t.traceId||'',...extra}}
