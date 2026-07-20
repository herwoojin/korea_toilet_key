/**
 * 화장실 핀 저장용 Google Apps Script Web App
 *
 * 대상 시트: https://docs.google.com/spreadsheets/d/16jRMOhiEmtWqdbL5OiPsTxT2b2K-prK00sE02eUAekw
 *
 * 설치 방법 (시트 소유자 계정에서):
 *  1. 위 시트 열기 → 메뉴 [확장 프로그램] → [Apps Script]
 *  2. 이 파일 전체를 붙여넣고 저장
 *  3. [배포] → [새 배포] → 유형 "웹 앱"
 *     - 실행 계정: 나(소유자)
 *     - 액세스 권한: 모든 사용자
 *  4. 생성된 웹 앱 URL(https://script.google.com/macros/s/…/exec)을
 *     Netlify 환경변수 SHEETS_WEBAPP_URL 에 등록
 *
 * 첫 요청 시 헤더 행이 없으면 자동 생성되므로 시트를 미리 손댈 필요 없음.
 */

var SHEET_ID = "16jRMOhiEmtWqdbL5OiPsTxT2b2K-prK00sE02eUAekw";
var HEADERS = [
  "id", "createdAt", "name", "storeName", "address", "lat", "lng",
  "malePw", "femalePw", "nickname", "uid", "correctCount", "wrongCount",
  "correctUids", "wrongUids", // 1인 1회 투표 기록 (uid 콤마 목록)
];

function getSheet_() {
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
  } else {
    // 구버전 시트 마이그레이션: 누락된 헤더 컬럼을 자동 추가
    var width = sh.getLastColumn();
    if (width < HEADERS.length) {
      sh.getRange(1, width + 1, 1, HEADERS.length - width)
        .setValues([HEADERS.slice(width)]);
    }
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/** 핀 전체 목록 */
function doGet() {
  var rows = getSheet_().getDataRange().getValues();
  var pins = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    var r = {};
    for (var j = 0; j < HEADERS.length; j++) r[HEADERS[j]] = rows[i][j];
    pins.push(r);
  }
  return json_({ ok: true, pins: pins });
}

/** action=add: 핀 추가 / action=feedback: 맞아요·틀려요 카운트 증가 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var body = JSON.parse(e.postData.contents);
    var sh = getSheet_();

    if (body.action === "add") {
      var p = body.pin || {};
      var id = "pin-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
      sh.appendRow([
        id, new Date().toISOString(),
        p.name || "", p.storeName || "", p.address || "",
        p.lat, p.lng, String(p.malePw || ""), String(p.femalePw || ""),
        p.nickname || "", p.uid || "", 0, 0, "", "",
      ]);
      return json_({ ok: true, id: id });
    }

    if (body.action === "feedback") {
      var rows = sh.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(body.id)) {
          // 1인 1회: correctUids(14열)·wrongUids(15열)에 uid가 이미 있으면 거부
          var uid = String(body.uid || "");
          var correctUids = String(rows[i][13] || "");
          var wrongUids = String(rows[i][14] || "");
          var voted = (correctUids + "," + wrongUids).split(",").indexOf(uid) !== -1;
          if (!uid || voted) {
            return json_({ ok: false, error: "ALREADY_VOTED" });
          }
          // 1-based 컬럼: correctCount=12, wrongCount=13, correctUids=14, wrongUids=15
          var isWrong = body.result === "wrong";
          var countCol = isWrong ? 13 : 12;
          var uidCol = isWrong ? 15 : 14;
          var uidList = isWrong ? wrongUids : correctUids;
          sh.getRange(i + 1, countCol).setValue(Number(rows[i][countCol - 1] || 0) + 1);
          sh.getRange(i + 1, uidCol).setValue(uidList ? uidList + "," + uid : uid);
          return json_({ ok: true });
        }
      }
      return json_({ ok: false, error: "NOT_FOUND" });
    }

    return json_({ ok: false, error: "BAD_REQUEST" });
  } finally {
    lock.releaseLock();
  }
}
