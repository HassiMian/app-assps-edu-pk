
from pathlib import Path
import hashlib,re,json
R=Path('/root/workspace/assps-diary-a195-typography-20261104')
SRC=Path('/var/www/assps-releases/diary-studio8-independent-colors-20261104/assets/DailyDiaryWorkspace-ASSPS-STUDIO8-INDEPENDENT-COLORS-20261104.js')
OUT=R/'ops/a195/release';OUT.mkdir(parents=True,exist_ok=True)
s=SRC.read_text();base=hashlib.sha256(s.encode()).hexdigest()
B=chr(96);D=chr(36)+chr(123)
def change(a,b,tag,n=1):
 global s
 found=s.count(a)
 assert found==n,(tag,found,n)
 s=s.replace(a,b,n)
 print('PATCH_OK',tag)
fonts=[
 ('cambria','Cambria (Scholastic Serif)',"'Cambria', 'Georgia', 'Times New Roman', serif"),
 ('garamond','Garamond (Classic Editorial)',"'Garamond', 'Georgia', 'Times New Roman', serif"),
 ('arial','Arial (Clean Sans)',"Arial, 'Helvetica Neue', sans-serif"),
 ('verdana','Verdana (Readable Sans)',"Verdana, Geneva, sans-serif"),
 ('tahoma','Tahoma (Compact Sans)',"Tahoma, Geneva, sans-serif"),
]
extra=','.join('{id:'+B+x+B+',name:'+B+y+B+',family:'+B+z+B+'}' for x,y,z in fonts)
change('Re=[{id:'+B+'times'+B+',','Re=['+extra+',{id:'+B+'times'+B+',','font catalog')
change('[G,pt]=(0,b.useState)(Number(w.footerFontSize)||0),[mt,ht]=',
 '[G,pt]=(0,b.useState)(Number(w.footerFontSize)||0),[__a195TH,__setA195TH]=(0,b.useState)(Math.max(9,Math.min(20,Number(w.tableHeaderFontSize)||12))),[__a195Bold,__setA195Bold]=(0,b.useState)(w.tableHeaderBold??!0),[mt,ht]=','heading state')
change('globalSubjectBold:W,footerFontSize:G,editorFontSize:mt','globalSubjectBold:W,tableHeaderFontSize:__a195TH,tableHeaderBold:__a195Bold,footerFontSize:G,editorFontSize:mt','persistence',2)
change('[E,O,k,A,M,P,Me,__studioColor,Ze,$e,tt,R,z,it,B,V,gt,H,U,W,G,mt]',
 '[E,O,k,A,M,P,Me,__studioColor,Ze,$e,tt,R,z,it,B,V,gt,H,U,W,__a195TH,__a195Bold,G,mt]','draft dependencies')
change('rt(e.style_settings.fontStyleId),',
 'rt(e.style_settings.fontStyleId),e.style_settings!=null&&Number(e.style_settings.tableHeaderFontSize)>=9&&__setA195TH(Math.min(20,Number(e.style_settings.tableHeaderFontSize))),typeof(e.style_settings==null?void 0:e.style_settings.tableHeaderBold)==='+B+'boolean'+B+'&&__setA195Bold(e.style_settings.tableHeaderBold),',
 'server restore')
change('globalSubjectBold:oe=!1}){let g=',
 'globalSubjectBold:oe=!1,tableHeaderFontSize:__a195CardTH=12,tableHeaderBold:__a195CardBold=!0}){let g=',
 'card props signature')
change('globalSubjectBold:W},e.__generic',
 'globalSubjectBold:W,tableHeaderFontSize:__a195TH,tableHeaderBold:__a195Bold},e.__generic','props to preview cards')
vars=[
 '"--dd-font":de.family',
 '"--dd-urdu-font":m==='+B+'naskh'+B+'?'+B+"'Noto Naskh Arabic',Arial,sans-serif"+B+':'+B+"'ASSPS Jameel Noori','Jameel Noori Nastaleeq','Noto Nastaliq Urdu',serif"+B,
 '"--dd-header-factor":Math.max(.75,Math.min(1.35,(ee||100)/100))',
 '"--dd-preset-factor":h==='+B+'compact'+B+'?.78:h==='+B+'spacious'+B+'?1.28:1',
 '"--dd-school-base":(te>0?te:16)+'+B+'px'+B,
 '"--dd-logo-base":(ne>0?ne:14)+'+B+'mm'+B,
 '"--dd-row-height":p>0?'+B+'calc('+D+'p}mm * var(--scale))'+B+':'+B+'0px'+B,
 '"--dd-row-flex":p>0?'+B+'0 0 var(--dd-row-height)'+B+':'+B+'1 1 auto'+B,
 '"--dd-table-head-size":'+B+'clamp(8px, calc('+D+'__a195CardTH}px * var(--scale)), 20px)'+B,
 '"--dd-table-head-weight":__a195CardBold?850:650',
 '"--dd-footer-size":'+B+'clamp(7.5px, calc('+D+'re||9}px * var(--scale)), 16px)'+B,
]
change('"--header-scale":ue,fontFamily:de.family',
 '"--header-scale":ue,'+','.join(vars)+',fontFamily:de.family','shared card CSS vars')
change('onClick:()=>ot(e=>Math.min(22,(e||11)+1))',
 'onClick:()=>ot(e=>Math.min(24,(e||16)+1))','monotonic school plus',2)
change('onClick:()=>ot(e=>Math.max(9,(e||12)-1))',
 'onClick:()=>ot(e=>Math.max(9,(e||16)-1))','monotonic school minus',2)
# Row sizing starts from current Auto offsetHeight (unaffected by preview zoom transform).
row="(document.querySelector("+B+".dd-card-studio .dd-row"+B+")||document.querySelector("+B+".dd-card .dd-row"+B+"))"
scale="(qe(P).scale||1)"
base_mm="(e>0?e:("+row+"?.offsetHeight||0)/(96/25.4)/"+scale+"||12)"
change('onClick:()=>nt(e=>Math.min(26,(e||10)+2))',
 'onClick:()=>nt(e=>Math.min(26,Math.max(6,Math.ceil('+base_mm+')+2)))','row plus',2)
change('onClick:()=>nt(e=>Math.max(0,(e||12)-2))',
 'onClick:()=>nt(e=>Math.min(26,Math.max(6,Math.floor('+base_mm+')-2)))','row minus',2)
# Save intermediate asset; next phases add the controller UI and print style.
inter=OUT/'a195-work-in-progress.js'
inter.write_text(s)
(OUT/'baseline.json').write_text(json.dumps({'baseline_sha256':base,'source':str(SRC)},indent=2))
print('A195_BASE_PATCHED',len(s),base)
