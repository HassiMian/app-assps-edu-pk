import { CanonicalNodeType } from '../../PaperEditor/core/PaperDocumentV2.js'

export const BLOCK_REGISTRY_VERSION = 1
export const BlockInlineCapability = Object.freeze({ TEXT:'text', MATH:'math', IMAGE:'image', TABLE:'table', BIDI:'bidi' })
export const BlockBreakPolicy = Object.freeze({ ATOMIC:'atomic', SPLITTABLE:'splittable', KEEP_WITH_NEXT:'keep_with_next' })

const CORE = Object.freeze([
  { type:CanonicalNodeType.MCQ, interaction:'choice', tablePurpose:null, breakPolicy:BlockBreakPolicy.ATOMIC },
  { type:CanonicalNodeType.SHORT_QUESTION, interaction:'response', tablePurpose:null, breakPolicy:BlockBreakPolicy.SPLITTABLE },
  { type:CanonicalNodeType.LONG_QUESTION, interaction:'response', tablePurpose:null, breakPolicy:BlockBreakPolicy.SPLITTABLE },
  { type:CanonicalNodeType.TRUE_FALSE, interaction:'choice', tablePurpose:null, breakPolicy:BlockBreakPolicy.ATOMIC },
  { type:CanonicalNodeType.FILL_BLANK, interaction:'response', tablePurpose:null, breakPolicy:BlockBreakPolicy.SPLITTABLE },
  { type:CanonicalNodeType.MATCHING_COLUMNS, interaction:'matching', tablePurpose:'matching', breakPolicy:BlockBreakPolicy.ATOMIC },
  { type:CanonicalNodeType.GRAMMAR_TABLE, interaction:'table', tablePurpose:'grammar', breakPolicy:BlockBreakPolicy.ATOMIC },
  { type:CanonicalNodeType.VERTICAL_MATH, interaction:'response', tablePurpose:null, breakPolicy:BlockBreakPolicy.ATOMIC },
  { type:CanonicalNodeType.ESSAY, interaction:'response', tablePurpose:null, breakPolicy:BlockBreakPolicy.SPLITTABLE },
  { type:CanonicalNodeType.APPLICATION, interaction:'response', tablePurpose:null, breakPolicy:BlockBreakPolicy.SPLITTABLE },
  { type:CanonicalNodeType.LETTER, interaction:'response', tablePurpose:null, breakPolicy:BlockBreakPolicy.SPLITTABLE },
  { type:CanonicalNodeType.TRANSLATION, interaction:'response', tablePurpose:null, breakPolicy:BlockBreakPolicy.SPLITTABLE },
  { type:CanonicalNodeType.DEFINITION, interaction:'response', tablePurpose:null, breakPolicy:BlockBreakPolicy.SPLITTABLE },
  { type:CanonicalNodeType.RICH_TEXT, interaction:'content', tablePurpose:null, breakPolicy:BlockBreakPolicy.SPLITTABLE },
  { type:CanonicalNodeType.SCOPE_HEADER, interaction:'content', tablePurpose:null, breakPolicy:BlockBreakPolicy.KEEP_WITH_NEXT },
  { type:CanonicalNodeType.SECTION_BANNER, interaction:'content', tablePurpose:null, breakPolicy:BlockBreakPolicy.KEEP_WITH_NEXT },
  { type:CanonicalNodeType.UNKNOWN_PRESERVED, interaction:'unknown', tablePurpose:null, breakPolicy:BlockBreakPolicy.ATOMIC },
].map(entry=>Object.freeze({
  registryVersion:BLOCK_REGISTRY_VERSION,
  namespace:'core',
  inlineCapabilities:Object.freeze(Object.values(BlockInlineCapability)),
  supportsRtl:true,
  supportsImages:true,
  supportsMath:true,
  ...entry,
})))

const namespaceType=/^[a-z][a-z0-9_-]*:[a-z][a-z0-9_-]*$/
const clone=value=>JSON.parse(JSON.stringify(value))

export class BlockRegistry {
  constructor({ version=BLOCK_REGISTRY_VERSION, coreDefinitions=CORE }={}) {
    this.version=version
    this.definitions=new Map()
    coreDefinitions.forEach(def=>this.register(def,{allowCore:true}))
  }
  register(definition,{allowCore=false}={}) {
    const def=clone(definition||{})
    if(!def.type) throw new Error('Block type is required')
    if(def.namespace==='core' && !allowCore) throw new Error('Core block registrations are immutable')
    if(def.namespace!=='core' && !namespaceType.test(def.type)) throw new Error(`Extension block type must be namespaced: ${def.type}`)
    if(this.definitions.has(def.type)) throw new Error(`Block type already registered: ${def.type}`)
    def.registryVersion=Number(def.registryVersion||this.version)
    if(def.registryVersion!==this.version) throw new Error(`Block registry version mismatch: ${def.registryVersion}`)
    def.inlineCapabilities=Array.from(new Set(Array.isArray(def.inlineCapabilities)?def.inlineCapabilities:[]))
    def.supportsRtl=def.supportsRtl!==false
    def.supportsImages=def.inlineCapabilities.includes(BlockInlineCapability.IMAGE)
    def.supportsMath=def.inlineCapabilities.includes(BlockInlineCapability.MATH)
    this.definitions.set(def.type,Object.freeze(def))
    return this.definitions.get(def.type)
  }
  has(type){ return this.definitions.has(type) }
  resolve(type){ return this.definitions.get(type)||null }
  resolveOrFallback(type){
    const known=this.resolve(type)
    if(known) return { known:true, requestedType:type, definition:known }
    return { known:false, requestedType:type, definition:this.resolve(CanonicalNodeType.UNKNOWN_PRESERVED) }
  }
  list(){ return [...this.definitions.values()] }
}

export const DEFAULT_BLOCK_REGISTRY = new BlockRegistry()

export function normalizeNodeForBlockRegistry(node, registry=DEFAULT_BLOCK_REGISTRY) {
  if(!node || typeof node!=='object') return node
  const resolved=registry.resolveOrFallback(node.type)
  if(resolved.known) return node
  return {
    ...node,
    type:CanonicalNodeType.UNKNOWN_PRESERVED,
    preservedBlockType:String(node.type||'unknown'),
    preservedBlockPayload:clone(node),
  }
}
