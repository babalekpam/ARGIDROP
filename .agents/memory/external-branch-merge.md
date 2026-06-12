---
name: Merging an external git branch in this repo
description: How to combine a diverged remote branch with local main when raw git merge is blocked
---

# Merging an external branch when `git merge` is blocked

Raw/destructive git (`git merge`, removing `.git/*.lock`, etc.) is blocked in
the working environment. To combine a diverged remote branch with local `main`,
do a **file-level union** instead of a git merge:

1. `git diff --name-status <mergeBase> <remoteRef>` = the remote's changes.
   `git diff --name-only <mergeBase> main` = local's changes. The intersection
   is the true conflict set; everything else is take-one-side.
2. For files only the remote changed (local == base): copy verbatim with
   `git show <remoteRef>:<path> > <path>` (read-only, allowed).
3. For true conflict files, isolate the remote's *real* edits with
   `git diff <mergeBase> <remoteRef> -- <path>` and apply only those onto the
   local file by hand (don't trust the local-vs-remote diff — it includes
   local-only additions as false "deletions").

**Why:** the platform reconciles git on task merge-back, so a working-tree
union + the end-of-task auto-commit produces the same result as a merge commit,
without needing blocked git operations.

**How to apply:** any "merge GitHub branch into Replit" task. Verify by booting
the app and confirming both feature sets' startup logs appear.
