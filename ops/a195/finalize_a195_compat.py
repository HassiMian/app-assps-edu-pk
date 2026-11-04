
from pathlib import Path
import hashlib,json
R=Path('/root/workspace/assps-diary-a195-typography-20261104')
OUT=R/'ops/a195/release'
s=(OUT/'a195-work-in-progress.js').read_text()
B=chr(96)
def ch(a,b,label):
 global s
 n=s.count(a);assert n==1,(label,n)
 s=s.replace(a,b,1);print('PATCH_OK',label)
btn=lambda attrs,child:"(0,F.jsx)('button',{"+attrs+",children:"+child+"})"
bold=btn("type:'button',className:__a195Bold?'dd-sqb-btn-bold active':'dd-sqb-btn-bold',onClick:()=>__setA195Bold(e=>!e),title:'Toggle Subject and Home Task heading bold'", "'B'")
minus=btn("type:'button',onClick:()=>__setA195TH(e=>Math.max(9,e-1)),title:'Decrease table heading font size'", "(0,F.jsx)(v,{size:11})")
plus=btn("type:'button',onClick:()=>__setA195TH(e=>Math.min(20,e+1)),title:'Increase table heading font size'", "(0,F.jsx)(_,{size:11})")
group="(0,F.jsx)('div',{className:'dd-sqb-divider'}),"
group+="(0,F.jsxs)('div',{className:'dd-sqb-group dd-sqb-table-heading','data-table-heading-controls':!0,children:["
group+="(0,F.jsx)('span',{className:'dd-sqb-label',children:'Table Headings:'}),"
group+="(0,F.jsxs)('div',{className:'dd-sqb-stepper',children:["+bold+","+minus+",(0,F.jsx)('b',{children:__a195TH+'px'}),"+plus+"]})]}),"
anchor='(0,F.jsx)('+B+'div'+B+',{className:'+B+'dd-sqb-divider'+B+'}),(0,F.jsxs)('+B+'div'+B+',{className:'+B+'dd-sqb-group'+B+',children:[(0,F.jsx)('+B+'span'+B+',{className:'+B+'dd-sqb-label'+B+',children:'+B+'Row Height:'+B+'})'
ch(anchor,group+'(0,F.jsxs)('+B+'div'+B+',{className:'+B+'dd-sqb-group'+B+',children:[(0,F.jsx)('+B+'span'+B+',{className:'+B+'dd-sqb-label'+B+',children:'+B+'Row Height:'+B+'})','heading controller')
ch('children:'+B+'Subject:'+B+'}', 'children:'+B+'Subject Row:'+B+'}', 'subject label')
ch('children:'+B+'Diary Font:'+B+'}', 'children:'+B+'Task Text:'+B+'}', 'task label')

# Print-time overflow guard must inspect the same rendered cards used by iframe cloning.
needle='let e=document.querySelector('+B+'.dd-page-stage'+B+');if(!e){window.print();return}let t='
assert s.count(needle)==1,("print guard anchor",s.count(needle))
guard="let e=document.querySelector("+B+".dd-page-stage"+B+");if(!e){window.print();return}const __a195Overflow=[...e.querySelectorAll("+B+".dd-card-studio"+B+")].filter(c=>c.scrollHeight>c.clientHeight+2);if(__a195Overflow.length){J('Print blocked: '+__a195Overflow.length+' diary card(s) exceed A4 space. Reduce Row Height, text size, or diaries per page, then preview again.');return}let t="
s=s.replace(needle,guard,1)
css=(R/'ops/a195/a195-typography.css').read_text()
marker='/* Premium 8 — isolated iframe A4 print rules. Inline AFTER standard print CSS. */'
assert s.count(marker)==1
start=s.index(marker)
end=s.index('</style>',start)
assert end>start
s=s[:end]+"\n"+css+"\n"+s[end:]
jn='DailyDiaryWorkspace-ASSPS-A195-CONTROLS-20261104.js'
cn='DailyDiaryWorkspace-ASSPS-A195-CONTROLS-20261104.css'
s='\n'.join(line.rstrip() for line in s.splitlines())+'\n'
(OUT/jn).write_text(s)
original_css=Path('/var/www/assps-releases/diary-studio8-independent-colors-20261104/assets/DailyDiaryWorkspace-ASSPS-STUDIO8-INDEPENDENT-COLORS-20261104.css').read_text()
(OUT/cn).write_text(original_css.rstrip()+"\n"+css.rstrip()+"\n")
manifest=json.loads((OUT/'baseline.json').read_text())
manifest.update({'new_sha256':hashlib.sha256(s.encode()).hexdigest(),'module':jn,'stylesheet':cn,'production_status':'STAGED','data_migrations':False})
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
print('A195_READY',len(s),len(original_css)+len(css))
