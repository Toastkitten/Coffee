import { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } from 'react'

// ─── 語言系統 ─────────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  zh: {
    appTitle: '咖啡萃取與風味調整',
    tabEspresso: '義式濃縮', tabPour: '手沖咖啡',
    edit: '編輯', done: '完成', add: '新增', delete: '刪除',
    save: '儲存', cancel: '取消', confirm: '確定',
    // Espresso
    espressoLabel: '義式濃縮', productLabel: '產品',
    addConfig: '新增配置', addProduct: '新增品項',
    ratioLabel: '濃度比例', milkRatioLabel: () => '產品比例',
    targetYield: '目標萃取量', waterDispense: '機器出水量',
    singleShot: '單杯萃取', doubleShot: '雙杯萃取', mlUnit: '毫升',
    grindLabel: '研磨 1→10', tampLabel: '壓粉(公斤)', absorptionLabel: '吸水率',
    brewTimeLabel: '出水秒數', brewTimeTarget: '目標 25～30 秒',
    tooFast: '(偏快)', tooSlow: '(偏慢)',
    configNamePlaceholder: '配置名稱', ratioSelectLabel: '粉液比',
    summaryGrind: '研磨', summaryDose: '粉重', summaryTamp: '壓粉',
    // Pour
    beanLabel: '豆子', methodLabel: '手法',
    noBeanInfo: '尚未填寫豆子資訊',
    originLabel: '產地', varietyLabel: '品種', processLabel: '加工', roastLabel: '焙度',
    flavorNoteLabel: '風味特色',
    techniqueLabel: '沖煮技巧', techniqueItem: '技巧',
    newTechniqueOpt: '— 新技巧 —',
    extractionLabel: '萃取', flowLabel: '水流', bedLabel: '粉層', otherLabel: '其他',
    techniqueNamePlaceholder: '例：畫圈、中心注水',
    startBrew: '▶ 開始沖煮', addLog: '＋ 記錄',
    historyLabel: '紀錄', allBeans: '全部豆子',
    brewPlanLabel: '沖煮計畫',
    // Timer
    timerTitle: '沖煮計時',
    nextStepLabel: '下一步',
    brewComplete: '沖煮完成',
    resetBtn: '重置', restartBtn: '重新開始',
    startBtn: '開始', pauseBtn: '暫停', resumeBtn: '繼續',
    logBrewBtn: '記錄此次沖煮',
    // Log modal
    logTitle: '記錄本次沖煮',
    logActualData: '實際使用數據',
    logExecution: '執行完美度（1–10）',
    logFlavor: '風味結果分數（1–10）',
    scoreExecution: '執行', scoreFlavor: '風味',
    logPros: '優點 / 亮點', logCons: '缺點 / 待改進',
    logDirection: '後續修改方向',
    logSave: '儲存紀錄',
  },
  en: {
    appTitle: 'Coffee Extraction',
    tabEspresso: 'Espresso', tabPour: 'Pour Over',
    edit: 'Edit', done: 'Done', add: 'Add', delete: 'Delete',
    save: 'Save', cancel: 'Cancel', confirm: 'OK',
    // Espresso
    espressoLabel: 'Espresso', productLabel: 'Drink',
    addConfig: 'New Config', addProduct: 'New Drink',
    ratioLabel: 'Ratio', milkRatioLabel: () => 'Drink Ratio',
    targetYield: 'Target Yield', waterDispense: 'Water In',
    singleShot: 'Single', doubleShot: 'Double', mlUnit: 'ml',
    grindLabel: 'Grind 1→10', tampLabel: 'Tamp (kg)', absorptionLabel: 'Absorption',
    brewTimeLabel: 'Brew Time', brewTimeTarget: 'Target 25–30s',
    tooFast: '(fast)', tooSlow: '(slow)',
    configNamePlaceholder: 'Config name', ratioSelectLabel: 'Ratio',
    summaryGrind: 'Grind', summaryDose: 'Dose', summaryTamp: 'Tamp',
    // Pour
    beanLabel: 'Bean', methodLabel: 'Method',
    noBeanInfo: 'No bean info yet',
    originLabel: 'Origin', varietyLabel: 'Variety', processLabel: 'Process', roastLabel: 'Roast',
    flavorNoteLabel: 'Flavor',
    techniqueLabel: 'Techniques', techniqueItem: 'Technique',
    newTechniqueOpt: '— New —',
    extractionLabel: 'Extraction', flowLabel: 'Flow', bedLabel: 'Bed', otherLabel: 'Other',
    techniqueNamePlaceholder: 'e.g. Circle pour, Center pour',
    startBrew: '▶ Brew', addLog: '＋ Log',
    historyLabel: 'History', allBeans: 'All Beans',
    brewPlanLabel: 'Brew Plan',
    // Timer
    timerTitle: 'Brew Timer',
    nextStepLabel: 'Next',
    brewComplete: 'Done!',
    resetBtn: 'Reset', restartBtn: 'Restart',
    startBtn: 'Start', pauseBtn: 'Pause', resumeBtn: 'Resume',
    logBrewBtn: 'Log Brew',
    // Log modal
    logTitle: 'Log This Brew',
    logActualData: 'Actual Parameters',
    logExecution: 'Execution Score (1–10)',
    logFlavor: 'Flavor Score (1–10)',
    scoreExecution: 'Exec', scoreFlavor: 'Flavor',
    logPros: 'Pros / Highlights', logCons: 'Cons / Issues',
    logDirection: 'Next Steps',
    logSave: 'Save Log',
  },
}
const LangContext = createContext('zh')
function useLang() {
  const lang = useContext(LangContext)
  const t = (key, ...args) => {
    const val = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.zh[key] ?? key
    return typeof val === 'function' ? val(...args) : val
  }
  return { lang, t }
}

// 義式濃縮比例預設（固定三種）
const ESPRESSO_RATIO_PRESETS = [
  { ratio: 2, name: 'Ristretto', desc: '1:1' },
  { ratio: 3, name: 'Espresso',  desc: '1:2' },
  { ratio: 4, name: 'Lungo',     desc: '1:3' },
]
function espressoRatioName(ratio) {
  return ESPRESSO_RATIO_PRESETS.find(p => p.ratio === ratio)?.name ?? `1:${ratio}`
}

const PARAM_CARD_MIN_H = 'min-h-[4.5rem]'

/** 將輸入轉成數字；只有 NaN 時才用 fallback（避免 0 被 || 吃掉） */
function asNumberOr(value, fallback) {
  const n = Number(value)
  return Number.isNaN(n) ? fallback : n
}

function useLocalStorageState(key, initialValue) {
  const [state, setState] = useState(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const raw = window.localStorage.getItem(key)
      if (raw == null) return initialValue
      return JSON.parse(raw)
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // ignore write errors (e.g. storage full / blocked)
    }
  }, [key, state])

  return [state, setState]
}

function EditIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}

function TrashIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function HandIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V5a1 1 0 112 0v6m0 0V4a1 1 0 112 0v7m0 0V6a1 1 0 112 0v5m0 0V8a1 1 0 112 0v6c0 4-2.5 7-6.5 7H11a6 6 0 01-6-6v-2a1 1 0 112 0v1a3 3 0 003 3h1.5" />
    </svg>
  )
}

// ——— 共用元件（緊湊版）———
function Stepper({ label, value, min, max, step, unit, onChange }) {
  const inc = () => onChange(Math.min(max, Math.round((value + step) * 100) / 100))
  const dec = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100))
  const displayVal = Number.isInteger(value) ? value : value.toFixed(1)
  return (
    <div className="rounded-xl bg-white p-2.5 shadow-sm">
      <div className="mb-1 text-xs font-medium text-stone-500">{label}</div>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={dec} disabled={value <= min}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-200 text-lg font-semibold text-stone-700 active:bg-stone-300 disabled:opacity-40" aria-label="減少">−</button>
        <span className="min-w-[3rem] text-center text-lg font-bold tabular-nums text-stone-800">
          {displayVal}<span className="ml-0.5 text-sm font-medium text-stone-500">{unit}</span>
        </span>
        <button type="button" onClick={inc} disabled={value >= max}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-200 text-lg font-semibold text-stone-700 active:bg-stone-300 disabled:opacity-40" aria-label="增加">+</button>
      </div>
    </div>
  )
}

function Slider({ label, value, min, max, step, unit, onChange }) {
  const displayVal = Number.isInteger(value) ? value : value.toFixed(1)
  return (
    <div className={`rounded-xl bg-white p-2.5 shadow-sm ${PARAM_CARD_MIN_H}`}>
      <div className="mb-1 flex justify-between">
        <span className="text-xs font-medium text-stone-500">{label}</span>
        <span className="text-sm font-bold tabular-nums text-stone-800">{displayVal}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="h-2 w-full" />
    </div>
  )
}

// 義式濃縮粉:水 = 1:(1~3，小數一位)

