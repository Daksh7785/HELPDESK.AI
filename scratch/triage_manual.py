import subprocess

def run(args):
    subprocess.run(["gh"] + args, check=False)

# Labels
run(["issue", "edit", "55", "--repo", "ritesh-1918/HELPDESK.AI", "--add-label", "bug,gssoc,level:intermediate,type:bug"])
run(["issue", "edit", "54", "--repo", "ritesh-1918/HELPDESK.AI", "--add-label", "bug,gssoc,level:advanced,type:bug"])
run(["pr", "edit", "60", "--repo", "ritesh-1918/HELPDESK.AI", "--add-label", "gssoc,type:bug"])
run(["pr", "edit", "59", "--repo", "ritesh-1918/HELPDESK.AI", "--add-label", "gssoc,type:bug"])

# Comments
c55 = """Hi @kamalsharma001,

Thank you for reporting this issue! 🙌 
It's a really great catch on how the original language and text are being dropped during the AI processing state transfer. Multilingual support is important for us!

We appreciate your effort and encourage you to continue working on this via the `gssoc` branch. 
If you are new to the project, please make sure to follow the onboarding steps:
1. Sign-up on the platform
2. Select *Ritesh Private Limited* as your company
3. Verify your email
4. Request access via an issue here on GitHub
5. Wait for approval before testing

Feel free to ask any questions. 🚀

Best,
Ritesh"""

c54 = """Hi @harshitanagpal05,

Thank you for bringing this to our attention! 🙌 
Making sure the backend degrades gracefully when the SentenceTransformer model isn't available offline is a fantastic improvement.

We appreciate your effort and encourage you to continue working on the `gssoc` branch.
If you are new, please follow the onboarding steps:
1. Sign-up
2. Select *Ritesh Private Limited*
3. Verify email
4. Request access via an issue
5. Wait for approval

Feel free to ask any questions. 🚀

Best,
Ritesh"""

c60 = """Hi @harshitanagpal05,

Thank you so much for the PR to fix the SentenceTransformer offline loading issue! 🙌 
This is a much-needed fix for local development. I see you've already added the graceful degradation pattern, which looks great.

We appreciate your effort and encourage you to ensure all your commits are targeted at the `gssoc` branch.
If you are new, please make sure to complete the onboarding steps to test the backend fully:
1. Sign-up
2. Select *Ritesh Private Limited*
3. Verify email
4. Request access via an issue
5. Wait for approval

Feel free to ask any questions if you run into issues. 🚀

Best,
Ritesh"""

c59 = """Hi @ayushi2577,

Thank you for this security fix! 🙌 
Adding current password verification before allowing a password update is a crucial enhancement to prevent unauthorized account takeovers.

We appreciate your effort and encourage you to continue working on the `gssoc` branch.
If you are new, please follow the onboarding steps to test your changes:
1. Sign-up
2. Select *Ritesh Private Limited*
3. Verify email
4. Request access via an issue
5. Wait for approval

Feel free to ask any questions. 🚀

Best,
Ritesh"""

run(["issue", "comment", "55", "--repo", "ritesh-1918/HELPDESK.AI", "--body", c55])
run(["issue", "comment", "54", "--repo", "ritesh-1918/HELPDESK.AI", "--body", c54])
run(["pr", "comment", "60", "--repo", "ritesh-1918/HELPDESK.AI", "--body", c60])
run(["pr", "comment", "59", "--repo", "ritesh-1918/HELPDESK.AI", "--body", c59])
