#!/bin/bash

# OAuth Setup Verification Script
# Run this to verify your OAuth setup is correct

echo "🔍 IronPath OAuth Setup Verification"
echo "====================================="
echo ""

# Check if we're in the right directory
if [ ! -f "frontend/.env" ]; then
    echo "❌ Error: frontend/.env not found. Run this script from the ironpath root directory."
    exit 1
fi

# Check environment variables
echo "1. Checking environment variables..."
if grep -q "VITE_SUPABASE_URL=" frontend/.env && grep -q "VITE_SUPABASE_ANON_KEY=" frontend/.env; then
    echo "   ✅ Supabase credentials found in frontend/.env"
    SUPABASE_URL=$(grep "VITE_SUPABASE_URL=" frontend/.env | cut -d'=' -f2)
    echo "   📍 Supabase URL: $SUPABASE_URL"
else
    echo "   ❌ Missing Supabase credentials in frontend/.env"
    exit 1
fi

if grep -q "VITE_API_URL=" frontend/.env; then
    API_URL=$(grep "VITE_API_URL=" frontend/.env | cut -d'=' -f2)
    echo "   ✅ Backend API URL configured: $API_URL"
else
    echo "   ⚠️  VITE_API_URL not set, will default to http://localhost:8000"
fi

echo ""

# Check if backend is running
echo "2. Checking backend status..."
BACKEND_PORT=$(echo $API_URL | grep -oP ':\K[0-9]+' || echo "8000")
if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "   ✅ Backend is running on port $BACKEND_PORT"
else
    echo "   ❌ Backend is NOT running on port $BACKEND_PORT"
    echo "   💡 Start it with: cd backend && uv run uvicorn src.main:app --reload --host 0.0.0.0 --port $BACKEND_PORT"
fi

echo ""

# Check if frontend dev server is running
echo "3. Checking frontend dev server..."
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "   ✅ Frontend dev server is running on port 5173"
else
    echo "   ❌ Frontend dev server is NOT running"
    echo "   💡 Start it with: cd frontend && bun dev"
fi

echo ""

# Check critical files
echo "4. Checking critical files..."
CRITICAL_FILES=(
    "frontend/src/App.tsx"
    "frontend/src/lib/supabase.ts"
    "frontend/src/services/api.ts"
    "frontend/src/pages/Login.tsx"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file exists"
    else
        echo "   ❌ $file is missing"
    fi
done

echo ""

# Check for onAuthStateChange implementation
echo "5. Checking OAuth implementation..."
if grep -q "onAuthStateChange" frontend/src/App.tsx; then
    echo "   ✅ onAuthStateChange listener found in App.tsx"
else
    echo "   ❌ onAuthStateChange listener NOT found in App.tsx"
    echo "   💡 This is critical for OAuth to work!"
fi

if grep -q "detectSessionInUrl: true" frontend/src/lib/supabase.ts; then
    echo "   ✅ detectSessionInUrl enabled in Supabase config"
else
    echo "   ❌ detectSessionInUrl NOT enabled"
    echo "   💡 This is required to detect OAuth callbacks!"
fi

echo ""

# Supabase configuration instructions
echo "6. Supabase Dashboard Configuration"
echo "   ⚠️  IMPORTANT: Verify these settings in Supabase dashboard:"
echo ""
echo "   📍 Dashboard URL:"
echo "      ${SUPABASE_URL/https:\/\//https://supabase.com/dashboard/project/}"
echo "      (Extract project ID from your URL)"
echo ""
echo "   Required Settings:"
echo "   → Site URL: http://localhost:5173"
echo "   → Redirect URLs: http://localhost:5173/**"
echo "   → Google OAuth Provider: Enabled"
echo ""

# Testing instructions
echo "7. Testing Instructions"
echo "   1. Open browser console (F12)"
echo "   2. Navigate to http://localhost:5173/"
echo "   3. Click 'Continue with Google'"
echo "   4. Watch for these console messages:"
echo "      • 🔐 Initiating Google OAuth login..."
echo "      • 🔧 Setting up Supabase auth listener..."
echo "      • 🔔 Auth state changed: SIGNED_IN"
echo "      • 👤 Setting user: your@email.com"
echo "      • 🚀 Navigating to /dashboard"
echo ""

echo "====================================="
echo "✅ Verification complete!"
echo ""
echo "📚 For detailed troubleshooting, see: OAUTH_SETUP.md"
echo ""
