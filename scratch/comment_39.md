Helo @Jiya3177 and @Deniwn22! 🙌 (And open to @saurabhhhcodes, @namann5, @harshitanagpal05, @Anand-240, @tamannaa-rath, or any other contributors who want to collaborate in parallel!)

Before you dive into the code, you'll need to set up and access the application to test your changes. Here is the step-by-step guide to get access to the dashboard:

### 🚀 Contributor Onboarding Guide
1. **Create an Account**: Go to the sign-up page on your local build (usually `http://localhost:5173/signup`) or our deployed link.
2. **Select the Company**: During sign-up, you **MUST** select **Ritesh Private Limited** as the company.
3. **Verify Your Email**: Complete the email verification step first.
4. **Request Access**: After your email is confirmed, you need manual approval to access the user dashboard. You can either:
   - Send me a formal WhatsApp message requesting access.
   - Or, simply reply here on GitHub with the email address you used to sign up.
5. **Get Approved**: Once I receive your request, I will approve your account from the backend. You will then have full access to the user perspective to reproduce bugs and test your features!

*Happy coding! Let me know when you've signed up.*

---

### 🛠️ Technical Implementation Steps:
1. **Supabase Schema**: Create a `system_settings` table in Supabase mapping settings like confidence thresholds, auto-resolve toggles, etc.
2. **Frontend Settings Component**: Update `AdminSettings.jsx` to fetch these settings from Supabase on mount and perform a database upsert whenever they are changed.
3. **API Layer**: Route requests securely and ensure company isolation so one company cannot read or overwrite another company's admin settings.
4. **Target Branch**: Please ensure your Pull Request targets the `gssoc` branch, NOT `main`.

---

### 🌟 Project Support & Networking Campaign (For Newcomers!)
If you are new here, please take a quick moment to support the project and connect with me:
1. ⭐ **Star this repository**: Helps the project get discovered! [Star here](https://github.com/ritesh-1918/HELPDESK.AI)
2. 🍴 **Fork this repository**: Create your own working copy! [Fork here](https://github.com/ritesh-1918/HELPDESK.AI/fork)
3. 👤 **Follow @ritesh-1918 on GitHub**: Stay updated on real-time projects! [Follow here](https://github.com/ritesh-1918)
4. 💼 **Connect on LinkedIn**: Let's build a strong network of like-minded devs! [Connect on LinkedIn](https://www.linkedin.com/in/ritesh1908/)
5. ✉️ **Reach out via Email**: Contact me at **bonthalamadhavi1@gmail.com** for collaborations.

Looking forward to your PR! Happy coding! 🚀💻
