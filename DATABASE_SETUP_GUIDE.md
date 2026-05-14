# Database Migration Guide

## Issue
The website is not loading because the required classroom tables (especially `enrollments`) are missing from, or pointed at the wrong Supabase schema. Older setup attempts may show:
```
Could not find the table 'public.enrollments' in the schema cache
```

The current app expects classroom tables in the `teacher` schema. Make sure `.env` contains:

```
VITE_TEACHER_SUPABASE_SCHEMA=teacher
```

## Solution

### Step 1: Generate Migrations File
A consolidated SQL file `APPLY_MIGRATIONS.sql` has been created in the project root with all required migrations.

### Step 2: Apply Migrations to Supabase

1. Go to your Supabase Project Dashboard:
   - URL: `https://app.supabase.com/project/ukiuxecvybwvngwirjqt`
   - Or navigate to: https://app.supabase.com → Select your project

2. In the left sidebar, click **SQL Editor**

3. Click the **"New Query"** button (or **"+"** icon)

4. Click the link/button that says **"New blank query"**

5. Open the file `APPLY_MIGRATIONS.sql` from your project root:
   - Copy ALL the SQL content from the file

6. Paste the SQL into the Supabase SQL editor query box

7. Click the **"RUN"** button (usually green, top-right corner)

8. Wait for the migrations to complete. You should see success messages.

### Step 3: Verify the Fix

1. Return to your browser where the app is running (http://localhost:8081)

2. Refresh the page (F5 or Cmd+R)

3. The page should now load without errors

4. Try signing up or logging in as a student/teacher

## What These Migrations Do

The migrations set up:
- ✅ Student and teacher profiles
- ✅ Course management tables
- ✅ **Enrollments table** (the one that was missing!)
- ✅ Assignments and submissions
- ✅ Test history and progress tracking
- ✅ Row-level security policies
- ✅ Automatic user creation triggers

## Troubleshooting

**If you get a permission error:**
- Make sure you're logged in to Supabase with the correct account
- You need admin access to run migrations

**If you see duplicate key errors:**
- Some tables might already exist - this is OK
- The migrations have `IF NOT EXISTS` clauses to prevent this

**If migrations seem to hang:**
- Wait 1-2 minutes (large migrations take time)
- Check your internet connection
- Try again in a fresh SQL editor query

## Next Steps After Migrations

1. Refresh the website browser tab
2. The app should now work properly
3. You should be able to create accounts and log in

If you still encounter issues after applying migrations, check:
- Browser console for errors (F12 → Console tab)
- Supabase project logs
- Network tab for failed API calls
