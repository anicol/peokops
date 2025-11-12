# Welcome to PeakOps, BalanceGrille!

**Your Complete Guide to Getting Started**

---

## What is PeakOps?

PeakOps helps you maintain operational excellence across all your restaurant locations through:
- **Daily Micro-Checks**: 3 quick verification items sent each day via text message
- **Employee Pulse Surveys**: Daily check-ins to understand team sentiment
- **7shifts Integration**: Automatic sync of your team members and schedules

No more clipboards, no more forgotten checklists. Just simple, daily habits that keep your operations running smoothly.

---

## Getting Started

### Step 1: Log In for the First Time

1. Go to **https://app.peakops.com**
2. Enter your credentials:
   - **Email**: [provided by setup team]
   - **Temporary Password**: [provided by setup team]
3. You'll be prompted to create a new password
4. Choose a strong password and save it securely

### Step 2: Complete Your Profile

After logging in:
1. Click your profile icon (top right)
2. Update your:
   - Full name
   - Phone number (for SMS notifications)
   - Preferred timezone
3. Click **Save Changes**

---

## Understanding Your Dashboard

### Home Dashboard
Shows at-a-glance metrics:
- **Completion Rate**: % of daily checks completed across all stores
- **Current Streak**: Consecutive days with 100% completion
- **Recent Activity**: Latest check completions and pulse survey responses
- **Alert Summary**: Any issues requiring attention

### Stores View
- See all 4 locations
- View individual store performance
- Access store-specific settings
- Review historical data per location

### Team View
- See all team members
- Invite new users
- Manage roles and permissions
- View individual activity

---

## How Daily Micro-Checks Work

### The Daily Flow

**Every morning at 8:00 AM** (or your configured time):
1. Your store managers receive a text message
2. The text contains a link: "Complete today's 3 checks"
3. They tap the link (no login required!)
4. They see 3 quick verification items
5. For each item:
   - ✅ **Pass**: Tap green checkmark
   - ❌ **Fail**: Tap red X, add photo and note
6. Takes under 2 minutes total
7. You see results in real-time on your dashboard

### What Gets Checked

The system intelligently selects 3 items each day from categories like:
- **PPE & Uniforms**: Hair restraints, gloves, proper attire
- **Safety**: Wet floor signs, fire extinguisher access, electrical safety
- **Cleanliness**: Surface sanitation, handwashing stations, drain cleanliness
- **Food Safety**: Temperature control, proper separation, date marking
- **Equipment**: Refrigeration temps, equipment cleanliness
- **Facility**: Lighting, walls/ceiling condition, pest control

**Smart Selection**: The system rotates items you haven't checked recently and prioritizes high-severity items.

### Viewing Results

1. Go to **Micro-Checks** in the left navigation
2. See today's checks across all stores
3. Click any check to see:
   - Which items passed/failed
   - Photos of any issues
   - Manager notes
   - Timestamp of completion

---

## Connecting Your 7shifts Account

This integration automatically syncs your team members so they can receive micro-checks and pulse surveys.

### Step 1: Get Your 7shifts Credentials

You'll need:
- Your 7shifts company ID (find this in 7shifts Settings → Company)
- Admin access to your 7shifts account

### Step 2: Connect in PeakOps

1. Go to **Settings** → **Integrations**
2. Click **Connect 7shifts**
3. You'll be redirected to 7shifts to authorize
4. Log in with your 7shifts admin credentials
5. Click **Allow Access**
6. You'll be redirected back to PeakOps

### Step 3: Configure Sync Settings

After connecting:
1. Choose which employee roles receive micro-checks:
   - ☑ Manager
   - ☑ Shift Lead
   - ☑ Assistant Manager
   - ☐ Server (optional)
   - ☐ Cook (optional)

2. Enable shift-based delivery (recommended):
   - ☑ **Only send checks when employee is clocked in**
   - This ensures checks go to whoever is on shift

3. Set sync frequency:
   - **Daily** (recommended) - syncs every night
   - **Real-time** - syncs immediately when changes are made

4. Click **Save Settings**

### Step 4: Initial Sync

After connecting:
- All employees from 7shifts will be imported
- They'll be matched to their PeakOps store locations
- They'll automatically receive micro-checks on their shifts

**Note**: Employees won't need to create accounts - they'll receive text messages with magic links to complete checks.

---

## Employee Pulse Surveys

### What They Are

Short, daily check-ins sent to your team at the end of their shift (6 PM by default). Helps you understand:
- How supported employees feel
- Whether they have the resources they need
- Overall shift satisfaction
- Any concerns or suggestions

### Default Questions

1. "How supported did you feel by your manager today?" (1-5 rating)
2. "Did you have everything you needed to do your job well today?" (Yes/No)
3. "How would you rate today's shift overall?" (1-5 rating)
4. "Any concerns or suggestions?" (Optional text)

