# Team Collaboration Guide

This document outlines the workflow and best practices for our 24-member team to collaborate effectively on GitHub.

## Branch Strategy

We use a feature-branch workflow centered around the following main branches:

- **`main`**: Production-ready code. Only merge here after thorough testing and approval.
- **`dev`**: Integration branch. All features are merged here first for integration testing.
- **`frontend`**: Validated frontend code.
- **`backend`**: Validated backend code.
- **`model`**: Validated AI/ML model code.

## Daily Workflow

1.  **Start your day**:
    ```bash
    git checkout dev
    git pull origin dev
    git checkout -b feature/your-feature-name
    ```

2.  **Work**:
    - Make small, frequent commits.
    - Write clear commit messages (e.g., `feat: Add login form`, `fix: Resolve token issue`).

3.  **End of Day (EOD) Submission**:
    - Push your feature branch to GitHub:
      ```bash
      git push origin feature/your-feature-name
      ```
    - Create a **Pull Request (PR)** targeting the `dev` branch.
    - Notify your team lead or reviewers.

## Code Review & Merging

- **No direct pushes** to `main`, `dev`, `frontend`, `backend`, or `model`.
- All changes must go through a Pull Request.
- **Review Requirement**: At least 1 peer review is required before merging.
- **CI/CD**: Ensure all automated checks pass.

## Repository Setup for New Members

1.  **Clone the repository**:
    ```bash
    git clone <repo-url>
    ```
2.  **Install dependencies**:
    ```bash
    npm install  # Frontend
    pip install -r requirements.txt # Backend/Model
    ```

## Merge Conflicts

If you encounter conflicts:
1.  Pull the latest `dev` branch into your feature branch:
    ```bash
    git pull origin dev
    ```
2.  Resolve conflicts locally.
3.  Commit the resolution and push.

---
**Happy Coding!**
