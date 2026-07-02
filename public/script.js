const socket = io();

const nameInput = document.getElementById("nameInput");
const crimeInput = document.getElementById("crimeInput");
const submitBtn = document.getElementById("submitBtn");
const list = document.getElementById("crimeList");

// ranking
const rankingBtn = document.getElementById("rankingBtn");
const rankingPanel = document.getElementById("rankingPanel");
const rankingClose = document.getElementById("rankingClose");
const backdrop = document.getElementById("backdrop");
const tabParticipation = document.getElementById("tabParticipation");
const tabSympathy = document.getElementById("tabSympathy");
const rankingList = document.getElementById("rankingList");

// roulette
const rouletteOverlay = document.getElementById("rouletteOverlay");
const rouletteWheel = document.getElementById("rouletteWheel");
const rouletteMeta = document.getElementById("rouletteMeta");
const rouletteResult = document.getElementById("rouletteResult");
const rouletteClose = document.getElementById("rouletteClose");
const rouletteSpin = document.getElementById("rouletteSpin");
const rouletteReplay = document.getElementById("rouletteReplay");

// detail
const urlParams = new URLSearchParams(window.location.search);
const crimeId = urlParams.get("id");

let myId = null;
let latestCrimes = [];
let rankingMode = "participation";

let currentRouletteCrime = null;
let isSpinning = false;

socket.on("connect", () => { myId = socket.id; });

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(iso) {
  if (!iso) return "不明";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "不明";
  return d.toLocaleString("ja-JP");
}

function remainingSec(closeAtIso) {
  const t = new Date(closeAtIso).getTime() - Date.now();
  return Math.max(0, Math.ceil(t / 1000));
}

function keyGI(id) { return `GI_${id}`; }
function keySym(id) { return `SYM_${id}`; }
function keyRouletteSeen(id) { return `ROULETTE_${id}`; }

// ===== vote =====
window.vote = function (id, type) {
  if (type === "guilty" || type === "innocent") {
    if (localStorage.getItem(keyGI(id))) return;
    socket.emit("vote", { id, type });
    localStorage.setItem(keyGI(id), type);
    return;
  }
  if (type === "sympathy") {
    if (localStorage.getItem(keySym(id))) return;
    socket.emit("vote", { id, type });
    localStorage.setItem(keySym(id), "1");
    return;
  }
};

// ===== submit =====
if (submitBtn) {
  submitBtn.onclick = () => {
    const text = crimeInput.value.trim();
    const name = (nameInput?.value.trim() || "") || "名無し";
    if (!text) return;

    socket.emit("newCrime", { text, name });
    crimeInput.value = "";
    if (nameInput) nameInput.value = "";
  };
}

// ===== updates =====
socket.on("updateCrimes", (crimes) => {
  latestCrimes = Array.isArray(crimes) ? crimes : [];
  if (list) renderCrimes(latestCrimes);
  renderRanking();
});

