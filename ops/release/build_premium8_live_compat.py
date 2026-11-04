
from pathlib import Path
import hashlib,json,re
B=chr(96)
D=chr(36)+chr(123)
SRC=Path('/root/workspace/assps-diary-premium8-20261104/al-siddique-frontend/src/Modules/Paper-Generator/DailyDiaryWorkspace.jsx')
LIVE=Path('/var/www/assps-releases/attendance-prenine-20261103-v1/assets/DailyDiaryWorkspace-Crc_h4AZ.js')
OUT=Path('/root/workspace/assps-diary-premium8-20261104/ops/release/diary-premium8')
OUT.mkdir(parents=True,exist_ok=True)
js=LIVE.read_text()
checksum=hashlib.sha256(js.encode()).hexdigest()
assert checksum=='0a2bda12ebe44d264e5a47015396830c7ea648454c6241215da8fe85f8e93750',checksum
regex=r"id: (2[1-8]), name: '([^']+)', premium: true, accent: '([^']+)', soft: '([^']+)', line: '([^']+)', ink: '([^']+)', foil: '([^']+)'"
items=re.findall(regex,SRC.read_text())
assert len(items)==8,len(items)
objs=[]
for id,name,accent,soft,line,ink,foil in items:
    objs.append('{id:'+id+',name:'+json.dumps(name,ensure_ascii=False)+',premium:!0,accent:'+json.dumps(accent)+',soft:'+json.dumps(soft)+',line:'+json.dumps(line)+',ink:'+json.dumps(ink)+',foil:'+json.dumps(foil)+'}')
def change(old,new,reason):
    global js
    assert js.count(old)==1,(reason,js.count(old))
    js=js.replace(old,new,1)
# Add 8 Studio editions as first choice in the selector; preserve all legacy IDs.
studio_regex=r"id: (3[1-8]), name: '([^']+)', premium: true, studio: true, edition: '([^']+)', accent: '([^']+)', soft: '([^']+)', line: '([^']+)', ink: '([^']+)', foil: '([^']+)'"
studio_items=re.findall(studio_regex,SRC.read_text())
assert len(studio_items)==8,len(studio_items)
studio_objs=[]
for id,name,edition,accent,soft,line,ink,foil in studio_items:
    studio_objs.append('{id:'+id+',name:'+json.dumps(name,ensure_ascii=False)+',premium:!0,studio:!0,edition:'+json.dumps(edition)+',accent:'+json.dumps(accent)+',soft:'+json.dumps(soft)+',line:'+json.dumps(line)+',ink:'+json.dumps(ink)+',foil:'+json.dumps(foil)+'}')
# Eight independent colors, reused by every Studio design (8 x 8 combinations).
color_re=r"id: '([a-z]+)', name: '([^']+)', accent: '([^']+)', soft: '([^']+)', line: '([^']+)', ink: '([^']+)', foil: '([^']+)'"
colors=re.findall(color_re,SRC.read_text())
assert len(colors)==8,len(colors)
color_objs=[]
for id,name,accent,soft,line,ink,foil in colors:
    color_objs.append('{id:'+json.dumps(id)+',name:'+json.dumps(name)+',accent:'+json.dumps(accent)+',soft:'+json.dumps(soft)+',line:'+json.dumps(line)+',ink:'+json.dumps(ink)+',foil:'+json.dumps(foil)+'}')
change('ink:'+B+'#3b2c12'+B+'}],Re=', 'ink:'+B+'#3b2c12'+B+'},'+','.join(objs)+'],ASSPS_STUDIO_COLORS=['+','.join(color_objs)+'],Re=', 'palette array and independent studio colors')
change('Le=[{id:1,', 'Le=['+','.join(studio_objs)+',{id:1,', 'studio palettes first')
change('className:'+B+'dd-card '+D+'v?', 'className:'+B+'dd-card '+D+'n.premium?'+B+'dd-card-premium'+B+':'+B+B+'} '+D+'v?', 'premium class')
old='className:'+B+'dd-card '+D+'n.premium?'+B+'dd-card-premium'+B+':'+B+B+'} '+D+'v?'
new='className:'+B+'dd-card '+D+'n.premium?'+B+'dd-card-premium'+B+':'+B+B+'} '+D+'n.studio?'+B+'dd-card-studio dd-edition-'+D+'n.edition}'+B+':'+B+B+'} '+D+'v?'
change(old,new,'studio architectural classes')
change('"--ink":n.ink,"--scale":g.scale','"--ink":n.ink,"--foil":n.foil||n.accent,"--scale":g.scale','foil style')
old=B+'Student Name'+B+'})]}),(0,F.jsxs)('+B+'div'+B+',{className:'+B+'dd-student-field dd-student-roll-field'+B
new=B+'Student Name'+B+'})]}),n.premium?(0,F.jsxs)('+B+'div'+B+',{className:'+B+'dd-student-field dd-student-class-field'+B+',children:['
new+='(0,F.jsx)('+B+'span'+B+',{className:'+B+'dd-student-lbl'+B+',children:'+B+'CLASS:'+B+'}),'
new+='(0,F.jsxs)('+B+'strong'+B+',{className:'+B+'dd-student-val'+B+',children:[a,se?'+B+' · '+D+'se}'+B+':'+B+B+']})]}):null,'
new+='(0,F.jsxs)('+B+'div'+B+',{className:'+B+'dd-student-field dd-student-roll-field'+B
change(old,new,'class details')
# The date has moved to the upper-right calendar, so no date column is injected.

