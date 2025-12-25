import re
import time
import pathlib

def update_versions(root_dir: str = "."):
    """
    Searches for .html files and updates CSS and JS imports by adding 
    or updating the ?v=timestamp parameter to prevent caching.
    """
    new_version = int(time.time())
    root = pathlib.Path(root_dir)
    
    html_files = ["index.html", "mobile.html"]
    
    css_pattern = re.compile(r'href="(css/[a-zA-Z0-9_\-]+\.css)(?:\?v=[^"]*)?"')
    js_pattern = re.compile(r'src="(js/[a-zA-Z0-9_\-]+\.js)(?:\?v=[^"]*)?"')

    for filename in html_files:
        file_path = root / filename
        if not file_path.exists():
            continue
            
        content = file_path.read_text(encoding="utf-8")
        
        def replacement_css(match):
            file = match.group(1)
            return f'href="{file}?v={new_version}"'

        def replacement_js(match):
            file = match.group(1)
            return f'src="{file}?v={new_version}"'
            
        new_content, count_css = css_pattern.subn(replacement_css, content)
        new_content, count_js = js_pattern.subn(replacement_js, new_content)
        
        if count_css > 0 or count_js > 0:
            file_path.write_text(new_content, encoding="utf-8")
            print(f"✅ {filename}: Updated {count_css} CSS and {count_js} JS links to v={new_version}")
        else:
            print(f"ℹ️  {filename}: No local links found to update.")

if __name__ == "__main__":
    update_versions()
