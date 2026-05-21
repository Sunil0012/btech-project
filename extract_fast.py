#!/usr/bin/env python3
"""Fast question extraction from PDF"""

import pdfplumber
import os
import json
import re

pdf_path = 'da.pdf'
data_folder = 'data'
os.makedirs(data_folder, exist_ok=True)

all_questions = []

# Open PDF and extract efficiently
with pdfplumber.open(pdf_path) as pdf:
    print(f"Extracting from {len(pdf.pages)} pages...")
    
    for page_num in range(min(100, len(pdf.pages))):  # Start with first 100 pages
        page = pdf.pages[page_num]
        text = page.extract_text()
        
        if text:
            # Split into lines and find questions (lines starting with digits)
            for line in text.split('\n'):
                match = re.match(r'^(\d+)\s*[.)\-]\s*(.+)', line.strip())
                if match:
                    num, q_text = match.groups()
                    all_questions.append({
                        'id': len(all_questions) + 1,
                        'num': num,
                        'page': page_num + 1,
                        'text': q_text.strip()
                    })
        
        if (page_num + 1) % 20 == 0:
            print(f"Page {page_num + 1}: Found {len(all_questions)} questions so far")

print(f"\nTotal questions extracted: {len(all_questions)}")

# Save results
with open(os.path.join(data_folder, 'questions.json'), 'w', encoding='utf-8') as f:
    json.dump(all_questions, f, indent=2, ensure_ascii=False)

with open(os.path.join(data_folder, 'questions.txt'), 'w', encoding='utf-8') as f:
    for q in all_questions:
        f.write(f"Q{q['num']} (pg {q['page']}): {q['text']}\n")

print("✓ Saved to data/questions.json and data/questions.txt")

# Show sample
if all_questions:
    print(f"\nFirst 3 questions:")
    for q in all_questions[:3]:
        print(f"  {q['num']}. {q['text'][:80]}")
