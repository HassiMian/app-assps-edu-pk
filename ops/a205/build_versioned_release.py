"""Construct isolated A205 CSS-only hotfix on existing A204 premium release."""
from pathlib import Path
from hashlib import sha256
import os

repo=Path('/root/workspace/assps-a205-premium-line-20261105')
source=Path('/var/www/assps-releases/assps-diary-a204-premium-footer-20261105')
dest=Path('/var/www/assps-releases/assps-diary-a205-grid-visibility-20261105')
patch=(repo/'ops/a205/diary-grid-optical-visibility.css').read_text()
old_asset='DailyDiaryWorkspace-ASSPS-A204-PREMIUM-FOOTER-20261105.js'
new_asset='DailyDiaryWorkspace-ASSPS-A205-GRID-VISIBILITY-20261105.js'
new_style='DailyDiaryWorkspace-ASSPS-A205-GRID-VISIBILITY-20261105.css'
old=source/'assets'/old_asset
expected_sha='91e996eb02f4570cb508b21c5fb5c44b34612dfc5984434e72ed65168fc3d437'
assert sha256(old.read_bytes()).hexdigest()==expected_sha
assert source.is_dir() and not dest.exists()
s=old.read_text()
marker='</style>\n</head>\n<body>'
assert s.count(marker)==1
assert 'A205 — optical print consistency' not in s
assert '</style>' not in patch and chr(36)+chr(123) not in patch and chr(96) not in patch
s=s.replace(marker,'\n'+patch+'\n'+marker,1)
assert s.count('window.print()')==0
assert s.count('dd-rows>footer.dd-table-footer')>=1
assert os.system('cp -al '+str(source)+' '+str(dest))==0
(dest/'assets'/new_asset).write_text(s)
(dest/'assets'/new_style).write_text(patch)
index=dest/'index.html'
html=index.read_text()
assert html.count(old_asset)==1 and html.count('</head>')==1
html=html.replace(old_asset,new_asset,1)
html=html.replace('</head>','<link rel="stylesheet" href="/assets/'+new_style+'" />\n</head>',1)
temp=dest/'index.html.a205tmp'
temp.write_text(html)
os.replace(temp,index)
print('A205_STAGING_RELEASE',dest)
print('A205_NEW_JS_SHA256',sha256((dest/'assets'/new_asset).read_bytes()).hexdigest())
print('A205_NEW_CSS_SHA256',sha256(patch.encode()).hexdigest())
print('ORIGINAL_A204_RELEASE_INTACT',old_asset in (source/'index.html').read_text())
