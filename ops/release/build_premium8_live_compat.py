
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
change('ink:'+B+'#3b2c12'+B+'}],Re=', 'ink:'+B+'#3b2c12'+B+'},'+','.join(objs)+'],Re=', 'palette array')
change('className:'+B+'dd-card '+D+'v?', 'className:'+B+'dd-card '+D+'n.premium?'+B+'dd-card-premium'+B+':'+B+B+'} '+D+'v?', 'premium class')
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
change('Le.some(e=>e.id===Number(w.paletteId))?Number(w.paletteId):3)', 'Le.some(e=>e.id===Number(w.paletteId))?Number(w.paletteId):21)', 'new default')
pcss=Path('/root/workspace/assps-diary-premium8-20261104/ops/release/premium8-print.css').read_text()
needle='  </style>\n</head>\n<body>\n  <div class="dd-page-stage">'
change(needle,pcss+'\n'+needle,'isolated iframe premium print styles')
styles=SRC.with_suffix('.css').read_text()
marker='/* ASSPS Premium Daily Diary — eight opt-in editorial, low-toner templates.'
assert styles.count(marker)==1
styles=styles[styles.index(marker):]
assert len(styles)>3000
jn='DailyDiaryWorkspace-ASSPS-PREMIUM8-CALENDAR-V2-20261104.js'
cn='DailyDiaryWorkspace-ASSPS-PREMIUM8-CALENDAR-V2-20261104.css'
(OUT/jn).write_text(js)
(OUT/cn).write_text(styles)
manifest={'baseline_sha256':checksum,'new_sha256':hashlib.sha256(js.encode()).hexdigest(),'source_bundle':LIVE.name,'js':jn,'css':cn,'ids':[int(x[0]) for x in items],'theme_names':[x[1] for x in items],'production_status':'NOT_DEPLOYED','existing_ids_unchanged':[1,2,3,4]}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
print(json.dumps(manifest,ensure_ascii=False))

