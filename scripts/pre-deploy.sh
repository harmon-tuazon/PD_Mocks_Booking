#!/bin/bash

echo "🚀 Pre-deployment checks starting..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
    print_error "vercel.json not found. Are you in the project root?"
    exit 1
fi

print_status "Checking project structure..."

# Check required directories
if [ ! -d "frontend" ]; then
    print_error "Frontend directory not found"
    exit 1
fi

if [ ! -d "api" ]; then
    print_error "API directory not found"
    exit 1
fi

print_success "Project structure verified"

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf frontend/dist
rm -rf .vercel
print_success "Previous builds cleaned"

# Check Node.js and npm versions
print_status "Checking Node.js and npm versions..."
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_status "Node.js: $NODE_VERSION, npm: $NPM_VERSION"

# Navigate to frontend and install dependencies
print_status "Installing frontend dependencies..."
cd frontend || exit 1

if npm ci; then
    print_success "Frontend dependencies installed successfully"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi

# Build the frontend
print_status "Building frontend..."
if npm run build; then
    print_success "Frontend build completed successfully"
else
    print_error "Frontend build failed"
    exit 1
fi

# Verify build
print_status "Verifying build integrity..."
cd ..

if node scripts/verify-build.js; then
    print_success "Build verification passed"
else
    print_error "Build verification failed"
    exit 1
fi

# Check API endpoints syntax
print_status "Checking API endpoint syntax..."
for file in api/**/*.js; do
    if [ -f "$file" ]; then
        if node -c "$file"; then
            print_success "✓ $file syntax OK"
        else
            print_error "✗ $file has syntax errors"
            exit 1
        fi
    fi
done

# Final checks
print_status "Performing final pre-deployment checks..."

# Check for required environment variables in production
if [ -f ".env" ]; then
    print_warning "Local .env file detected - ensure production environment variables are set in Vercel"
fi

# Check vercel.json syntax
if node -e "JSON.parse(require('fs').readFileSync('vercel.json', 'utf8'))"; then
    print_success "vercel.json syntax is valid"
else
    print_error "vercel.json has syntax errors"
    exit 1
fi

print_success "🎉 All pre-deployment checks passed!"
print_status "Ready for deployment to Vercel"
print_warning "Remember to check Vercel dashboard for environment variables"

echo ""
echo "🔗 Next steps:"
echo "   1. Run: vercel --prod"
echo "   2. Verify deployment URL loads correctly"
echo "   3. Test critical user flows"
echo ""