// ===== render list =====
function renderCrimes(crimes) {
  list.innerHTML = "";

  crimes.forEach((c) => {
    const div = document.createElement("div");
    div.className = "crime";
    div.id = `crime-${c.id}`;
    div.onclick = () => { window.location.href = `detail.html?id=${c.id}`; };

    const myVoteSocket = myId && c.votedGI && c.votedGI[myId];
    const myVoteLocal = localStorage.getItem(keyGI(c.id));
    const myVote = myVoteSocket || myVoteLocal || null;

    const votedSymSocket = myId && (c.votedSym || []).includes(myId);
    const votedSymLocal = !!localStorage.getItem(keySym(c.id));
    const votedSym = votedSymSocket || votedSymLocal;

    const isClosed = (Date.now() >= new Date(c.closeAt).getTime()) || c.status === "judged";
    const sec = remainingSec(c.closeAt);

    const guiltyClass = myVote === "innocent" ? "disabled" : "";
    const innocentClass = myVote === "guilty" ? "disabled" : "";

    const seen = !!localStorage.getItem(keyRouletteSeen(c.id));
    const verdictBadge = (c.status === "judged" && seen)
      ? `<div class="verdict-badge ${c.verdict === "guilty" ? "vg" : "vi"}">
          🎰 判決：${c.verdict === "guilty" ? "有罪" : "無罪"}
          <span class="verdict-sub-mini">（有罪率 ${Math.round((c.guiltyRate ?? 0.5) * 100)}%）</span>
        </div>`
      : "";

    const timerLine = c.status === "judged"
      ? `<div class="timer-line closed">投票終了</div>`
      : `<div class="timer-line">締切まで：<b>${sec}</b>秒</div>`;

    const rouletteBtnHtml = (c.status === "judged")
      ? `<button class="roulette-open" onclick="event.stopPropagation(); openRoulette(${c.id});">
           🎰 判決スタート
         </button>`
      : "";

    div.innerHTML = `
      <p class="crime-name">被告：${escapeHtml(c.name)}</p>
      <p class="crime-time">投稿日時：${formatDate(c.createdAt)}</p>
      ${timerLine}
      <p class="crime-text">罪状：${escapeHtml(c.text)}</p>

      ${rouletteBtnHtml}
      ${verdictBadge}

      <div class="buttons">
        <button class="guilty ${guiltyClass}"
          onclick="event.stopPropagation(); vote(${c.id}, 'guilty')"
          ${(myVote || isClosed) ? "disabled" : ""}>
          🔥 有罪 (${c.guilty})
        </button>

        <button class="innocent ${innocentClass}"
          onclick="event.stopPropagation(); vote(${c.id}, 'innocent')"
          ${(myVote || isClosed) ? "disabled" : ""}>
          🕊️ 無罪 (${c.innocent})
        </button>

        <button class="sympathy ${votedSym ? "voted" : ""}"
          onclick="event.stopPropagation(); vote(${c.id}, 'sympathy')"
          ${votedSym ? "disabled" : ""}>
          🙏 心中お察し (${c.sympathy})
        </button>
      </div>
    `;

    list.appendChild(div);
  });
}

if (list) {
  setInterval(() => {
    if (!latestCrimes.length) return;
    renderCrimes(latestCrimes);
  }, 1000);
}

// ===== ranking =====
function getParticipationCount(c) { return Object.keys(c.votedGI || {}).length; }
function getSympathyCount(c) { return (c.votedSym || []).length; }

