// CaterpillarNumberTrace.jsx — Original worksheet caterpillar number trace layout
import React from 'react'
import { TYPOGRAPHY_TOKENS } from '../tokens/typographyTokens.js'

export default function CaterpillarNumberTrace({
  numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
}) {
  return (
    <div
      className="early-years-caterpillar-trace"
      style={{
        margin: '16px 0',
        padding: '12px 6px',
        border: '1.5px solid #333',
        borderRadius: '12px',
        background: '#fff'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflowX: 'auto',
          padding: '8px 4px'
        }}
      >
        {/* Numbers 1-10 segments from left to right */}
        {numbers.map((num, idx) => (
          <div
            key={`cat-seg-${idx}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative'
            }}
          >
            {/* Circular body segment */}
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: '2px solid #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fff',
                fontSize: TYPOGRAPHY_TOKENS.fontSizes.numberGridText,
                fontFamily: TYPOGRAPHY_TOKENS.fontFamilies.englishPrimary,
                fontWeight: 'bold',
                color: '#666',
                boxShadow: 'inset 0 0 0 1px #eee'
              }}
            >
              {num}
            </div>

            {/* Little feet */}
            <div
              style={{
                display: 'flex',
                gap: '4px',
                marginTop: '2px'
              }}
            >
              <div style={{ width: '2px', height: '6px', background: '#000' }} />
              <div style={{ width: '2px', height: '6px', background: '#000' }} />
            </div>
          </div>
        ))}

        {/* Caterpillar Head with antennae & smile on the right */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginLeft: '4px'
          }}
        >
          {/* Antennae */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              fontSize: '11px',
              lineHeight: 1,
              marginBottom: '-2px'
            }}
          >
            <span>\</span>
            <span>/</span>
          </div>
          {/* Face */}
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: '2.5px solid #000',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fff'
            }}
          >
            <div style={{ display: 'flex', gap: '8px', fontSize: '10px' }}>
              <span>●</span>
              <span>●</span>
            </div>
            <div style={{ fontSize: '12px', marginTop: '-2px' }}>‿</div>
          </div>
        </div>
      </div>
    </div>
  )
}
