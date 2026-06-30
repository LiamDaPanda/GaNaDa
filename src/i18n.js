// i18n.js — UI translations. The Korean *letters* you draw never change; this
// only translates the surrounding interface between 한국어 and English.

const STRINGS = {
  ko: {
    'hud.wave': '물결', 'hud.score': '점수', 'hud.best': '최고', 'hud.combo': '콤보',
    'bar.gate': '성문', 'bar.ink': '먹',
    'btn.hold': '모아 그리기', 'btn.holding': '그리는 중…', 'btn.cast': '시전',
    'btn.start': '시작하기', 'btn.restart': '다시 도전', 'btn.skip': '건너뛰기',
    'banner.wave': '{w}번째 물결!', 'banner.boss': '도깨비 대장 출현',
    'toast.noInk': '먹이 부족!', 'toast.nice': '좋아요!', 'toast.done': '완료!',
    'toast.double': '쌍 {j}!', 'toast.combine': '조합 {j}!', 'toast.final': '받침 {j}!',
    'toast.cluster': '겹받침 {j}!', 'toast.waveClear': '물결 클리어! +보너스',
    'toast.gateHeal': '성문 +{n}', 'toast.combo': '{n} 콤보! x{m}',
    'compose.addVowel': '모음을 더 그려보세요', 'compose.keepGoing': '계속 그리고 시전',
    'toast.locked': '잠긴 글자!', 'toast.levelUp': '레벨 {n}!', 'toast.newLetter': '새 글자 해금: {j}',
    'shop.tabUpgrade': '강화', 'shop.tabSummon': '소환',
    'sum.level': '레벨', 'sum.collection': '수집', 'sum.pull': '소환',
    'sum.allUnlocked': '모든 글자 해금 완료!',
    'sum.hint': '골드로 잠긴 글자를 소환하세요. 레벨업으로도 해금돼요!',
    'sum.got': '획득!',
    'shop.title': '상점', 'shop.hint': '처치한 도깨비의 골드로 영구 강화 (저장됨)',
    'book.title': '마법서',
    'book.hint': '자음을 그려 마법 시전 · 모음을 이어 그리면 조합(예: ㄱ+ㅏ=가)',
    'book.tabCons': '자음 (마법)', 'book.tabVow': '모음 (조합)', 'book.tabCombo': '조합 예시',
    'book.vowNote': '모음은 단독으로 쓸 수 없어요. 자음 뒤에 이어 그리면 마법의 형태가 바뀝니다.',
    'book.comboNote': '자음+모음(+받침)을 이어 그려 글자를 완성하세요. 글자가 길수록 강력!<br><b>쌍자음</b>: 같은 자음을 두 번 (ㄱㄱ=<b>ㄲ</b>) → 강화 마법.<br><b>복합 모음</b>: 모음을 이어서 (ㅗ+ㅏ=<b>ㅘ</b>, ㅏ+ㅣ=<b>ㅐ</b>).',
    'set.title': '설정', 'set.art': '아트 스타일', 'set.lang': '언어',
    'set.sound': '소리', 'set.vibration': '진동', 'set.on': '켜짐', 'set.off': '꺼짐',
    'pause.title': '일시정지', 'pause.tap': '아무 곳이나 탭하면 계속',
    'go.title': '성문이 무너졌다…',
    'go.stats': '도달 물결 <b>{wave}</b> · 점수 <b>{score}</b> · 처치 <b>{kills}</b><br>최고 콤보 <b>{combo}</b> · 최고 기록 <b>{best}</b>물결',
    'go.tip': '강화는 그대로 유지됩니다. 골드를 모아 더 강해지세요!',
    'tut.practice': '연습 {n}/{m}',
    'tut.1.title': 'ㄱ + ㅏ = 가', 'tut.1.detail': 'ㄱ(┐)을 그린 뒤 이어서 ㅏ(⊢)를 그려 \'가\'를 시전하세요.',
    'tut.2.title': 'ㄱ ㄱ + ㅏ = 까', 'tut.2.detail': '같은 자음을 두 번 그리면 쌍자음! ㄱㄱ으로 ㄲ을 만들어 \'까\'.',
    'tut.3.title': 'ㄱ + ㅏ ㅣ = 개', 'tut.3.detail': '모음을 이어 그리면 복합 모음! ㅏ 다음 ㅣ = ㅐ → \'개\'.',
    'title.sub': '한글을 그려 도깨비를 물리쳐라',
    'tier.combo': '조합 마법', 'tier.fusion': '융합 궁극기',
    'how.1': '<svg class="ic sm"><use href="#ic-brush"/></svg> <b>그리기</b> — 자음을 손가락으로 그리면 마법 발동! 자음 19개 + 모음 21개',
    'how.2': '<svg class="ic sm"><use href="#ic-cast"/></svg> <b>조합</b> — 자음 뒤에 모음을 이어 그리면 글자 완성. <b>ㄱ + ㅏ = 가</b> → 더 강력!',
    'how.3': '<b>받침까지</b> 3글자를 그리면 (예: <b>건</b>, <b>혈</b>) 화면 전체를 휩쓰는 융합 궁극기!',
    'how.4': '<svg class="ic sm"><use href="#ic-brush"/></svg> <b>모아 그리기</b>로 시간제한 없이 글자를 만들고 <svg class="ic sm"><use href="#ic-cast"/></svg> <b>시전</b>!',
    'how.5': '<svg class="ic sm"><use href="#ic-swirl"/></svg> <b>자동포</b>가 알아서 싸우고, <svg class="ic sm"><use href="#ic-bag"/></svg> <b>상점</b>에서 골드로 강화!',
  },
  en: {
    'hud.wave': 'Wave', 'hud.score': 'Score', 'hud.best': 'Best', 'hud.combo': 'Combo',
    'bar.gate': 'Gate', 'bar.ink': 'Ink',
    'btn.hold': 'Hold Draw', 'btn.holding': 'Drawing…', 'btn.cast': 'Cast',
    'btn.start': 'Start', 'btn.restart': 'Try Again', 'btn.skip': 'Skip',
    'banner.wave': 'Wave {w}!', 'banner.boss': 'Boss Dokkaebi!',
    'toast.noInk': 'Not enough ink!', 'toast.nice': 'Nice!', 'toast.done': 'Done!',
    'toast.double': 'Double {j}!', 'toast.combine': 'Combine {j}!', 'toast.final': 'Final {j}!',
    'toast.cluster': 'Cluster {j}!', 'toast.waveClear': 'Wave clear! +bonus',
    'toast.gateHeal': 'Gate +{n}', 'toast.combo': '{n} Combo! x{m}',
    'compose.addVowel': 'add a vowel', 'compose.keepGoing': 'keep drawing, then Cast',
    'toast.locked': 'Locked!', 'toast.levelUp': 'Level {n}!', 'toast.newLetter': 'New letter: {j}',
    'shop.tabUpgrade': 'Upgrades', 'shop.tabSummon': 'Summon',
    'sum.level': 'Level', 'sum.collection': 'Collection', 'sum.pull': 'Summon',
    'sum.allUnlocked': 'All letters unlocked!',
    'sum.hint': 'Spend gold to summon a locked letter. Leveling up unlocks them too!',
    'sum.got': 'Unlocked!',
    'shop.title': 'Shop', 'shop.hint': 'Spend dokkaebi gold on permanent upgrades (saved)',
    'book.title': 'Spellbook',
    'book.hint': 'Draw a consonant to cast · add a vowel to combine (e.g. ㄱ+ㅏ=가)',
    'book.tabCons': 'Consonants', 'book.tabVow': 'Vowels', 'book.tabCombo': 'Combos',
    'book.vowNote': 'Vowels can\'t be cast alone. Draw one right after a consonant to reshape the spell.',
    'book.comboNote': 'Draw consonant + vowel (+ final) to form a syllable — longer is stronger!<br><b>Double consonant</b>: draw the same consonant twice (ㄱㄱ=<b>ㄲ</b>) → empowered spell.<br><b>Compound vowel</b>: draw vowels in a row (ㅗ+ㅏ=<b>ㅘ</b>, ㅏ+ㅣ=<b>ㅐ</b>).',
    'set.title': 'Settings', 'set.art': 'Art Style', 'set.lang': 'Language',
    'set.sound': 'Sound', 'set.vibration': 'Vibration', 'set.on': 'On', 'set.off': 'Off',
    'pause.title': 'Paused', 'pause.tap': 'Tap anywhere to continue',
    'go.title': 'The gate has fallen…',
    'go.stats': 'Reached wave <b>{wave}</b> · Score <b>{score}</b> · Kills <b>{kills}</b><br>Best combo <b>{combo}</b> · Best record <b>wave {best}</b>',
    'go.tip': 'Your upgrades are kept — gather gold and grow stronger!',
    'tut.practice': 'Practice {n}/{m}',
    'tut.1.title': 'ㄱ + ㅏ = 가 (ga)', 'tut.1.detail': 'Draw ㄱ (┐), then ㅏ (⊢) to cast the syllable \'가\'.',
    'tut.2.title': 'ㄱ ㄱ + ㅏ = 까 (kka)', 'tut.2.detail': 'Draw the same consonant twice for a double! ㄱㄱ makes ㄲ → \'까\'.',
    'tut.3.title': 'ㄱ + ㅏ ㅣ = 개 (gae)', 'tut.3.detail': 'Draw vowels in a row for a compound! ㅏ then ㅣ = ㅐ → \'개\'.',
    'title.sub': 'Draw Korean letters to defeat the dokkaebi',
    'tier.combo': 'combo spell', 'tier.fusion': 'fusion ultimate',
    'how.1': '<svg class="ic sm"><use href="#ic-brush"/></svg> <b>Draw</b> — trace a consonant to cast a spell! 19 consonants + 21 vowels.',
    'how.2': '<svg class="ic sm"><use href="#ic-cast"/></svg> <b>Combine</b> — add a vowel after a consonant to form a syllable. <b>ㄱ + ㅏ = 가</b> → stronger!',
    'how.3': '<b>Add a final</b> for a 3-letter block (e.g. <b>건</b>, <b>혈</b>) → a screen-wide fusion ultimate!',
    'how.4': '<svg class="ic sm"><use href="#ic-brush"/></svg> <b>Hold Draw</b> to build a syllable with no timer, then <svg class="ic sm"><use href="#ic-cast"/></svg> <b>Cast</b>!',
    'how.5': '<svg class="ic sm"><use href="#ic-swirl"/></svg> <b>Auto Qi</b> fights for you; upgrade in the <svg class="ic sm"><use href="#ic-bag"/></svg> <b>shop</b> with gold!',
  },
};

// Default the surrounding UI ("regular game stuff") to English. The Korean
// letters you draw never change — only the interface follows this setting.
let lang = 'en';
try {
  const saved = localStorage.getItem('ganada_lang');
  if (saved && STRINGS[saved]) lang = saved;
} catch (e) { /* ignore */ }

export function getLang() { return lang; }

export function setLang(l) {
  if (!STRINGS[l]) return;
  lang = l;
  try { localStorage.setItem('ganada_lang', l); } catch (e) { /* ignore */ }
}

export function t(key, params) {
  let s = (STRINGS[lang] && STRINGS[lang][key]) || (STRINGS.ko[key]) || key;
  if (params) for (const k of Object.keys(params)) s = s.replaceAll(`{${k}}`, params[k]);
  return s;
}

// Pick the localized name from a data object that has `name` (ko) + `nameEn`.
export function localName(obj) {
  if (!obj) return '';
  return lang === 'en' && obj.nameEn ? obj.nameEn : obj.name;
}
