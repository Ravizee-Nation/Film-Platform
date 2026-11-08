# Branch protection and repository settings (Phase 0 criterion 15)

These settings need a repository admin. They make the agreed quality gates mandatory, so nothing
merges into `main` unless every CI check passes and the pull request is approved.

Do this **after the Phase 0 pull request's checks have run at least once**: GitHub only offers
status checks it has already seen.

## 1. Protect `main` with a ruleset

### Option A: in the browser

1. Open the repository on GitHub > **Settings** > **Rules** > **Rulesets** > **New ruleset** >
   **New branch ruleset**.
2. Name: `Protect main`. Enforcement status: **Active**.
3. Bypass list: leave empty (recommended) so the gates apply to everyone.
4. Target branches: **Add target** > **Include default branch**.
5. Turn on:
   - **Restrict deletions**
   - **Block force pushes**
   - **Require linear history**
   - **Require a pull request before merging**, with:
     - Required approvals: **0** while there is one maintainer, **1** once there are two (see section 2)
     - **Dismiss stale pull request approvals when new commits are pushed**
     - **Require conversation resolution before merging**
   - **Require status checks to pass**, with **Require branches to be up to date before merging**,
     and add each of these checks:
     `lint`, `typecheck`, `boundaries`, `unit`, `api-integration`, `contract`, `migrations`, `web`,
     `mobile`, `codeql`, `secrets`, `dependency-review`
6. **Create**.

### Option B: with the GitHub CLI

From the repository root, as an admin:

```bash
gh api repos/Ravizee-Nation/Film-Platform/rulesets -X POST --input docs/github/ruleset-main.json
```

## 2. Code owners and approvals

Recommended for the current ownership (one maintainer, `patchworkeducation-lab`, who is also the
author of pull requests opened from Claude sessions):

1. `.github/CODEOWNERS` reads `* @patchworkeducation-lab` (done on 2026-11-08; the owner confirmed
   this account is the sole authorized maintainer).
2. In the ruleset: **Required approvals: 0**, **Require review from Code Owners: off**, all status
   checks required, no bypass actors. GitHub doesn't let you approve your own pull request, so a
   required approval would block every merge, while required checks still enforce every gate.
3. When a second maintainer joins: point CODEOWNERS at them or a team (for example
   `@Ravizee-Nation/maintainers`), set **Required approvals: 1**, and turn on **Require review from
   Code Owners** and **Dismiss stale pull request approvals**.

`docs/github/ruleset-main.json` matches the one-maintainer setup: 0 required approvals and no
mandatory code-owner review. When a second maintainer joins, change
`required_approving_review_count` to `1` and `require_code_owner_review` to `true`.

## 3. Security settings

**Settings** > **Advanced Security** (called **Code security** on some accounts):

- **Dependency graph**: Enable. **Required:** the `dependency-review` CI check fails with
  "Dependency review is not supported on this repository" until this is on.
- **Dependabot alerts**: Enable
- **Dependabot security updates**: Enable
- **Secret scanning**: Enable, and **Push protection**: Enable
- **Private vulnerability reporting**: Enable (`SECURITY.md` links to it)
- **Code scanning**: leave **default setup off**. The `security.yml` workflow runs CodeQL itself, and
  default setup would conflict with it.

These are free while the repository is public.

## 4. Actions settings

**Settings** > **Actions** > **General**:

- **Workflow permissions**: **Read repository contents and packages permissions** (the workflows
  request anything extra per job).
- Leave **Allow GitHub Actions to create and approve pull requests** unchecked.

## 5. Check it worked

- Open the Phase 0 pull request: the merge button should say merging is blocked until the
  required checks pass and a review is given.
- `gh api repos/Ravizee-Nation/Film-Platform/rulesets` lists `Protect main`.
