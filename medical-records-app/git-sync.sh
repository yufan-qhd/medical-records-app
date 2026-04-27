#!/bin/bash

cd "$(git rev-parse --show-toplevel)" || exit 1

git add -A

CHANGED=$(git status --porcelain)

if [ -z "$CHANGED" ]; then
  echo "没有变更需要提交"
  exit 0
fi

echo "检测到以下变更："
echo "$CHANGED"
echo ""

COMMIT_MSG="自动同步：$(date '+%Y-%m-%d %H:%M:%S')"

git commit -m "$COMMIT_MSG"

git push origin main

echo "代码已同步到 GitHub"