// ——— 義式濃縮（固定三種比例：Ristretto/Espresso/Lungo）———
function EspressoTab() {
  const { t } = useLang()
  const [cupMode, setCupMode] = useState('double')   // single | double
  const [dose, setDose] = useState(18)
  const [selectedRatio, setSelectedRatio] = useLocalStorageState('coffee.espresso.selectedRatio', 3)
  const [absorptionRate, setAbsorptionRate] = useState(1)
  const [grindSize, setGrindSize] = useState(5)
  const [brewTime, setBrewTime] = useState(28)
  const [brewTimeInput, setBrewTimeInput] = useState('28')
  const [tampPressure, setTampPressure] = useState(20)
  const [drinkId, setDrinkId] = useLocalStorageState('coffee.espresso.drinkId', '')
  const [customDrinks, setCustomDrinks] = useLocalStorageState('coffee.espresso.customDrinks', [])
  const [editingDrink, setEditingDrink] = useState(null)
  const [showEditPopover, setShowEditPopover] = useState(false)
  const [targetVolumeMl, setTargetVolumeMl] = useState(null)

  const TARGET_TIME_MIN = 25
  const TARGET_TIME_MAX = 30
  const brewTimeOk = brewTime >= TARGET_TIME_MIN && brewTime <= TARGET_TIME_MAX
  const tooFast = brewTime < TARGET_TIME_MIN
  const tooSlow = brewTime > TARGET_TIME_MAX

  const allDrinks = customDrinks
  const currentDrink = allDrinks.find(d => d.id === drinkId) || allDrinks[0] || null
  // 比例固定為三種預設
  const effectiveRatio = ESPRESSO_RATIO_PRESETS.some(p => p.ratio === selectedRatio) ? selectedRatio : 3

  // 修正 localStorage 可能造成的「已刪除但仍保留在選單的 id」
  useEffect(() => {
    if (drinkId && !customDrinks.some(d => d.id === drinkId)) {
      setDrinkId(customDrinks[0]?.id ?? '')
    }
  }, [customDrinks, drinkId])

  const hasMilk = currentDrink?.milkParts != null
  const totalParts = hasMilk ? 1 + currentDrink.milkParts : 1
  const cups = cupMode === 'single' ? 1 : 2
  const totalTargetVolume = targetVolumeMl != null && targetVolumeMl > 0 ? targetVolumeMl * cups : null
  const espressoFromTarget = totalTargetVolume != null ? totalTargetVolume / totalParts : null
  const doseFromTarget = espressoFromTarget != null && effectiveRatio > 0 ? Math.round((espressoFromTarget / effectiveRatio) * 10) / 10 : null
  const useTargetVolume = doseFromTarget != null
  const effectiveDose = useTargetVolume ? doseFromTarget : dose
  const effectiveYield = useTargetVolume ? Math.floor(espressoFromTarget * 10) / 10 : Math.floor(dose * effectiveRatio * 10) / 10
  // 出水量 = (比例+1) × 粉重，對應命名規則：Ristretto 1:2粉水、Espresso 1:3粉水、Lungo 1:4粉水
  const waterToDispense = Math.round((effectiveYield + absorptionRate * effectiveDose) * 10) / 10

  useEffect(() => {
    if (targetVolumeMl == null || targetVolumeMl <= 0 || effectiveRatio <= 0) return
    const cups = cupMode === 'single' ? 1 : 2
    const total = targetVolumeMl * cups
    const parts = currentDrink?.milkParts != null ? 1 + currentDrink.milkParts : 1
    const espressoMl = total / parts
    const suggested = Math.round((espressoMl / effectiveRatio) * 10) / 10
    setDose(suggested)
  }, [targetVolumeMl, cupMode, effectiveRatio, currentDrink?.milkParts, currentDrink?.id])

  const handleSaveCustomDrink = (form) => {
    const newDrink = {
      id: form.id || 'custom-' + Date.now(),
      name: form.name.trim(),
      milkParts: form.milkParts != null && form.milkParts !== '' ? Number(form.milkParts) : null,
      extraLabel: form.extraLabel || '牛奶',
      others: form.others || [],
    }
    if (editingDrink) {
      setCustomDrinks(prev => prev.map(d => d.id === editingDrink.id ? newDrink : d))
      setEditingDrink(null)
    } else {
      setCustomDrinks(prev => [...prev, newDrink])
      setDrinkId(newDrink.id)
    }
  }

  const handleDeleteDrink = (id) => {
    setCustomDrinks(prev => prev.filter(d => d.id !== id))
    if (drinkId === id) {
      const remaining = customDrinks.filter(d => d.id !== id)
      setDrinkId(remaining[0]?.id ?? '')
    }
  }

  const hints = {}
  if (tooFast) {
    // 偏快 → 需要磨細（數字↑）、加大壓粉
    hints.dose = '↓'
    hints.grind = '↑'
    hints.tamp = '↑'
    hints.yieldRatio = '↑'
  } else if (tooSlow) {
    // 偏慢 → 需要磨粗（數字↓）、減小壓粉
    hints.dose = '↑'
    hints.grind = '↓'
    hints.tamp = '↓'
    hints.yieldRatio = '↓'
  }

  return (
    <div className="space-y-3 pb-24">
      {/* 第一排：義式濃縮比例下拉 + 產品下拉 + 編輯按鈕 */}
      <section className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 shrink-0">{t('espressoLabel')}</span>
        <select
          value={selectedRatio}
          onChange={(e) => setSelectedRatio(Number(e.target.value))}
          className="flex-1 min-w-0 rounded-lg border border-stone-200 bg-white py-2 pl-2 pr-7 text-sm font-medium text-stone-800 focus:border-espresso-500 focus:outline-none"
        >
          {ESPRESSO_RATIO_PRESETS.map(p => (
            <option key={p.ratio} value={p.ratio}>{p.name} ({p.desc})</option>
          ))}
        </select>
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 shrink-0">{t('productLabel')}</span>
        <select value={drinkId} onChange={(e) => setDrinkId(e.target.value)} className="flex-1 min-w-0 rounded-lg border border-stone-200 bg-white py-2 pl-2 pr-7 text-sm font-medium text-stone-800 focus:border-espresso-500 focus:outline-none">
          <option value="">— {t('addProduct')} —</option>
          {allDrinks.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <button type="button" onClick={() => { setShowEditPopover(s => !s); if (!showEditPopover) setEditingDrink(currentDrink) }} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-500 text-white" aria-label="編輯產品">
          <EditIcon className="h-3 w-3" />
        </button>
      </section>

      {/* 編輯區：僅管理產品（飲品） */}
      {showEditPopover && (
        <section className="rounded-xl border border-stone-200 bg-white py-3 shadow-sm">
          <div className="px-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-stone-500 shrink-0">{t('productLabel')}</span>
              <select value={editingDrink?.id ?? ''} onChange={(e) => { const v = e.target.value; setEditingDrink(v ? allDrinks.find(d => d.id === v) ?? null : null) }} className="flex-1 min-w-0 rounded border border-stone-200 px-2 py-1.5 text-sm text-stone-800">
                <option value="">{t('addProduct')}</option>
                {allDrinks.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <CustomDrinkForm
              key={editingDrink?.id ?? 'new-drink'}
              drink={editingDrink ?? null}
              onSave={(form) => { handleSaveCustomDrink(form); setEditingDrink(undefined) }}
              onCancel={() => { setEditingDrink(undefined) }}
              onDelete={editingDrink ? () => { handleDeleteDrink(editingDrink.id); setEditingDrink(undefined) } : undefined}
            />
          </div>
        </section>
      )}

      <div className="flex gap-2 items-center py-2">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <input type="text" inputMode="numeric" placeholder={t('mlUnit')} value={targetVolumeMl ?? ''} onChange={(e) => { const raw = e.target.value; if (raw === '') { setTargetVolumeMl(null); return }; const n = Number(raw); if (!Number.isNaN(n)) setTargetVolumeMl(n) }} className="w-full rounded border border-stone-200 px-2 py-1.5 text-sm text-right tabular-nums" />
          <span className="text-sm text-stone-500 shrink-0">{t('mlUnit')}</span>
        </div>
        <div className="flex-1 min-w-0 flex gap-2">
          <button type="button" onClick={() => { setCupMode('single'); setDose(d => (d > 12 ? 10 : d)) }} className={`flex-1 rounded-lg py-2 text-sm font-medium ${cupMode === 'single' ? 'bg-espresso-600 text-white' : 'bg-stone-200 text-stone-600'}`}>{t('singleShot')}</button>
          <button type="button" onClick={() => { setCupMode('double'); setDose(d => (d < 14 ? 18 : d)) }} className={`flex-1 rounded-lg py-2 text-sm font-medium ${cupMode === 'double' ? 'bg-espresso-600 text-white' : 'bg-stone-200 text-stone-600'}`}>{t('doubleShot')}</button>
        </div>
      </div>
      <section className="rounded-xl border border-stone-200 bg-espresso-800 p-3 text-white shadow">
        <div className="flex">
          <div className="flex-1 min-w-0 space-y-2 text-base pr-3">
            {(() => {
              const preset = ESPRESSO_RATIO_PRESETS.find(p => p.ratio === effectiveRatio)
              return (
                <div className="flex justify-between">
                  <span className="text-espresso-200">{t('ratioLabel')}</span>
                  <span className="tabular-nums">{preset ? `${preset.name} (${preset.desc})` : `1:${effectiveRatio}`}</span>
                </div>
              )
            })()}
            {currentDrink?.milkParts != null && (
              <div className="flex justify-between">
                <span className="text-espresso-200">{t('milkRatioLabel')}</span>
                <span className="tabular-nums">
                  1 : {currentDrink.milkParts}
                  <span className="ml-1 text-espresso-300 text-sm">
                    ({Math.round(effectiveYield * currentDrink.milkParts)} ml)
                  </span>
                </span>
              </div>
            )}
          </div>
          <div className="shrink-0 w-px self-stretch bg-espresso-600" aria-hidden />
          <div className="flex-1 min-w-0 space-y-2 text-base pl-3">
            <div className="flex justify-between"><span className="text-espresso-200">{t('targetYield')}</span><span className="font-bold tabular-nums">{effectiveYield} ml</span></div>
            <div className="flex justify-between"><span className="text-espresso-200">{t('waterDispense')}</span><span className="font-bold tabular-nums">{waterToDispense} ml</span></div>
          </div>
        </div>
        <div className="mt-3 border-t border-espresso-600 pt-2 text-center text-sm text-espresso-200">
          {t('summaryGrind')} {grindSize} · {t('summaryDose')} {dose}g ({ESPRESSO_RATIO_PRESETS.find(p => p.ratio === effectiveRatio)?.desc ?? ''}) · {brewTime}s · {t('summaryTamp')} {tampPressure}kg
        </div>
      </section>

      {/* 研磨、壓粉、吸水率、出水秒數（粉重資訊移到咖啡色區塊） */}
      <section>
        <div className="grid grid-cols-2 gap-2">
          <SliderWithHint label={t('grindLabel')} value={grindSize} min={1} max={10} step={1} unit="" onChange={setGrindSize} hint={hints.grind} />
          <SliderWithHint label={t('tampLabel')} value={tampPressure} min={12} max={35} step={1} unit=" kg" onChange={setTampPressure} hint={hints.tamp} />
          <Slider label={t('absorptionLabel')} value={absorptionRate} min={1} max={4} step={0.1} unit="" onChange={setAbsorptionRate} />
          <div className={`rounded-xl bg-white p-2.5 shadow-sm ${PARAM_CARD_MIN_H}`}>
            <div className="mb-1 flex flex-wrap justify-between gap-x-1 gap-y-0">
              <span className="text-xs font-medium text-stone-500">{t('brewTimeLabel')}</span>
              <span className={`text-sm font-bold tabular-nums ${!brewTimeOk ? 'text-amber-600' : ''}`}>
                {brewTime}s{!brewTimeOk && <span className="ml-0.5 text-xs font-normal">{tooFast ? t('tooFast') : t('tooSlow')}</span>}
              </span>
            </div>
            <input
              type="text" inputMode="numeric"
              value={brewTimeInput}
              onChange={(e) => {
                const raw = e.target.value
                setBrewTimeInput(raw)
                const n = Number(raw)
                if (raw !== '' && !Number.isNaN(n)) setBrewTime(n)
              }}
              onBlur={() => {
                const n = Number(brewTimeInput)
                const valid = brewTimeInput !== '' && !Number.isNaN(n)
                const final = valid ? n : 28
                setBrewTime(final)
                setBrewTimeInput(String(final))
              }}
              className="w-full rounded border border-stone-200 py-1.5 px-2 text-center text-sm tabular-nums"
            />
            <p className="mt-0.5 text-[10px] text-stone-500">{t('brewTimeTarget')}</p>
          </div>
        </div>
      </section>
    </div>
  )
}

function StepperWithHint({ label, value, min, max, step, unit, onChange, hint }) {
  const inc = () => onChange(Math.min(max, Math.round((value + step) * 100) / 100))
  const dec = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100))
  const displayVal = Number.isInteger(value) ? value : value.toFixed(1)
  return (
    <div className={`rounded-xl bg-white p-2.5 shadow-sm ${PARAM_CARD_MIN_H}`}>
      <div className="mb-1 flex justify-between items-center">
        <span className="text-xs font-medium text-stone-500">{label}</span>
        <span className="inline-flex w-5 justify-center text-amber-600 font-bold" title={hint === '↑' ? '可考慮調高' : hint === '↓' ? '可考慮調低' : ''}>{hint ?? '\u00A0'}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={dec} disabled={value <= min} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-200 text-lg font-semibold text-stone-700 disabled:opacity-40">−</button>
        <span className="min-w-[3rem] text-center text-lg font-bold tabular-nums text-stone-800">{displayVal}<span className="ml-0.5 text-sm text-stone-500">{unit}</span></span>
        <button type="button" onClick={inc} disabled={value >= max} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-200 text-lg font-semibold text-stone-700 disabled:opacity-40">+</button>
      </div>
    </div>
  )
}

function SliderWithHint({ label, value, min, max, step, unit, onChange, hint }) {
  const displayVal = Number.isInteger(value) ? value : value.toFixed(1)
  return (
    <div className={`rounded-xl bg-white p-2.5 shadow-sm ${PARAM_CARD_MIN_H}`}>
      <div className="mb-1 flex justify-between items-center">
        <span className="text-xs font-medium text-stone-500">{label}</span>
        <span className="flex items-center gap-1 min-w-[3rem] justify-end">
          <span className="inline-flex w-5 justify-center text-amber-600 font-bold">{hint ?? '\u00A0'}</span>
          <span className="text-sm font-bold tabular-nums text-stone-800">{displayVal}{unit}</span>
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-2 w-full" />
    </div>
  )
}

