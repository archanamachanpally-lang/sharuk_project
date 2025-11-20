# Quick Setup Guide for Email Sharing

## For New Users Setting Up This Project

If you're setting up this project and want to use the email sharing feature, follow these steps:

### Step 1: Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This will install all required libraries including:
- `reportlab` (for PDF generation)
- `requests` (for HTTP requests)
- `python-dotenv` (for environment variables)

### Step 2: Check Your Setup

Run the setup checker to verify everything is installed:

```bash
cd backend
python check_email_setup.py
```

This will tell you if anything is missing.

### Step 3: Configure Email Settings

1. **Create Gmail App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Generate a new App Password (you need 2-Factor Auth enabled)
   - Copy the 16-character password

2. **Create `.env` file in `backend` folder:**

```env
# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
FROM_EMAIL=your-email@gmail.com
```

Replace:
- `your-email@gmail.com` with your actual Gmail address
- `your-16-char-app-password` with the App Password from step 1 (no spaces!)

### Step 4: Restart Backend

```bash
uvicorn main:app --reload --port 8000
```

### Step 5: Test Email Sharing

1. Generate a sprint plan
2. Click "SHARE" button (green button below FEEDBACK)
3. Enter recipient email and description
4. Click "Send Email"
5. Check inbox for email with PDF attachment

## That's It! 🎉

The email sharing feature should now work correctly.

## Common Issues

**"Email configuration not set"**
- Make sure `.env` file is in the `backend` folder
- Restart the backend server after creating `.env`

**"Failed to generate PDF"**
- Run: `pip install reportlab`
- Restart backend

**No attachment in email**
- Make sure `reportlab` is installed: `pip list | grep reportlab`
- Check backend terminal for errors

## Need More Details?

See `backend/EMAIL_SETUP.md` for complete documentation.


