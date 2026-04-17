**Welcome to your Base44 project** 

**About**

View and Edit  your app on [Base44.com](http://Base44.com) 

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the Base44 Builder.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables

```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url

e.g.
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
```

Run the app: `npm run dev`

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)

---

## Admin Account Setup (One-time)

The first admin account must be created manually in Supabase:

1. Go to **Supabase Dashboard → Authentication → Users**
2. Click **Add User → Create New User**
3. Enter the admin's email and a strong password
4. Check **Auto Confirm User**
5. Click **Create User** and copy the new user's **UUID**
6. Go to **SQL Editor** and run:

```sql
-- Replace with the actual UUID from step 5
INSERT INTO profiles (id, full_name, role)
VALUES ('PASTE-UUID-HERE', 'Admin', 'admin');
```

The admin can now log in and access the Admin Dashboard.

---

## Professor Approval Flow

Professors cannot self-register. The flow is:

1. Professor visits `/ProfessorSignUp` and fills out the application form
2. Application is stored in `professor_applications` with status `pending`
3. Admin logs in → Admin Dashboard → Applications tab
4. Admin reviews the application and clicks **Approve**:
   - Admin creates the professor's auth user in **Supabase Auth dashboard**
   - Admin pastes the new user's UUID in the approval dialog
   - System creates the professor profile and marks the application as approved
5. Professor can now log in with the credentials set in Supabase