// 義式配置表單：名稱與比例左右對稱，無外層泡泡
function EspressoConfigForm({ config, onSave, onCancel, onDelete }) {
  const { t } = useLang()
  const [name, setName] = useState(config?.name || '')
  const [yieldRatio, setYieldRatio] = useState(() => {
    const r = config?.yieldRatio ?? 3
    return ESPRESSO_RATIO_PRESETS.some(p => p.ratio === r) ? r : 3
  })
  useEffect(() => {
    setName(config?.name || '')
    const r = config?.yieldRatio ?? 3
    setYieldRatio(ESPRESSO_RATIO_PRESETS.some(p => p.ratio === r) ? r : 3)
  }, [config?.id])
  return (
    <div className="mt-1">
      <input type="text" value={name} onChange={(e) => setName(e.target.value)}
        placeholder={t('configNamePlaceholder')}
        className="mb-2 w-full rounded border border-stone-200 px-2 py-1.5 text-sm" />
      <div className="mb-2">
        <p className="mb-1 text-xs text-stone-500">{t('ratioSelectLabel')}</p>
        <div className="flex gap-1.5">
          {ESPRESSO_RATIO_PRESETS.map(p => (
            <button
              key={p.ratio}
              type="button"
              onClick={() => { setYieldRatio(p.ratio); if (!name) setName(p.name) }}
              className={`flex-1 rounded-lg border py-2 text-center transition ${yieldRatio === p.ratio
                ? 'border-espresso-500 bg-espresso-600 text-white'
                : 'border-stone-200 bg-stone-50 text-stone-700'}`}
            >
              <div className="text-sm font-bold">{p.name}</div>
              <div className="text-[10px] opacity-80">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-1.5 items-center">
        <button type="button" onClick={() => onSave({ ...config, name: name || espressoRatioName(yieldRatio), yieldRatio })} className="rounded px-3 py-1.5 text-xs text-white bg-espresso-600">{t('save')}</button>
        <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-xs text-stone-700 bg-stone-200">{t('cancel')}</button>
        <button type="button" onClick={onDelete || (() => {})} disabled={!onDelete} className="rounded px-3 py-1.5 text-xs text-white bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed">{t('delete')}</button>
      </div>
    </div>
  )
}

// 自訂飲品：名稱與下拉左右對稱；下方牛奶/水下拉、右側另一個配料；無外層泡泡
const EXTRA_LABEL_OPTIONS = [{ value: '牛奶', label: '牛奶' }, { value: '水', label: '水' }]
function CustomDrinkForm({ drink, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(drink?.name || '')
  const [milkParts, setMilkParts] = useState(drink?.milkParts ?? 5)
  const [hasMilk, setHasMilk] = useState(drink?.milkParts != null)
  const [extraLabel, setExtraLabel] = useState(drink?.extraLabel || '牛奶')
  const [others, setOthers] = useState(drink?.others?.length ? drink.others : [{ name: '', amount: '少許' }])

  useEffect(() => {
    setName(drink?.name || '')
    setMilkParts(drink?.milkParts ?? 5)
    setHasMilk(drink?.milkParts != null)
    setExtraLabel(drink?.extraLabel || '牛奶')
    setOthers(drink?.others?.length ? drink.others : [{ name: '', amount: '少許' }])
  }, [drink?.id])

  const addOther = () => setOthers(o => [...o, { name: '', amount: '少許' }])
  const updateOther = (i, field, val) => setOthers(o => o.map((x, j) => j === i ? { ...x, [field]: val } : x))
  const removeOther = (i) => setOthers(o => o.filter((_, j) => j !== i))

  return (
    <div className="mt-2">
      <p className="mb-2 text-[11px] text-stone-500">濃縮粉液比請以主畫面左上方「義式濃縮」下拉為準；此處只設定品項名稱與濃縮／奶或水的比例。</p>
      <div className="flex gap-2 items-center mb-2">
        <div className="flex-1 min-w-0">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="品項名稱" className="w-full rounded border border-stone-200 px-2 py-1.5 text-sm" />
        </div>
      </div>
      {/* 液體比例 */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <label className="flex items-center gap-1.5 text-xs text-stone-600 shrink-0 h-9">
          <input type="checkbox" checked={hasMilk} onChange={(e) => setHasMilk(e.target.checked)} />
          濃縮:
        </label>
        <select value={extraLabel} onChange={(e) => setExtraLabel(e.target.value)} className="h-9 rounded border border-stone-200 px-2 py-1.5 text-sm text-stone-800 flex-1 min-w-[4rem]" disabled={!hasMilk}>
          {EXTRA_LABEL_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {hasMilk && (
          <>
            <span className="text-xs text-stone-600 shrink-0">1:</span>
            <input type="text" inputMode="decimal" value={milkParts} onChange={(e) => setMilkParts(asNumberOr(e.target.value, 0))} className="h-9 w-14 rounded border border-stone-200 px-2 py-1.5 text-sm text-right tabular-nums" />
          </>
        )}
      </div>
      {/* 其他配料 */}
      <div className="flex gap-1 items-start mb-2">
        <div className="flex-1 min-w-0 space-y-1">
          {others.map((o, i) => (
            <div key={i} className="flex gap-1 items-center h-9">
              <input type="text" value={o.name} onChange={(e) => updateOther(i, 'name', e.target.value)} placeholder="名稱" className="flex-1 min-w-0 h-9 rounded border border-stone-200 px-2 py-1.5 text-sm" />
              <input type="text" value={o.amount} onChange={(e) => updateOther(i, 'amount', e.target.value)} placeholder="比例／少許" className="flex-1 min-w-0 h-9 rounded border border-stone-200 px-2 py-1.5 text-sm" />
              <button type="button" onClick={() => removeOther(i)} className="text-red-500 shrink-0 h-9 w-9 flex items-center justify-center" aria-label="刪除">×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addOther} className="shrink-0 flex h-9 w-9 items-center justify-center rounded border border-stone-200 text-stone-500 hover:bg-stone-50 text-lg" aria-label="新增">+</button>
      </div>
      <div className="flex gap-1.5 items-center">
        <button type="button" onClick={() => onSave({ ...drink, name, milkParts: hasMilk ? milkParts : null, extraLabel: hasMilk ? extraLabel : undefined, others })} className="rounded px-3 py-1.5 text-xs text-white bg-espresso-600">儲存</button>
        <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-xs text-stone-700 bg-stone-200">取消</button>
        <button type="button" onClick={onDelete || (() => {})} className="rounded px-3 py-1.5 text-xs text-white bg-red-600">刪除</button>
      </div>
    </div>
  )
}

// ——— 手沖：時間軸萃取理論常數 (3 分鐘基準) ———
const EXTRACTION_STAGES = [
  { start: 0, end: 30, label: '悶蒸', flavor: '高強度酸質', color: 'bg-amber-300', textColor: 'text-amber-900' },
  { start: 31, end: 60, label: '前段', flavor: '酸質＋甜感', color: 'bg-amber-400', textColor: 'text-amber-900' },
  { start: 61, end: 90, label: '中段', flavor: '甜感高峰·苦初現', color: 'bg-orange-400', textColor: 'text-orange-900' },
  { start: 91, end: 120, label: '中後段', flavor: '甜降·苦增', color: 'bg-orange-600', textColor: 'text-white' },
  { start: 121, end: 150, label: '後段', flavor: '苦·澀釋放', color: 'bg-amber-800', textColor: 'text-white' },
  { start: 151, end: 180, label: '尾段', flavor: '澀·雜味·水感', color: 'bg-stone-500', textColor: 'text-white' },
]

const TROUBLESHOOTING_OPTIONS = {
  sour: {
    title: '覺得太酸、沒有甜味 (萃取不足)',
    diagnosis: '前段酸質萃取完後，未能有效萃取出中段的甜感。',
    tips: [
      { category: '時間軸操作', text: '拉長 30秒～1分30秒 之間的注水時間（甜感黃金區間），或增加此階段的給水量。' },
      { category: '研磨與水溫', text: '稍微調細研磨度，或提高水溫 1～2°C，加速整體物質釋放。' },
    ],
  },
  bitter: {
    title: '覺得太苦、澀感重、有雜味 (過度萃取)',
    diagnosis: '萃取時間拖到了 2 分鐘之後，進入了苦澀釋放區。',
    tips: [
      { category: '時間軸操作', text: '提早斷水！在 1分45秒 至 2分鐘 左右停止注水，捨棄尾段容易帶有澀感的液體。若水量不夠，最後再加入熱水 (Bypass) 補足。' },
      { category: '研磨與水溫', text: '調粗研磨度，加快水流速度，避免咖啡粉浸泡過久。' },
    ],
  },
  flat: {
    title: '覺得風味太平淡、水感重',
    diagnosis: '整體萃取效率太低，或是前段風味最強烈的物質沒有被帶出來。',
    tips: [
      { category: '時間軸操作', text: '確實做好 0～30 秒的悶蒸，並適當拉長悶蒸時間至 40 秒，確保粉層完全排氣。' },
      { category: '注水手法', text: '在前段（0～60 秒）注水時加大水流攪動，提升前中段的風味濃度。' },
    ],
  },
}

// 風味按鈕（舊的 4 項）
const FLAVOR_TIPS = {
  bitter: { title: '太苦 / 有雜味', tips: ['研磨度調粗', '降低水溫 1～2 °C', '加快水流 / 縮短萃取時間'] },
  sour: { title: '太酸 / 萃取不足', tips: ['研磨度調細', '提高水溫 1～2 °C', '延長悶蒸時間'] },
  sweet: { title: '想提升甜感與厚度', tips: ['稍微增加粉量', '增加注水段數（提高攪動）'] },
  clean: { title: '想要乾淨花果香', tips: ['減少注水段數（如一刀流）', '稍微調粗研磨'] },
}

// 時間–水量簡易圖：points 為 { time, water, temp }[]，必含 (0,0) 起點以畫出第一段線與原點節點
function TimeWaterChart({ points: pointsProp, totalWater, maxTime: maxTimeProp }) {
  if (!pointsProp?.length) return null
  const maxTime =
    maxTimeProp != null && maxTimeProp > 0
      ? maxTimeProp
      : Math.max(180, ...pointsProp.map((p) => p.time))
  const maxW = Math.max(totalWater, 0.001, ...pointsProp.map((p) => p.water))
  const w = 280
  const h = 120
  const pad = { l: 32, r: 24, t: 8, b: 28 }
  const x = (t) => pad.l + (t / maxTime) * (w - pad.l - pad.r)
  const y = (v) => pad.t + (h - pad.t - pad.b) * (1 - v / maxW)

  const points = pointsProp.map((s) => ({
    x: x(s.time),
    y: y(s.water),
    temp: s.temp,
    water: s.water,
    time: s.time,
  }))
  const pathD = points.length ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ') : ''

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      {/* 網格線 + 座標軸 */}
      {/* 橫向網格 & 縱軸刻度（水量） */}
      {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
        const v = Math.round(r * maxW)
        const yy = y(v)
        return (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={yy} y2={yy} stroke="#e5e5e5" strokeWidth="0.5" />
            <text x={pad.l - 4} y={yy + 3} textAnchor="end" className="fill-stone-500" fontSize="8">{v}</text>
          </g>
        )
      })}
      {/* 縱向網格 & 橫軸刻度（時間） */}
      {Array.from({ length: Math.floor(maxTime / 60) + 1 }, (_, i) => i * 60).filter(t => t <= maxTime).map(t => {
        const xx = x(t)
        return (
          <g key={t}>
            <line x1={xx} x2={xx} y1={pad.t} y2={h - pad.b} stroke="#e5e5e5" strokeWidth="0.5" />
            <text x={xx} y={h - 3} textAnchor="middle" className="fill-stone-500" fontSize="8">{t}</text>
          </g>
        )
      })}
      {/* 座標軸線 */}
      <line x1={pad.l} x2={w - pad.r} y1={h - pad.b} y2={h - pad.b} stroke="#a3a3a3" strokeWidth="0.75" />
      <line x1={pad.l} x2={pad.l} y1={pad.t} y2={h - pad.b} stroke="#a3a3a3" strokeWidth="0.75" />
      {/* 軸單位：橫軸「秒」→右下角，縱軸「ml」→左上角（textAnchor=start 從 x=1 起，不與刻度文字重疊） */}
      <text x={w - pad.r + 2} y={h - pad.b + 10} textAnchor="end" className="fill-stone-400" fontSize="7">s</text>
      <text x={1} y={pad.t - 1} textAnchor="start" className="fill-stone-400" fontSize="7">ml</text>
      <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2" className="text-pour-500" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={i === 0 ? 3.5 : 3} className="fill-pour-600" stroke={i === 0 ? '#fff' : 'none'} strokeWidth={i === 0 ? 0.75 : 0} />
          {i > 0 ? (
            <text x={p.x} y={p.y - 5} textAnchor="middle" className="fill-stone-500" fontSize="7">{p.water}</text>
          ) : null}
        </g>
      ))}
    </svg>
  )
}

//（GoldCupCard 已不再使用，移除）

// 沖煮技巧：效果以 酸／甜／苦／雜 設定
const DEFAULT_TECHNIQUES = [
  { id: 'bloom',  name: '悶蒸',    effectSour: '', effectSweet: '',       effectBitter: '', effectOff: '排氣、均勻浸濕',   bonusExt: 2,  bonusFlow: 0,  bonusBed: 1, bonusEven: 2 },
  { id: 'circle', name: '畫圈',    effectSour: '', effectSweet: '增加萃取', effectBitter: '', effectOff: '',               bonusExt: 2,  bonusFlow: 2,  bonusBed: 1, bonusEven: 0 },
  { id: 'center', name: '中心注水', effectSour: '', effectSweet: '',       effectBitter: '', effectOff: '減少攪動、較乾淨', bonusExt: -1, bonusFlow: -2, bonusBed: 0, bonusEven: 2 },
  { id: 'spiral', name: '螺旋注水', effectSour: '平衡酸', effectSweet: '平衡甜', effectBitter: '', effectOff: '',           bonusExt: 1,  bonusFlow: 1,  bonusBed: 2, bonusEven: 1 },
  { id: 'wash',   name: '洗刷粉牆', effectSour: '', effectSweet: '均勻萃取', effectBitter: '', effectOff: '',              bonusExt: 1,  bonusFlow: 3,  bonusBed: 2, bonusEven: 1 },
]

/**
 * 手法（Methods）：每個手法包含沖煮參數（粉重/粉水比/水溫/研磨）以及注水步驟表。
 * 豆子只儲存風味資訊，參數歸屬於手法。
 */
const DEFAULT_METHODS = [
  {
    id: 'm1', name: '四六法',
    coffeeWeight: 20, waterRatio: 15, waterTemp: 92, grindSize: 5, absorptionRate: 2,
    steps: [
      { intervalSec: 45, addWaterMl: 60,  temp: 92, technique: '悶蒸'    },
      { intervalSec: 45, addWaterMl: 60,  temp: 92, technique: '畫圈'    },
      { intervalSec: 45, addWaterMl: 60,  temp: 92, technique: '畫圈'    },
      { intervalSec: 45, addWaterMl: 80,  temp: 91, technique: '中心注水' },
      { intervalSec: 60, addWaterMl: 40,  temp: 91, technique: '中心注水' },
    ],
  },
  {
    id: 'm2', name: '一刀流',
    coffeeWeight: 20, waterRatio: 16, waterTemp: 93, grindSize: 4.5, absorptionRate: 2,
    steps: [
      { intervalSec: 45,  addWaterMl: 50,  temp: 93, technique: '悶蒸'    },
      { intervalSec: 120, addWaterMl: 270, temp: 93, technique: '螺旋注水' },
    ],
  },
  {
    id: 'm3', name: '三段式',
    coffeeWeight: 20, waterRatio: 15, waterTemp: 93, grindSize: 5, absorptionRate: 2,
    steps: [
      { intervalSec: 45, addWaterMl: 50,  temp: 93, technique: '悶蒸'    },
      { intervalSec: 60, addWaterMl: 100, temp: 93, technique: '畫圈'    },
      { intervalSec: 60, addWaterMl: 100, temp: 92, technique: '中心注水' },
      { intervalSec: 60, addWaterMl: 50,  temp: 91, technique: '洗刷粉牆' },
    ],
  },
]

const ROAST_LEVELS = [
  { zh: '極淺', en: 'Light+' },
  { zh: '淺',   en: 'Light' },
  { zh: '淺中', en: 'Medium Light' },
  { zh: '中',   en: 'Medium' },
  { zh: '中深', en: 'Medium Dark' },
  { zh: '深',   en: 'Dark' },
]

/** 每步：間格時間(秒)、本步加水量(ml)；累計水量與折線由程式推算 */
const DEFAULT_POUR_PLAN_STEPS = [
  { intervalSec: 45, addWaterMl: 60, temp: 93, technique: '悶蒸' },
  { intervalSec: 45, addWaterMl: 90, temp: 93, technique: '畫圈' },
  { intervalSec: 45, addWaterMl: 90, temp: 92, technique: '中心注水' },
  { intervalSec: 45, addWaterMl: 60, temp: 91, technique: '完成' },
]

function migrateLegacyPlanSteps(raw) {
  const toStep = (s, waterValue, waterMode) => ({
    intervalSec: Math.max(0, Number(s.intervalSec) || 0),
    waterValue:  Math.max(0, Number(waterValue) || 0),
    waterMode:   waterMode ?? 'fixed',
    temp:        asNumberOr(s.temp, 93),
    technique:   s.technique ?? '',
  })
  if (!raw?.length) return DEFAULT_POUR_PLAN_STEPS.map((s) => ({
    intervalSec: Math.max(0, Number(s.intervalSec) || 0),
    waterValue:  Math.max(0, Number(s.waterValue ?? s.addWaterMl) || 0),
    waterMode:   s.waterMode ?? 'fixed',
    temp:        asNumberOr(s.temp, 93),
    technique:   s.technique ?? '',
  }))
  // 新格式：已有 intervalSec + waterValue
  if (raw[0]?.intervalSec != null && raw[0]?.waterValue != null) {
    return raw.map((s) => toStep(s, s.waterValue, s.waterMode))
  }
  // 舊格式：已有 intervalSec + addWaterMl（升級為 fixed）
  if (raw[0]?.intervalSec != null && raw[0]?.addWaterMl != null) {
    return raw.map((s) => toStep(s, s.addWaterMl, 'fixed'))
  }
  // 最舊格式：time/water 絕對值對
  const out = []
  for (let i = 1; i < raw.length; i++) {
    const prev = raw[i - 1]
    const cur  = raw[i]
    const t0   = Number(prev.time) || 0
    const t1   = Number(cur.time)  || 0
    const w0   = Number(prev.water) || 0
    const w1   = Number(cur.water)  || 0
    const isLast = i === raw.length - 1
    out.push({
      intervalSec: Math.max(0, t1 - t0),
      waterValue:  Math.max(0, w1 - w0),
      waterMode:   'fixed',
      temp:        asNumberOr(cur.temp, 93),
      technique:   (isLast ? cur.technique : prev.technique) ?? '',
    })
  }
  return out.length ? out : DEFAULT_POUR_PLAN_STEPS.map((s) => ({ ...s }))
}

/** 時間表編輯緩存（字串可空白）；關閉編輯時以 commitPlanStepsBuffer 寫回 */
function planStepsToEditBuffer(steps) {
  return steps.map((s) => ({
    intervalSec: String(s.intervalSec ?? ''),
    waterValue:  String(s.waterValue ?? s.addWaterMl ?? ''),
    waterMode:   s.waterMode ?? 'fixed',
    temp:        String(s.temp ?? ''),
    technique:   s.technique ?? '',
  }))
}

function commitPlanStepsBuffer(buf) {
  return buf.map((s) => ({
    intervalSec: Math.max(0, Number(s.intervalSec) || 0),
    waterValue:  Math.max(0, Number(s.waterValue)  || 0),
    waterMode:   s.waterMode ?? 'fixed',
    temp:        asNumberOr(s.temp, 93),
    technique:   s.technique ?? '',
  }))
}

/** 第 i 步起點秒數 = 前面各步 intervalSec 之和 */
function stepStartSecFromIntervals(steps, i) {
  let s = 0
  for (let k = 0; k < i; k++) s += Math.max(0, Number(steps[k]?.intervalSec) || 0)
  return s
}

/** 解析單步實際水量（支援 waterValue+waterMode 雙軌，並向下相容 addWaterMl） */
function resolveStepWater(step, totalWater) {
  const mode = step.waterMode ?? 'fixed'
  const val  = step.waterValue ?? step.addWaterMl ?? 0
  if (mode === 'percent') return Math.round((totalWater || 0) * (Number(val) || 0) / 100)
  return Math.max(0, Number(val) || 0)
}

/** 折線圖用：含 (0,0) 起點，之後每步終點（需傳 totalWater 以解析 percent 步驟） */
function buildChartPointsFromPlan(steps, totalWater = 0) {
  let t = 0
  let w = 0
  const pts = [{ time: 0, water: 0, temp: steps[0] != null ? asNumberOr(steps[0].temp, 93) : 93 }]
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]
    const is = Math.max(0, Number(s.intervalSec) || 0)
    const aw = resolveStepWater(s, totalWater)
    t += is
    w += aw
    pts.push({ time: t, water: w, temp: asNumberOr(s.temp, 93) })
  }
  return pts
}