# Calendar is the third item in the existing top header row (logo, school brand, calendar).
old='children:'+B+'Official Student Academic Record'+B+'})]})]})]}),(0,F.jsxs)('+B+'div'+B+',{className:'+B+'dd-head-meta-row'+B
cal='(0,F.jsxs)('+B+'div'+B+',{className:'+B+'dd-premium-calendar'+B+',role:'+B+'group'+B+',"aria-label":'+B+'Diary date '+D+'He(s)}'+B+',children:['
cal+='(0,F.jsx)('+B+'span'+B+',{className:'+B+'dd-premium-calendar-month'+B+',children:He(s).split('+B+' '+B+').slice(1).join('+B+' '+B+').toUpperCase()}),'
cal+='(0,F.jsx)('+B+'strong'+B+',{className:'+B+'dd-premium-calendar-day'+B+',children:He(s).split('+B+' '+B+')[0]}),'
cal+='(0,F.jsx)('+B+'span'+B+',{className:'+B+'dd-premium-calendar-weekday'+B+',children:new Date(String(s).slice(0,10)+'+B+'T12:00:00'+B+').toLocaleDateString('+B+'en-GB'+B+',{weekday:'+B+'short'+B+'}).toUpperCase()})]})'
new='children:'+B+'Official Student Academic Record'+B+'})]})]}),n.premium?'+cal+':null]}),(0,F.jsxs)('+B+'div'+B+',{className:'+B+'dd-head-meta-row'+B
change(old,new,'premium calendar in school header')
# Studio color is stored separately from structure ID.
change('[Me,I]=(0,b.useState)(Le.some(e=>e.id===Number(w.paletteId))?Number(w.paletteId):3),[Ze,Qe]=',
       '[Me,I]=(0,b.useState)(Le.some(e=>e.id===Number(w.paletteId))?Number(w.paletteId):31),[__studioColor,__setStudioColor]=(0,b.useState)(ASSPS_STUDIO_COLORS.some(e=>e.id===w.studioColorId)?w.studioColorId:'+B+'jade'+B+'),[Ze,Qe]=',
       'independent studio color state')
change('cn=Le.find(e=>e.id===Me)||Le[0],ln=',
       'cn=((p)=>{const c=ASSPS_STUDIO_COLORS.find(x=>x.id===__studioColor)||ASSPS_STUDIO_COLORS[0];return p.studio?{...p,...c,id:p.id,name:p.name,studio:!0,premium:!0,edition:p.edition}:p})(Le.find(e=>e.id===Me)||Le[0]),ln=',
       'computed palette for selected design and selected color')
change('paletteId:Me,footerText:Ze','paletteId:Me,studioColorId:__studioColor,footerText:Ze','draft persistence')
change('[E,O,k,A,M,P,Me,Ze,','[E,O,k,A,M,P,Me,__studioColor,Ze,','draft effect dependency')
change('section:k,paletteId:Me,mode:', 'section:k,paletteId:Me,studioColorId:__studioColor,mode:', 'server style_settings persistence')
change('}typeof e.footer_text=='+B+'string'+B+'&&Qe(e.footer_text)',
       '}__setStudioColor(ASSPS_STUDIO_COLORS.some(t=>t.id===(e.style_settings&&e.style_settings.studioColorId))?e.style_settings.studioColorId:'+B+'jade'+B+'),typeof e.footer_text=='+B+'string'+B+'&&Qe(e.footer_text)',
       'restore selected studio color on saved diary reopen')


