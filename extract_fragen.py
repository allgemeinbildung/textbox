import os
import re

def extract_sections_from_file(file_path):
    # Read the entire file
    with open(file_path, "r", encoding="utf-8") as file:
        content = file.read()
    
    # Regex to find all occurrences starting after the marker and including the closing tag.
    # The pattern captures everything until and including </iframe>.
    pattern = r'> \[!question\]- ⤵ Auftrag:(.*?</iframe>)'
    sections = re.findall(pattern, content, flags=re.DOTALL)
    return sections

def process_folder(root_folder):
    # Walk through all subdirectories of the provided folder.
    for current_path, subdirs, files in os.walk(root_folder):
        if "2 Lehrmittel.md" in files:
            source_file = os.path.join(current_path, "2 Lehrmittel.md")
            print(f"Processing: {source_file}")
            sections = extract_sections_from_file(source_file)
            
            if sections:
                # Replace the original marker with "subId:" at the start of each extracted section.
                # Join sections with a couple of newlines between each.
                output_text = "\n\n".join("subId:" + section.strip() for section in sections)
                
                # Save the output in the same folder as the source file.
                output_file = os.path.join(current_path, "2 Lehrmittel Fragen.md")
                with open(output_file, "w", encoding="utf-8") as file:
                    file.write(output_text)
                print(f"Extracted content saved to: {output_file}")
            else:
                print(f"No matching sections found in {source_file}")

if __name__ == "__main__":
    # Ask user for the folder path
    folder_path = input("Enter the path to the folder: ").strip()
    
    if not os.path.isdir(folder_path):
        print("The specified path is not a valid directory.")
    else:
        process_folder(folder_path)
