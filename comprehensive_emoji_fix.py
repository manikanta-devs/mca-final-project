#!/usr/bin/env python3
"""
Final comprehensive emoji fix for InterviewPage.jsx
Handles all mojibake patterns found at bytes level
"""

file_path = 'frontend/src/pages/InterviewPage.jsx'

with open(file_path, 'rb') as f:
    content = f.read()

print("Starting emoji fixes...")
count = 0

# We'll work with string replacements, not byte patterns
# since the mojibake is easier to handle as decoded strings

# Decode the content as UTF-8 with error replacement
content_str = content.decode('utf-8', errors='replace')

# Split into lines for processing
lines = content_str.split('\n')

# Line 472 area - Difficulty adjusted
for i in range(len(lines)):
    if 'Difficulty adjusted' in lines[i] and 'icon' in lines[i]:
        # Replace the icon value
        if 'ðŸ' in lines[i]:  # Has mojibake
            lines[i] = lines[i].replace("icon: 'ðŸ\"Š'", "icon: '📊'")
            print("✅ Fixed line with Difficulty adjusted (dashboard icon)")
            count += 1
            
# Line 561 area - Time's up
for i in range(len(lines)):
    if "Time's up" in lines[i] and 'icon' in lines[i]:
        if 'â' in lines[i] or 'ï' in lines[i]:  # Has mojibake
            lines[i] = lines[i].replace("icon: 'â±ï¸'", "icon: '⏱️'")
            print("✅ Fixed line with Time's up (timer icon)")
            count += 1

# Line 581 area - Retry mode  
for i in range(len(lines)):
    if 'Retry mode' in lines[i] and 'icon' in lines[i]:
        # Fix the em dash and icon
        if 'â€"' in lines[i]:  # Has em dash mojibake
            lines[i] = lines[i].replace('Retry mode â€"', 'Retry mode —')
            print("✅ Fixed em dash in retry mode")
            count += 1
        if '„' in lines[i]:  # Has left quote
            lines[i] = lines[i].replace("icon: '„'", "icon: '📄'")
            print("✅ Fixed icon in retry mode")
            count += 1

# Write back
fixed_content = '\n'.join(lines)
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(fixed_content)

print(f"\n✅ Total fixes applied: {count}")
print("\nVerifying final state...")

with open(file_path, 'r', encoding='utf-8') as f:
    final_lines = f.readlines()
    for line_num in [43, 44, 45, 472, 561, 581]:
        if line_num <= len(final_lines):
            line = final_lines[line_num-1].strip()
            if len(line) > 110:
                line = line[:110] + "..."
            if any(x in line for x in ['🟢', '🟡', '🔴', '📊', '⏱️', '📄', 'Retry', 'Time', 'Difficulty']):
                print(f"Line {line_num}: {line}")
