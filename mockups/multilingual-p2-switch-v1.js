"use strict";
// Design-only proposal. No API, storage, submissions, CMS sessions or public route handlers.
const samples = {
 en: {title:['A little cute.','A lot of creative.'], description:'A place for your next idea. Explore a playful direction for your brand, story or creative project.', footnote:'A little inspiration starts here.', alt:'Pinky Lamb character illustration'},
 vi: {title:['Một chút đáng yêu.','Thật nhiều sáng tạo.'], description:'Một không gian cho ý tưởng tiếp theo. Cùng khám phá hướng thể hiện mới cho thương hiệu và câu chuyện của bạn.', footnote:'Một chút cảm hứng, khởi đầu mới.', alt:'Minh họa nhân vật Pinky Lamb'},
 ja: {title:['小さなかわいさ。','大きな創造力。'], description:'次のアイデアを、一緒に。ブランドやストーリーを、遊び心のある表現で考えるためのクリエイティブな場所。', footnote:'ひらめきは、小さな一歩から。', alt:'Pinky Lambのキャラクターイラスト'}
};
const copy = {
 en: {skip:'Skip to content', projects:'Projects', services:'Services', about:'About Pinky', ip:'IP Studio', cta:'Tell us your idea ↗', language:'Website language', explore:'Explore projects ↗', showreel:'▷ Watch showreel', workKicker:'01 / SELECTED WORK', workTitle:'A little perspective.\nSomething memorable.', sampleNote:'Illustrative project for navigation testing. No client or project result is represented.', all:'All', creative:'Creative', illustration:'DESIGN SAMPLE / 01', sampleEntity:'ILLUSTRATIVE PROJECT · CASE1', projectTitle:'A playful starting point', missingList:'This illustrative project has no Japanese version.', servicesTitle:'An idea. Many possibilities.', servicesNote:'This design focuses on language selection. The full service content belongs to a later phase.', contextSample:'Illustrative section anchor for testing navigation context.', contactKicker:'LET’S MAKE SOMETHING LOVELY', contactTitle:'Your next idea\nstarts here.', briefNote:'Try typing, then change the language. This sample does not send or store your information.', name:'Your name (optional)', idea:'Your idea (optional)', formNote:'Design test only · No submission · Cleared when this page is closed', backTop:'Back to top ↑', briefKicker:'YOUR BRIEF', dirtyTitle:'Keep your idea?', dirtyDescription:'Changing language will clear the information you have typed in this sample.', discard:'Discard and change language', stay:'Stay here', projectNote:'This is one illustrative entity, available in English and Vietnamese. It has no Japanese translation. Changing language never opens a different project.', close:'Close', reelNote:'Video playback is outside this language-switch design. No video is loaded.', menuOpen:'Open menu', menuClose:'Close menu', mainNav:'Main navigation', filters:'Filter illustrative projects', missingNotice:'This project is not available in Japanese. You are back in Projects; no different project has been opened.', switched:'Website language changed to English.', sampleLabel:'DESIGN SAMPLE'},
 vi: {skip:'Đến nội dung chính', projects:'Dự án', services:'Dịch vụ', about:'Về Pinky', ip:'IP Studio', cta:'Kể ý tưởng của bạn ↗', language:'Ngôn ngữ website', explore:'Khám phá dự án ↗', showreel:'▷ Xem showreel', workKicker:'01 / DỰ ÁN', workTitle:'Một góc nhìn mới.\nMột điều đáng nhớ.', sampleNote:'Dự án minh họa để thử điều hướng. Không đại diện khách hàng hoặc kết quả dự án.', all:'Tất cả', creative:'Sáng tạo', illustration:'MẪU THIẾT KẾ / 01', sampleEntity:'DỰ ÁN MINH HỌA · CASE1', projectTitle:'Một khởi đầu đầy cảm hứng', missingList:'Dự án minh họa này chưa có bản tiếng Nhật.', servicesTitle:'Một ý tưởng. Nhiều khả năng.', servicesNote:'Bản thiết kế tập trung vào chuyển ngôn ngữ. Nội dung dịch vụ đầy đủ thuộc giai đoạn sau.', contextSample:'Mục minh họa để thử giữ vị trí khi chuyển ngôn ngữ.', contactKicker:'CÙNG LÀM ĐIỀU ĐÁNG YÊU', contactTitle:'Ý tưởng tiếp theo\nbắt đầu từ đây.', briefNote:'Thử nhập brief rồi đổi ngôn ngữ. Bản mẫu không gửi hoặc lưu thông tin của bạn.', name:'Tên của bạn (không bắt buộc)', idea:'Ý tưởng của bạn (không bắt buộc)', formNote:'Chỉ để thử thiết kế · Không gửi · Đóng trang sẽ xóa dữ liệu', backTop:'Về đầu trang ↑', briefKicker:'BRIEF CỦA BẠN', dirtyTitle:'Giữ lại ý tưởng đang nhập?', dirtyDescription:'Chuyển ngôn ngữ sẽ xóa thông tin bạn đã nhập trong bản mẫu này.', discard:'Bỏ nội dung và chuyển', stay:'Ở lại', projectNote:'Một dự án minh họa có bản Anh và Việt, chưa có tiếng Nhật. Đổi ngôn ngữ không mở sang một dự án khác.', close:'Đóng', reelNote:'Phát video nằm ngoài bản thiết kế switch. Không tải video trong mockup.', menuOpen:'Mở menu', menuClose:'Đóng menu', mainNav:'Điều hướng chính', filters:'Lọc dự án minh họa', missingNotice:'Dự án này chưa có bản tiếng Nhật. Đã trở về mục Dự án, không mở dự án khác.', switched:'Đã chuyển ngôn ngữ website sang tiếng Việt.', sampleLabel:'MẪU THIẾT KẾ'},
 ja: {skip:'メインコンテンツへ', projects:'プロジェクト', services:'サービス', about:'Pinkyについて', ip:'IP Studio', cta:'アイデアを聞かせてください ↗', language:'ウェブサイトの言語', explore:'プロジェクトを見る ↗', showreel:'▷ ショーリールを見る', workKicker:'01 / プロジェクト', workTitle:'新しい視点から。\n心に残るものを。', sampleNote:'言語切り替えの確認用サンプルです。実際の顧客や成果を表すものではありません。', all:'すべて', creative:'クリエイティブ', illustration:'デザインサンプル / 01', sampleEntity:'サンプルプロジェクト · CASE1', projectTitle:'遊び心のあるはじまり', missingList:'このサンプルプロジェクトには日本語版がありません。', servicesTitle:'ひとつのアイデア。広がる可能性。', servicesNote:'このデザインは言語選択の確認用です。サービスの詳細は今後のフェーズで扱います。', contextSample:'言語切り替え時の位置を確認するサンプルセクションです。', contactKicker:'一緒に、素敵なものを', contactTitle:'次のアイデアは、\nここから。', briefNote:'入力してから言語を切り替えてみてください。このサンプルは情報を送信・保存しません。', name:'お名前（任意）', idea:'アイデア（任意）', formNote:'デザイン確認用 · 送信なし · ページを閉じると入力内容は消えます', backTop:'ページの先頭へ ↑', briefKicker:'入力中のアイデア', dirtyTitle:'入力内容を残しますか？', dirtyDescription:'言語を切り替えると、このサンプルに入力した内容は消えます。', discard:'入力を破棄して切り替える', stay:'このページに留まる', projectNote:'英語とベトナム語のあるサンプルです。日本語版はありません。別のプロジェクトを開くことはありません。', close:'閉じる', reelNote:'動画の再生はこの言語切り替えデザインの対象外です。動画は読み込みません。', menuOpen:'メニューを開く', menuClose:'メニューを閉じる', mainNav:'メインナビゲーション', filters:'サンプルプロジェクトの絞り込み', missingNotice:'このプロジェクトには日本語版がありません。別のプロジェクトを開かず、一覧に戻りました。', switched:'ウェブサイトの言語を日本語に切り替えました。', sampleLabel:'デザインサンプル'}
};
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const valid = value => ['en','vi','ja'].includes(value);
let locale = valid(new URL(location.href).searchParams.get('locale')) ? new URL(location.href).searchParams.get('locale') : 'en';
let filter = 'all';
let pending = null;
let returnFocus = null;
let historyIndex = 0;
let bypassHistoryGuard = false;
let restoringHistory = false;
const dirty = () => Boolean($('#brief-name').value || $('#brief-idea').value);
function closePicker(focus = false) { $('#header-languages').hidden = true; $('#header-language').setAttribute('aria-expanded','false'); if(focus) $('#header-language').focus(); }
function menu(open) { $('#mobile-nav').hidden = !open; $('.menu-toggle').setAttribute('aria-expanded', String(open)); $('.menu-toggle').setAttribute('aria-label',copy[locale][open ? 'menuClose' : 'menuOpen']); }
function notice(text) { $('#context-notice').textContent = text; $('#context-notice').hidden = !text; }
function paint() {
 document.documentElement.lang = locale;
 $$('[data-copy]').forEach(element => { element.textContent = copy[locale][element.dataset.copy]; });
 $('#title-first').textContent = samples[locale].title[0]; $('#title-last').textContent = samples[locale].title[1];
 $('#hero-description').textContent = samples[locale].description; $('#hero-footnote').textContent = samples[locale].footnote; $('#hero-image').alt = samples[locale].alt;
 $('#sample-label').textContent = `${locale.toUpperCase()} · ${copy[locale].sampleLabel}`;
 $('#route').textContent = locale === 'en' ? '/' : `/${locale}/`;
 $('.current-locale').textContent = locale.toUpperCase();
 $('#header-language').setAttribute('aria-label', `${copy[locale].language}: ${locale === 'en' ? 'English' : locale === 'vi' ? 'Tiếng Việt' : '日本語'}`);
 $$('[data-locale]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.locale === locale)));
 $$('[data-nav-label]').forEach(nav => nav.setAttribute('aria-label',copy[locale].mainNav));
 $$('.footer-languages,.dialog-languages').forEach(group => group.setAttribute('aria-label',copy[locale].language));
 $('.filters').setAttribute('aria-label',copy[locale].filters);
 $('#close-project').setAttribute('aria-label',copy[locale].close);
 $('#open-project').hidden = locale === 'ja'; $('.missing-project').hidden = locale !== 'ja';
 $$('[data-filter]').forEach(button => { button.classList.toggle('active',button.dataset.filter === filter); button.setAttribute('aria-pressed',String(button.dataset.filter === filter)); });
 menu($('#mobile-nav').hidden === false);
}
function stateURL(nextLocale = locale) { const url = new URL(location.href); url.searchParams.set('locale',nextLocale); return url; }
function commitLocale(nextLocale, fromHistory = false) {
 const wasProject = $('#project-dialog').open;
 if(wasProject && nextLocale === 'ja') $('#project-dialog').close();
 locale = nextLocale; closePicker(); menu(false); notice(''); paint();
 if(!fromHistory) { historyIndex++; history.pushState({p2Index:historyIndex},'',stateURL()); }
 if(wasProject && locale === 'ja') { const url = new URL(location.href); url.hash = 'work'; history.replaceState({p2Index:historyIndex},'',url); notice(copy[locale].missingNotice); $('#work').scrollIntoView({block:'start'}); $('#context-notice').focus({preventScroll:true}); }
}
function requestLocale(nextLocale, source) {
 if(nextLocale === locale) { closePicker(true); return; }
 if(dirty()) {
  returnFocus = source; pending = {locale:nextLocale}; closePicker();
  if($('#project-dialog').open) { $('#project-dialog').close(); pending.reopenProject = true; }
  $('#dirty-dialog').showModal(); $('#stay').focus(); return;
 }
 commitLocale(nextLocale);
 if(source.closest('.language-picker')) $('#header-language').focus();
}
function stay() { const reopen = pending?.reopenProject; pending = null; $('#dirty-dialog').close(); if(reopen) $('#project-dialog').showModal(); if(returnFocus?.isConnected && !returnFocus.closest('[hidden]')) returnFocus.focus(); else if(!$('#project-dialog').open) $('#header-language').focus(); }
$$('[data-locale]').forEach(button => button.addEventListener('click',() => requestLocale(button.dataset.locale,button)));
$('#header-language').addEventListener('click',() => { const open = $('#header-languages').hidden; $('#header-languages').hidden = !open; $('#header-language').setAttribute('aria-expanded',String(open)); if(open) $('#header-languages button[aria-pressed=true]').focus(); });
document.addEventListener('click',event => { if(!event.target.closest('.language-picker')) closePicker(); });
document.addEventListener('keydown',event => { if(event.key === 'Escape' && !$('#header-languages').hidden) { event.preventDefault(); closePicker(true); } });
$('.menu-toggle').addEventListener('click',() => menu($('#mobile-nav').hidden));
$$('#mobile-nav a').forEach(link => link.addEventListener('click',() => menu(false)));
$$('[data-filter]').forEach(button => button.addEventListener('click',() => {filter = button.dataset.filter; paint();}));
$('#brief').addEventListener('submit',event => event.preventDefault());
$('#stay').addEventListener('click',stay);
$('#dirty-dialog').addEventListener('cancel',event => {event.preventDefault();stay();});
$('#discard-switch').addEventListener('click',() => {
 const target = pending; pending = null; $('#brief').reset(); $('#dirty-dialog').close();
 if(target.historyDelta !== undefined) { bypassHistoryGuard = true; history.go(target.historyDelta); }
 else { if(target.reopenProject) $('#project-dialog').showModal(); commitLocale(target.locale); if(locale !== 'ja') $('#header-language').focus(); }
});
function openProject() { if(locale === 'ja') {notice(copy[locale].missingNotice);$('#work').scrollIntoView({block:'start'});$('#context-notice').focus({preventScroll:true});return;} $('#project-dialog').showModal(); }
$('#open-project').addEventListener('click',openProject); $('#review-project').addEventListener('click',openProject);
$('#close-project').addEventListener('click',() => $('#project-dialog').close());
$('#showreel').addEventListener('click',() => $('#reel-dialog').showModal()); $('#close-reel').addEventListener('click',() => $('#reel-dialog').close());
history.replaceState({p2Index:historyIndex},'',location.href);
window.addEventListener('popstate',event => {
 const nextIndex = Number.isInteger(event.state?.p2Index) ? event.state.p2Index : historyIndex;
 const targetLocale = new URL(location.href).searchParams.get('locale'); const nextLocale = valid(targetLocale) ? targetLocale : 'en';
 if(restoringHistory) {restoringHistory = false; $('#dirty-dialog').showModal(); $('#stay').focus();return;}
 if(nextLocale !== locale && dirty() && !bypassHistoryGuard && nextIndex !== historyIndex) {
  pending = {locale:nextLocale,historyDelta:nextIndex-historyIndex}; returnFocus = $('#header-language'); restoringHistory = true; history.go(historyIndex-nextIndex);return;
 }
 bypassHistoryGuard = false; historyIndex = nextIndex; commitLocale(nextLocale,true);
});
paint();
