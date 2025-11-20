# Re-indexing Files to Include Hyperlinks

## Important Note

If you uploaded files **before** the hyperlink extraction feature was added, those files need to be re-indexed to include links in responses.

## For Mandatory Files (Project Playbook, etc.)

### Option 1: Re-upload the File (Recommended)
1. Delete the old file from Mandatory Files
2. Re-upload the file
3. The new extraction will automatically include hyperlinks

### Option 2: Update Extraction in Database
If you want to update the existing file without re-uploading:

1. The file will need to be re-extracted when you query it
2. For now, re-uploading is the simplest solution

## For Uploaded Files (Chatbot Files)

### Re-index Files
- Re-upload the file (creates a new Pinecone index with updated extraction)
- Alternatively, delete the existing record from `uploaded_files` and upload again

> Pinecone indexes are created per file upload, so re-uploading is the simplest way to refresh chunks with hyperlinks.

## How to Verify Links Are Working

1. Upload or re-upload a DOCX file with hyperlinks
2. Check the extracted text in the database - it should show links in format: `link_text (url)`
3. Query the file and verify links appear in the response as clickable HTML links

## What Links Are Extracted?

- External hyperlinks (http://, https://)
- Internal document links (bookmarks, TOC references - marked as internal)
- Plain text URLs in the document
- Google Sheets links
- Document template links

## Troubleshooting

If links are still not showing:
1. Verify the file was uploaded **after** the hyperlink extraction update
2. Check the extracted text in database - look for `(url)` patterns
3. Check server logs for extraction errors
4. Verify the DOCX file actually contains hyperlinks (not just plain text)

