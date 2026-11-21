// Run after npm install: node tests/phase2LanguageNav.test.cjs
// Static/translation checks; this is not a replacement for Android on-device QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const transpile = name => ts.transpileModule(read(name), {
  fileName: name,
  reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
});
function load(name, deps = {}) {
  const result = transpile(name);
  assert.equal(result.diagnostics.length, 0, `${name}: syntax diagnostics`);
  const exports = {};
  vm.runInNewContext(result.outputText, { exports, require(key) { return deps[key]; } }, { filename: name });
  return exports;
}
const extra = load('i18n/extra-translations.ts');
const translations = load('i18n/translations.ts', { './extra-translations': extra });
const testCases = [
  ['mr', 'Full Day Work', 'पूर्ण दिवसाचे काम'],
  ['hi', 'Full Day Work', 'पूरे दिन का काम'],
  ['mr', 'Since first pool started', 'पहिला पूल सुरू झाल्यापासून'],
  ['hi', 'Hold 3 Seconds', '3 सेकंड दबाए रखें'],
  ['mr', 'Jobs', 'कामे'],
  ['hi', 'Excellent', 'उत्कृष्ट'],
  ['mr', 'Hi, ', 'नमस्कार, '],
  ['mr', '8 hours', '८ तास'],
  ['en', 'Hold 3 Seconds', 'Hold 3 Seconds'],
  ['gu', 'Hold 3 Seconds', 'Hold 3 Seconds'],
];
for (const [lang, original, expected] of testCases) {
  assert.equal(translations.translate(lang, original), expected, `${lang}: ${original}`);
}
const switcher = read('components/language-quick-switcher.tsx');
assert.ok(switcher.includes('languages.length > 3'), 'More mode must be based on API language count');
assert.ok(switcher.includes("item.code === 'en'") && switcher.includes("item.code === 'hi'"), 'English and Hindi direct buttons');
assert.ok(switcher.includes('setLanguage(code)'), 'Changes must persist using I18nProvider');
assert.ok(switcher.includes('Modal visible={moreOpen}'), 'More menu must open');
const layout = read('app/_layout.tsx');
assert.ok(layout.includes('<LanguageQuickSwitcher />'), 'Other routes must have language navbar');
assert.ok(read('app/user/dashboard.tsx').includes('<LanguageQuickSwitcher onDark />'), 'Customer dashboard navbar');
assert.ok(read('app/worker/dashboard.tsx').includes('<LanguageQuickSwitcher />'), 'Worker dashboard navbar');
assert.ok(read('app/index.tsx').includes("router.push('/select-language')"), 'Android back to language selection');
console.log(`Language UI and localization checks passed (${testCases.length} translation cases + navigation/switcher assertions).`);
