// Canonical teacher-authored pipe-table transport. Escaped Markdown delimiters
// are data, not new columns. This codec is shared by screen and cell edits.
export function parseMarkdownTable(content = '') {
  return String(content).split(/\r?\n/).map(line => line.trim())
    .filter(line => /^\|.*\|$/.test(line))
    .map(line => {
      const cells=[]
      let value=''
      const source=line.slice(1,-1)
      for(let i=0;i<source.length;i++){
        const char=source[i]
        if(char==='\\'&&(source[i+1]==='|'||source[i+1]==='\\')){
          value+=source[++i]
        }else if(char==='|'){
          cells.push(value.trim());value=''
        }else{
          value+=char
        }
      }
      cells.push(value.trim())
      return cells
    })
    .filter(row => !row.every(cell => /^:?-{3,}:?$/.test(cell)))
}

export function serializeMarkdownRows(rows = []) {
  if (!rows.length) return ''
  const encodeCell=cell=>String(cell||'').trim().replace(/\\/g,'\\\\').replace(/\|/g,'\\|')
  const encode=row=>'| '+row.map(encodeCell).join(' | ')+' |'
  const separator='| '+rows[0].map(()=>'---').join(' | ')+' |'
  return [encode(rows[0]),separator,...rows.slice(1).map(encode)].join('\n')
}
