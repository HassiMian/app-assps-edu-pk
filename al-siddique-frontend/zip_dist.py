import shutil
import os

os.chdir(r'C:\projects\My SAas\al-siddique-os\al-siddique-frontend')
shutil.make_archive('dist', 'zip', 'dist')
print("Zipped successfully with shutil")