### Customizing Questions

1. Go to **Pulse Surveys** → **Questions**
2. Click **Add Question** or edit existing ones
3. Choose question type:
   - 1-5 Rating Scale
   - Yes/No
   - Multiple Choice
   - Free Text
4. Set category (Management, Resources, Safety, etc.)
5. Mark as required or optional
6. Drag to reorder questions
7. Click **Save**

### Viewing Responses

1. Go to **Pulse Surveys** → **Responses**
2. See aggregated sentiment trends over time
3. Filter by:
   - Store location
   - Date range
   - Question category
   - Sentiment (positive, neutral, negative)

**Privacy**: Responses are anonymous unless you configure them otherwise. Managers can't see who said what, only the aggregate data.

### Acting on Feedback

When negative sentiment is detected:
1. You'll see an alert on your dashboard
2. Review the specific concerns
3. The system can auto-generate micro-checks based on recurring themes
   - Example: Multiple mentions of "dirty bathrooms" → auto-creates a bathroom cleanliness check

---

## Customizing Micro-Check Templates

### Viewing Templates

1. Go to **Settings** → **Micro-Check Templates**
2. See 30+ pre-built templates organized by category
3. Each template shows:
   - Title and description
   - Success criteria (what "passing" looks like)
   - Severity level (High, Medium, Low)
   - Rotation priority

### Creating Custom Templates

1. Click **Create Template**
2. Fill in:
   - **Title**: Brief name (e.g., "Table Sanitization")
   - **Description**: What to check
   - **Success Criteria**: What a "pass" looks like
   - **Category**: Choose from dropdown
   - **Severity**: High, Medium, or Low
   - **Level**:
     - **Brand-wide**: All stores
     - **Account-wide**: All your stores
     - **Store-specific**: Just one location
3. Set **Rotation Priority** (1-100)
   - Higher = appears more frequently
   - Default: 50
4. Click **Save**

### Editing Existing Templates

1. Find the template in the list
2. Click the ⋯ menu → **Edit**
3. Make changes
4. Click **Save**

**Note**: Changes to templates affect future micro-checks, not ones already sent.

### Store-Specific Overrides

Some stores have unique needs:

1. Create a template with **Level: Store-specific**
2. Select which store it applies to
3. It will only appear in rotation for that store

Example: If your Cambridge location has a bar, create bar-specific checks just for that store.

---

## Inviting Team Members

### Invite a Manager or Admin

1. Go to **Team** → **Users**
2. Click **Invite User**
3. Fill in:
   - Email address
   - First and last name
   - Phone number (for SMS)
   - Role:
     - **Owner**: Full access to everything
     - **Admin**: Manage all stores
     - **Store Manager**: Access to one store
4. Select which store (if Store Manager)
5. Click **Send Invitation**

They'll receive an email with login instructions.

### Employees from 7shifts

If you've connected 7shifts, employees are automatically imported. They don't need accounts - they'll receive SMS with magic links to complete checks.

---

## Configuring Store Settings

### Update Store Information

1. Go to **Stores**
2. Click a store name
3. Update:
   - Address
   - Phone number
   - Manager email
   - Timezone
   - Segment (high/medium/low volume)
4. Click **Save**

### Set Micro-Check Send Time

Each store can have a different send time:

