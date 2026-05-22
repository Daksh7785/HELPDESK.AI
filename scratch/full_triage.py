import subprocess

def gh(*args):
    result = subprocess.run(["gh"] + list(args), check=False)

REPO = "ritesh-1918/HELPDESK.AI"

# ─── Issue #52: reply to codeananyagupta and Achiever199 ─────────────────────
gh("issue", "comment", "52", "--repo", REPO, "--body", """Hi @codeananyagupta and @Achiever199! 🙌

Thank you both for your interest in fixing the `/ai/analyze_ticket` route collision — this is a great bug to jump on!

Remember, **there are no single-person restrictions here** — both of you are welcome to work on this simultaneously. Whoever delivers a clean, validated fix first will have their PR merged into the `gssoc` branch! 🚀

**Approach guidance:**
- Rename the legacy handler to `/ai/analyze_ticket/legacy` (or a similar clear name)
- Ensure the primary `/ai/analyze_ticket` route still works correctly
- Update any internal references or docs pointing to the old route

**Before you start, please complete onboarding:**
1. Sign up at https://helpdeskaiv1.vercel.app/signup
2. Select **Ritesh Private Limited** as your company
3. Verify your email
4. Reply here with your sign-up email — I'll approve your dashboard access manually!
5. Log in at https://helpdeskaiv1.vercel.app/login

⚠️ **Branch rule:** All PRs MUST target the `gssoc` branch, NOT `main`. Any PR targeting `main` will be closed.

Happy coding! 🔥""")

# ─── Issue #51: reply to ayushi2577 (PR submitted + approval request) ────────
gh("issue", "comment", "51", "--repo", REPO, "--body", """Hi @ayushi2577! 🎉

Absolutely fantastic work on PR #59 — the security fix for missing current password verification is exactly what we needed! Adding `supabase.auth.signInWithPassword()` re-authentication before `updateUser()` is the right approach.

Regarding the Vercel check failure — you are 100% correct, that's a forked PR authorization setting on my end and it has **zero impact** on your code quality. I'll sort that out. All your actual checks pass ✅

I'm reviewing your PR and will approve your dashboard access (email: `ayushiagrawal2507@gmail.com`) right away so you can test end-to-end!

Keep up the incredible work — would love to have you continue contributing! 🚀🙌""")

# ─── Issue #50: reply to ayushi2577 (PR #56 submitted) ───────────────────────
gh("issue", "comment", "50", "--repo", REPO, "--body", """Hi @ayushi2577! 🙌

Amazing work on PR #56 — clearing the `ticketStore` persisted state on logout is exactly the right fix to prevent cross-user data leakage! The approach of resetting `aiTicket`, `activeTicket`, `autoResolvedTickets`, notifications, and tickets on `signOut` is clean and minimal.

I can see you kept the change scoped to just `authStore.js` — great discipline! Reviewing now. 🚀

As always, remember:
- ❌ **DO NOT** target `main` — all PRs must go to the `gssoc` branch
- ✅ Your PR should be targeting `gssoc` — please verify if it isn't already!

Thank you for the continued contributions — this is exactly the quality we love to see! 🔥""")

# ─── Issue #48: reply to codeananyagupta ──────────────────────────────────────
gh("issue", "comment", "48", "--repo", REPO, "--body", """Hi @codeananyagupta! 🙌

Thank you for your interest in fixing the voice visualizer stale closure bug in `CreateTicket.jsx`! Your analysis of the issue — stale state capture inside `recognition.onend` causing incorrect animation cleanup — is spot on! Great investigation.

Note: Issue #49 is the canonical version of this bug. Please work off that one to avoid duplicate PRs. I've marked #48 as a duplicate.

**Before you start, please complete onboarding:**
1. Sign up at https://helpdeskaiv1.vercel.app/signup
2. Select **Ritesh Private Limited** as your company
3. Verify your email
4. Reply here with your sign-up email — I'll approve your dashboard access manually!
5. Log in at https://helpdeskaiv1.vercel.app/login to test and reproduce the bug

⚠️ **Branch rule:** All PRs MUST target the `gssoc` branch, NOT `main`.

Looking forward to your fix! 🚀""")

# ─── Re-announce Issue #28 as OPEN for all contributors ──────────────────────
gh("issue", "comment", "28", "--repo", REPO, "--body", """📢 **Open Announcement — This issue is available for ALL contributors!**

Hey everyone! 👋

This issue (**Steps section laggy transition**) is **still open and actively needs contributors**! If @arpan7sarkar hasn't submitted a PR yet, anyone is welcome to jump in and work on this!

**There are no single-person restrictions** — multiple contributors can work simultaneously. The first to deliver a clean, validated fix wins the merge into `gssoc`! 🏆

**To get started:**
1. Sign up at https://helpdeskaiv1.vercel.app/signup
2. Select **Ritesh Private Limited** as your company
3. Verify your email
4. Drop your sign-up email here — I'll manually approve your dashboard access!
5. Branch off `gssoc`, fix the laggy transition + font inconsistency, and open a PR targeting `gssoc`

⚠️ PRs targeting `main` will be closed automatically.

Let's get this fixed! 🚀🔥""")

