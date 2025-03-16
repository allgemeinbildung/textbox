import os
import re

def process_fragen_file(file_path):
    """
    Reads a '2 Lehrmittel Fragen.md' file and splits its content into blocks.
    Each block is expected to start with "subId:" and contain:
      - an abstract (line starting with ">>[!abstract]")
      - two Verständnisfragen (lines beginning with ">1." and ">2.")
      - a Reflexionsfrage (after a line with ">#### Reflexionsfrage")
    Returns a list of dictionaries with keys: subid, abstract, question1, question2, reflex.
    """
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Split content into blocks (each starting with "subId:" at the beginning of a line)
    blocks = re.split(r'(?=^subId:)', content, flags=re.MULTILINE)
    parsed_blocks = []
    for block in blocks:
        if not block.startswith("subId:"):
            continue

        # Extract subId (everything on the line after "subId:")
        m = re.search(r'^subId:(.*)', block)
        if m:
            subid = m.group(1).strip()
        else:
            continue

        # Extract abstract line (assumes one line starting with >>[!abstract])
        m_abs = re.search(r'>>\[!abstract\](.*)', block)
        abstract = m_abs.group(1).strip() if m_abs else ""

        # Extract the two Verständnisfragen.
        # Look for lines starting with ">" followed by a number and a period.
        questions = re.findall(r'>\s*\d+\.\s*(.*)', block)
        q1 = questions[0].strip() if len(questions) > 0 else ""
        q2 = questions[1].strip() if len(questions) > 1 else ""
        # Remove any markdown bold markers
        q1 = q1.replace("**", "")
        q2 = q2.replace("**", "")

        # Extract the Reflexionsfrage.
        # Look for a line that starts with ">#### Reflexionsfrage" then the following line that is not an iframe.
        m_ref = re.search(r'>#### Reflexionsfrage\s*\n>(?!<iframe)(.*)', block)
        reflex = m_ref.group(1).strip() if m_ref else ""
        reflex = reflex.replace("**", "")

        parsed_blocks.append({
            "subid": subid,
            "abstract": abstract,
            "question1": q1,
            "question2": q2,
            "reflex": reflex
        })
    return parsed_blocks

def generate_new_content(file_path, blocks):
    """
    Given the parsed blocks and the original file_path, this function creates the new content.
    For each block, it creates:
      - A question header with the subId.
      - An abstract line (unchanged).
      - An iframe line built with parameters:
            assignmentId (the folder name),
            subIds (the subId),
            question1 and question2 (processed).
    At the end, a single Reflexionsfragen section is added, which aggregates all reflexions questions.
    """
    # The assignmentId is the name of the folder where the file is located.
    folder_name = os.path.basename(os.path.dirname(file_path))
    
    output_lines = []
    for block in blocks:
        output_lines.append(f"> [!question]- ⤵ Auftrag: {block['subid']}")
        output_lines.append(f">>[!abstract] {block['abstract']}")
        iframe_url = (
            f"https://allgemeinbildung.github.io/textbox/answers.html?"
            f"assignmentId={folder_name}&subIds={block['subid']}"
            f"&question1={block['question1']}&question2={block['question2']}"
        )
        output_lines.append(
            f">><iframe src=\"{iframe_url}\" style=\"border:0px #ffffff none;\" "
            f"name=\"myiFrame\" scrolling=\"no\" frameborder=\"1\" marginheight=\"0px\" "
            f"marginwidth=\"0px\" height=\"500px\" width=\"100%\" allowfullscreen></iframe>"
        )
        output_lines.append("")  # Blank line between blocks

    # Process Reflexionsfragen: aggregate all reflexions questions found.
    reflex_questions = [block["reflex"] for block in blocks if block["reflex"]]
    if reflex_questions:
        output_lines.append("#### Reflexionsfragen")
        # Build URL parameters dynamically: question1, question2, ... for each reflexionsfrage.
        reflex_params = []
        for i, reflex in enumerate(reflex_questions, start=1):
            reflex_params.append(f"question{i}={reflex}")
        reflex_params_str = "&".join(reflex_params)
        iframe_url_ref = (
            f"https://allgemeinbildung.github.io/textbox/answers.html?"
            f"assignmentId={folder_name}&subIds=Refexionsfrage&{reflex_params_str}"
        )
        output_lines.append(
            f"<iframe src=\"{iframe_url_ref}\" style=\"border:0px #ffffff none;\" "
            f"name=\"myiFrame\" scrolling=\"no\" frameborder=\"1\" marginheight=\"0px\" "
            f"marginwidth=\"0px\" height=\"500px\" width=\"100%\" allowfullscreen></iframe>"
        )
        output_lines.append("")

    return "\n".join(output_lines)

def process_folder(root_folder):
    """
    Recursively search for files named '2 Lehrmittel Fragen.md' in root_folder.
    For each file found, process its content to generate a new file with the new format.
    """
    for current_path, subdirs, files in os.walk(root_folder):
        if "2 Lehrmittel Fragen.md" in files:
            file_path = os.path.join(current_path, "2 Lehrmittel Fragen.md")
            print(f"Processing: {file_path}")
            blocks = process_fragen_file(file_path)
            new_content = generate_new_content(file_path, blocks)
            # Save the new content into a new file in the same folder
            output_file = os.path.join(current_path, "2 Lehrmittel Fragen new.md")
            with open(output_file, "w", encoding="utf-8") as out:
                out.write(new_content)
            print(f"New file created: {output_file}")

if __name__ == "__main__":
    folder_path = input("Enter the path to the folder: ").strip()
    if not os.path.isdir(folder_path):
        print("The specified path is not a valid directory.")
    else:
        process_folder(folder_path)
