import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CanonicalNodeType } from '../core/PaperDocumentV2.js'
import { BlockInlineCapability, BlockRegistry, DEFAULT_BLOCK_REGISTRY, normalizeNodeForBlockRegistry } from '../../AssessmentStudio/core/BlockRegistry.js'

test('core block registry is versioned and content capabilities are orthogonal to interaction type',()=>{
 const mcq=DEFAULT_BLOCK_REGISTRY.resolve(CanonicalNodeType.MCQ)
 const short=DEFAULT_BLOCK_REGISTRY.resolve(CanonicalNodeType.SHORT_QUESTION)
 assert.equal(mcq.registryVersion,1)
 assert.equal(mcq.supportsRtl,true)
 assert.equal(short.supportsRtl,true)
 assert.ok(mcq.inlineCapabilities.includes(BlockInlineCapability.MATH))
 assert.ok(mcq.inlineCapabilities.includes(BlockInlineCapability.IMAGE))
 assert.ok(short.inlineCapabilities.includes(BlockInlineCapability.MATH))
})

test('namespaced extension types register without changing core enum',()=>{
 const registry=new BlockRegistry()
 const custom=registry.register({
  type:'assps:semantic_table', namespace:'assps', interaction:'table', tablePurpose:'answer_grid',
  inlineCapabilities:[BlockInlineCapability.TEXT,BlockInlineCapability.MATH,BlockInlineCapability.BIDI], breakPolicy:'atomic',
 })
 assert.equal(custom.type,'assps:semantic_table')
 assert.equal(custom.supportsMath,true)
 assert.equal(custom.supportsRtl,true)
 assert.equal(CanonicalNodeType.SEMANTIC_TABLE,undefined)
})

test('unknown extension is preserved losslessly through unknown-safe fallback',()=>{
 const node={id:'n1',type:'vendor:new_interaction',direction:'rtl',content:'اصل متن',custom:{x:1}}
 const normalized=normalizeNodeForBlockRegistry(node)
 assert.equal(normalized.type,CanonicalNodeType.UNKNOWN_PRESERVED)
 assert.equal(normalized.preservedBlockType,'vendor:new_interaction')
 assert.deepEqual(normalized.preservedBlockPayload,node)
 assert.equal(node.type,'vendor:new_interaction')
})

test('extension registration fails closed without namespace or on duplicate',()=>{
 const registry=new BlockRegistry()
 assert.throws(()=>registry.register({type:'semantic_table',namespace:'assps'}),/namespaced/)
 registry.register({type:'assps:semantic_table',namespace:'assps'})
 assert.throws(()=>registry.register({type:'assps:semantic_table',namespace:'assps'}),/already registered/)
})
