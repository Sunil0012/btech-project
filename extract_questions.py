#!/usr/bin/env python3
"""Extract questions from da.pdf and save to data folder"""

import pdfplumber
import os
import json
import re
from collections import defaultdict

pdf_path = r'da.pdf'
data_folder = 'data'
os.makedirs(data_folder, exist_ok=True)

# Pattern to identify questions - numbered format like "1. Question text"
question_pattern = re.compile(r'^\s*(\d+)\s*[.)\-]\s*(.+?)(?=^\s*\d+\s*[.)\-]|$)', 
                              re.MULTILINE | re.DOTALL)

all_questions = []
questions_by_topic = defaultdict(list)
current_topic = "General"
total_processed = 0

try:
    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        print(f"Processing {total_pages} pages from {pdf_path}...")
        
        full_text = ""
        
        # Extract text from all pages
        for page_num, page in enumerate(pdf.pages):
            try:
                text = page.extract_text() or ""
                full_text += "\n" + text
                
                # Update progress every 50 pages
                if (page_num + 1) % 50 == 0:
                    print(f"Extracted {page_num + 1}/{total_pages} pages...")
                    
            except Exception as e:
                print(f"Warning: Error on page {page_num + 1}: {str(e)[:50]}")
                continue
        
        # Extract questions from the full text
        print("\nParsing questions from extracted text...")
        
        # Split by topic headers (look for patterns like "1.1", "2.1", etc.)
        topic_pattern = re.compile(r'^(\d+\.\d+\s+[^\n]+)', re.MULTILINE)
        
        lines = full_text.split('\n')
        current_topic_text = ""
        
        for line in lines:
            if re.match(r'^\d+\.\d+\s+', line):
                current_topic = line.strip()
            
            # Look for numbered questions
            if re.match(r'^\s*\d+\s*[.)\-]\s*', line):
                match = re.match(r'^\s*(\d+)\s*[.)\-]\s*(.+)', line)
                if match:
                    question_num, question_text = match.groups()
                    q_obj = {
                        'number': question_num,
                        'topic': current_topic,
                        'text': question_text.strip()
                    }
                    all_questions.append(q_obj)
                    questions_by_topic[current_topic].append(q_obj)
        
        print(f"\nTotal questions found: {len(all_questions)}")
        print(f"Unique topics: {len(questions_by_topic)}")
        
        # Save all questions to JSON
        json_path = os.path.join(data_folder, 'questions.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(all_questions, f, indent=2, ensure_ascii=False)
        print(f"✓ Saved to {json_path}")
        
        # Save to CSV
        csv_path = os.path.join(data_folder, 'questions.csv')
        with open(csv_path, 'w', encoding='utf-8') as f:
            f.write("Number,Topic,Question\n")
            for q in all_questions:
                q_text = q['text'].replace('"', '""')
                f.write(f'{q["number"]},"{q["topic"]}","{q_text}"\n')
        print(f"✓ Saved to {csv_path}")
        
        # Save to text file
        txt_path = os.path.join(data_folder, 'questions.txt')
        with open(txt_path, 'w', encoding='utf-8') as f:
            for q in all_questions:
                f.write(f"Q{q['number']} ({q['topic']})\n{q['text']}\n\n")
        print(f"✓ Saved to {txt_path}")
        
        # Save by topic
        topics_path = os.path.join(data_folder, 'questions_by_topic.json')
        with open(topics_path, 'w', encoding='utf-8') as f:
            json.dump(dict(questions_by_topic), f, indent=2, ensure_ascii=False)
        print(f"✓ Saved by topic to {topics_path}")
        
        # Show summary
        print("\n--- Summary ---")
        print(f"Total questions: {len(all_questions)}")
        print(f"First 5 questions:")
        for q in all_questions[:5]:
            print(f"  Q{q['number']}: {q['text'][:70]}...")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
