# Git ワークフロー管理指針

## 🎯 目的
CDK + Amplify環境でのリポジトリ混乱を防ぎ、安定した開発・デプロイ環境を維持する

## 🛡️ ブランチ保護戦略

### 1. mainブランチ（本番環境）
```
🔒 絶対ルール：直接プッシュ禁止
✅ 用途：本番環境への自動デプロイのみ
✅ 変更方法：Pull Requestのみ
✅ 保護対象：CDK設定、Lambda関数、重要設定
```

### 2. developmentブランチ（開発メイン）
```
🔧 用途：日常的な開発作業
✅ 直接プッシュ：OK（小さな修正）
✅ テスト：ローカル環境で十分確認後
✅ マージ：main へはPRでレビュー後
```

### 3. feature/ブランチ（機能開発）
```
🚀 命名例：feature/remove-login, feature/new-analysis
✅ 用途：大きな機能追加・変更
✅ 作業：independentに開発
✅ 完了後：development にマージ
```

## ⚡ 実際の作業フロー

### 日常の小さな修正
```bash
git checkout development
git pull origin development
# 修正作業
git add -A && git commit -m "fix: 修正内容"
git push origin development
```

### 大きな機能追加
```bash
git checkout development
git checkout -b feature/新機能名
# 開発作業
git add -A && git commit -m "feat: 新機能"
git push origin feature/新機能名
# GitHub でPR作成: feature/新機能名 → development
```

### 本番リリース
```bash
# developmentで十分テスト完了後
# GitHub でPR作成: development → main
# PR承認後 → 自動的にAmplify + CDKデプロイ
```

## 🚨 トラブル回避ルール

### ❌ やってはいけないこと
1. **mainに直接プッシュ** - Amplifyが混乱する
2. **複数ブランチを同時編集** - マージ競合の原因
3. **CDK設定の実験** - developmentでも慎重に
4. **コミット取り消し** - 共有後は絶対禁止

### ✅ 必ずやること
1. **作業前にpull** - 最新状態で開始
2. **ローカルテスト** - npm run build で確認
3. **コミットメッセージ統一** - feat/fix/docs形式
4. **一機能一コミット** - 細かく分割

## 🔧 リカバリ手順

### もし混乱したら
```bash
# 1. 現在の状況確認
git status
git log --oneline -10

# 2. 安全な場所に避難
git stash  # 変更を一時保存

# 3. クリーンな状態に戻る
git checkout main
git pull origin main

# 4. 新しいブランチで再開
git checkout -b recovery-作業内容
git stash pop  # 変更を復元
```

## 📊 CDK + Amplify 連携のコツ

### 環境変数変更時
```bash
# 1. developmentブランチで変更
git checkout development
# CDKファイル編集
npm run build  # ローカル確認
git commit -m "feat: 環境変数更新"

# 2. CDK環境更新（開発用スタック作成推奨）
cdk deploy SapDevelopmentStack

# 3. 問題なければmainにPR
```

### 緊急修正時
```bash
git checkout main
git checkout -b hotfix/緊急修正内容
# 修正
git commit -m "hotfix: 緊急修正"
git push origin hotfix/緊急修正内容
# 即座にPR → main
```

## 🎯 成功の鍵

1. **mainは聖域** - 常に動作する状態を維持
2. **小さく頻繁に** - 大きな変更は分割
3. **テスト必須** - ローカルでの動作確認
4. **コミュニケーション** - チーム内での変更共有

この方針で、AWSコンサル不要の安定運用が実現できます！

---
🤖 Generated with [Claude Code](https://claude.ai/code)