function renderRanking() {
  if (!rankingList || !rankingPanel?.classList.contains("open")) return;

  const crimes = [...latestCrimes];
  crimes.sort((a, b) => {
    if (rankingMode === "participation") return getParticipationCount(b) - getParticipationCount(a);
    return getSympathyCount(b) - getSympathyCount(a);
  });

  const top = crimes.slice(0, 10);
  if (!top.length) {
    rankingList.innerHTML = `<div class="ranking-empty">まだ罪状がありません。</div>`;
    return;
  }

  rankingList.innerHTML = top.map((c, idx) => {
    const p = getParticipationCount(c);
    const s = getSympathyCount(c);
    const text = String(c.text || "");
    const shortText = text.length > 48 ? text.slice(0, 48) + "…" : text;
    const metric = (rankingMode === "participation") ? `参加者：${p}人` : `心中お察し：${s}人`;

    return `
      <div class="rank-item" onclick="location.href='detail.html?id=${c.id}'">
        <div class="rank-left"><div class="rank-num">${idx + 1}位</div></div>
        <div class="rank-main">
          <div class="rank-head">
            <div class="rank-name">被告：${escapeHtml(c.name)}</div>
            <div class="rank-metric">${metric}</div>
          </div>
          <div class="rank-crime">罪状：${escapeHtml(shortText)}</div>
          <div class="rank-sub">
            <span>🔥 ${c.guilty}</span>
            <span>🕊️ ${c.innocent}</span>
            <span>🙏 ${c.sympathy}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function openRanking() {
  rankingPanel.classList.add("open");
  backdrop?.classList.add("show");
  renderRanking();
}
function closeRanking() {
  rankingPanel.classList.remove("open");
  backdrop?.classList.remove("show");
}

if (rankingBtn) {
  rankingBtn.onclick = () => rankingPanel.classList.contains("open") ? closeRanking() : openRanking();
  rankingClose.onclick = closeRanking;
  backdrop.onclick = closeRanking;

  tabParticipation.onclick = () => {
    rankingMode = "participation";
    tabParticipation.classList.add("active");
    tabSympathy.classList.remove("active");
    renderRanking();
  };

  tabSympathy.onclick = () => {
    rankingMode = "sympathy";
    tabSympathy.classList.add("active");
    tabParticipation.classList.remove("active");
    renderRanking();
  };
}

// ===== roulette helpers =====
function randInt(min, max) {
  const a = Math.ceil(min);
  const b = Math.floor(max);
  if (b <= a) return a;
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

// conic-gradient の 0deg は「上」方向。
// ポインタも上に置くので、止めたい角度 targetAngle が「上」に来るように回転させる。
// (targetAngle + rotation) % 360 = 0 になる rotation → rotation = -targetAngle (+ 360k)
function pickAngleInSegment(guiltyDeg, verdict) {
  // 端のチラつき回避で少し内側に寄せる
  const margin = 6;

  if (verdict === "guilty") {
    const start = 0 + margin;
    const end = Math.max(start + 1, guiltyDeg - margin);
    return randInt(start, Math.max(start, end));
  } else {
    const start = Math.min(359, guiltyDeg + margin);
    const end = 360 - margin;
    return randInt(start, Math.max(start, end));
  }
}

// ===== roulette open =====
window.openRoulette = function (crimeId) {
  const c = latestCrimes.find((x) => x.id === crimeId);
  if (!c || c.status !== "judged") return;

  currentRouletteCrime = c;
  isSpinning = false;

  const guiltyRate = (typeof c.guiltyRate === "number") ? c.guiltyRate : 0.5;
  const guiltyDeg = Math.round(guiltyRate * 3600) / 10; // 小数1桁で綺麗に

  // ✅ 赤=有罪 / 白=無罪
  rouletteWheel.style.background =
    `conic-gradient(#ff2d2d 0deg ${guiltyDeg}deg, #ffffff ${guiltyDeg}deg 360deg)`;

  rouletteWheel.style.transition = "none";
  rouletteWheel.style.transform = "rotate(0deg)";
  void rouletteWheel.offsetWidth;

  rouletteResult.innerHTML = "";
  rouletteMeta.innerHTML = `
    <div><b>被告：</b>${escapeHtml(c.name)}</div>
    <div><b>罪状：</b>${escapeHtml(c.text)}</div>
    <div class="roulette-meta-sub">有罪率 ${Math.round(guiltyRate * 100)}%（締切時の投票比率）</div>
  `;

  rouletteSpin.style.display = "inline-flex";
  rouletteReplay.style.display = "none";

  rouletteOverlay.classList.add("show");
};

// close overlay
function closeRoulette() {
  rouletteOverlay.classList.remove("show");
  currentRouletteCrime = null;
  isSpinning = false;
}

rouletteClose?.addEventListener("click", closeRoulette);
rouletteOverlay?.addEventListener("click", (e) => {
  if (e.target === rouletteOverlay) closeRoulette();
});

// spin
function spinOnce() {
  if (!currentRouletteCrime || isSpinning) return;
  isSpinning = true;

  const c = currentRouletteCrime;
  const guiltyRate = (typeof c.guiltyRate === "number") ? c.guiltyRate : 0.5;
  const guiltyDeg = Math.round(guiltyRate * 360);

  // ✅ 罪ごとの確定結果
  const verdict = c.verdict; // "guilty" | "innocent"

  // ✅ 同じ結果でも「止まる位置」を毎回ランダムにする（＝見た目がいつも同じにならない）
  const targetAngle = pickAngleInSegment(guiltyDeg, verdict);

  const spins = randInt(6, 10);
  const finalRotation = spins * 360 - targetAngle;

  rouletteWheel.style.transition = "transform 2.8s cubic-bezier(0.12, 0.85, 0.18, 1)";
  rouletteWheel.style.transform = `rotate(${finalRotation}deg)`;

  rouletteResult.innerHTML = `<div class="roulette-wait">審理中…</div>`;
  rouletteSpin.style.display = "none";

  setTimeout(() => {
    const label = verdict === "guilty" ? "🔥 有罪" : "🕊️ 無罪";
    rouletteResult.innerHTML = `
      <div class="roulette-final ${verdict === "guilty" ? "vg" : "vi"}">
        判決：<b>${label}</b>
      </div>
    `;

    // ✅ ルーレット後にだけ一覧に判決を表示
    localStorage.setItem(keyRouletteSeen(c.id), "1");
    if (list) renderCrimes(latestCrimes);

    rouletteReplay.style.display = "inline-flex";
    isSpinning = false;
  }, 3000);
}

rouletteSpin?.addEventListener("click", spinOnce);
rouletteReplay?.addEventListener("click", () => {
  if (!currentRouletteCrime) return;

  rouletteWheel.style.transition = "none";
  rouletteWheel.style.transform = "rotate(0deg)";
  void rouletteWheel.offsetWidth;

  rouletteResult.innerHTML = "";
  rouletteSpin.style.display = "inline-flex";
  rouletteReplay.style.display = "none";
  isSpinning = false;
});

// ===== detail page =====
if (crimeId) {
  socket.emit("getCrimeDetail", crimeId);
  setInterval(() => socket.emit("getCrimeDetail", crimeId), 1000);
}

socket.on("crimeDetail", (data) => {
  const title = document.getElementById("crimeTitle");
  const status = document.getElementById("voteStatus");
  const meta = document.getElementById("crimeMeta");
  const verdictBox = document.getElementById("verdictBox");

  if (!data || !title) return;

  title.innerText = `罪状：${data.text}`;
  if (meta) meta.innerText = `被告：${data.name} ／ 投稿日時：${formatDate(data.createdAt)} ／ 締切：${formatDate(data.closeAt)}`;
  if (status) status.innerText = `投票：🔥 ${data.guilty} ｜ 🕊️ ${data.innocent} ｜ 🙏 ${data.sympathy}`;

  if (verdictBox) {
    if (data.status === "judged") {
      const rate = Math.round(((data.guiltyRate ?? 0.5) * 100));
      verdictBox.innerHTML = `
        <div class="verdict-big ${data.verdict === "guilty" ? "vg" : "vi"}">
          🎰 判決：<b>${data.verdict === "guilty" ? "有罪" : "無罪"}</b>
          <div class="verdict-sub">有罪率 ${rate}% で抽選</div>
        </div>
      `;
    } else {
      verdictBox.innerHTML = `<div class="verdict-wait">締切まで：<b>${remainingSec(data.closeAt)}</b>秒</div>`;
    }
  }

  renderComments(data.comments || []);
});

const submitComment = document.getElementById("submitComment");
if (submitComment) {
  submitComment.onclick = () => {
    const input = document.getElementById("commentInput");
    const text = input?.value.trim();
    if (!text) return;
    socket.emit("newComment", { crimeId, text });
    if (input) input.value = "";
  };
}

socket.on("updateComments", ({ crimeId: updatedId, comments }) => {
  if (!crimeId) return;
  if (String(updatedId) !== String(crimeId)) return;
  renderComments(comments || []);
});

function renderComments(comments) {
  const commentList = document.getElementById("commentList");
  if (!commentList) return;

  commentList.innerHTML = "";
  if (!comments.length) {
    commentList.innerHTML = `<div class="comment-empty">まだ禊コメントがありません。</div>`;
    return;
  }

  comments.forEach((c) => {
    const div = document.createElement("div");
    div.className = "comment-item";
    div.innerText = c;
    commentList.appendChild(div);
  });
}