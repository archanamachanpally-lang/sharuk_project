# Email Sharing Setup Guide

This guide will help you set up the email sharing functionality for sprint plans.

## Required Python Libraries

The email sharing feature requires the following libraries (already in requirements.txt):

- **reportlab** - For PDF generation
- **requests** - For HTTP requests
- **python-dotenv** - For environment variables

## Installation Steps

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Or install specific libraries:

```bash
pip install reportlab requests python-dotenv
```

### 2. Configure Gmail App Password

To send emails via Gmail, you need to create an App Password:

#### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account: https://myaccount.google.com
2. Click on "Security"
3. Enable "2-Step Verification"

#### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer" (or Other)
3. Click "Generate"
4. Copy the 16-character password (example: `abcd efgh ijkl mnop`)

### 3. Create .env File

Create a file named `.env` in the `backend` folder with the following content:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/sprint_demo
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000
ENVIRONMENT=development

# Gemini API Keys
GEMINI_API_KEY_1=your-primary-gemini-api-key-here
GEMINI_API_KEY_2=your-secondary-gemini-api-key-here
GEMINI_API_KEY_3=your-tertiary-gemini-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here

# Email Configuration for Sprint Plan Sharing
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-gmail-email@gmail.com
SMTP_PASSWORD=your-16-character-app-password-here
FROM_EMAIL=your-gmail-email@gmail.com
```

### 4. Update Email Settings

Replace these values in your `.env` file:

```env
# Example:
SMTP_USERNAME=john.doe@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
FROM_EMAIL=john.doe@gmail.com
```

**Important:**
- Remove spaces from the App Password (use `abcdefghijklmnop` not `abcd efgh ijkl mnop`)
- Don't use quotes around values
- Use your actual Gmail address
- The `.env` file should be in the `backend` folder, NOT the root folder

### 5. Restart Backend Server

After creating/updating the `.env` file, restart your backend:

```bash
# Stop the server (Ctrl+C)
# Then restart:
uvicorn main:app --reload --port 8000
```

## Testing Email Functionality

1. Generate a sprint plan
2. Click the "SHARE" button (below FEEDBACK button)
3. Enter recipient email and description
4. Click "Send Email"
5. Check your inbox for the email with PDF attachment

## Troubleshooting

### Error: "Email configuration not set"
- Make sure `.env` file exists in the `backend` folder
- Check that `SMTP_USERNAME` and `SMTP_PASSWORD` are set correctly
- Restart the backend server after updating `.env`

### Error: "Failed to generate PDF"
- Make sure `reportlab` is installed: `pip install reportlab`
- Check backend terminal for error messages

### Error: "SMTP Authentication failed"
- Verify your App Password is correct (16 characters, no spaces)
- Make sure 2-Factor Authentication is enabled on your Google account
- Try generating a new App Password

### Email sends but no attachment
- Check backend terminal logs for PDF generation errors
- Make sure `reportlab` library is installed
- Restart backend after installing libraries

## Email Features

- **Subject:** "sprint plan shared : {sprint_plan_name}"
- **Body:** Your custom description
- **Attachment:** Professional PDF of the sprint plan
- **Format:** Clean, formatted PDF with headers and styling

## File Structure

```
backend/
├── .env                 ← Create this file with email settings
├── requirements.txt     ← Python dependencies
├── main.py             ← Main application
└── ...
```

## Security Notes

- **Never commit `.env` file to Git** - it contains sensitive credentials
- The `.env` file is already in `.gitignore`
- Keep your App Password secure
- Don't share your `.env` file with others

## Quick Checklist

- [ ] Python dependencies installed (`pip install -r requirements.txt`)
- [ ] Gmail 2-Factor Authentication enabled
- [ ] App Password generated from Google
- [ ] `.env` file created in `backend` folder
- [ ] Email settings added to `.env` file
- [ ] Backend server restarted
- [ ] Email sharing tested and working

## Need Help?

If you're still having issues:
1. Check backend terminal for error messages
2. Verify all environment variables are set correctly
3. Make sure you're using Gmail App Password, not your regular password
4. Ensure `reportlab` is installed: `pip list | grep reportlab`