# Rework the actual production selector into two independent controls.
# Read the exact known label boundary instead of guessing transpiler-generated offsets.
begin='(0,F.jsxs)('+B+'label'+B+',{children:[(0,F.jsx)('+B+'span'+B+',{children:'+B+'Color Theme Palette'+B+'})'
end='(0,F.jsxs)('+B+'label'+B+',{children:[(0,F.jsx)('+B+'span'+B+',{children:'+B+'Footer note'+B+'})'
assert js.count(begin)==1,('selector begin',js.count(begin))
assert js.count(end)==1,('selector end',js.count(end))
from_idx=js.index(begin)
to_idx=js.index(end,from_idx)
assert 250 < to_idx-from_idx < 1800,to_idx-from_idx
ui_template = '''
(0,F.jsxs)(§div§,{className:§dd-studio-config§,§data-studio-configuration§:!0,children:[
(0,F.jsxs)(§div§,{className:§dd-studio-config-title§,children:[(0,F.jsx)(§strong§,{children:§01 — Choose Design Structure§}),(0,F.jsx)(§span§,{children:§8 independent print layouts§})]}),
(0,F.jsx)(§div§,{className:§dd-studio-designs§,role:§group§,§aria-label§:§Studio design structure§,children:Le.filter(x=>x.studio).map(x=>(0,F.jsxs)(§button§,{type:§button§,§data-studio-design§:x.id,§aria-pressed§:Me===x.id,className:Me===x.id?§dd-studio-design-choice active§:§dd-studio-design-choice§,onClick:()=>I(x.id),children:[
(0,F.jsxs)(§span§,{className:§dd-studio-mini dd-studio-mini-__DOLLAR_BRACE__x.edition}§,§aria-hidden§:!0,children:[(0,F.jsx)(§i§,{}),(0,F.jsx)(§i§,{}),(0,F.jsx)(§i§,{})]}),
(0,F.jsx)(§span§,{children:x.name.replace(/\\s*\\/ Studio$/,§§)})]},x.id))}),
(0,F.jsxs)(§div§,{className:§dd-studio-config-title§,children:[(0,F.jsx)(§strong§,{children:§02 — Choose Color Palette§}),(0,F.jsx)(§span§,{children:§8 light palettes for any design§})]}),
(0,F.jsx)(§div§,{className:§dd-studio-colors§,role:§group§,§aria-label§:§Studio color palette§,children:ASSPS_STUDIO_COLORS.map(x=>(0,F.jsxs)(§button§,{type:§button§,§data-studio-color§:x.id,§aria-pressed§:__studioColor===x.id,disabled:!cn.studio,className:__studioColor===x.id&&cn.studio?§dd-studio-color-choice active§:§dd-studio-color-choice§,title:x.name,onClick:()=>__setStudioColor(x.id),children:[
(0,F.jsx)(§span§,{className:§dd-studio-color-swatch§,style:{§--swatch-accent§:x.accent,§--swatch-soft§:x.soft,§--swatch-line§:x.line}}),
(0,F.jsx)(§span§,{children:x.name})]},x.id))}),
(0,F.jsxs)(§details§,{className:§dd-classic-themes§,children:[
(0,F.jsx)(§summary§,{children:§Existing designs (preserved for saved diaries)§}),
(0,F.jsx)(§div§,{className:§dd-palettes§,children:Le.filter(x=>!x.studio).map(x=>(0,F.jsxs)(§button§,{type:§button§,className:Me===x.id?§active§:§§,onClick:()=>I(x.id),children:[(0,F.jsx)(§i§,{style:{background:x.accent}}),(0,F.jsx)(§span§,{children:x.name})]},x.id))})
]})
]})
'''
ui=ui_template.strip().replace('§',B).replace('__DOLLAR_BRACE__',D)
# JS object keys with hyphens must be quoted, never backtick-literals.
ui=re.sub(re.escape(B)+r'(data-[a-z-]+|aria-[a-z-]+|--swatch-[a-z-]+)'+re.escape(B)+r'(?=:)',lambda m:json.dumps(m.group(1)),ui)
js=js[:from_idx]+ui+','+js[to_idx:]
pcss=Path('/root/workspace/assps-diary-premium8-20261104/ops/release/premium8-print.css').read_text()
needle='  </style>\n</head>\n<body>\n  <div class="dd-page-stage">'
change(needle,pcss+'\n'+needle,'isolated iframe premium print styles')
styles=SRC.with_suffix('.css').read_text()
marker='/* ASSPS Premium Daily Diary — eight opt-in editorial, low-toner templates.'
assert styles.count(marker)==1
styles=styles[styles.index(marker):]
assert len(styles)>3000
jn='DailyDiaryWorkspace-ASSPS-STUDIO8-INDEPENDENT-COLORS-20261104.js'
cn='DailyDiaryWorkspace-ASSPS-STUDIO8-INDEPENDENT-COLORS-20261104.css'
(OUT/jn).write_text(js)
(OUT/cn).write_text(styles)
manifest={'baseline_sha256':checksum,'new_sha256':hashlib.sha256(js.encode()).hexdigest(),'source_bundle':LIVE.name,'js':jn,'css':cn,'ids':[int(x[0]) for x in items+studio_items],'theme_names':[x[1] for x in items+studio_items],'production_status':'NOT_DEPLOYED','existing_ids_unchanged':[1,2,3,4],'color_ids':[x[0] for x in colors],'combinations':64}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
print(json.dumps(manifest,ensure_ascii=False))

