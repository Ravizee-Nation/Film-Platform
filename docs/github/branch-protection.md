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
     - Required approvals: **1**
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

## 2. Code owners (optional but recommended)

1. Edit `.github/CODEOWNERS`: replace `@YOUR-GITHUB-USERNAME` with your username or a team, and
   uncomment the line.
2. In the ruleset, turn on **Require review from Code Owners**.

> **One-person teams:** GitHub doesn't let you approve your own pull request. If you are the only
> person with write access, and pull requests are opened from your account, a required approval
> blocks every merge. In that case either add a second reviewer, or set required approvals to 0
> and keep all the status checks required. The CI gates still apply either way.

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