function createDefaultBean(extra = {}) {
  return {
    id: `bean-${Date.now()}`,
    name: '新豆子',
    origin: '',
    variety: '',
    process: '',
    roast: '',
    flavorNote: '',
    defaultMethodId: 'm1',
    history: [],
    ...extra,
  }
}

function formatBrewDateTime() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function scoreToneClass(n) {
  if (n >= 7) return 'border-emerald-200 bg-emerald-50/90'
  if (n <= 4) return 'border-amber-200 bg-amber-50/90'
  return 'border-stone-200 bg-white'
}

const INPUT_CELL =
  'w-full rounded border border-stone-200 px-2 py-1 text-[13px] text-stone-800 transition placeholder:text-stone-400 focus:border-pour-400 focus:outline-none'

function clampCoffeeWeight(v) {
  return Math.min(40, Math.max(0, Math.round(v * 10) / 10))
}
function clampWaterRatio(v) {
  return Math.min(18, Math.max(0, Math.round(v * 10) / 10))
}
function clampWaterTemp(v) {
  return Math.min(98, Math.max(0, Math.round(v)))
}
function clampGrindSize(v) {
  return Math.min(10, Math.max(0, Math.round(v * 2) / 2))
}
function clampAbsorption(v) {
  return Math.min(5, Math.max(0, Math.round(v * 10) / 10))
}