# ─── Re-announce Issue #30 as OPEN for all contributors ──────────────────────
gh("issue", "comment", "30", "--repo", REPO, "--body", """📢 **Open Announcement — This issue is available for ALL contributors!**

Hey everyone! 👋

This issue (**Password character sequence warning shown too late**) is **still open and actively needs contributors**! If @coolss21 hasn't submitted a PR yet, anyone is welcome to dive in!

**There are no single-person restrictions** — multiple contributors can work simultaneously. First clean PR into `gssoc` gets merged! 🏆

**To get started:**
1. Sign up at https://helpdeskaiv1.vercel.app/signup
2. Select **Ritesh Private Limited** as your company
3. Verify your email
4. Drop your sign-up email here — I'll manually approve your dashboard access!
5. Move the password validation logic so it triggers during password entry, not on form submit
6. Branch off `gssoc` and open a PR targeting `gssoc`

⚠️ PRs targeting `main` will be closed automatically.

Let's get this fixed! 🚀🔥""")

# ─── Re-announce Issue #31 as OPEN for all contributors ──────────────────────
gh("issue", "comment", "31", "--repo", REPO, "--body", """📢 **Open Announcement — This issue is available for ALL contributors!**

Hey everyone (including @Ishita-varshney and @vasheekhan)! 👋

This issue (**Add Dark Mode Option**) is **still open and actively needs contributors**! If there's no PR submitted yet, anyone can jump in — this is a great beginner-to-intermediate level feature!

**There are no single-person restrictions** — multiple contributors can work simultaneously. First clean PR into `gssoc` gets merged! 🏆

**To get started:**
1. Sign up at https://helpdeskaiv1.vercel.app/signup
2. Select **Ritesh Private Limited** as your company
3. Verify your email
4. Drop your sign-up email here — I'll manually approve your dashboard access!
5. Add a dark/light mode toggle — ensure all UI components and pages are styled for both themes
6. Branch off `gssoc` and open a PR targeting `gssoc`

⚠️ PRs targeting `main` will be closed automatically.

Let's light up the dark side! 🌙🚀""")

# ─── Re-announce Issue #39 as OPEN for all contributors ──────────────────────
gh("issue", "comment", "39", "--repo", REPO, "--body", """📢 **Open Announcement — This issue is available for ALL contributors!**

Hey everyone (including @Jiya3177)! 👋

This issue (**Persist Admin Settings to Supabase Database**) is **still open and actively needs contributors**! If there's no merged PR yet, everyone is welcome to work on this!

**There are no single-person restrictions** — multiple contributors can work simultaneously. First clean PR into `gssoc` gets merged! 🏆

**To get started:**
1. Sign up at https://helpdeskaiv1.vercel.app/signup
2. Select **Ritesh Private Limited** as your company
3. Verify your email
4. Drop your sign-up email here — I'll manually approve your dashboard access!
5. Add `system_settings` table in Supabase, fetch on mount in `AdminSettings.jsx`, and persist on save
6. Branch off `gssoc` and open a PR targeting `gssoc`

⚠️ PRs targeting `main` will be closed automatically.

Let's get this shipped! 🚀🔥""")

# ─── Star/Fork/Follow Announcement on all active issues ──────────────────────
ANNOUNCEMENT = """🌟 **Special Announcement from the Project Owner — Please Read!** 🌟

Hey everyone! 👋 This is Ritesh, the owner of **HELPDESK.AI**.

First of all, a massive **THANK YOU** 🙏 to every single one of you who has contributed, raised issues, reviewed PRs, or even just engaged with this project. You are the reason this project is growing and improving every single day!

I have a small but **very meaningful request** for all of you:

---

⭐ **Please Star this Repository**
If you find this project interesting, useful, or worth contributing to — please give it a star! Stars help this project get discovered by more developers and contributors in the open-source community. It takes just one click and means a LOT to us.
👉 https://github.com/ritesh-1918/HELPDESK.AI

🍴 **Fork the Repository**
Forking keeps your own copy up to date and makes contributing even easier. It also shows your support!
👉 https://github.com/ritesh-1918/HELPDESK.AI/fork

👤 **Follow @ritesh-1918 on GitHub**
Following me helps you stay up to date with new projects, updates, and open-source work I publish. I'm actively building and would love to have you along for the journey!
👉 https://github.com/ritesh-1918

---

**Why does this matter?**
I am genuinely passionate about this project and the community we are building around it. The more visibility HELPDESK.AI gets, the more contributors join, the better it becomes for everyone. Every star, fork, and follow truly makes a difference and motivates me to keep pushing forward.

This project is my way of contributing to the open-source community and I really want to see it grow. Your support — no matter how small — goes a long way! 🚀

Thank you so much for being part of this journey. Let's keep building something amazing together! 🎉🙌

— Ritesh (@ritesh-1918)"""

ISSUES = ["28", "30", "31", "39", "46", "47", "48", "49", "50", "51", "52", "54", "55"]
for issue_num in ISSUES:
    gh("issue", "comment", issue_num, "--repo", REPO, "--body", ANNOUNCEMENT)

print("All done! ✅")
