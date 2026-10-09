import {test} from 'node:test'
import assert from 'node:assert/strict'
import {parseMarkdownTable,serializeMarkdownRows} from '../official/markdownTableCodec.js'

test('escaped Markdown pipes stay inside one canonical teacher table cell',()=>{
 const cells=[[String.raw`A \| B`,'اردو',String.raw`C:\\Science`],['Pressure | Temperature','دباؤ | حرارت',String.raw`C:\Science`]]
 const encoded=serializeMarkdownRows(cells)
 const parsed=parseMarkdownTable(encoded)
 assert.deepEqual(parsed,cells)
 assert.equal(parsed[0].length,3)
 assert.ok(encoded.includes(String.raw`Pressure \| Temperature`))
})

test('source Markdown header, divider and answer lines with escaped pipes preserve 3 columns',()=>{
 const src=String.raw`| Formula \| Unit | عنوان | English |
| :--- | :---: | ---: |
| P \| T | درجہ حرارت \| دباؤ | C:\\Science |
| Regular | سادہ | Value \| x |`
 const rows=parseMarkdownTable(src)
 assert.deepEqual(rows,[['Formula | Unit','عنوان','English'],['P | T','درجہ حرارت | دباؤ',String.raw`C:\Science`],['Regular','سادہ','Value | x']])
 assert.deepEqual(parseMarkdownTable(serializeMarkdownRows(rows)),rows)
})

test('odd/even backslash runs do not change structural separator semantics',()=>{
 const cases=[
  {input:String.raw`| A \| B | X |`,value:['A | B','X']},
  {input:String.raw`| A \\ | X |`,value:['A \\', 'X']},
  {input:String.raw`| A \\\| B | X |`,value:[String.raw`A \| B`,'X']},
  {input:String.raw`| C:\folder\subfolder | X |`,value:[String.raw`C:\folder\subfolder`,'X']},
  {input:String.raw`| x \frac{a}{b} | B |`,value:[String.raw`x \frac{a}{b}`,'B']},
 ]
 for(const {input,value} of cases) assert.deepEqual(parseMarkdownTable(input),[value],input)
})

test('cell commit serialization round trip retains other cells, literal pipes and Urdu data',()=>{
 const initial=[['Label','اردو','Math'],['A | B','کثافت',String.raw`x \frac{a}{b}`],['C','بارش','42']]
 const edited=initial.map(row=>[...row])
 edited[1][1]='کثافت | حرارت'
 edited[2][2]=String.raw`y\z | equation`
 const written=serializeMarkdownRows(edited)
 assert.deepEqual(parseMarkdownTable(written),edited)
 assert.ok(written.includes(String.raw`کثافت \| حرارت`))
 assert.ok(written.includes(String.raw`y\\z \| equation`))
})

test('blank table and legacy simple Markdown preserve compatibility',()=>{
 assert.equal(serializeMarkdownRows([]),'')
 assert.deepEqual(parseMarkdownTable(''),[])
 assert.deepEqual(parseMarkdownTable('| One | Two |\n| --- | --- |\n| Yes | No |'),[['One','Two'],['Yes','No']])
})
