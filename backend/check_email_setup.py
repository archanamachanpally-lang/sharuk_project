#!/usr/bin/env python3
"""
Email Setup Checker
This script verifies that all required libraries and configurations are properly set up
for the email sharing functionality.
"""

import sys
import os

def check_library(library_name, import_name=None):
    """Check if a Python library is installed"""
    if import_name is None:
        import_name = library_name
    
    try:
        __import__(import_name)
        print(f"✅ {library_name} is installed")
        return True
    except ImportError:
        print(f"❌ {library_name} is NOT installed")
        print(f"   Install with: pip install {library_name}")
        return False

def check_env_file():
    """Check if .env file exists and has required settings"""
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    
    if not os.path.exists(env_path):
        print("❌ .env file NOT found")
        print("   Create a .env file in the backend folder")
        return False
    
    print("✅ .env file exists")
    
    # Read and check for required variables
    required_vars = ['SMTP_USERNAME', 'SMTP_PASSWORD', 'SMTP_SERVER', 'SMTP_PORT', 'FROM_EMAIL']
    
    with open(env_path, 'r') as f:
        content = f.read()
    
    missing_vars = []
    for var in required_vars:
        if var not in content or f"{var}=your-" in content or f"{var}=\n" in content:
            missing_vars.append(var)
    
    if missing_vars:
        print(f"⚠️  Missing or incomplete environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        return False
    
    print("✅ All required environment variables are set")
    return True

def main():
    print("=" * 60)
    print("Email Sharing Setup Checker")
    print("=" * 60)
    print()
    
    print("Checking Python libraries...")
    print("-" * 60)
    
    all_libraries_ok = True
    all_libraries_ok &= check_library("reportlab")
    all_libraries_ok &= check_library("requests")
    all_libraries_ok &= check_library("python-dotenv", "dotenv")
    
    print()
    print("Checking configuration...")
    print("-" * 60)
    
    env_ok = check_env_file()
    
    print()
    print("=" * 60)
    
    if all_libraries_ok and env_ok:
        print("✅ ALL CHECKS PASSED!")
        print("   Email sharing should work correctly.")
        print("   Make sure to restart your backend server.")
    else:
        print("❌ SETUP INCOMPLETE")
        print("   Please fix the issues above and run this script again.")
        print()
        print("Quick fix:")
        if not all_libraries_ok:
            print("   pip install reportlab requests python-dotenv")
        if not env_ok:
            print("   Create .env file with email settings (see EMAIL_SETUP.md)")
    
    print("=" * 60)
    print()
    
    return 0 if (all_libraries_ok and env_ok) else 1

if __name__ == "__main__":
    sys.exit(main())


