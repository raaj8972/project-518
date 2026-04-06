import re
import glob

files = glob.glob("src/components/RicoFamily/*.tsx")

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()

    # We look for the exact aria-hidden string we injected to anchor
    # "<img src={...} aria-hidden=\"true\" className=\"absolute inset-0..."
    
    # But for CommitteeHeadCard etc. we might need to handle it precisely
    def inject_spotlight(match):
        img_line = match.group(0)
        spotlight = '<div className="dossier-spotlight text-cyan-400 bg-gradient-to-b from-cyan-400/20 via-transparent to-transparent pointer-events-none z-20"></div>\n'
        # Add spaces for indentation
        spaces = match.group(1)
        return spaces + spotlight + spaces + img_line.lstrip()

    # Match the blurred image line:
    new_content = re.sub(r'( +)<img[^>]+aria-hidden="true"[^>]+>', inject_spotlight, content)

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Added spotlight to {filepath}")

