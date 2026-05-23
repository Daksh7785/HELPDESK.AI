import subprocess
import json

REPO = "ritesh-1918/HELPDESK.AI"
ANNOUNCEMENT_MARKER = "Special Announcement from the Project Owner"

def gh_json(*args):
    r = subprocess.run(["gh"] + list(args), capture_output=True, check=False)
    out = r.stdout.strip()
    if not out:
        return None
    try:
        return json.loads(out)
    except Exception:
        return None

def gh_run(*args):
    subprocess.run(["gh"] + list(args), check=False)

def delete_comment(comment_id):
    # Use the API to delete a comment
    subprocess.run(
        ["gh", "api", "--method", "DELETE",
         f"/repos/{REPO}/issues/comments/{comment_id}"],
        check=False
    )

def get_issue_data(number):
    return gh_json("issue", "view", str(number), "--repo", REPO,
                   "--json", "author,comments")

def get_pr_data(number):
    return gh_json("pr", "view", str(number), "--repo", REPO,
                   "--json", "author,comments")

def collect_participants(data):
    """Collect all unique logins from author + commenters, excluding bot and owner."""
    logins = set()
    if not data:
        return logins
    author = data.get("author", {}).get("login", "")
    if author and author != "ritesh-1918":
        logins.add(author)
    for c in data.get("comments", []):
        login = c.get("author", {}).get("login", "")
        if login and login != "ritesh-1918":
            logins.add(login)
    return logins

def delete_old_announcements(data):
    """Delete previous announcement comments made by ritesh-1918."""
    if not data:
        return
    for c in data.get("comments", []):
        if (c.get("author", {}).get("login") == "ritesh-1918" and
                ANNOUNCEMENT_MARKER in c.get("body", "")):
            comment_id = c["id"].split("_")[-1] if "_" in c["id"] else c["id"]
            # Extract numeric ID from the URL instead
            url = c.get("url", "")
            if "issuecomment-" in url:
                comment_id = url.split("issuecomment-")[-1].split("#")[0]
                print(f"  Deleting old announcement comment {comment_id}...")
                delete_comment(comment_id)

def build_announcement(participants):
    tags = " ".join(f"@{p}" for p in sorted(participants))
    if tags:
        mention_line = f"\n\n{tags}\n"
    else:
        mention_line = ""

    return f"""🌟 **Special Announcement from the Project Owner — Please Read!** 🌟{mention_line}
Hey everyone! 👋 This is Ritesh, the owner of **HELPDESK.AI**.

First of all, a massive **THANK YOU** 🙏 to every single one of you who has contributed, raised issues, reviewed PRs, or even just engaged with this project. You are the reason this project is growing and improving every single day!

I have a small but **very meaningful** request for all of you:

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

# ── All issue numbers ──────────────────────────────────────────────────────────
ISSUE_NUMBERS = [55, 54, 52, 51, 50, 49, 48, 47, 46, 44, 41, 40, 39, 38, 35, 32, 31, 30, 28, 27, 26, 25, 24]

# ── All PR numbers that had real contributors ──────────────────────────────────
PR_NUMBERS = [60, 59, 58, 57, 56, 53, 45, 43, 42, 37, 36, 34, 33, 29]

print("=" * 60)
print("Processing ISSUES...")
print("=" * 60)

for num in ISSUE_NUMBERS:
    print(f"\nIssue #{num}:")
    data = get_issue_data(num)
    participants = collect_participants(data)
    print(f"  Participants: {participants if participants else '(none besides owner)'}")
    delete_old_announcements(data)
    body = build_announcement(participants)
    gh_run("issue", "comment", str(num), "--repo", REPO, "--body", body)
    print(f"  Posted announcement on issue #{num}")

print()
print("=" * 60)
print("Processing PRs...")
print("=" * 60)

for num in PR_NUMBERS:
    print(f"\nPR #{num}:")
    data = get_pr_data(num)
    participants = collect_participants(data)
    print(f"  Participants: {participants if participants else '(none besides owner)'}")
    delete_old_announcements(data)
    body = build_announcement(participants)
    gh_run("pr", "comment", str(num), "--repo", REPO, "--body", body)
    print(f"  Posted announcement on PR #{num}")

print()
print("All announcements posted successfully!")
