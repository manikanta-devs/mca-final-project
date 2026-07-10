with open(r"C:\Users\lucky\.gemini\antigravity\brain\5b8c46dc-d05b-40ba-8510-060f8c4820a7\.system_generated\steps\10510\content.md", "r", encoding="utf-8") as f:
    for line in f:
        if "skills/" in line or 'name":"' in line:
            if len(line) < 300:
                print(line.strip())
