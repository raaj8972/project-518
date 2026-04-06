import re
import glob
import os

files = glob.glob("src/components/RicoFamily/*.tsx") + ["src/pages/RicoFamily.tsx"]

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()

    original = content
    
    # regex for <img ... className="... object-cover ..." />
    # We will find all <img> tags. If it has object-cover, we replace it with two tags.
    def replacer(match):
        full_tag = match.group(0)
        
        # Don't touch if it already has blur / object-contain logic (so it's idempotent)
        if "aria-hidden=\"true\"" in full_tag or "object-contain" in full_tag:
            return full_tag
            
        if "object-cover" not in full_tag:
            return full_tag

        # extract src="" or src={...}
        src_match = re.search(r'src=({[^}]+}|"[^"]+")', full_tag)
        if not src_match:
            return full_tag
        src = src_match.group(1)
        
        # If it has "resize=cover", strip it out to avoid supabase cropping on backend
        clean_src = src.replace("?width=400&resize=cover", "?width=400")
        
        if clean_src != src:
            full_tag = full_tag.replace(src, clean_src)
            src = clean_src
            
        # extract alt
        alt_match = re.search(r'alt=({[^}]+}|"[^"]+")', full_tag)
        alt = alt_match.group(0) if alt_match else 'alt="Team member"'
        
        # We need the original class string to keep all hover effects and grayscales.
        cls_match = re.search(r'className=({`[^`]+`}|"[^"]+"|{[^}]+})', full_tag)
        classes = ""
        if cls_match:
            classes = cls_match.group(1)
            # Remove object-cover, object-top, object-center, w-full, h-full, absolute, inset-0
            for remove in ["object-cover", "object-top", "object-center", "w-full", "h-full", "absolute", "inset-0"]:
                classes = re.sub(r'\b' + remove + r'\b', '', classes)
            # clean up extra spaces
            classes = re.sub(r' +', ' ', classes).replace('"`', '`').replace('`"', '`')
            
            # strip out quotes/ticks from ends softly to rebuild it
            if classes.startswith('"') and classes.endswith('"'): classes = classes[1:-1]
            elif classes.startswith('`') and classes.endswith('`'): classes = classes[1:-1]
            elif classes.startswith('{"') and classes.endswith('"}'): classes = classes[2:-2]
            elif classes.startswith('{`') and classes.endswith('`}'): classes = classes[2:-2]

        blurred_bg = f'<img src={src} aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-40 blur-xl scale-125 saturate-150 pointer-events-none" />'
        
        # Reconstruct the foreground image
        fg_classes = f"absolute inset-0 w-full h-full object-contain object-bottom relative z-10 {classes}".strip()
        fg_img = f'<img loading="lazy" decoding="async" src={src} {alt} className="{fg_classes}" />'
        
        return blurred_bg + "\n" + (" " * 20) + fg_img

    new_content = re.sub(r'<img[^>]+>', replacer, content)
    
    # Explicitly catch the multiline img in TeamMemberCard and FounderCard
    # Regex <img ... /> across multiple lines:
    new_content = re.sub(r'<img[\s\S]*?/>', replacer, new_content)
    
    if new_content != original:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated images in {filepath}")