1. Go to store details
2. Find **Micro-Check Send Time**
3. Set time (in store's local timezone)
   - Recommended: 8:00 AM (before lunch rush)
   - Avoid busy periods (11 AM - 2 PM, 5 PM - 8 PM)
4. Click **Save**

---

## Mobile Experience for Managers

Your managers don't need to download an app. Here's their experience:

### Receiving Checks

1. Text message arrives: "BalanceGrille Downtown daily checks are ready!"
2. Shows: "Complete 3 quick items (under 2 min)"
3. Contains a link: [Tap here to start]

### Completing Checks

1. Tap link → opens in their phone browser
2. No login required (magic link authenticates them)
3. See 3 items to verify
4. For each:
   - If everything's good → tap ✅ green checkmark
   - If there's an issue → tap ❌ red X
     - System prompts for photo
     - Add quick note explaining the issue
5. Tap **Submit** when done

### Photos and Notes

When marking something as failed:
- Camera opens automatically
- Take photo of the issue
- Add brief note: "Ice buildup in walk-in freezer"
- This helps track and resolve issues

---

## Viewing Reports and Analytics

### Completion Reports

1. Go to **Reports** → **Completion**
2. See:
   - Daily completion rate by store
   - Completion trends over time
   - Top performing stores
   - Individual manager performance
3. Filter by date range
4. Export to CSV

### Issue Reports

1. Go to **Reports** → **Issues**
2. See:
   - Most common failures by category
   - Stores with recurring issues
   - Resolution time for issues
   - Photos of all failed items
3. Click any issue to see details and corrective actions

### Pulse Survey Analytics

1. Go to **Reports** → **Pulse Surveys**
2. See:
   - Sentiment trends over time
   - Store-by-store comparison
   - Question-by-question breakdowns
   - Word clouds of common themes
3. Filter by date, store, or category

---

## Best Practices

### For Maximum Adoption

1. **Explain the "Why"**: Tell managers this takes 2 minutes and prevents health code violations
2. **Start Small**: First week, just focus on completion - don't worry about failures
3. **Celebrate Wins**: Recognize stores/managers with high completion rates
4. **Review Weekly**: Spend 10 minutes Monday reviewing last week's data
5. **Act on Issues**: When something fails repeatedly, fix the root cause

### For Better Data Quality

1. **Encourage Photos**: Even for passes, photos create visual proof
2. **Specific Notes**: "Dirty" isn't helpful - "Grease buildup on hood vent" is
3. **Timely Completion**: Complete checks when you're actually at the location
4. **Follow Up**: When issues are flagged, document the fix in the system

### For Team Engagement

1. **Make Pulse Surveys Short**: 4 questions max, takes 1 minute
2. **Share Aggregate Results**: Let team see their feedback matters
3. **Act on Feedback**: When employees mention a concern, address it
4. **Recognize Participation**: Celebrate teams with high survey response rates

---

## Troubleshooting

### "I didn't receive the text message"

**Check:**
- Is your phone number correct in your profile? (Include country code: +1...)
- Is your phone capable of receiving SMS?
- Check spam/blocked messages

**Fix:**
1. Go to your profile → Update phone number
2. Or request a new link via email instead: Settings → Notifications → Enable email delivery

### "The link doesn't work"

**Possible causes:**
- Link expired (magic links expire after 24 hours)
- Already used (links are single-use for security)

**Fix:**
- Request a new check link from the dashboard: Micro-Checks → Today → Request New Link

### "I can't see all my stores"

**Check your role:**
- Store Managers see only their assigned store
- Owners/Admins see all stores

**Fix:**
- Contact your account owner to update your role if needed

### "Employees aren't receiving checks"

**Check:**
1. Is 7shifts integration connected? (Settings → Integrations)
2. Are employees synced? (Team → Users → See imported employees)
3. Do employees have valid phone numbers in 7shifts?
4. Are the employees' roles included in sync settings?

**Fix:**
1. Re-sync 7shifts: Settings → Integrations → 7shifts → Sync Now
2. Verify employee phone numbers in 7shifts
3. Check sync settings include the right roles

### "Pulse surveys aren't sending"

**Check:**
1. Is pulse survey config active? (Settings → Pulse Surveys)
2. Is the send time correct for your timezone?
3. Are there active questions? (need at least 1)

**Fix:**
- Go to Settings → Pulse Surveys → Verify "Active" is toggled ON
- Check send time is appropriate (recommend 6 PM)

---

## Getting Help

### Documentation
- Full user guide: [link]
- Video tutorials: [link]
- FAQ: [link]

### Support
- Email: support@peakops.com
- Response time: < 24 hours on business days
- Emergency support: [phone number]

### Training
- Schedule a 1-on-1 training session: [calendly link]
- Group training for your managers: Request via support@peakops.com

### Feature Requests
Have an idea for improvement?
- Go to Settings → Feedback
- Or email: feedback@peakops.com

---

## Success Metrics to Track

**First 30 Days:**
- Micro-check completion rate > 80%
- At least 1 photo per day per store
- Pulse survey response rate > 60%
- Zero days with no data

**After 60 Days:**
- Completion rate > 90%
- Declining trend in failed items (issues getting fixed)
- Improving pulse survey sentiment scores
- Managers completing checks without reminders

**Long Term:**
- Fewer health code violations
- Faster issue resolution
- Higher team satisfaction scores
- Data-driven operational improvements

---

## Quick Reference Card

**For Your Wallet/Fridge:**

📱 **PeakOps Dashboard**: https://app.peakops.com

⏰ **Daily Checks Send**: 8:00 AM (per store)

📊 **Pulse Surveys Send**: 6:00 PM

✅ **Completion Goal**: 90%+

📸 **Always Photo Failed Items**

💬 **Support**: support@peakops.com

---

## Welcome Again!

We're excited to partner with BalanceGrille on this pilot. Our goal is to make operational excellence simple, habitual, and data-driven.

**Your success plan:**
- **Week 1**: Get familiar with the dashboard, ensure managers receive checks
- **Week 2**: Review first week's data, identify any gaps
- **Week 3**: Customize templates, adjust send times if needed
- **Week 4**: Review month 1 data, plan for scale

**Questions anytime?** Don't hesitate to reach out. We're here to help you succeed.

**Let's build better habits together!**

— The PeakOps Team

---

**Document Version**: 1.0
**Last Updated**: November 11, 2025
**Your Account**: BalanceGrille (4 locations)
