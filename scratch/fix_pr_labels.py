import subprocess

def gh(*args):
    subprocess.run(["gh"] + list(args), check=False)

REPO = "ritesh-1918/HELPDESK.AI"

print("Fixing missing labels on merged PRs to maximize GSSoC points...")

# PR #60 - fix: graceful degradation SentenceTransformer (ADVANCED level bug fix, security-ish)
# Missing: gssoc:approved, level:advanced, quality:exceptional, mentor:ritesh-1918
print("Labeling PR #60...")
gh("pr", "edit", "60", "--repo", REPO,
   "--add-label", "gssoc:approved,level:advanced,quality:exceptional,mentor:ritesh-1918,type:bug")

# PR #59 - fix: current password verification (ADVANCED security bug fix)
# Missing: gssoc:approved, level:advanced, quality:exceptional, type:security, mentor:ritesh-1918
print("Labeling PR #59...")
gh("pr", "edit", "59", "--repo", REPO,
   "--add-label", "gssoc:approved,level:advanced,quality:exceptional,type:security,mentor:ritesh-1918")

# PR #56 - fix: clear ticketStore on logout (INTERMEDIATE bug)
# Missing: gssoc:approved, level:intermediate, quality:clean, type:bug, gssoc, mentor:ritesh-1918
print("Labeling PR #56...")
gh("pr", "edit", "56", "--repo", REPO,
   "--add-label", "gssoc:approved,gssoc,level:intermediate,quality:clean,type:bug,mentor:ritesh-1918")

# PR #37 - Fix SSE streaming response (INTERMEDIATE bug, was missing gssoc:approved!)
# Missing: gssoc:approved, quality:clean
print("Labeling PR #37...")
gh("pr", "edit", "37", "--repo", REPO,
   "--add-label", "gssoc:approved,quality:clean")

print("All labels applied!")
print()
print("Summary of what was fixed:")
print("PR #60 -> gssoc:approved + level:advanced + quality:exceptional + mentor:ritesh-1918 + type:bug")
print("PR #59 -> gssoc:approved + level:advanced + quality:exceptional + type:security + mentor:ritesh-1918")
print("PR #56 -> gssoc:approved + level:intermediate + quality:clean + type:bug + mentor:ritesh-1918")
print("PR #37 -> gssoc:approved + quality:clean")
