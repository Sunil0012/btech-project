#!/usr/bin/env python3
"""Extract AI questions from pages 130-154 and convert to TypeScript format"""

import pdfplumber
import re
import json

pdf_path = 'da.pdf'
output_folder = 'data'

# Extract text from pages 130-154 (0-indexed: 129-153)
ai_text = ""
with pdfplumber.open(pdf_path) as pdf:
    print(f"Extracting pages 130-154 from {pdf_path}...")
    for page_num in range(129, min(154, len(pdf.pages))):
        page = pdf.pages[page_num]
        text = page.extract_text()
        if text:
            ai_text += f"\n--- Page {page_num + 1} ---\n{text}"
            print(f"Extracted page {page_num + 1}")

print(f"\nTotal extracted text length: {len(ai_text)} characters")

# Parse questions
questions = []
lines = ai_text.split('\n')

current_question = None
question_counter = 0

for i, line in enumerate(lines):
    line = line.strip()
    
    # Look for numbered questions (pattern: "1. question text")
    match = re.match(r'^(\d+)\s*[.)\-]\s*(.+)', line)
    
    if match:
        # Save previous question if exists
        if current_question:
            questions.append(current_question)
        
        question_counter += 1
        num, text = match.groups()
        current_question = {
            'id': question_counter,
            'number': num,
            'text': text,
            'options': [],
            'page': 130  # Will be updated based on context
        }
    elif current_question and line:
        # Check if line is an option (A, B, C, D pattern)
        if re.match(r'^[A-D]\s*[.)\-]\s*', line):
            option_text = re.sub(r'^[A-D]\s*[.)\-]\s*', '', line)
            current_question['options'].append(option_text)
        else:
            # Add to question text
            if not current_question['options']:  # Only add to question if no options collected yet
                current_question['text'] += " " + line

# Add last question
if current_question:
    questions.append(current_question)

print(f"\nFound {len(questions)} questions")

# Create TypeScript format
ts_content = '''export const aiQuestions = [
'''

for idx, q in enumerate(questions):
    if q['text'] and len(q['options']) >= 2:  # Only include questions with options
        # Generate ID
        qid = f"ai-q{idx+1}"
        
        # Determine correct answer (default to 0, you may need to adjust)
        correct_answer = 0
        
        # Format options as array
        options_str = ','.join([f'"{opt.strip()}"' for opt in q['options'][:4]])  # Take first 4 options
        
        # Escape quotes in question text
        question_text = q['text'].strip().replace('"', '\\"')
        
        # Create TypeScript object
        ts_obj = f'''  {{
    id: "{qid}",
    subjectId: "data-science-ai",
    topicId: "artificial-intelligence",
    question: "{question_text}",
    options: [{options_str}],
    correctAnswer: 0,
    type: "mcq",
    explanation: "See explanation in original PDF",
    difficulty: "medium",
    marks: 1,
    negativeMarks: 0.33,
  }},
'''
        ts_content += ts_obj

ts_content += '''] as const;
'''

# Save to file
output_path = f"{output_folder}/ai.ts"
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f"\n✓ Created {output_path}")
print(f"Total questions in TypeScript format: {len([q for q in questions if q['text'] and len(q['options']) >= 2])}")

# Show sample
print("\n--- First 3 questions preview ---")
for q in questions[:3]:
    if q['text']:
        print(f"\nQ{q['number']}: {q['text'][:80]}")
        print(f"Options: {q['options']}")