function PourOverTab() {
  const { t, lang } = useLang()
  // ── 持久化狀態 ────────────────────────────────────────────────────────────
  const [beans, setBeans]                 = useLocalStorageState('coffee.pour.beans', [])
  const [selectedBeanId, setSelectedBeanId] = useLocalStorageState('coffee.pour.selectedBeanId', '')
  const [methods, setMethods]             = useLocalStorageState('coffee.pour.methods', DEFAULT_METHODS)
  const [selectedMethodId, setSelectedMethodId] = useLocalStorageState('coffee.pour.selectedMethodId', 'm1')
  const [techniques, setTechniques]       = useLocalStorageState('coffee.pour.techniques', DEFAULT_TECHNIQUES)

  // ── 揮發狀態 ─────────────────────────────────────────────────────────────
  const [planEditing, setPlanEditing]     = useState(false)
  const [tableEditing, setTableEditing]   = useState(false)
  const [planStepsEditBuffer, setPlanStepsEditBuffer] = useState(null)
  const [showTechniqueForm, setShowTechniqueForm] = useState(false)
  const [editingTechnique, setEditingTechnique]   = useState(null)
  const [inlineTechniqueId, setInlineTechniqueId] = useState(null)
  const [newTechniqueDraft, setNewTechniqueDraft] = useState(null) // 新增草稿，未儲存前不寫入 techniques
  const [techniqueCardOpen, setTechniqueCardOpen] = useState(false)
  const [showBrewTimer, setShowBrewTimer] = useState(false)
  const [showBrewLogModal, setShowBrewLogModal] = useState(false)
  const [brewExecution, setBrewExecution]   = useState(7)
  const [brewResult, setBrewResult]         = useState(7)
  const [brewPros, setBrewPros]             = useState('')
  const [brewCons, setBrewCons]             = useState('')
  const [brewActualParams, setBrewActualParams] = useState({ cw: '20', wr: '15', wt: '92', gs: '5' })
  const [brewDirection, setBrewDirection] = useState('')
  const [methodParamDraft, setMethodParamDraft] = useState({ cw: '20', wr: '15', wt: '92', gs: '5', ar: '2' })
  const [showNewBeanModal, setShowNewBeanModal] = useState(false)
  const [newBeanNameInput, setNewBeanNameInput] = useState('')
  const [showNewMethodModal, setShowNewMethodModal] = useState(false)
  const [newMethodNameInput, setNewMethodNameInput] = useState('')
  const [historySectionOpen, setHistorySectionOpen] = useState(true)
  const [logDetailOpen, setLogDetailOpen] = useState({})
  const [historyFilterBeanId, setHistoryFilterBeanId] = useState('')

  // ── 首次種子資料 ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!methods.length) setMethods(DEFAULT_METHODS)
  }, [])
  useEffect(() => {
    if (beans.length === 0) {
      const b = createDefaultBean()
      setBeans([b]); setSelectedBeanId(b.id); return
    }
    if (!selectedBeanId || !beans.some((x) => x.id === selectedBeanId))
      setSelectedBeanId(beans[0].id)
  }, [beans, selectedBeanId])

  // ── 衍生值 ────────────────────────────────────────────────────────────────
  const allMethods    = methods.length ? methods : DEFAULT_METHODS
  const currentBean   = beans.find((b) => b.id === selectedBeanId)   ?? beans[0]         ?? null
  const currentMethod = allMethods.find((m) => m.id === selectedMethodId) ?? allMethods[0] ?? null

  // 切換豆子 → 自動套用其預設手法
  useEffect(() => {
    const preferred = currentBean?.defaultMethodId
    if (preferred && allMethods.some((m) => m.id === preferred))
      setSelectedMethodId(preferred)
  }, [currentBean?.id])

  // 切換手法 → 同步參數 draft；若在編輯中也重設步驟 buffer
  useEffect(() => {
    if (!currentMethod) return
    setMethodParamDraft({
      cw: String(currentMethod.coffeeWeight   ?? 20),
      wr: String(currentMethod.waterRatio     ?? 15),
      wt: String(currentMethod.waterTemp      ?? 92),
      gs: String(currentMethod.grindSize      ?? 5),
      ar: String(currentMethod.absorptionRate ?? 2),
    })
    if (planEditing || tableEditing) {
      const steps = migrateLegacyPlanSteps(
        currentMethod.steps?.length ? currentMethod.steps : DEFAULT_POUR_PLAN_STEPS
      )
      setPlanStepsEditBuffer(planStepsToEditBuffer(steps))
    }
  }, [currentMethod?.id])

  const coffeeWeight  = currentMethod?.coffeeWeight ?? 20
  const waterRatio    = currentMethod?.waterRatio   ?? 15
  const waterTemp     = currentMethod?.waterTemp    ?? 92
  const grindSize     = currentMethod?.grindSize    ?? 5
  const roastVal      = currentBean?.roast          ?? ''
  const roastIsLegacy = Boolean(roastVal && !ROAST_LEVELS.some(r => r.zh === roastVal))

  const planSteps = useMemo(
    () => migrateLegacyPlanSteps(currentMethod?.steps?.length ? currentMethod.steps : DEFAULT_POUR_PLAN_STEPS),
    [currentMethod?.steps, currentMethod?.id]
  )
  const cwParsed = parseFloat(methodParamDraft.cw)
  const wrParsed = parseFloat(methodParamDraft.wr)
  const wtParsed = parseFloat(methodParamDraft.wt)
  const gsParsed = parseFloat(methodParamDraft.gs)
  const arParsed = parseFloat(methodParamDraft.ar)
  const effCoffeeWeight    = Number.isNaN(cwParsed) ? coffeeWeight : cwParsed
  const effWaterRatio      = Number.isNaN(wrParsed) ? waterRatio  : wrParsed
  const effWaterTemp       = Number.isNaN(wtParsed) ? waterTemp   : wtParsed
  const effGrindSize       = Number.isNaN(gsParsed) ? grindSize   : gsParsed
  const effAbsorptionRate  = Number.isNaN(arParsed) ? (currentMethod?.absorptionRate ?? 2) : arParsed
  // 百分比步驟計算基數：含吸水率的總投水量 = (粉水比 + 吸水率) × 粉重
  const totalWater = Math.round(effCoffeeWeight * (effWaterRatio + effAbsorptionRate) * 10) / 10

  const planStepsForChart = useMemo(() => {
    if (planStepsEditBuffer != null) return commitPlanStepsBuffer(planStepsEditBuffer)
    return planSteps
  }, [planStepsEditBuffer, planSteps])
  const chartPoints = useMemo(() => buildChartPointsFromPlan(planStepsForChart, totalWater), [planStepsForChart, totalWater])
  const tableMaxSec = chartPoints.length ? Math.max(...chartPoints.map((p) => p.time)) : 0
  const timeAxisMax = Math.max(60, Math.ceil(tableMaxSec / 60) * 60)
  const pourTableRows = tableEditing && planStepsEditBuffer ? planStepsEditBuffer : planSteps

  // ── helpers ───────────────────────────────────────────────────────────────
  const patchCurrentBean = (patch) => {
    if (!currentBean) return
    setBeans((prev) => prev.map((b) => (b.id === currentBean.id ? { ...b, ...patch } : b)))
  }
  const patchCurrentMethod = (patch) => {
    if (!currentMethod) return
    setMethods((prev) => prev.map((m) => (m.id === currentMethod.id ? { ...m, ...patch } : m)))
  }
  const updatePlanEditRow = (i, field, value) => {
    setPlanStepsEditBuffer((rows) =>
      rows == null ? null : rows.map((s, j) => (j === i ? { ...s, [field]: value } : s))
    )
  }
  const togglePlanEditing = () => {
    setPlanEditing((v) => !v)
  }
  const toggleTableEditing = () => {
    if (tableEditing) {
      if (planStepsEditBuffer) patchCurrentMethod({ steps: commitPlanStepsBuffer(planStepsEditBuffer) })
      setPlanStepsEditBuffer(null)
      setTableEditing(false)
    } else {
      setPlanStepsEditBuffer(planStepsToEditBuffer(
        migrateLegacyPlanSteps(currentMethod?.steps?.length ? currentMethod.steps : DEFAULT_POUR_PLAN_STEPS)
      ))
      setTableEditing(true)
    }
  }
  const openAddBeanModal = () => { setNewBeanNameInput(''); setShowNewBeanModal(true) }
  const confirmAddBean = () => {
    const name = newBeanNameInput.trim() || '新豆子'
    if (planStepsEditBuffer) patchCurrentMethod({ steps: commitPlanStepsBuffer(planStepsEditBuffer) })
    setPlanStepsEditBuffer(null); setPlanEditing(false); setTableEditing(false)
    const nb = createDefaultBean({ name, defaultMethodId: selectedMethodId })
    setBeans((prev) => [...prev, nb]); setSelectedBeanId(nb.id)
    setShowNewBeanModal(false); setNewBeanNameInput('')
  }
  const handleDeleteCurrentBean = () => {
    if (!currentBean) return
    if (beans.length <= 1) { window.alert('至少保留一筆豆子'); return }
    if (!window.confirm(`確定刪除「${currentBean.name || '未命名'}」？`)) return
    const next = beans.filter((b) => b.id !== currentBean.id)
    setBeans(next); setSelectedBeanId(next[0]?.id ?? '')
    setPlanStepsEditBuffer(null); setPlanEditing(false); setTableEditing(false)
  }
  const openAddMethodModal = () => { setNewMethodNameInput(''); setShowNewMethodModal(true) }
  const confirmAddMethod = () => {
    const name = newMethodNameInput.trim() || '新手法'
    const template = currentMethod ?? DEFAULT_METHODS[0]
    const nm = {
      ...template,
      id: `method-${Date.now()}`,
      name,
    }
    setMethods((prev) => [...prev, nm])
    setSelectedMethodId(nm.id)
    setShowNewMethodModal(false)
    setNewMethodNameInput('')
  }
  const handleDeleteCurrentMethod = () => {
    if (!currentMethod) return
    if (allMethods.length <= 1) { window.alert('至少保留一個手法'); return }
    if (!window.confirm(`確定刪除「${currentMethod.name}」手法？`)) return
    const next = methods.filter((m) => m.id !== currentMethod.id)
    setMethods(next.length ? next : DEFAULT_METHODS)
    setSelectedMethodId((next.length ? next : DEFAULT_METHODS)[0].id)
    setPlanStepsEditBuffer(null)
  }
  const handleDeleteBrewLog = (log, hi) => {
    if (!window.confirm('確定刪除此筆沖煮紀錄？')) return
    const rowKey = log.id ?? `hist-${log.date}-${hi}`
    const targetBeanId = log.beanId ?? currentBean?.id
    setBeans((prev) => prev.map((b) => {
      if (b.id !== targetBeanId) return b
      return { ...b, history: (b.history || []).filter((h) => h !== log) }
    }))
    setLogDetailOpen((prev) => { const n = { ...prev }; delete n[rowKey]; return n })
  }
  const toggleLogDetail = (logId) =>
    setLogDetailOpen((prev) => ({ ...prev, [logId]: !prev[logId] }))
  const handleRenameBean = () => {
    if (!currentBean) return
    const next = window.prompt('豆子名稱', currentBean.name)
    if (next != null && next.trim()) patchCurrentBean({ name: next.trim() })
  }

  const buildPourPlanSnapshot = (steps) =>
    steps.map((s, i) => {
      const startT = stepStartSecFromIntervals(steps, i)
      const intervalSec = Math.max(0, Number(s.intervalSec) || 0)
      const endT = startT + intervalSec
      const segWater = resolveStepWater(s, totalWater)
      let cumPrevW = 0
      for (let k = 0; k < i; k++) cumPrevW += resolveStepWater(steps[k], totalWater)
      const cumW = cumPrevW + segWater
      return {
        startTime: startT,
        time: endT,
        intervalSec,
        cumulativeWater: cumW,
        segmentWater: segWater,
        temp: s.temp,
        technique: s.technique || '',
      }
    })

  const handleSaveBrewLog = () => {
    if (!currentBean) return
    const actualCw = asNumberOr(parseFloat(brewActualParams.cw), effCoffeeWeight)
    const actualWr = asNumberOr(parseFloat(brewActualParams.wr), effWaterRatio)
    const actualWt = asNumberOr(parseFloat(brewActualParams.wt), effWaterTemp)
    const actualGs = asNumberOr(parseFloat(brewActualParams.gs), effGrindSize)
    const entry = {
      id: `log-${Date.now()}`,
      date: formatBrewDateTime(),
      beanId: currentBean.id,
      beanSnapshot: {
        name:       currentBean.name       ?? '',
        origin:     currentBean.origin     ?? '',
        variety:    currentBean.variety    ?? '',
        process:    currentBean.process    ?? '',
        roast:      currentBean.roast      ?? '',
        flavorNote: currentBean.flavorNote ?? '',
      },
      methodId:   currentMethod?.id   ?? '',
      methodName: currentMethod?.name ?? '',
      coffeeWeight: actualCw,
      waterRatio:   actualWr,
      waterTemp:    actualWt,
      grindSize:    actualGs,
      executionScore: Math.min(10, Math.max(1, Number(brewExecution) || 5)),
      resultScore:    Math.min(10, Math.max(1, Number(brewResult) || 5)),
      pros:      brewPros.trim(),
      cons:      brewCons.trim(),
      direction: brewDirection.trim(),
      steps: planStepsForChart.map((s) => ({
        intervalSec: Math.max(0, Number(s.intervalSec) || 0),
        waterValue:  Math.max(0, Number(s.waterValue ?? s.addWaterMl) || 0),
        waterMode:   s.waterMode ?? 'fixed',
        temp:        asNumberOr(s.temp, actualWt),
        technique:   s.technique || '',
      })),
    }
    setBeans((prev) =>
      prev.map((b) =>
        b.id === currentBean.id ? { ...b, history: [entry, ...(b.history || [])] } : b
      )
    )
    setBrewExecution(7)
    setBrewResult(7)
    setBrewPros('')
    setBrewCons('')
    setBrewDirection('')
    setShowBrewLogModal(false)
  }

  // 彙整所有豆子的歷史，並補上 beanId/beanName（相容舊紀錄）
  const allHistory = beans.flatMap((b) =>
    (b.history || []).map((log) => ({
      ...log,
      beanId:   log.beanId   ?? b.id,
      beanName: log.beanSnapshot?.name ?? log.beanName ?? b.name,
    }))
  ).sort((a, b) => String(b.date).localeCompare(String(a.date)))
  const sortedHistory = historyFilterBeanId
    ? allHistory.filter((log) => log.beanId === historyFilterBeanId)
    : allHistory

  return (
    <div className="space-y-3 pb-24">
      {/* 目標總注水量 */}
      <section className="rounded-xl bg-pour-700 p-3 text-white shadow transition-colors">
        {/* 第一行：豆名 + 水量 */}
        <div className="flex items-center justify-between gap-2">
          {planEditing && currentBean ? (
            <input
              type="text"
              value={currentBean.name ?? ''}
              onChange={(e) => patchCurrentBean({ name: e.target.value })}
              className="flex-1 min-w-0 rounded border border-white/40 bg-white/15 px-2 py-0.5 text-sm font-medium text-white placeholder:text-pour-200 focus:border-white focus:outline-none"
              placeholder="豆子名稱"
              aria-label="豆子名稱"
            />
          ) : (
            <button
              type="button"
              onClick={handleRenameBean}
              className="flex-1 min-w-0 text-left text-sm font-semibold underline-offset-2 transition hover:underline active:opacity-90 truncate"
              title="點擊修改豆子名稱"
            >
              {currentBean ? currentBean.name : '—'}
            </button>
          )}
          {/* 總水量/水量 */}
          {(() => {
            const cw = parseFloat(methodParamDraft.cw)
            const wr = parseFloat(methodParamDraft.wr)
            const ar = parseFloat(methodParamDraft.ar)
            if (Number.isNaN(cw) || Number.isNaN(wr)) return null
            const waterVol = Math.round(wr * cw)
            const totalVol = Number.isNaN(ar) ? null : Math.round((wr + ar) * cw)
            return (
              <span className="shrink-0 tabular-nums text-right leading-none">
                <span className="text-base font-bold text-pour-100">{totalVol != null ? totalVol : waterVol}</span>
                <span className="text-xs font-normal text-pour-300">/{waterVol} ml</span>
              </span>
            )
          })()}
        </div>
        {/* 第二行：產地 品種 */}
        {(currentBean?.origin || currentBean?.variety) && (
          <div className="mt-1 text-xs text-pour-200">
            {[
              currentBean?.origin && `${t('originLabel')} ${currentBean.origin}`,
              currentBean?.variety && `${t('varietyLabel')} ${currentBean.variety}`,
            ].filter(Boolean).join(' · ')}
          </div>
        )}
        {/* 第三行：加工 焙度 */}
        {(currentBean?.process || currentBean?.roast) && (
          <div className="text-xs text-pour-200">
            {[
              currentBean?.process && `${t('processLabel')} ${currentBean.process}`,
              currentBean?.roast && `${t('roastLabel')} ${ROAST_LEVELS.find(r => r.zh === currentBean.roast)?.[lang] ?? currentBean.roast}`,
            ].filter(Boolean).join(' · ')}
          </div>
        )}
        {/* 無資訊提示 */}
        {!currentBean?.origin && !currentBean?.variety && !currentBean?.process && !currentBean?.roast && (
          <div className="mt-1 text-xs text-pour-200 opacity-60">{t('noBeanInfo')}</div>
        )}
        {/* 風味特色 */}
        {currentBean?.flavorNote && (
          <div className="mt-0.5 text-xs text-pour-200">{t('flavorNoteLabel')}：{currentBean.flavorNote}</div>
        )}
      </section>

      {/* 豆子 / 手法選單列 + 編輯按鈕 */}
      <section className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 shrink-0">{t('beanLabel')}</span>
        <select
          value={selectedBeanId}
          onChange={(e) => { setPlanStepsEditBuffer(null); setPlanEditing(false); setSelectedBeanId(e.target.value) }}
          className="flex-1 min-w-0 rounded-lg border border-stone-200 bg-white py-2 pl-2 pr-7 text-sm font-medium text-stone-800 focus:border-pour-400 focus:outline-none"
        >
          {beans.map((b) => <option key={b.id} value={b.id}>{b.name || '未命名'}</option>)}
        </select>
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 shrink-0">{t('methodLabel')}</span>
        <select
          value={selectedMethodId}
          onChange={(e) => setSelectedMethodId(e.target.value)}
          className="flex-1 min-w-0 rounded-lg border border-stone-200 bg-white py-2 pl-2 pr-7 text-sm font-medium text-stone-800 focus:border-pour-400 focus:outline-none"
        >
          {allMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <button type="button" onClick={togglePlanEditing}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white transition active:scale-95 ${planEditing ? 'bg-pour-700' : 'bg-stone-500'}`}
          aria-label="編輯">
          <EditIcon className="h-3 w-3" />
        </button>
      </section>

      {/* 快速參數列（常駐顯示） */}
      <section className="flex items-center gap-1.5">
        {/* 粉水比 */}
        {[
          { labelLeft: '1:', labelRight: null, key: 'wr', inputMode: 'decimal', placeholder: '粉水比', clamp: clampWaterRatio, def: 15, fieldKey: 'waterRatio' },
          { labelLeft: null, labelRight: 'g',  key: 'cw', inputMode: 'decimal', placeholder: '粉重',   clamp: clampCoffeeWeight, def: 20, fieldKey: 'coffeeWeight' },
          { labelLeft: null, labelRight: null,  key: 'ar', inputMode: 'decimal', placeholder: '吸水率', clamp: clampAbsorption, def: 2, fieldKey: 'absorptionRate' },
          { labelLeft: '#', labelRight: null,  key: 'gs', inputMode: 'decimal', placeholder: '研磨',   clamp: clampGrindSize, def: 5, fieldKey: 'grindSize' },
        ].map(({ labelLeft, labelRight, key, inputMode, placeholder, clamp, def, fieldKey }) => (
          <label key={key} className="flex flex-1 items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1.5">
            {labelLeft && <span className="shrink-0 text-[11px] text-stone-400">{labelLeft}</span>}
            <input
              type="text" inputMode={inputMode} autoComplete="off" placeholder={placeholder}
              value={methodParamDraft[key]}
              onChange={(e) => setMethodParamDraft((p) => ({ ...p, [key]: e.target.value }))}
              onBlur={() => {
                const v = parseFloat(methodParamDraft[key])
                if (Number.isNaN(v)) { patchCurrentMethod({ [fieldKey]: def }); setMethodParamDraft((p) => ({ ...p, [key]: String(def) })); return }
                const c = clamp(v)
                patchCurrentMethod({ [fieldKey]: c })
                setMethodParamDraft((p) => ({ ...p, [key]: String(c) }))
              }}
              className="w-full min-w-0 text-sm tabular-nums text-stone-800 outline-none placeholder:text-stone-300"
            />
            {labelRight && <span className="shrink-0 text-[11px] text-stone-400">{labelRight}</span>}
          </label>
        ))}
      </section>

      {/* 編輯面板（義式濃縮同款卡片配置） */}
      {planEditing && (
        <section className="rounded-xl border border-stone-200 bg-white py-3 shadow-sm">
          <div className="px-3">
            {/* ── 豆子區 ── */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-stone-500 shrink-0">{t('beanLabel')}</span>
              <select value={selectedBeanId}
                onChange={(e) => setSelectedBeanId(e.target.value)}
                className="flex-1 min-w-0 rounded border border-stone-200 px-2 py-1.5 text-sm text-stone-800 focus:border-pour-400 focus:outline-none">
                {beans.map((b) => <option key={b.id} value={b.id}>{b.name || '未命名'}</option>)}
              </select>
              <button type="button" onClick={openAddBeanModal}
                className="shrink-0 w-12 rounded py-1.5 text-center text-xs font-medium text-white bg-pour-600 transition active:bg-pour-700"
                aria-label="新增豆子">{t('add')}</button>
              <button type="button" onClick={handleDeleteCurrentBean} disabled={beans.length <= 1}
                className="shrink-0 w-12 rounded py-1.5 text-center text-xs font-medium text-white bg-red-500 transition active:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="刪除豆子">{t('delete')}</button>
            </div>
            <div className="grid grid-cols-4 gap-2 text-[13px] mb-1.5">
              <input type="text" placeholder={t('originLabel')}
                value={currentBean?.origin ?? ''} onChange={(e) => patchCurrentBean({ origin: e.target.value })}
                className={INPUT_CELL} />
              <input type="text" placeholder={t('varietyLabel')}
                value={currentBean?.variety ?? ''} onChange={(e) => patchCurrentBean({ variety: e.target.value })}
                className={INPUT_CELL} />
              <input type="text" placeholder={t('processLabel')}
                value={currentBean?.process ?? ''} onChange={(e) => patchCurrentBean({ process: e.target.value })}
                className={INPUT_CELL} />
              <select value={roastVal} onChange={(e) => patchCurrentBean({ roast: e.target.value })}
                className={INPUT_CELL}>
                <option value="">— {t('roastLabel')} —</option>
                {roastIsLegacy && <option value={roastVal}>{roastVal}（舊）</option>}
                {ROAST_LEVELS.map((lvl) => <option key={lvl.zh} value={lvl.zh}>{lang === 'en' ? lvl.en : lvl.zh}</option>)}
              </select>
            </div>
            <div className="mb-3">
              <input type="text" placeholder="風味特色"
                value={currentBean?.flavorNote ?? ''} onChange={(e) => patchCurrentBean({ flavorNote: e.target.value })}
                className={`w-full ${INPUT_CELL}`} />
            </div>

            {/* ── 手法區 ── */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-stone-500 shrink-0">{t('methodLabel')}</span>
              <select value={selectedMethodId}
                onChange={(e) => setSelectedMethodId(e.target.value)}
                className="flex-1 min-w-0 rounded border border-stone-200 px-2 py-1.5 text-sm text-stone-800 focus:border-pour-400 focus:outline-none">
                {allMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button type="button" onClick={openAddMethodModal}
                className="shrink-0 w-12 rounded py-1.5 text-center text-xs font-medium text-white bg-pour-600 transition active:bg-pour-700"
                aria-label="新增手法">{t('add')}</button>
              <button type="button" onClick={handleDeleteCurrentMethod} disabled={allMethods.length <= 1}
                className="shrink-0 w-12 rounded py-1.5 text-center text-xs font-medium text-white bg-red-500 transition active:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="刪除手法">{t('delete')}</button>
            </div>
          </div>
        </section>
      )}

      {/* 沖煮技巧獨立卡片（編輯模式） */}
      {planEditing && (() => {
        const isCreating = newTechniqueDraft !== null
        const activeTech = isCreating
          ? newTechniqueDraft
          : (techniques.find((t) => t.id === (inlineTechniqueId ?? techniques[0]?.id)) ?? techniques[0] ?? null)
        const effectiveId = isCreating ? '__new__' : (activeTech?.id ?? '')
        return (
          <section className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            <button type="button"
              onClick={() => setTechniqueCardOpen((o) => !o)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left transition active:bg-stone-50">
              <span className="text-xs font-semibold text-stone-500">{t('techniqueLabel')}</span>
              <span className="text-stone-400 text-sm">{techniqueCardOpen ? '▼' : '▶'}</span>
            </button>
            {techniqueCardOpen && <div className="px-3 pb-3 border-t border-stone-100 pt-2">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-stone-500 shrink-0">{t('techniqueItem')}</span>
                <select
                  value={effectiveId}
                  onChange={(e) => { setNewTechniqueDraft(null); setInlineTechniqueId(e.target.value) }}
                  className="flex-1 min-w-0 rounded border border-stone-200 px-2 py-1.5 text-sm text-stone-800 focus:border-pour-400 focus:outline-none">
                  {isCreating && <option value="__new__">{t('newTechniqueOpt')}</option>}
                  {techniques.map((tc) => <option key={tc.id} value={tc.id}>{tc.name || '未命名'}</option>)}
                </select>
                <button type="button"
                  onClick={() => setNewTechniqueDraft({ id: `tech-${Date.now()}`, name: '', effectSour: '', effectSweet: '', effectBitter: '', effectOff: '' })}
                  disabled={isCreating}
                  className="shrink-0 w-12 rounded py-1.5 text-center text-xs font-medium text-white bg-pour-600 transition active:bg-pour-700 disabled:opacity-40">{t('add')}</button>
                <button type="button"
                  onClick={() => {
                    if (isCreating) { setNewTechniqueDraft(null); return }
                    if (!activeTech) return
                    if (techniques.length <= 1) { window.alert('至少保留一個技巧'); return }
                    if (!window.confirm(`確定刪除「${activeTech.name || '未命名'}」？`)) return
                    const next = techniques.filter((tc) => tc.id !== activeTech.id)
                    setTechniques(next)
                    setInlineTechniqueId(next[0]?.id ?? null)
                  }}
                  disabled={!isCreating && techniques.length <= 1}
                  className={`shrink-0 w-12 rounded py-1.5 text-center text-xs font-medium text-white transition disabled:opacity-30 disabled:cursor-not-allowed ${isCreating ? 'bg-stone-400 active:bg-stone-500' : 'bg-red-500 active:bg-red-600'}`}>
                  {isCreating ? t('cancel') : t('delete')}
                </button>
              </div>

              {activeTech && (
                <TechniqueForm
                  key={activeTech.id}
                  technique={activeTech}
                  onSave={(form) => {
                    const saved = { ...activeTech, ...form }
                    if (isCreating) {
                      setTechniques((prev) => [...prev, saved])
                      setInlineTechniqueId(saved.id)
                      setNewTechniqueDraft(null)
                    } else {
                      setTechniques((prev) => prev.map((t) => t.id === saved.id ? saved : t))
                    }
                  }}
                  onCancel={() => {}}
                  inline
                />
              )}
            </div>}
          </section>
        )
      })()}

      {/* 折線圖 */}
      <section>
        <div className="rounded-xl border border-stone-200 bg-white p-2 shadow-sm">
          <div className="mx-auto aspect-[4/2] w-full">
            <TimeWaterChart points={chartPoints} totalWater={totalWater} maxTime={timeAxisMax} />
          </div>
        </div>
      </section>

      {/* 時間表（編輯時可修改，非編輯時唯讀顯示） */}
      <section>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full min-w-[420px] table-fixed text-xs">
            <colgroup>
              {/* 9 份等距：t₀ Δt ΔW ΣW T v 各 1 份，μ（手法）佔 2 份，刪除 1 份 */}
              {[1,1,1,1,1,1,2,1].map((span, i) => (
                <col key={i} style={{ width: `${span / 9 * 100}%` }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th title="起點（秒）" className="p-1.5 font-semibold text-stone-600 text-center">t₀</th>
                <th title="間格時間（秒）" className="p-1.5 font-semibold text-stone-600 text-center">Δt</th>
                <th title="本段加水量" className="p-1.5 font-semibold text-stone-600 text-center">ΔW</th>
                <th title="累計總水量" className="p-1.5 font-semibold text-stone-600 text-center">ΣW</th>
                <th title="水溫（°C）" className="p-1.5 font-semibold text-stone-600 text-center">T</th>
                <th title="流速（ml/s）" className="p-1.5 font-semibold text-stone-600 text-center">v</th>
                <th title="沖煮技巧" className="p-1.5 font-semibold text-stone-600 text-left pl-[10px]">
                  <span className="flex items-center gap-1">
                    {t('techniqueItem')}
                    {tableEditing && (
                      <button
                        type="button"
                        onClick={() => { setEditingTechnique(null); setShowTechniqueForm(true) }}
                        className="text-pour-500 leading-none"
                        title="新增沖煮技巧"
                      >+</button>
                    )}
                  </span>
                </th>
                <th className="p-1 font-semibold text-stone-600">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={toggleTableEditing}
                      className={`text-[10px] font-medium leading-none transition ${tableEditing ? 'text-pour-700 font-semibold' : 'text-stone-400'}`}
                    >
                      {tableEditing ? t('done') : t('edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!tableEditing || !planStepsEditBuffer) return
                        setPlanStepsEditBuffer((buf) => [
                          ...buf,
                          {
                            intervalSec: '45',
                            waterValue:  '0',
                            waterMode:   'fixed',
                            temp:        String(Math.round(effWaterTemp)),
                            technique:   techniques[0]?.name ?? '',
                          },
                        ])
                      }}
                      className={`text-[10px] font-medium leading-none transition ${tableEditing ? 'text-pour-600' : 'text-stone-200'}`}
                    >
                      ＋
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {pourTableRows.map((step, i) => {
                const readOnly = !tableEditing
                const techniqueNames = techniques.map((t) => t.name)
                const techniqueOrphan = Boolean(step.technique && !techniqueNames.includes(step.technique))
                const tStart = stepStartSecFromIntervals(pourTableRows, i)
                const intervalShown = Math.max(0, Number(step.intervalSec) || 0)
                const stepWaterMode = step.waterMode ?? 'fixed'
                const actualWaterThis = resolveStepWater(step, totalWater)
                const cumWater = pourTableRows.slice(0, i + 1).reduce((sum, s) => sum + resolveStepWater(s, totalWater), 0)
                const tempShown = asNumberOr(step.temp, 93)
                return (
                <tr key={i} className="border-b border-stone-100">
                  <td className="p-1 text-center align-middle tabular-nums text-stone-700">
                    <span className={readOnly ? '' : 'text-stone-900'} title="本步開始秒數（= 前面各步間格之和；空白視為 0）">
                      {tStart}
                    </span>
                  </td>
                  <td className="p-1 text-center align-middle">
                    {readOnly ? (
                      <span className="tabular-nums text-stone-700">{intervalShown}</span>
                    ) : (
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={step.intervalSec}
                        onChange={(e) => updatePlanEditRow(i, 'intervalSec', e.target.value)}
                        className="w-full rounded border border-stone-200 py-1 px-1 text-center tabular-nums"
                      />
                    )}
                  </td>
                  {/* ΔW：雙軌制（% / ml） */}
                  <td className="p-1 text-center align-middle">
                    {readOnly ? (
                      <span className="tabular-nums text-stone-700">
                        {stepWaterMode === 'percent' ? `${step.waterValue ?? 0}%` : actualWaterThis}
                      </span>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="flex items-stretch">
                          <input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={step.waterValue ?? ''}
                            onChange={(e) => updatePlanEditRow(i, 'waterValue', e.target.value)}
                            className="w-9 rounded-l border border-stone-200 py-1 px-0.5 text-center tabular-nums text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => updatePlanEditRow(i, 'waterMode', stepWaterMode === 'percent' ? 'fixed' : 'percent')}
                            className="rounded-r border border-l-0 border-stone-200 bg-stone-100 px-1 text-[10px] text-stone-600 leading-none"
                          >
                            {stepWaterMode === 'percent' ? '%' : 'ml'}
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                  {/* ΣW：累計總水量 */}
                  <td className="p-1 text-center align-middle tabular-nums text-stone-700">
                    {cumWater}
                  </td>
                  <td className="p-1 text-center align-middle">
                    {readOnly ? (
                      <span className="tabular-nums text-stone-700">{tempShown}</span>
                    ) : (
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={step.temp}
                        onChange={(e) => updatePlanEditRow(i, 'temp', e.target.value)}
                        className="w-full rounded border border-stone-200 py-1 px-1 text-center tabular-nums"
                      />
                    )}
                  </td>
                  {/* v：流速 ml/s */}
                  <td className="p-1 text-center align-middle tabular-nums text-stone-700">
                    {(() => {
                      const sec = Math.max(0, Number(step.intervalSec) || 0)
                      if (sec === 0) return <span className="text-stone-300">—</span>
                      return (actualWaterThis / sec).toFixed(1)
                    })()}
                  </td>
                  <td className="p-1 align-middle pl-[6px]">
                    <select
                      value={step.technique || ''}
                      onChange={readOnly ? undefined : (e) => updatePlanEditRow(i, 'technique', e.target.value)}
                      disabled={readOnly}
                      className={`w-full max-w-[90px] rounded border border-stone-200 py-1 px-0.5 text-[11px] text-stone-700 disabled:opacity-100 ${readOnly ? 'border-transparent bg-transparent' : ''}`}
                    >
                      <option value="">—</option>
                      {techniqueOrphan ? <option value={step.technique}>{step.technique}</option> : null}
                      {techniques.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1 text-right align-middle pr-2">
                    <button
                      type="button"
                      onClick={
                        readOnly
                          ? undefined
                          : () => setPlanStepsEditBuffer((buf) => (buf ? buf.filter((_, j) => j !== i) : null))
                      }
                      disabled={readOnly}
                      className="inline-flex text-red-500 disabled:opacity-0"
                      title="刪除此步"
                      aria-label="刪除此步"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </section>

      {/* 沖煮計時 + 記錄本次沖煮 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowBrewTimer(true)}
          disabled={!currentBean}
          className="flex-1 rounded-xl bg-pour-600 py-3 text-sm font-semibold text-white shadow transition active:scale-[0.99] disabled:opacity-50"
        >
          {t('startBrew')}
        </button>
        <button
          type="button"
          onClick={() => {
            setBrewActualParams({ cw: String(effCoffeeWeight), wr: String(effWaterRatio), wt: String(effWaterTemp), gs: String(effGrindSize) })
            setShowBrewLogModal(true)
          }}
          disabled={!currentBean}
          className="flex-1 rounded-xl border-2 border-pour-300 bg-white py-3 text-sm font-semibold text-pour-800 shadow-sm transition active:scale-[0.99] disabled:opacity-50"
        >
          {t('addLog')}
        </button>
      </div>

      {/* 歷史沖煮紀錄（區塊摺疊 + 單筆摺疊 + 刪除） */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          {/* 豆子篩選下拉 */}
          <select
            value={historyFilterBeanId}
            onChange={(e) => setHistoryFilterBeanId(e.target.value)}
            className="h-9 flex-1 min-w-0 rounded-lg border border-stone-200 bg-stone-50 px-2 text-xs text-stone-700 focus:border-pour-400 focus:outline-none"
          >
            <option value="">{t('allBeans')}</option>
            {beans.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setHistorySectionOpen((o) => !o)}
            className="h-9 flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50/80 px-3 transition active:bg-stone-100"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">{t('historyLabel')}</span>
            <span className="text-[11px] tabular-nums text-stone-500">{sortedHistory.length}</span>
            <span className="text-xs text-stone-400" aria-hidden>{historySectionOpen ? '▼' : '▶'}</span>
          </button>
        </div>
        {!historySectionOpen ? null : sortedHistory.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50/80 py-6 text-center text-xs text-stone-500">尚無紀錄，沖完後在上方填寫並儲存。</p>
        ) : (
          <ul className="space-y-2">
            {sortedHistory.map((log, hi) => {
              const lid = log.id ?? `hist-${log.date}-${hi}`
              const expanded = Boolean(logDetailOpen[lid])
              return (
                <li
                  key={lid}
                  className={`overflow-hidden rounded-xl border shadow-sm transition ${scoreToneClass(Math.round((log.executionScore + log.resultScore) / 2))}`}
                >
                  <div className="flex items-center gap-2 p-2.5">
                    <button
                      type="button"
                      onClick={() => toggleLogDetail(lid)}
                      className="min-w-0 flex-1 text-left transition active:opacity-80"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-stone-800">{log.date}</span>
                        {log.beanName && (
                          <span className="rounded bg-pour-50 px-2 py-0.5 text-[11px] font-medium text-pour-800">{log.beanName}</span>
                        )}
                        {log.methodName && (
                          <span className="text-[11px] text-stone-400">{log.methodName}</span>
                        )}
                        <span className={`rounded px-2 py-0.5 text-[11px] font-bold tabular-nums ${log.executionScore >= 7 ? 'bg-emerald-100 text-emerald-900' : log.executionScore <= 4 ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-800'}`}>
                          {t('scoreExecution')} {log.executionScore}
                        </span>
                        <span className={`rounded px-2 py-0.5 text-[11px] font-bold tabular-nums ${log.resultScore >= 7 ? 'bg-emerald-100 text-emerald-900' : log.resultScore <= 4 ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-800'}`}>
                          {t('scoreFlavor')} {log.resultScore}
                        </span>
                        <span className="text-stone-400">{expanded ? '▼' : '▶'}</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBrewLog(log, hi)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 transition active:bg-red-50"
                      title="刪除此筆紀錄"
                      aria-label="刪除此筆紀錄"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                  {expanded ? (
                    <div className="space-y-2 border-t border-stone-100/80 bg-white/40 px-3 pb-3 pt-2">
                      {log.pros ? (
                        <p className="text-xs text-stone-700">
                          <span className="font-medium text-emerald-800">優點</span> {log.pros}
                        </p>
                      ) : null}
                      {log.cons ? (
                        <p className="text-xs text-stone-700">
                          <span className="font-medium text-amber-800">缺點</span> {log.cons}
                        </p>
                      ) : null}
                      {(log.steps?.length || log.pourPlan?.length) ? (() => {
                        // 同時支援新格式 steps 與舊格式 pourPlan
                        const rows = log.steps?.length ? log.steps : log.pourPlan
                        const isNewFmt = Boolean(log.steps?.length)
                        // 計算每步實際水量（新格式需要 totalWater，用記錄當時的 waterRatio×coffeeWeight）
                        const logTotalWater = isNewFmt
                          ? Math.round((log.waterRatio ?? 15) * (log.coffeeWeight ?? 20))
                          : 0
                        let cumSec = 0
                        return (
                          <div className="rounded-lg border border-stone-100 bg-stone-50/80 overflow-hidden">
                            <table className="w-full text-[11px]">
                              <thead>
                                <tr className="bg-stone-100/80 text-stone-500 text-center">
                                  <th className="px-1.5 py-1 font-semibold">t₀</th>
                                  <th className="px-1.5 py-1 font-semibold">Δt</th>
                                  <th className="px-1.5 py-1 font-semibold">ΔW</th>
                                  <th className="px-1.5 py-1 font-semibold">ΣW</th>
                                  <th className="px-1.5 py-1 font-semibold">T</th>
                                  <th className="px-1.5 py-1 font-semibold text-left">{t('techniqueItem')}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-100">
                                {rows.map((row, ri) => {
                                  let segWater, cumWater
                                  if (isNewFmt) {
                                    segWater = resolveStepWater(row, logTotalWater)
                                    cumWater = rows.slice(0, ri + 1).reduce((s, r) => s + resolveStepWater(r, logTotalWater), 0)
                                  } else {
                                    segWater = row.segmentWater ?? 0
                                    cumWater = row.cumulativeWater ?? 0
                                  }
                                  const tStart = isNewFmt ? cumSec : (row.startTime ?? 0)
                                  if (isNewFmt) cumSec += Math.max(0, Number(row.intervalSec) || 0)
                                  const intervalSec = isNewFmt ? Math.max(0, Number(row.intervalSec) || 0) : ((row.time ?? 0) - tStart)
                                  return (
                                    <tr key={ri} className="text-center text-stone-700">
                                      <td className="px-1.5 py-1 tabular-nums">{tStart}</td>
                                      <td className="px-1.5 py-1 tabular-nums">{intervalSec}</td>
                                      <td className="px-1.5 py-1 tabular-nums">{segWater}</td>
                                      <td className="px-1.5 py-1 tabular-nums">{cumWater}</td>
                                      <td className="px-1.5 py-1 tabular-nums">{row.temp}°</td>
                                      <td className="px-1.5 py-1 text-left text-pour-800">{row.technique || '—'}</td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )
                      })() : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>


      {/* 記錄本次沖煮 Modal */}
      {showBrewTimer && (
        <BrewTimerModal
          steps={planStepsForChart}
          totalWater={totalWater}
          onClose={() => setShowBrewTimer(false)}
          onLogBrew={() => {
            setShowBrewTimer(false)
            setBrewActualParams({ cw: String(effCoffeeWeight), wr: String(effWaterRatio), wt: String(effWaterTemp), gs: String(effGrindSize) })
            setShowBrewLogModal(true)
          }}
        />
      )}

      {showBrewLogModal && (
        <section className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 px-4 pb-6 sm:items-center">
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl">
            <h3 className="mb-1 text-sm font-semibold text-stone-800">{t('logTitle')}</h3>
            <p className="mb-3 text-[11px] text-stone-400">{currentBean?.name}｜{currentMethod?.name}</p>

            {/* 實際數據微調 */}
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">{t('logActualData')}</p>
            <div className="mb-3 grid grid-cols-3 gap-2 text-[13px]">
              {[
                { key: 'cw', placeholder: '粉重 g' },
                { key: 'wr', placeholder: '粉水比' },
                { key: 'gs', placeholder: '研磨' },
              ].map(({ key, placeholder }) => (
                <input key={key} type="text" inputMode="decimal" autoComplete="off"
                  placeholder={placeholder}
                  value={brewActualParams[key]}
                  onChange={(e) => setBrewActualParams((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full rounded border border-stone-200 px-2 py-1.5 text-center text-[13px] text-stone-800 placeholder:text-stone-400 focus:border-pour-400 focus:outline-none" />
              ))}
            </div>

            {/* 評分與心得 */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-stone-500">{t('logExecution')}</label>
                  <input type="range" min={1} max={10} step={1} value={brewExecution}
                    onChange={(e) => setBrewExecution(Number(e.target.value))}
                    className="h-2 w-full accent-pour-600" />
                  <div className="mt-0.5 text-center text-sm font-bold tabular-nums text-pour-700">{brewExecution}</div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-stone-500">{t('logFlavor')}</label>
                  <input type="range" min={1} max={10} step={1} value={brewResult}
                    onChange={(e) => setBrewResult(Number(e.target.value))}
                    className="h-2 w-full accent-pour-600" />
                  <div className="mt-0.5 text-center text-sm font-bold tabular-nums text-pour-700">{brewResult}</div>
                </div>
              </div>
              <input type="text" value={brewPros} onChange={(e) => setBrewPros(e.target.value)}
                placeholder={t('logPros')}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm transition focus:border-pour-400 focus:outline-none" />
              <input type="text" value={brewCons} onChange={(e) => setBrewCons(e.target.value)}
                placeholder={t('logCons')}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm transition focus:border-pour-400 focus:outline-none" />
              <input type="text" value={brewDirection} onChange={(e) => setBrewDirection(e.target.value)}
                placeholder={t('logDirection')}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm transition focus:border-pour-400 focus:outline-none" />
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setShowBrewLogModal(false)}
                className="flex-1 rounded-lg bg-stone-200 py-2.5 text-sm font-medium text-stone-700 transition active:bg-stone-300">
                {t('cancel')}
              </button>
              <button type="button" onClick={handleSaveBrewLog}
                className="flex-1 rounded-lg bg-pour-600 py-2.5 text-sm font-semibold text-white shadow transition active:scale-[0.99]">
                {t('logSave')}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 新增豆子：名稱泡泡 */}
      {showNewBeanModal && (
        <section className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-3 shadow-xl">
            <h3 className="mb-2 text-sm font-semibold text-stone-800">新增豆子</h3>
            <input
              type="text"
              value={newBeanNameInput}
              onChange={(e) => setNewBeanNameInput(e.target.value)}
              placeholder="豆子名稱"
              className="w-full rounded border border-stone-200 px-2 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-pour-400 focus:outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmAddBean()
                if (e.key === 'Escape') setShowNewBeanModal(false)
              }}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setShowNewBeanModal(false)} className="rounded bg-stone-200 px-3 py-1.5 text-xs text-stone-700">
                取消
              </button>
              <button type="button" onClick={confirmAddBean} className="rounded bg-pour-600 px-3 py-1.5 text-xs text-white">
                確定
              </button>
            </div>
          </div>
        </section>
      )}

      {showNewMethodModal && (
        <section className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-3 shadow-xl">
            <h3 className="mb-2 text-sm font-semibold text-stone-800">新增手法</h3>
            <p className="mb-2 text-xs text-stone-400">以目前選定的手法為範本複製，填入新名稱後儲存。</p>
            <input
              type="text"
              value={newMethodNameInput}
              onChange={(e) => setNewMethodNameInput(e.target.value)}
              placeholder="手法名稱"
              className="w-full rounded border border-stone-200 px-2 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-pour-400 focus:outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmAddMethod()
                if (e.key === 'Escape') setShowNewMethodModal(false)
              }}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setShowNewMethodModal(false)} className="rounded bg-stone-200 px-3 py-1.5 text-xs text-stone-700">取消</button>
              <button type="button" onClick={confirmAddMethod} className="rounded bg-pour-600 px-3 py-1.5 text-xs text-white">確定</button>
            </div>
          </div>
        </section>
      )}

      {/* 沖煮技巧（僅在新增/編輯時顯示表單泡泡） */}
      {showTechniqueForm && (
        <section className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-3 shadow-xl">
            <TechniqueForm
              technique={editingTechnique}
              onSave={(form) => {
                const next = {
                  id: editingTechnique?.id || 't-' + Date.now(),
                  name: form.name,
                  effectSour: form.effectSour ?? '',
                  effectSweet: form.effectSweet ?? '',
                  effectBitter: form.effectBitter ?? '',
                  effectOff: form.effectOff ?? '',
                }
                if (editingTechnique) setTechniques(prev => prev.map(x => x.id === editingTechnique.id ? next : x))
                else setTechniques(prev => [...prev, next])
                setShowTechniqueForm(false)
                setEditingTechnique(null)
              }}
              onCancel={() => { setShowTechniqueForm(false); setEditingTechnique(null) }}
            />
          </div>
        </section>
      )}

    </div>
  )
}

// ─── 沖煮計時器 ──────────────────────────────────────────────────────────────
function BrewTimerModal({ steps, totalWater = 0, onClose, onLogBrew }) {
  const { t } = useLang()
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const alertedRef  = useRef(new Set())
  const intervalRef = useRef(null)
  const audioCtxRef = useRef(null)

  const stepTimings = useMemo(() => {
    let cum = 0
    return steps.map((s) => {
      const start = cum
      cum += Math.max(0, Number(s.intervalSec) || 0)
      return { ...s, startTime: start, endTime: cum }
    })
  }, [steps])
  const totalTime = stepTimings.length ? stepTimings[stepTimings.length - 1].endTime : 0

  const playBeep = useCallback((freq = 880, dur = 0.35) => {
    try {
      if (!audioCtxRef.current)
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.45, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
      osc.start(); osc.stop(ctx.currentTime + dur)
    } catch (_) {}
  }, [])

  // 雙音提示（下一步）
  const playNext  = useCallback(() => { playBeep(880, 0.2); setTimeout(() => playBeep(1100, 0.25), 220) }, [playBeep])
  // 完成三音
  const playDone  = useCallback(() => { playBeep(880, 0.15); setTimeout(() => playBeep(1100, 0.15), 180); setTimeout(() => playBeep(1400, 0.5), 360) }, [playBeep])
  // 開始單音
  const playStart = useCallback(() => playBeep(660, 0.3), [playBeep])

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1
        // 提醒下一步
        for (let i = 1; i < stepTimings.length; i++) {
          if (stepTimings[i].startTime === next && !alertedRef.current.has(i)) {
            alertedRef.current.add(i)
            playNext()
          }
        }
        if (next >= totalTime) {
          clearInterval(intervalRef.current)
          playDone()
          return totalTime
        }
        return next
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running, stepTimings, totalTime, playNext, playDone])

  const reset = () => { setElapsed(0); setRunning(false); alertedRef.current = new Set() }
  const handleStart = () => { if (elapsed === 0) playStart(); setRunning(true) }

  const currentIdx = stepTimings.reduce((acc, s, i) => s.startTime <= elapsed ? i : acc, 0)
  const done = elapsed >= totalTime && totalTime > 0
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const progressPct = totalTime > 0 ? Math.min(100, (elapsed / totalTime) * 100) : 0

  return (
    <section className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6 sm:items-center">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl overflow-hidden">
        {/* 標頭 */}
        <div className="bg-pour-700 px-4 pt-4 pb-3 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-pour-200">{t('timerTitle')}</span>
            <button type="button" onClick={onClose} className="text-pour-300 hover:text-white text-xl leading-none" aria-label="關閉">×</button>
          </div>
          <div className="text-5xl font-bold tabular-nums text-center tracking-tight">{fmt(elapsed)}</div>
          {/* 下一步技巧提示 */}
          {(() => {
            const nextStep = !done ? stepTimings[currentIdx + 1] : null
            return (
              <div className="mt-1.5 text-center text-lg text-pour-200 h-7">
                {nextStep
                  ? <>
                      <span className="tabular-nums text-pour-300">{fmt(nextStep.startTime)}</span>
                      <span className="mx-2 text-pour-400">→</span>
                      <span className="font-semibold text-pour-100">{nextStep.technique || '—'}</span>
                    </>
                  : done ? <span className="text-pour-100 font-semibold">{t('brewComplete')}</span> : null}
              </div>
            )
          })()}
          <div className="mt-2 h-1.5 rounded-full bg-pour-500/60 overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* 步驟列表 */}
        <div className="max-h-52 overflow-y-auto divide-y divide-stone-100">
          {stepTimings.map((step, i) => {
            const isActive  = !done && i === currentIdx
            const isPast    = elapsed >= step.endTime
            const segWater  = resolveStepWater(step, totalWater)
            const cumWater  = stepTimings.slice(0, i + 1).reduce((s, x) => s + resolveStepWater(x, totalWater), 0)
            return (
              <div key={i} className={`flex items-center gap-2.5 px-4 py-2 transition ${isActive ? 'bg-pour-50' : ''}`}>
                <span className={`h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold
                  ${isActive ? 'bg-pour-600 text-white' : isPast ? 'bg-stone-200 text-stone-400' : 'bg-stone-100 text-stone-400'}`}>{i + 1}</span>
                <span className={`text-xs flex-1 ${isActive ? 'font-semibold text-pour-800' : isPast ? 'text-stone-400 line-through' : 'text-stone-600'}`}>
                  {step.technique || '—'}
                </span>
                <span className="text-[11px] tabular-nums text-stone-500">＋{segWater} → {cumWater} ml</span>
                <span className={`text-[10px] tabular-nums w-9 text-right shrink-0 ${isActive ? 'text-pour-600 font-semibold' : 'text-stone-400'}`}>{fmt(step.endTime)}</span>
              </div>
            )
          })}
        </div>

        {/* 操作按鈕 */}
        <div className="px-4 py-3 flex gap-2 border-t border-stone-100">
          {done ? (
            <>
              <button type="button" onClick={reset}
                className="rounded-lg bg-stone-200 px-4 py-2.5 text-sm text-stone-700 transition active:bg-stone-300">{t('restartBtn')}</button>
              <button type="button" onClick={onLogBrew}
                className="flex-1 rounded-lg bg-pour-600 py-2.5 text-sm font-semibold text-white shadow transition active:scale-[0.99]">{t('logBrewBtn')}</button>
            </>
          ) : (
            <>
              <button type="button" onClick={reset}
                className="rounded-lg bg-stone-200 px-4 py-2.5 text-sm text-stone-700 transition active:bg-stone-300">{t('resetBtn')}</button>
              <button type="button" onClick={running ? () => setRunning(false) : handleStart}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold text-white shadow transition active:scale-[0.99] ${running ? 'bg-amber-500' : 'bg-pour-600'}`}>
                {running ? t('pauseBtn') : elapsed === 0 ? t('startBtn') : t('resumeBtn')}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function TechniqueForm({ technique, onSave, onCancel, inline = false }) {
  const { t } = useLang()
  const [name, setName] = useState(technique?.name || '')
  const [effectSour, setEffectSour] = useState(technique?.effectSour ?? '')
  const [effectSweet, setEffectSweet] = useState(technique?.effectSweet ?? '')
  const [effectBitter, setEffectBitter] = useState(technique?.effectBitter ?? '')
  const [effectOff, setEffectOff] = useState(technique?.effectOff ?? '')
  useEffect(() => {
    setName(technique?.name || '')
    setEffectSour(technique?.effectSour ?? '')
    setEffectSweet(technique?.effectSweet ?? '')
    setEffectBitter(technique?.effectBitter ?? '')
    setEffectOff(technique?.effectOff ?? '')
  }, [technique?.id])
  return (
    <div className={inline ? '' : 'mt-2 rounded-xl border border-pour-200 bg-white p-2.5 shadow-sm'}>
      {!inline && <h3 className="mb-2 text-sm font-semibold text-stone-800">{technique ? '編輯沖煮技巧' : '新增沖煮技巧'}</h3>}
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('techniqueNamePlaceholder')} className="mb-2 w-full rounded border border-stone-200 px-2 py-1.5 text-sm" />
      <div className="mb-1 flex items-center gap-2">
        <span className="w-16 shrink-0 text-xs text-stone-600">{t('extractionLabel')}</span>
        <input type="text" value={effectSour} onChange={(e) => setEffectSour(e.target.value)} placeholder="例：提高萃取率、延長悶蒸" className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs" />
      </div>
      <div className="mb-1 flex items-center gap-2">
        <span className="w-16 shrink-0 text-xs text-stone-600">{t('flowLabel')}</span>
        <input type="text" value={effectSweet} onChange={(e) => setEffectSweet(e.target.value)} placeholder="例：大水流攪動、提高對流" className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs" />
      </div>
      <div className="mb-1 flex items-center gap-2">
        <span className="w-16 shrink-0 text-xs text-stone-600">{t('bedLabel')}</span>
        <input type="text" value={effectBitter} onChange={(e) => setEffectBitter(e.target.value)} placeholder="例：沖刷粉牆、延長浸泡" className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs" />
      </div>
      <div className="mb-3 flex items-center gap-2">
        <span className="w-16 shrink-0 text-xs text-stone-600">{t('otherLabel')}</span>
        <input type="text" value={effectOff} onChange={(e) => setEffectOff(e.target.value)} placeholder="例：減少通道、均勻受水" className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs" />
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => onSave({ name, effectSour, effectSweet, effectBitter, effectOff })} className="rounded bg-pour-600 px-3 py-1.5 text-xs text-white">{inline ? t('confirm') : t('save')}</button>
        {!inline && <button type="button" onClick={onCancel} className="rounded bg-stone-200 px-3 py-1.5 text-xs text-stone-700">{t('cancel')}</button>}
      </div>
    </div>
  )
}

// ——— 主 App ———
export default function App() {
  const [activeTab, setActiveTab] = useState('espresso')
  const [lang, setLang] = useState('zh')
  const { t } = useLang()
  const tl = (key, ...args) => {
    const val = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.zh[key] ?? key
    return typeof val === 'function' ? val(...args) : val
  }
  return (
    <LangContext.Provider value={lang}>
      <div className="min-h-screen safe-area-pb">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-stone-100/95 px-3 py-2.5 backdrop-blur">
          <div className="w-9 shrink-0" aria-hidden />
          <h1 className="flex-1 text-center text-base font-bold text-stone-800">{tl('appTitle')}</h1>
          <button
            type="button"
            onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
            className="w-9 shrink-0 rounded-lg border border-stone-200 bg-white py-1 text-center text-[11px] font-semibold text-stone-600 transition active:bg-stone-100"
          >
            {lang === 'zh' ? 'EN' : '中'}
          </button>
        </header>

        <main className="mx-auto max-w-lg px-3 pt-3">
          {activeTab === 'espresso' && <EspressoTab />}
          {activeTab === 'pour' && <PourOverTab />}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur safe-area-pb">
          <div className="mx-auto flex max-w-lg">
            <button type="button" onClick={() => setActiveTab('espresso')}
              className={`flex-1 py-2.5 text-center text-sm font-semibold transition ${activeTab === 'espresso' ? 'bg-espresso-600 text-white' : 'text-stone-500 active:bg-stone-100'}`}>
              {tl('tabEspresso')}
            </button>
            <button type="button" onClick={() => setActiveTab('pour')}
              className={`flex-1 py-2.5 text-center text-sm font-semibold transition ${activeTab === 'pour' ? 'bg-pour-600 text-white' : 'text-stone-500 active:bg-stone-100'}`}>
              {tl('tabPour')}
            </button>
          </div>
        </nav>
      </div>
    </LangContext.Provider>
  )
}
