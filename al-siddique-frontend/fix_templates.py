import re

with open('src/Modules/Paper-Generator/PTSPaperGenerator.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix Template signatures
code = re.sub(r'(function \w+Template\(\{.*?baseFontSz=11, )', r'\g<1>headFontSz=11, ', code)

# We need to replace `fs` with `hFs` in the header section of each template.
# Let's find each template's `const qFs = 11 * fs` and insert `const hFs = (half ? 0.82 : 1) * (headFontSz / 11)`
code = code.replace('const qFs = 11 * fs', 'const hFs = (half ? 0.82 : 1) * (headFontSz / 11)\n  const qFs = 11 * fs')

# Now replace fs with hFs in specific header lines for ClassicTemplate
code = code.replace('fontSize:`${(half?22:28)*fs}px`', 'fontSize:`${(half?22:28)*hFs}px`')
code = code.replace('fontSize:`${11*fs}px`, color:\'#444\'', 'fontSize:`${11*hFs}px`, color:\'#444\'')

# For ModernTemplate
code = code.replace('fontSize:`${(half?24:32)*fs}px`', 'fontSize:`${(half?24:32)*hFs}px`')

# For EliteTemplate
code = code.replace('fontSize:`${(half?20:26)*fs}px`', 'fontSize:`${(half?20:26)*hFs}px`')
code = code.replace('fontSize:`${9*fs}px`, letterSpacing:1', 'fontSize:`${9*hFs}px`, letterSpacing:1')

# For EmeraldTemplate
code = code.replace('fontSize:`${(half?24:34)*fs}px`', 'fontSize:`${(half?24:34)*hFs}px`')
code = code.replace('fontSize:`${10*fs}px`, color:\'#fff\'', 'fontSize:`${10*hFs}px`, color:\'#fff\'')

with open('src/Modules/Paper-Generator/PTSPaperGenerator.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Done!')
