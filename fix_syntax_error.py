import re

with open('fix_all_schema.sql', 'r') as f:
    lines = f.readlines()

# Around line 2086 is:
# END IF;
# v_pass_token := 'VIP-' || upper(substring(md5(random()::text || NOW()::text) from 1 for 12));
# INSERT INTO public.entry_passes (pass_token, pass_type, participant_name, notes, created_by) VALUES (v_pass_token, 'vip', p_name, p_notes, auth.uid()) RETURNING id INTO v_pass_id;
# RETURN json_build_object('success', true, 'pass_id', v_pass_id, 'pass_token', v_pass_token);
# END;
# $$;

# WAIT, the regex hollowed out the MIDDLE of the function, leaving the END of the function dangling!
# Let's just comment out those dangling lines. We know the exact text from the error.

dangling_text = """-- Council Check
    IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
      SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
      IF v_settings.council_password_hash IS NOT NULL AND v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
      END IF;
    END IF;
    
    IF NOT v_is_authorized THEN
      RAISE EXCEPTION 'Not authorized to create VIP passes';
    END IF;
    
    v_pass_token := 'VIP-' || upper(substring(md5(random()::text || NOW()::text) from 1 for 12));
    
    INSERT INTO public.entry_passes (pass_token, pass_type, participant_name, notes, created_by) 
    VALUES (v_pass_token, 'vip', p_name, p_notes, auth.uid()) 
    RETURNING id INTO v_pass_id;
    
    RETURN json_build_object('success', true, 'pass_id', v_pass_id, 'pass_token', v_pass_token);
END;
$$;"""

# Easiest way is to just find the dangling $$; right before `-- Add faces_indexed column` and hollow it out.
import io
with open('fix_all_schema.sql', 'r') as f:
    text = f.read()

# The error gives us the exact text. Let's just do a regex replace to comment out everything from `-- Council Check` to `$$;` that precedes the `-- Add faces_indexed column`
# Let's find the exact block around the error.
text = re.sub(r'(?si)-- Council Check.*?END;\n\$\$;', '/* Removed orphaned VIP function body */', text)

with open('fix_all_schema.sql', 'w') as f:
    f.write(text)

print("Fixed the orphaned $$ syntax error.")
