# Internet Court ⚖️🌐

> 匿名で日常の「罪」を告白し、参加者全員で裁くリアルタイム参加型Webアプリケーション

![Platform](https://img.shields.io/badge/Platform-Web-blue)
![Language](https://img.shields.io/badge/Language-JavaScript-yellow)
![Backend](https://img.shields.io/badge/Backend-Node.js-green)
![Database](https://img.shields.io/badge/Database-SQLite-blue)
![Realtime](https://img.shields.io/badge/Realtime-Socket.io-red)

![Main Screen](image/main-screen.png)

利用者は匿名で自身の日常の失敗や後ろめたい出来事を投稿し、他の参加者は「有罪」「無罪」への投票や「心中お察し」による共感を行うことができます。

一定時間後、投票割合を反映したルーレットによって判決が決定されるリアルタイム参加型エンターテインメントシステムです。

---

## 🎬 デモ動画

投稿、投票、心中お察し、ランキング、判決ルーレットまでの一連の流れを確認できます。

[▶ デモ動画を見る](image/demo-movie.mp4)

> ※ GitHub上で動画を直接再生したい場合は、README編集画面に動画ファイルをドラッグ＆ドロップし、生成されたURLをここに貼ると表示されやすくなります。

---

# 🚀 作成背景

SNSでは日々、多くの人が失敗談や出来事を共有しています。

本作品では、

**「もし日常の小さな罪をインターネット上で裁判にかけたらどうなるのか？」**

という発想から制作しました。

単なる投票システムではなく、

- 匿名投稿
- リアルタイム投票
- 共感機能
- ルーレット判決

を組み合わせることで、

**「インターネットの世論」**

を体験できる作品を目指しました。

---

# 🎮 主な機能

## ⚖️ 匿名投稿

利用者は匿名で罪を投稿できます。

- 名前入力（任意）
- 罪状入力
- リアルタイム追加

---

## 🗳️ 有罪・無罪投票

![Vote Screen](image/vote-screen.png)

各投稿に対して

- 有罪
- 無罪

のどちらか一票だけ投票できます。

投票後は

- 選択したボタンは色付き
- 選択していないボタンはグレースケール表示

になります。

---

## 💛 心中お察し

![Sympathy Screen](image/sympathy-screen.png)

有罪・無罪では表現できない

**「気持ちは分かる」**

を表現するボタンです。

- 一人一回のみ
- 共感人数を表示
- 押すと黄色に変化

---

## 📈 ランキング

![Ranking Screen](image/ranking-screen.png)

右上タブから

- 投票人数ランキング
- 心中お察しランキング

を表示できます。

リアルタイムで順位が更新されます。

---

## 🎲 判決ルーレット

![Roulette Screen](image/roulette-screen.png)

一定時間経過後、投票割合をもとに

- 有罪
- 無罪

の割合を持つルーレットを生成します。

ボタンを押すことでルーレットが回転し、最終判決が決定します。

単なる多数決ではなく、投票割合を反映したランダム性のある判決演出にすることで、最後まで結果が分からない体験を実現しました。

---

# ⚙️ システム構成

```text
       ブラウザ
           │
           │ Socket.io
           ▼
+----------------------+
|      Node.js         |
|      Express         |
|     Socket.io        |
+----------------------+
           │
           │ SQL
           ▼
+----------------------+
|       SQLite         |
+----------------------+
```

---

# 💻 注目コード

## ランキング機能

投稿を参加人数順に並び替えています。

```javascript
const sorted = [...crimes].sort((a, b) => {
    const aTotal = a.guilty + a.innocent;
    const bTotal = b.guilty + b.innocent;
    return bTotal - aTotal;
});
```

---

## 心中お察し

共感人数を更新します。

```sql
UPDATE crimes
SET sympathy = sympathy + 1
WHERE id = ?
```

---

## 判決決定

投票割合から判決を決定します。

```javascript
const guiltyRate = total > 0
    ? guilty / total
    : 0.5;

const verdict =
    Math.random() < guiltyRate
        ? "guilty"
        : "innocent";
```

---

# 💡 工夫した点

### リアルタイム通信

Socket.ioを利用することで、投稿・投票・コメント・判決を全ユーザーへ即時反映できるようにしました。

これにより、複数人が同時に参加している感覚を生み出しています。

---

### 共感機能

有罪・無罪だけでは表現できない

**「心中お察し」**

を導入しました。

裁くか許すかだけではなく、投稿者に共感する余地を作ることで、より参加しやすい体験にしています。

---

### ランキング

投稿順ではなく、参加人数や共感数によって順位が変化する仕組みを実装しました。

これにより、盛り上がっている投稿がひと目で分かるようになっています。

---

### 判決演出

単なる多数決ではなく、投票割合を反映したルーレット演出により、最後まで判決が分からない体験を実現しました。

有罪票が多いほど有罪になりやすく、無罪票が多いほど無罪になりやすい一方で、完全に確定ではないため、ゲーム性のある判決体験になっています。

---

# 🛠 使用技術

| カテゴリ | 技術 |
|---|---|
| Frontend | HTML / CSS / JavaScript |
| Backend | Node.js / Express |
| Realtime | Socket.io |
| Database | SQLite |
| 公開 | ngrok |
| 開発環境 | Visual Studio Code |

---

# 🔮 今後の展望

- Firebaseへの移行
- ユーザー認証
- 管理画面
- 判決履歴
- AIによるコメント生成
- 判決アニメーション強化
- 通知機能
- モバイルUI改善

---

# 📄 License

MIT License
