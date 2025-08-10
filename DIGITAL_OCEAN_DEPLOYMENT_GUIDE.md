# Digital Ocean Deployment Guide - Next.js App

## Overview
This guide documents the issues encountered when deploying a Next.js application to Digital Ocean App Platform and provides solutions to resolve them.

## Project Details
- **Application**: Deriv Bot Store (Next.js 14.2.31)
- **Platform**: Digital Ocean App Platform
- **Node Version**: 18.x (as specified in package.json)

## Issues Encountered & Solutions

### 1. TypeScript Build Error - bcrypt Module

#### Problem
```
Type error: Could not find a declaration file for module 'bcrypt'. 
'/workspace/node_modules/bcrypt/bcrypt.js' implicitly has an 'any' type.
Try `npm i --save-dev @types/bcrypt` if it exists or add a new declaration 
(.d.ts) file containing `declare module 'bcrypt';`
```

#### Root Cause
The `@types/bcrypt` package was placed in `devDependencies` instead of `dependencies`. During production builds on Digital Ocean App Platform, dev dependencies are pruned after the build step, but TypeScript compilation still requires the type definitions.

#### Solution
Move `@types/bcrypt` from `devDependencies` to `dependencies` in `package.json`:

```json
{
  "dependencies": {
    "@types/bcrypt": "^5.0.0",
    "bcrypt": "^5.1.1",
    // ... other dependencies
  },
  "devDependencies": {
    // @types/bcrypt removed from here
    // ... other dev dependencies
  }
}
```

#### Why This Works
- Production builds require type definitions during the TypeScript compilation phase
- Moving types to dependencies ensures they're available during build time
- This is a common pattern for TypeScript projects that need runtime and compile-time type safety

### 2. Missing Production Build Error

#### Problem
```
Error: Could not find a production build in the '.next' directory. 
Try building your app with 'next build' before starting the production server.
```

#### Root Cause
The application was trying to start with `npm start` (which runs `next start`) without a completed production build.

#### Solution
The build commands are correctly configured:

**Build Command:**
```bash
npm install && npm run build
```

**Run Command:**
```bash
npm start
```

#### Verification
After fixing the TypeScript issue, the build process now works correctly:
- ✅ Dependencies install successfully
- ✅ TypeScript compilation passes
- ✅ Next.js build completes
- ✅ `.next` directory is created with all necessary files
- ✅ Application starts successfully

## Digital Ocean App Platform Configuration

### Recommended Settings

#### Build Phase
```yaml
build:
  commands:
    - npm install && npm run build
```

#### Runtime Phase
```yaml
run:
  command: npm start
```

#### Environment Variables
Ensure all required environment variables are configured in the Digital Ocean control panel:
- `NODE_ENV=production`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`
- Other application-specific variables

### Application Configuration

#### package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start -H 0.0.0.0",
    "lint": "next lint"
  }
}
```

#### Node.js Engine
```json
{
  "engines": {
    "node": "18.x"
  }
}
```

## Build Process Validation

### Successful Build Output
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (41/41)
✓ Collecting build traces
✓ Finalizing page optimization
```

### Key Files Generated
- `.next/BUILD_ID` - Unique build identifier
- `.next/server/` - Server-side code
- `.next/static/` - Static assets
- `.next/standalone/` - Standalone server files

## Common Issues & Troubleshooting

### 1. TypeScript Type Errors
**Symptom**: Build fails with "Could not find declaration file" errors
**Solution**: Move `@types/*` packages from devDependencies to dependencies for production builds

### 2. Dynamic Server Usage Warnings
**Symptom**: Warnings about routes using cookies/dynamic features
**Expected**: These are normal for API routes that use authentication and are not build-blocking errors

### 3. Network/Fetch Errors During Build
**Symptom**: API calls fail during static generation
**Expected**: Normal behavior when external services aren't available during build time

### 4. Standalone Output Warning
**Symptom**: Warning about "output: standalone" configuration
**Note**: This is informational - the app still starts correctly with `npm start`

## Best Practices

### 1. Dependencies Management
- Place TypeScript type definitions in `dependencies` if needed during production builds
- Use `devDependencies` only for tools that are purely development-focused

### 2. Environment Configuration
- Set `NODE_ENV=production` in Digital Ocean environment variables
- Ensure all required API keys and secrets are configured
- Use different environment configurations for staging/production

### 3. Build Optimization
- The current build configuration is optimal for Digital Ocean App Platform
- The two-step process (install → build) ensures proper dependency resolution

### 4. Monitoring
- Check Digital Ocean build logs for any warnings or errors
- Monitor application startup logs for any runtime issues
- Set up health checks for production deployments

## Conclusion

The deployment issues have been resolved with the following key changes:

1. ✅ **Fixed TypeScript Build Error**: Moved `@types/bcrypt` to dependencies
2. ✅ **Verified Build Process**: Confirmed `npm install && npm run build` works correctly
3. ✅ **Validated Application Startup**: Confirmed `npm start` works with production build
4. ✅ **Documented Best Practices**: Provided comprehensive troubleshooting guide

The application is now ready for successful deployment on Digital Ocean App Platform.

## Build Commands Summary

**For Digital Ocean App Platform:**

- **Build Command**: `npm install && npm run build`
- **Run Command**: `npm start`

These commands are correct and will work reliably with the fixed dependencies configuration.