#!/usr/bin/env python3
import os
import re
import sys
import urllib.parse

def process_file(filepath):
    # Get the assignmentId from the parent folder (remove numbers)
    folder = os.path.basename(os.path.dirname(filepath))
    assignmentId = re.sub(r'\d+', '', folder).strip()
    
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    new_lines = []
    reflex_blocks = []  # Will collect reflexionsfrage blocks for appending later.
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("> [!question]- ⤵ Auftrag:"):
            # Start processing a question block.
            question_block = []
            # Capture the header line and subId (remove any **)
            header_line = line
            m = re.match(r"> \[!question\]- ⤵ Auftrag:\s*(.+)", header_line)
            if m:
                subId = m.group(1).strip().replace("**", "")
            else:
                subId = ""
            question_block.append(header_line)
            i += 1
            # Expect the abstract line next.
            if i < len(lines) and lines[i].lstrip().startswith(">> [!abstract]"):
                abstract_line = lines[i]
                question_block.append(abstract_line)
                i += 1

            # Initialize variables for comprehension and reflexion.
            comp_question1 = ""
            comp_question2 = ""
            reflex_header = ""
            reflex_question = ""
            reflex_iframe = ""
            
            # Process subsequent lines belonging to this question block.
            # We assume the comprehension block (if present) starts with "#### Verständnisfragen"
            while i < len(lines):
                cur_line = lines[i]
                stripped = cur_line.lstrip()
                # If we hit another question block, break.
                if cur_line.startswith("> [!question]- ⤵ Auftrag:"):
                    break
                # Process comprehension questions.
                if stripped.startswith("> #### Verständnisfragen"):
                    i += 1  # skip header
                    # Expect two lines with questions.
                    if i < len(lines) and re.match(r">\s*1\.", lines[i]):
                        comp_question1 = re.sub(r"^>\s*1\.\s*", "", lines[i]).strip().replace("**", "")
                        i += 1
                    if i < len(lines) and re.match(r">\s*2\.", lines[i]):
                        comp_question2 = re.sub(r"^>\s*2\.\s*", "", lines[i]).strip().replace("**", "")
                        i += 1
                    continue
                # Process reflexionsfrage block.
                elif stripped.startswith("> #### Reflexionsfrage"):
                    reflex_header = cur_line  # capture header
                    i += 1
                    if i < len(lines) and lines[i].lstrip().startswith(">"):
                        reflex_question = lines[i]
                        i += 1
                    if i < len(lines) and "<iframe" in lines[i]:
                        reflex_iframe = lines[i]
                        i += 1
                    # Once we capture reflexionsfrage, break out of this block.
                    break
                else:
                    # If the current line does not belong to comprehension or reflexion, break.
                    break

            # Build the new iframe URL.
            assignmentId_enc = urllib.parse.quote(assignmentId)
            subId_enc = urllib.parse.quote(subId)
            q1_enc = urllib.parse.quote(comp_question1)
            q2_enc = urllib.parse.quote(comp_question2)
            new_url = (f"https://allgemeinbildung.github.io/textbox/answers.html?"
                       f"assignmentId={assignmentId_enc}&subIds={subId_enc}"
                       f"&question1={q1_enc}&question2={q2_enc}")
            new_iframe_line = (f'><iframe src="{new_url}" style="border:0px #ffffff none;" '
                               f'name="myiFrame" scrolling="no" frameborder="1" marginheight="0px" '
                               f'marginwidth="0px" height="500px" width="100%" allowfullscreen></iframe>\n')
            
            # Insert the updated iframe right after the abstract.
            question_block.append(new_iframe_line)
            # Append the modified question block to new_lines.
            new_lines.extend(question_block)
            
            # If a reflexionsfrage block was captured, build it for later appending.
            if reflex_header:
                # We rebuild the reflex block using the same updated iframe.
                reflex_block = []
                reflex_block.append(reflex_header)
                if reflex_question:
                    reflex_block.append(reflex_question)
                reflex_block.append(new_iframe_line)
                # Join the reflex block lines into one block.
                reflex_blocks.append("".join(reflex_block))
            
        else:
            # Any line outside question blocks is copied as is.
            new_lines.append(line)
            i += 1

    # Append all captured reflexionsfrage blocks at the end.
    if reflex_blocks:
        new_lines.append("\n<!-- Appended Reflexionsfragen -->\n")
        for block in reflex_blocks:
            new_lines.append(block)
    
    # Write back the modified file.
    with open(filepath, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
    print(f"Processed file: {filepath}")

def main():
    root_folder = input("Please enter the root folder path: ").strip()
    if not root_folder:
        print("Error: No path provided")
        sys.exit(1)
    
    for dirpath, dirnames, filenames in os.walk(root_folder):
        for filename in filenames:
            if filename == "2 Lehrmittel.md":
                full_path = os.path.join(dirpath, filename)
                try:
                    process_file(full_path)
                except Exception as e:
                    print(f"Error processing {full_path}: {e}")

if __name__ == "__main__":
    main()
