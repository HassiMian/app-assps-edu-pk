import re
f = open("scripts/attendance-browser-e2e.mjs", encoding="utf-8")
content = f.read()
f.close()
# Fix: add waitFor before every closeBtn/modalCloseX click
# Pattern: locator declared then immediately clicked without waitFor
content = re.sub(r"(const closeBtn = page\.locator\([^)]+\));(\n\s+)(await closeBtn\.click\(\))", r"\1;\2await closeBtn.waitFor({ state: \"visible\", timeout: 10000 });\2await page.waitForTimeout(500);\2await closeBtn.click()", content)
# Fix second closeBtn click (no declaration line before it)
content = re.sub(r"(\n(\s+)await closeBtn\.click\(\);\n(\s+)await modal\.waitFor\({ state: \"hidden\", timeout: 5000 \}\);\n(\s+)await page\.reload)", lambda m: "\n" + m.group(2) + "await closeBtn.waitFor({ state: \"visible\", timeout: 8000 });\n" + m.group(2) + "await page.waitForTimeout(300);\n" + m.group(2) + "await closeBtn.click();\n" + m.group(3) + "await modal.waitFor({ state: \"hidden\", timeout: 8000 });\n" + m.group(4) + "await page.reload", content)
# Fix modalCloseX clicks
content = re.sub(r"(const modalCloseX = page\.locator\([^)]+\));(\n\s+)(await modalCloseX\.click\(\))", r"\1;\2await modalCloseX.waitFor({ state: \"visible\", timeout: 8000 });\2\3", content)
# Fix bare modalCloseX.click lines
content = re.sub(r"(\n(\s+))(await modalCloseX\.click\(\);)(\n\s+await confirmDialog)", lambda m: m.group(1) + "await modalCloseX.waitFor({ state: \"visible\", timeout: 5000 });\n" + m.group(2) + m.group(3) + m.group(4), content)
open("scripts/attendance-browser-e2e.mjs", "w", encoding="utf-8").write(content)
print("Patches applied, lines:", content.count(chr(10)))
