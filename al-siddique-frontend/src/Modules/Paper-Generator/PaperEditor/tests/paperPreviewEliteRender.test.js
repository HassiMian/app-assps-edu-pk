import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..')
const elitePath = '/src/Modules/Paper-Generator/PaperPreviewEngine.jsx'

const exportEliteForTest = {
  name: 'paper-preview-test-only-export',
  enforce: 'pre',
  transform(source, id) {
    if (id.endsWith('/PaperPreviewEngine.jsx')) return `${source}\nexport { ClassicTemplate, ModernTemplate, EliteTemplate }\n`
    return null
  },
}

test('all three legacy preview templates render in Urdu and English without undefined language state', { timeout: 30000 }, async () => {
  const server = await createServer({root, server:{middlewareMode:true}, appType:'custom', plugins:[exportEliteForTest]})
  try {
    const { ClassicTemplate, ModernTemplate, EliteTemplate } = await server.ssrLoadModule(elitePath)
    for (const Component of [ClassicTemplate, ModernTemplate, EliteTemplate]) {
      for (const language of ['urdu', 'english']) {
      const html = renderToStaticMarkup(React.createElement(Component, {
        config:{language,subject:'Science',classLevel:'8',examType:'Term'},
        settings:{schoolName:'ASSPS',address:'Rayya Khas',logo:''},
        selectedMCQ:[],selectedShort:[],selectedLong:[],printOpts:{engFontSize:13,urdFontSize:14},
        showAnswers:false,edit:false,
      }))
      assert.match(html,/ppe-paper/)
      assert.match(html,/ASSPS|الصدیق/)
      if (language==='urdu') { assert.match(html,/ASSPS Jameel Noori|Jameel Noori Nastaleeq/); assert.match(html,/direction:rtl/) }
      else assert.match(html,/direction:ltr/)
      }
    }
  } finally {
    await server.close()
  }
})
