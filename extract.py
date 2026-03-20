import re, base64

with open('landing_page_simplified_layout/code.html', 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'data:image/png;base64,([^"\'\>]+)', content)
if match:
    image_data = base64.b64decode(match.group(1))
    with open('app/logo.png', 'wb') as f:
        f.write(image_data)
    print("Success")
else:
    print("Match not found")
