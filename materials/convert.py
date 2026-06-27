#!/usr/bin/env python3
import os
import sys
import time
import traceback
from markitdown import MarkItDown

class LocalDocumentConverter:
    def __init__(self):
        self.markitdown = MarkItDown()
        
    def clean_markdown(self, text):
        """Post-process markdown to clean it up."""
        if not text:
            return ""
        # Remove null bytes which can corrupt text editors
        text = text.replace("\x00", "")
        # Remove excessive blank lines (more than two consecutive newlines)
        lines = text.splitlines()
        cleaned_lines = []
        consecutive_blanks = 0
        for line in lines:
            if not line.strip():
                consecutive_blanks += 1
            else:
                consecutive_blanks = 0
            if consecutive_blanks <= 2:
                cleaned_lines.append(line)
        return "\n".join(cleaned_lines)

    def convert_file(self, input_path, output_path):
        """Convert a single file using MarkItDown and post-process it."""
        try:
            start_time = time.time()
            result = self.markitdown.convert(input_path)
            raw_content = result.text_content
            
            # Post-process
            cleaned_content = self.clean_markdown(raw_content)
            
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(cleaned_content)
                
            elapsed = time.time() - start_time
            return {
                "success": True,
                "elapsed_seconds": elapsed,
                "raw_size": len(raw_content),
                "cleaned_size": len(cleaned_content),
                "error": None
            }
        except Exception as e:
            tb = traceback.format_exc()
            return {
                "success": False,
                "elapsed_seconds": time.time() - start_time,
                "raw_size": 0,
                "cleaned_size": 0,
                "error": f"{str(e)}\n{tb}"
            }

    def verify_output(self, input_path, output_path, stats):
        """Verify the quality and correctness of the output Markdown file."""
        if not stats["success"]:
            return {"valid": False, "reason": "Conversion failed"}
            
        if not os.path.exists(output_path):
            return {"valid": False, "reason": "Output file does not exist"}
            
        file_size = os.path.getsize(output_path)
        if file_size == 0:
            return {"valid": False, "reason": "Output file is empty"}
            
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                content = f.read()
                
            issues = []
            if "\0" in content:
                issues.append("Contains null bytes (possible binary corruptions)")
                
            # If the input file is large but output has almost no text, that's suspicious
            input_size = os.path.getsize(input_path)
            if input_size > 100000 and len(content) < 100:
                issues.append(f"Suspiciously small output ({len(content)} chars) for large input ({input_size} bytes)")
                
            if issues:
                return {"valid": True, "warnings": issues, "char_count": len(content)}
            else:
                return {"valid": True, "warnings": [], "char_count": len(content)}
        except Exception as e:
            return {"valid": False, "reason": f"Failed to read/verify output: {str(e)}"}

def main():
    workspace = "/sdcard/Download/study-master"
    print(f"Starting conversion in workspace: {workspace}")
    
    # Supported formats (excluding python files, md files, and directories)
    supported_extensions = (".pdf", ".docx", ".txt")
    
    # Find files
    files_to_convert = []
    for f in os.listdir(workspace):
        path = os.path.join(workspace, f)
        if os.path.isfile(path):
            ext = os.path.splitext(f)[1].lower()
            if ext in supported_extensions and f not in ("convert.py", "converter.py"):
                files_to_convert.append(path)
                
    # Sort files by size so smaller ones are converted first, giving quick progress feedback
    files_to_convert.sort(key=lambda p: os.path.getsize(p))
    
    print(f"Found {len(files_to_convert)} files to convert.")
    
    converter = LocalDocumentConverter()
    results = {}
    
    for i, input_path in enumerate(files_to_convert):
        filename = os.path.basename(input_path)
        base, ext = os.path.splitext(filename)
        output_filename = f"{base}.md"
        output_path = os.path.join(workspace, output_filename)
        
        input_size_mb = os.path.getsize(input_path) / (1024 * 1024)
        print(f"\n[{i+1}/{len(files_to_convert)}] Converting: {filename} ({input_size_mb:.2f} MB)...")
        sys.stdout.flush()
        
        stats = converter.convert_file(input_path, output_path)
        
        if stats["success"]:
            verification = converter.verify_output(input_path, output_path, stats)
            results[filename] = {
                "success": True,
                "elapsed": stats["elapsed_seconds"],
                "size_in": os.path.getsize(input_path),
                "size_out": os.path.getsize(output_path),
                "verification": verification
            }
            warn_str = f" (Warnings: {verification['warnings']})" if verification.get("warnings") else ""
            print(f"-> SUCCESS in {stats['elapsed_seconds']:.2f}s. Converted to {output_filename}.{warn_str}")
        else:
            results[filename] = {
                "success": False,
                "elapsed": stats["elapsed_seconds"],
                "size_in": os.path.getsize(input_path),
                "error": stats["error"]
            }
            print(f"-> FAILED in {stats['elapsed_seconds']:.2f}s. Error: {stats['error']}")
            
    # Print final summary
    print("\n" + "="*60)
    print("CONVERSION SUMMARY")
    print("="*60)
    success_count = sum(1 for r in results.values() if r["success"])
    fail_count = len(results) - success_count
    print(f"Total processed: {len(results)}")
    print(f"Success: {success_count}")
    print(f"Failed: {fail_count}")
    print("="*60)
    
    for fname, res in results.items():
        if res["success"]:
            v = res["verification"]
            status = "PASS" if not v.get("warnings") else "WARN"
            print(f"[{status}] {fname} -> {v.get('char_count', 0)} chars ({res['elapsed']:.2f}s)")
            if v.get("warnings"):
                for w in v["warnings"]:
                    print(f"  - WARNING: {w}")
        else:
            print(f"[FAIL] {fname} ({res['elapsed']:.2f}s) - {res['error'].splitlines()[0]}")

if __name__ == "__main__":
    main()
