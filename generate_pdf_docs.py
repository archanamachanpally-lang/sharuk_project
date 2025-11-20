#!/usr/bin/env python3
"""
PDF Generator for Risk Assessment PM Portal Technical Documentation
Converts Markdown to properly formatted PDF with styling
"""

import markdown
import pdfkit
from pathlib import Path
import os

def generate_pdf_from_markdown():
    """Generate PDF from markdown documentation"""
    
    # Read the markdown file
    markdown_file = "Risk_Assessment_PM_Portal_Technical_Documentation.md"
    
    if not os.path.exists(markdown_file):
        print(f"Error: {markdown_file} not found!")
        return False
    
    with open(markdown_file, 'r', encoding='utf-8') as f:
        markdown_content = f.read()
    
    # Convert markdown to HTML
    html_content = markdown.markdown(markdown_content, extensions=['toc', 'tables', 'fenced_code'])
    
    # Create styled HTML
    styled_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Risk Assessment PM Portal - Technical Documentation</title>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 1000px;
                margin: 0 auto;
                padding: 20px;
                background-color: #fff;
            }}
            
            h1 {{
                color: #2c3e50;
                border-bottom: 3px solid #3498db;
                padding-bottom: 10px;
                margin-top: 30px;
                margin-bottom: 20px;
                font-size: 28px;
            }}
            
            h2 {{
                color: #34495e;
                border-bottom: 2px solid #ecf0f1;
                padding-bottom: 8px;
                margin-top: 25px;
                margin-bottom: 15px;
                font-size: 22px;
            }}
            
            h3 {{
                color: #2c3e50;
                margin-top: 20px;
                margin-bottom: 10px;
                font-size: 18px;
            }}
            
            h4 {{
                color: #34495e;
                margin-top: 15px;
                margin-bottom: 8px;
                font-size: 16px;
            }}
            
            h5 {{
                color: #7f8c8d;
                margin-top: 12px;
                margin-bottom: 6px;
                font-size: 14px;
            }}
            
            p {{
                margin-bottom: 12px;
                text-align: justify;
            }}
            
            code {{
                background-color: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 4px;
                padding: 2px 6px;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                color: #e83e8c;
            }}
            
            pre {{
                background-color: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                padding: 15px;
                overflow-x: auto;
                margin: 15px 0;
            }}
            
            pre code {{
                background-color: transparent;
                border: none;
                padding: 0;
                color: #333;
            }}
            
            table {{
                border-collapse: collapse;
                width: 100%;
                margin: 15px 0;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            
            th, td {{
                border: 1px solid #ddd;
                padding: 12px;
                text-align: left;
            }}
            
            th {{
                background-color: #3498db;
                color: white;
                font-weight: bold;
            }}
            
            tr:nth-child(even) {{
                background-color: #f8f9fa;
            }}
            
            ul, ol {{
                margin-bottom: 15px;
                padding-left: 25px;
            }}
            
            li {{
                margin-bottom: 5px;
            }}
            
            blockquote {{
                border-left: 4px solid #3498db;
                margin: 15px 0;
                padding: 10px 20px;
                background-color: #f8f9fa;
                font-style: italic;
            }}
            
            .toc {{
                background-color: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                padding: 20px;
                margin: 20px 0;
            }}
            
            .toc h2 {{
                margin-top: 0;
                color: #2c3e50;
            }}
            
            .toc ul {{
                list-style-type: none;
                padding-left: 0;
            }}
            
            .toc li {{
                margin-bottom: 8px;
            }}
            
            .toc a {{
                text-decoration: none;
                color: #3498db;
            }}
            
            .toc a:hover {{
                text-decoration: underline;
            }}
            
            .page-break {{
                page-break-before: always;
            }}
            
            .highlight {{
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 4px;
                padding: 10px;
                margin: 10px 0;
            }}
            
            .info-box {{
                background-color: #d1ecf1;
                border: 1px solid #bee5eb;
                border-radius: 4px;
                padding: 15px;
                margin: 15px 0;
            }}
            
            .warning-box {{
                background-color: #f8d7da;
                border: 1px solid #f5c6cb;
                border-radius: 4px;
                padding: 15px;
                margin: 15px 0;
            }}
            
            .success-box {{
                background-color: #d4edda;
                border: 1px solid #c3e6cb;
                border-radius: 4px;
                padding: 15px;
                margin: 15px 0;
            }}
            
            @media print {{
                body {{
                    font-size: 12px;
                    line-height: 1.4;
                }}
                
                h1 {{
                    font-size: 24px;
                    page-break-before: always;
                }}
                
                h1:first-child {{
                    page-break-before: avoid;
                }}
                
                h2 {{
                    font-size: 18px;
                    page-break-before: avoid;
                }}
                
                h3 {{
                    font-size: 16px;
                }}
                
                pre, table {{
                    page-break-inside: avoid;
                }}
                
                .page-break {{
                    page-break-before: always;
                }}
            }}
        </style>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """
    
    # Save HTML file for reference
    html_file = "Risk_Assessment_PM_Portal_Technical_Documentation.html"
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(styled_html)
    
    print(f"HTML file created: {html_file}")
    
    # Generate PDF
    pdf_file = "Risk_Assessment_PM_Portal_Technical_Documentation.pdf"
    
    try:
        # Configure PDF options
        options = {
            'page-size': 'A4',
            'margin-top': '0.75in',
            'margin-right': '0.75in',
            'margin-bottom': '0.75in',
            'margin-left': '0.75in',
            'encoding': "UTF-8",
            'no-outline': None,
            'enable-local-file-access': None,
            'print-media-type': None,
            'disable-smart-shrinking': None,
        }
        
        # Generate PDF
        pdfkit.from_string(styled_html, pdf_file, options=options)
        print(f"PDF generated successfully: {pdf_file}")
        return True
        
    except Exception as e:
        print(f"Error generating PDF: {e}")
        print("Make sure wkhtmltopdf is installed:")
        print("  Windows: Download from https://wkhtmltopdf.org/downloads.html")
        print("  macOS: brew install wkhtmltopdf")
        print("  Ubuntu: sudo apt-get install wkhtmltopdf")
        return False

if __name__ == "__main__":
    print("Generating PDF documentation...")
    success = generate_pdf_from_markdown()
    
    if success:
        print("✅ PDF documentation generated successfully!")
        print("📄 Files created:")
        print("   - Risk_Assessment_PM_Portal_Technical_Documentation.html")
        print("   - Risk_Assessment_PM_Portal_Technical_Documentation.pdf")
    else:
        print("❌ Failed to generate PDF documentation")
        print("📄 HTML file created for manual conversion:")
        print("   - Risk_Assessment_PM_Portal_Technical_Documentation.html")

