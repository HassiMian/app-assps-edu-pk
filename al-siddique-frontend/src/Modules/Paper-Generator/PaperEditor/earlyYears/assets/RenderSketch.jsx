// RenderSketch.jsx — React presentation component for rendering Early Years sketches
import React from 'react'
import { getSketchAsset } from './SketchAssetRegistry.js'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'

export default function RenderSketch({
  assetId,
  size = 'choiceVisual', // token name or CSS dimension string
  className = '',
  style = {},
  alt = null,
  isDotted = false
}) {
  const asset = getSketchAsset(assetId)
  if (!asset) {
    return (
      <div
        className={`sketch-missing-placeholder ${className}`}
        style={{
          width: LAYOUT_TOKENS.sketchSizes[size] || size || '35mm',
          height: LAYOUT_TOKENS.sketchSizes[size] || size || '35mm',
          border: '1px dashed #999',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          color: '#666',
          ...style
        }}
        title={`Missing sketch asset: ${assetId}`}
      >
        [{assetId || 'Sketch'}]
      </div>
    )
  }

  const dimension = LAYOUT_TOKENS.sketchSizes[size] || size || '35mm'
  const effectiveAlt = alt || asset.altText
  const content = isDotted && asset.dottedSvgContent ? asset.dottedSvgContent : asset.svgContent

  // Handle uploaded raster (PNG / WebP)
  if (asset.source === 'USER_UPLOAD' && asset.dataUrl && asset.mimeType !== 'image/svg+xml') {
    return (
      <img
        src={asset.dataUrl}
        alt={effectiveAlt}
        className={`early-years-sketch ${className}`}
        style={{
          width: dimension,
          height: 'auto',
          maxHeight: dimension,
          objectFit: 'contain',
          display: 'inline-block',
          ...style
        }}
      />
    )
  }

  // Builtin or SVG upload
  return (
    <svg
      viewBox={asset.viewBox}
      className={`early-years-sketch ${className}`}
      style={{
        width: dimension,
        height: dimension,
        display: 'inline-block',
        verticalAlign: 'middle',
        overflow: 'visible',
        ...style
      }}
      role="img"
      aria-label={effectiveAlt}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}

export { RenderSketch }
