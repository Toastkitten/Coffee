import { useState, useEffect, useMemo, useRef, useCallback } from 'react'

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

// ——— 義式濃縮（無預設配方，全部自訂）———
function EspressoTab() {
  const [cupMode, setCupMode] = useState('double')   // single | double
  const [dose, setDose] = useState(18)
  const [yieldRatio, setYieldRatio] = useState(2.5)
  const [absorptionRate, setAbsorptionRate] = useState(2)
  const [grindSize, setGrindSize] = useState(5)
  const [brewTime, setBrewTime] = useState(28)
  const [tampPressure, setTampPressure] = useState(20)
  const [drinkId, setDrinkId] = useLocalStorageState('coffee.espresso.drinkId', '')
  const [customDrinks, setCustomDrinks] = useLocalStorageState('coffee.espresso.customDrinks', [])
  const [showAddDrink, setShowAddDrink] = useState(false)
  const [editingDrink, setEditingDrink] = useState(null)
  const [espressoConfigs, setEspressoConfigs] = useLocalStorageState('coffee.espresso.espressoConfigs', [])
  const [selectedConfigId, setSelectedConfigId] = useLocalStorageState('coffee.espresso.selectedConfigId', '')
  const [showAddConfig, setShowAddConfig] = useState(false)
  const [editingConfig, setEditingConfig] = useState(null)
  const [showEditPopover, setShowEditPopover] = useState(false)
  const [targetVolumeMl, setTargetVolumeMl] = useState(null)

  const TARGET_TIME_MIN = 25
  const TARGET_TIME_MAX = 30
  const brewTimeOk = brewTime >= TARGET_TIME_MIN && brewTime <= TARGET_TIME_MAX
  const tooFast = brewTime < TARGET_TIME_MIN
  const tooSlow = brewTime > TARGET_TIME_MAX

  const allDrinks = customDrinks
  const currentDrink = allDrinks.find(d => d.id === drinkId) || allDrinks[0] || null
  const selectedConfig = espressoConfigs.find(c => c.id === selectedConfigId) || espressoConfigs[0] || null
  // 濃縮粉液比一律跟隨左上方「義式濃縮」下拉目前選項，品項不綁定濃縮設定
  const effectiveRatio = selectedConfig?.yieldRatio ?? yieldRatio

  // 修正 localStorage 可能造成的「已刪除但仍保留在選單的 id」
  useEffect(() => {
    if (selectedConfigId && !espressoConfigs.some(c => c.id === selectedConfigId)) {
      setSelectedConfigId(espressoConfigs[0]?.id ?? '')
    }
    if (drinkId && !customDrinks.some(d => d.id === drinkId)) {
      setDrinkId(customDrinks[0]?.id ?? '')
    }
  }, [espressoConfigs, customDrinks, selectedConfigId, drinkId])

  const hasMilk = currentDrink?.milkParts != null
  const totalParts = hasMilk ? 1 + currentDrink.milkParts : 1
  const cups = cupMode === 'single' ? 1 : 2
  const totalTargetVolume = targetVolumeMl != null && targetVolumeMl > 0 ? targetVolumeMl * cups : null
  const espressoFromTarget = totalTargetVolume != null ? totalTargetVolume / totalParts : null
  const doseFromTarget = espressoFromTarget != null && effectiveRatio > 0 ? Math.round((espressoFromTarget / effectiveRatio) * 10) / 10 : null
  const useTargetVolume = doseFromTarget != null
  const effectiveDose = useTargetVolume ? doseFromTarget : dose
  const effectiveYield = useTargetVolume ? Math.floor(espressoFromTarget * 10) / 10 : Math.floor(dose * effectiveRatio * 10) / 10
  const waterToDispense = Math.round((effectiveYield + effectiveDose * absorptionRate) * 10) / 10

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
    setShowAddDrink(false)
  }

  const handleDeleteDrink = (id) => {
    setCustomDrinks(prev => prev.filter(d => d.id !== id))
    if (drinkId === id) {
      const remaining = customDrinks.filter(d => d.id !== id)
      setDrinkId(remaining[0]?.id ?? '')
    }
  }

  const handleSaveConfig = (saved) => {
    if (saved.id) {
      setEspressoConfigs(prev => prev.map(c => c.id === saved.id ? saved : c))
    } else {
      const newConfig = { ...saved, id: 'config-' + Date.now() }
      setEspressoConfigs(prev => [...prev, newConfig])
      setSelectedConfigId(newConfig.id)
    }
    setShowAddConfig(false)
    setEditingConfig(null)
  }
  const handleDeleteConfig = (id) => {
    const nextConfigs = espressoConfigs.filter(c => c.id !== id)
    setEspressoConfigs(nextConfigs)
    if (selectedConfigId === id) setSelectedConfigId(nextConfigs[0]?.id ?? '')
  }

  const hints = {}
  if (tooFast) {
    hints.dose = '↓'
    hints.grind = '↓'
    hints.tamp = '↑'
    hints.yieldRatio = '↑'
  } else if (tooSlow) {
    hints.dose = '↑'
    hints.grind = '↑'
    hints.tamp = '↓'
    hints.yieldRatio = '↓'
  }

  return (
    <div className="space-y-3 pb-24">
      {/* 第一排：義式濃縮 義式濃縮下拉 產品 產品下拉 編輯icon（縮小）；點擊在咖啡色區塊上方展開/收合編輯區 */}
      <section className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 shrink-0">義式濃縮</span>
        <select value={selectedConfigId} onChange={(e) => setSelectedConfigId(e.target.value)} className="flex-1 min-w-0 rounded-lg border border-stone-200 bg-white py-2 pl-2 pr-7 text-sm font-medium text-stone-800 focus:border-espresso-500 focus:outline-none">
          <option value="">— 請新增配置 —</option>
          {espressoConfigs.map(c => (
            <option key={c.id} value={c.id}>{c.name}（1:{c.yieldRatio}）</option>
          ))}
        </select>
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 shrink-0">產品</span>
        <select value={drinkId} onChange={(e) => setDrinkId(e.target.value)} className="flex-1 min-w-0 rounded-lg border border-stone-200 bg-white py-2 pl-2 pr-7 text-sm font-medium text-stone-800 focus:border-espresso-500 focus:outline-none">
          <option value="">— 請新增品項 —</option>
          {allDrinks.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <button type="button" onClick={() => { const opening = !showEditPopover; setShowEditPopover(s => !s); if (opening) { setEditingConfig(selectedConfig); setEditingDrink(currentDrink) } }} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-500 text-white" aria-label="編輯濃縮與產品">
          <EditIcon className="h-3 w-3" />
        </button>
      </section>

      {/* 編輯區：點編輯 icon 直接開此畫面；義式濃縮/產品右側下拉，選後下方表單帶入 */}
      {showEditPopover && (
        <section className="rounded-xl border border-stone-200 bg-white py-3 shadow-sm">
          <div className="px-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-stone-500 shrink-0">義式濃縮</span>
              <select value={editingConfig?.id ?? ''} onChange={(e) => { const v = e.target.value; setEditingConfig(v ? espressoConfigs.find(c => c.id === v) ?? null : null) }} className="flex-1 min-w-0 rounded border border-stone-200 px-2 py-1.5 text-sm text-stone-800">
                <option value="">新增配置</option>
                {espressoConfigs.map(c => (
                  <option key={c.id} value={c.id}>{c.name}（1:{c.yieldRatio}）</option>
                ))}
              </select>
              {editingConfig && (
                <button type="button" onClick={() => { handleDeleteConfig(editingConfig.id); setEditingConfig(espressoConfigs.find(c => c.id !== editingConfig.id) ?? null) }} className="shrink-0 rounded px-2 py-1.5 text-xs text-white bg-red-600">刪除</button>
              )}
            </div>
            <EspressoConfigForm
              key={editingConfig?.id ?? 'new-config'}
              config={editingConfig ?? null}
              onSave={(saved) => { handleSaveConfig(saved); setEditingConfig(undefined) }}
              onCancel={() => { setEditingConfig(undefined) }}
              onDelete={editingConfig ? () => { handleDeleteConfig(editingConfig.id); setEditingConfig(undefined) } : undefined}
            />
            <div className="flex items-center gap-2 mt-3 mb-1">
              <span className="text-xs font-semibold text-stone-500 shrink-0">產品</span>
              <select value={editingDrink?.id ?? ''} onChange={(e) => { const v = e.target.value; setEditingDrink(v ? allDrinks.find(d => d.id === v) ?? null : null) }} className="flex-1 min-w-0 rounded border border-stone-200 px-2 py-1.5 text-sm text-stone-800">
                <option value="">新增品項</option>
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
          <input type="text" inputMode="numeric" placeholder="單杯毫升" value={targetVolumeMl ?? ''} onChange={(e) => { const raw = e.target.value; if (raw === '') { setTargetVolumeMl(null); return }; const n = Number(raw); if (!Number.isNaN(n)) setTargetVolumeMl(n) }} className="w-full rounded border border-stone-200 px-2 py-1.5 text-sm text-right tabular-nums" />
          <span className="text-sm text-stone-500 shrink-0">毫升</span>
        </div>
        <div className="flex-1 min-w-0 flex gap-2">
          <button type="button" onClick={() => { setCupMode('single'); setDose(d => (d > 12 ? 10 : d)) }} className={`flex-1 rounded-lg py-2 text-sm font-medium ${cupMode === 'single' ? 'bg-espresso-600 text-white' : 'bg-stone-200 text-stone-600'}`}>單杯萃取</button>
          <button type="button" onClick={() => { setCupMode('double'); setDose(d => (d < 14 ? 18 : d)) }} className={`flex-1 rounded-lg py-2 text-sm font-medium ${cupMode === 'double' ? 'bg-espresso-600 text-white' : 'bg-stone-200 text-stone-600'}`}>雙杯萃取</button>
        </div>
      </div>
      <section className="rounded-xl border border-stone-200 bg-espresso-800 p-3 text-white shadow">
        <div className="flex">
          <div className="flex-1 min-w-0 space-y-2 text-base pr-3">
            <div className="flex justify-between"><span className="text-espresso-200">濃度比例</span><span className="tabular-nums">1 : {effectiveRatio}</span></div>
            {currentDrink?.milkParts != null && (
              <div className="flex justify-between"><span className="text-espresso-200">濃縮與{currentDrink.extraLabel || '牛奶'}的比例</span><span className="tabular-nums">1 : {currentDrink.milkParts}</span></div>
            )}
          </div>
          <div className="shrink-0 w-px self-stretch bg-espresso-600" aria-hidden />
          <div className="flex-1 min-w-0 space-y-2 text-base pl-3">
            <div className="flex justify-between"><span className="text-espresso-200">目標萃取量</span><span className="font-bold tabular-nums">{effectiveYield} ml</span></div>
            <div className="flex justify-between"><span className="text-espresso-200">機器出水量</span><span className="font-bold tabular-nums">{waterToDispense} ml</span></div>
          </div>
        </div>
        <div className="mt-3 border-t border-espresso-600 pt-2 text-center text-sm text-espresso-200">
          研磨{grindSize} · 粉重{dose}g (1:{effectiveRatio}) · {brewTime}s · 壓粉{tampPressure}kg
        </div>
      </section>

      {/* 研磨、壓粉、吸水率、出水秒數（粉重資訊移到咖啡色區塊） */}
      <section>
        <div className="grid grid-cols-2 gap-2">
          <SliderWithHint label="研磨 1→10" value={grindSize} min={1} max={10} step={1} unit="" onChange={setGrindSize} hint={hints.grind} />
          <SliderWithHint label="壓粉(公斤)" value={tampPressure} min={12} max={35} step={1} unit=" kg" onChange={setTampPressure} hint={hints.tamp} />
          <Slider label="吸水率" value={absorptionRate} min={1} max={4} step={0.1} unit="" onChange={setAbsorptionRate} />
          <div className={`rounded-xl bg-white p-2.5 shadow-sm ${PARAM_CARD_MIN_H}`}>
            <div className="mb-1 flex justify-between">
              <span className="text-xs font-medium text-stone-500">出水秒數</span>
              <span className={`text-sm font-bold tabular-nums ${!brewTimeOk ? 'text-amber-600' : ''}`}>{brewTime}s {!brewTimeOk && (tooFast ? '(偏快)' : '(偏慢)')}</span>
            </div>
            <input type="text" inputMode="numeric" value={brewTime} onChange={(e) => { const raw = e.target.value; if (raw === '' || Number.isNaN(Number(raw))) { setBrewTime(25); return }; setBrewTime(Number(raw)) }} className="w-full rounded border border-stone-200 py-1.5 px-2 text-center text-sm tabular-nums" />
            <p className="mt-0.5 text-[10px] text-stone-500">目標 25～30 秒</p>
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
  const [name, setName] = useState(config?.name || '')
  const [yieldRatio, setYieldRatio] = useState(config?.yieldRatio ?? 2.5)
  const clamp = (v) => Math.min(5, Math.max(0, Math.round(v * 10) / 10))
  useEffect(() => {
    setName(config?.name || '')
    setYieldRatio(config?.yieldRatio ?? 2.5)
  }, [config?.id])
  return (
    <div className="mt-1">
      <div className="flex gap-2 items-center mb-2">
        <div className="flex-1 min-w-0">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="名稱（如 1:2.5 標準）" className="w-full rounded border border-stone-200 px-2 py-1.5 text-sm" />
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span className="text-xs text-stone-600 shrink-0">粉液比 1:</span>
          <input type="text" inputMode="decimal" value={yieldRatio} onChange={(e) => setYieldRatio(clamp(asNumberOr(e.target.value, 0)))} className="flex-1 min-w-0 rounded border border-stone-200 px-2 py-1.5 text-sm text-right tabular-nums" />
        </div>
      </div>
      <div className="flex gap-1.5 items-center">
        <button type="button" onClick={() => onSave({ ...config, name, yieldRatio })} className="rounded px-3 py-1.5 text-xs text-white bg-espresso-600">儲存</button>
        <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-xs text-stone-700 bg-stone-200">取消</button>
        <button type="button" onClick={onDelete || (() => {})} disabled={!onDelete} className="rounded px-3 py-1.5 text-xs text-white bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed">刪除</button>
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
      <div className="flex gap-2 mb-2">
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
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
        <div className="flex-1 min-w-0 flex gap-1 items-center">
          <div className="flex-1 min-w-0 space-y-1">
            {others.map((o, i) => (
              <div key={i} className="flex gap-1 items-center h-9">
                <input type="text" value={o.name} onChange={(e) => updateOther(i, 'name', e.target.value)} placeholder="名稱" className="flex-1 min-w-0 h-9 rounded border border-stone-200 px-2 py-1.5 text-sm" />
                <input type="text" value={o.amount} onChange={(e) => updateOther(i, 'amount', e.target.value)} placeholder="比例／少許" className="w-20 h-9 rounded border border-stone-200 px-2 py-1.5 text-sm" />
                <button type="button" onClick={() => removeOther(i)} className="text-red-500 shrink-0 h-9 w-9 flex items-center justify-center" aria-label="刪除">×</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addOther} className="shrink-0 flex h-9 w-9 items-center justify-center rounded border border-stone-200 text-stone-500 hover:bg-stone-50 text-lg" aria-label="新增">+</button>
        </div>
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
      {/* 軸單位（橫軸→右上、縱軸→左上） */}
      <text x={w - pad.r} y={pad.t + 7} textAnchor="end" className="fill-stone-400" fontSize="7">秒</text>
      <text x={pad.l - 1} y={pad.t + 1} textAnchor="end" className="fill-stone-400" fontSize="7">ml</text>
      <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2" className="text-pour-500" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={i === 0 ? 3.5 : 3} className="fill-pour-600" stroke={i === 0 ? '#fff' : 'none'} strokeWidth={i === 0 ? 0.75 : 0} />
          {i > 0 ? (
            <text x={p.x} y={p.y - 6} textAnchor="middle" className="fill-stone-600" fontSize="7">{p.temp}°</text>
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
    coffeeWeight: 20, waterRatio: 15, waterTemp: 92, grindSize: 5,
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
    coffeeWeight: 20, waterRatio: 16, waterTemp: 93, grindSize: 4.5,
    steps: [
      { intervalSec: 45,  addWaterMl: 50,  temp: 93, technique: '悶蒸'    },
      { intervalSec: 120, addWaterMl: 270, temp: 93, technique: '螺旋注水' },
    ],
  },
  {
    id: 'm3', name: '三段式',
    coffeeWeight: 20, waterRatio: 15, waterTemp: 93, grindSize: 5,
    steps: [
      { intervalSec: 45, addWaterMl: 50,  temp: 93, technique: '悶蒸'    },
      { intervalSec: 60, addWaterMl: 100, temp: 93, technique: '畫圈'    },
      { intervalSec: 60, addWaterMl: 100, temp: 92, technique: '中心注水' },
      { intervalSec: 60, addWaterMl: 50,  temp: 91, technique: '洗刷粉牆' },
    ],
  },
]

const ROAST_LEVELS = ['極淺', '淺', '淺中', '中', '中深', '深']

/** 每步：間格時間(秒)、本步加水量(ml)；累計水量與折線由程式推算 */
const DEFAULT_POUR_PLAN_STEPS = [
  { intervalSec: 45, addWaterMl: 60, temp: 93, technique: '悶蒸' },
  { intervalSec: 45, addWaterMl: 90, temp: 93, technique: '畫圈' },
  { intervalSec: 45, addWaterMl: 90, temp: 92, technique: '中心注水' },
  { intervalSec: 45, addWaterMl: 60, temp: 91, technique: '完成' },
]

function migrateLegacyPlanSteps(raw) {
  if (!raw?.length) return DEFAULT_POUR_PLAN_STEPS.map((s) => ({ ...s }))
  if (raw[0] != null && raw[0].intervalSec != null && raw[0].addWaterMl != null) {
    return raw.map((s) => ({
      intervalSec: Math.max(0, Number(s.intervalSec) || 0),
      addWaterMl: Math.max(0, Number(s.addWaterMl) || 0),
      temp: asNumberOr(s.temp, 93),
      technique: s.technique ?? '',
    }))
  }
  const out = []
  for (let i = 1; i < raw.length; i++) {
    const prev = raw[i - 1]
    const cur = raw[i]
    const t0 = Number(prev.time) || 0
    const t1 = Number(cur.time) || 0
    const w0 = Number(prev.water) || 0
    const w1 = Number(cur.water) || 0
    const isLast = i === raw.length - 1
    out.push({
      intervalSec: Math.max(0, t1 - t0),
      addWaterMl: Math.max(0, w1 - w0),
      temp: asNumberOr(cur.temp, 93),
      technique: (isLast ? cur.technique : prev.technique) ?? '',
    })
  }
  return out.length ? out : DEFAULT_POUR_PLAN_STEPS.map((s) => ({ ...s }))
}

/** 時間表編輯緩存（字串可空白）；關閉編輯時以 commitPlanStepsBuffer 寫回 */
function planStepsToEditBuffer(steps) {
  return steps.map((s) => ({
    intervalSec: String(s.intervalSec ?? ''),
    addWaterMl: String(s.addWaterMl ?? ''),
    temp: String(s.temp ?? ''),
    technique: s.technique ?? '',
  }))
}

function commitPlanStepsBuffer(buf) {
  return buf.map((s) => ({
    intervalSec: Math.max(0, Number(s.intervalSec) || 0),
    addWaterMl: Math.max(0, Number(s.addWaterMl) || 0),
    temp: asNumberOr(s.temp, 93),
    technique: s.technique ?? '',
  }))
}

/** 第 i 步起點秒數 = 前面各步 intervalSec 之和 */
function stepStartSecFromIntervals(steps, i) {
  let s = 0
  for (let k = 0; k < i; k++) s += Math.max(0, Number(steps[k]?.intervalSec) || 0)
  return s
}

/** 折線圖用：含 (0,0) 起點，之後每步終點 */
function buildChartPointsFromPlan(steps) {
  let t = 0
  let w = 0
  const pts = [{ time: 0, water: 0, temp: steps[0] != null ? asNumberOr(steps[0].temp, 93) : 93 }]
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]
    const is = Math.max(0, Number(s.intervalSec) || 0)
    const aw = Math.max(0, Number(s.addWaterMl) || 0)
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

function PourOverTab() {
  // ── 持久化狀態 ────────────────────────────────────────────────────────────
  const [beans, setBeans]                 = useLocalStorageState('coffee.pour.beans', [])
  const [selectedBeanId, setSelectedBeanId] = useLocalStorageState('coffee.pour.selectedBeanId', '')
  const [methods, setMethods]             = useLocalStorageState('coffee.pour.methods', DEFAULT_METHODS)
  const [selectedMethodId, setSelectedMethodId] = useLocalStorageState('coffee.pour.selectedMethodId', 'm1')
  const [techniques, setTechniques]       = useLocalStorageState('coffee.pour.techniques', DEFAULT_TECHNIQUES)

  // ── 揮發狀態 ─────────────────────────────────────────────────────────────
  const [planEditing, setPlanEditing]     = useState(false)
  const [planStepsEditBuffer, setPlanStepsEditBuffer] = useState(null)
  const [showTechniqueForm, setShowTechniqueForm] = useState(false)
  const [editingTechnique, setEditingTechnique]   = useState(null)
  const [inlineTechniqueId, setInlineTechniqueId] = useState(null)
  const [newTechniqueDraft, setNewTechniqueDraft] = useState(null) // 新增草稿，未儲存前不寫入 techniques
  const [selectedTechForChart, setSelectedTechForChart] = useState(null)
  const [flavorIssue, setFlavorIssue]     = useState(null)
  const [troubleKey, setTroubleKey]       = useState(null)
  const [activeTechnique, setActiveTechnique] = useState(null)
  const [showBrewTimer, setShowBrewTimer] = useState(false)
  const [showBrewLogModal, setShowBrewLogModal] = useState(false)
  const [brewExecution, setBrewExecution]   = useState(7)
  const [brewResult, setBrewResult]         = useState(7)
  const [brewPros, setBrewPros]             = useState('')
  const [brewCons, setBrewCons]             = useState('')
  const [brewActualParams, setBrewActualParams] = useState({ cw: '20', wr: '15', wt: '92', gs: '5' })
  const [brewDirection, setBrewDirection] = useState('')
  const [methodParamDraft, setMethodParamDraft] = useState({ cw: '20', wr: '15', wt: '92', gs: '5' })
  const [showNewBeanModal, setShowNewBeanModal] = useState(false)
  const [newBeanNameInput, setNewBeanNameInput] = useState('')
  const [showNewMethodModal, setShowNewMethodModal] = useState(false)
  const [newMethodNameInput, setNewMethodNameInput] = useState('')
  const [historySectionOpen, setHistorySectionOpen] = useState(true)
  const [logDetailOpen, setLogDetailOpen] = useState({})

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
      cw: String(currentMethod.coffeeWeight ?? 20),
      wr: String(currentMethod.waterRatio   ?? 15),
      wt: String(currentMethod.waterTemp    ?? 92),
      gs: String(currentMethod.grindSize    ?? 5),
    })
    if (planEditing) {
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
  const roastIsLegacy = Boolean(roastVal && !ROAST_LEVELS.includes(roastVal))

  const planSteps = useMemo(
    () => migrateLegacyPlanSteps(currentMethod?.steps?.length ? currentMethod.steps : DEFAULT_POUR_PLAN_STEPS),
    [currentMethod?.steps, currentMethod?.id]
  )
  const planStepsForChart = useMemo(() => {
    if (planEditing && planStepsEditBuffer != null) return commitPlanStepsBuffer(planStepsEditBuffer)
    return planSteps
  }, [planEditing, planStepsEditBuffer, planSteps])
  const chartPoints = useMemo(() => buildChartPointsFromPlan(planStepsForChart), [planStepsForChart])

  const cwParsed = parseFloat(methodParamDraft.cw)
  const wrParsed = parseFloat(methodParamDraft.wr)
  const wtParsed = parseFloat(methodParamDraft.wt)
  const gsParsed = parseFloat(methodParamDraft.gs)
  const effCoffeeWeight = Number.isNaN(cwParsed) ? coffeeWeight : cwParsed
  const effWaterRatio   = Number.isNaN(wrParsed) ? waterRatio  : wrParsed
  const effWaterTemp    = Number.isNaN(wtParsed) ? waterTemp   : wtParsed
  const effGrindSize    = Number.isNaN(gsParsed) ? grindSize   : gsParsed
  const totalWater  = Math.round(effCoffeeWeight * effWaterRatio * 10) / 10
  const tableMaxSec = chartPoints.length ? Math.max(...chartPoints.map((p) => p.time)) : 0
  const timeAxisMax = Math.max(60, Math.ceil(tableMaxSec / 60) * 60)
  const pourTableRows = planEditing && planStepsEditBuffer ? planStepsEditBuffer : planSteps

  // ── 技巧加成圖 ────────────────────────────────────────────────────────────
  const baseFlavor = { acid: 5, sweet: 5, bitter: 3, body: 4, clean: 7 }
  const FLAVOR_EQUALIZER_TECHNIQUES = [
    { id: 'big-flow',  name: '大水流擾動',   mod: { acid: 0, sweet: -1, bitter: 2, body: 1, clean: -3 } },
    { id: 'center-ji', name: '中心の字繞圈', mod: { acid: 1, sweet: 0, bitter: -1, body: -1, clean: 2 } },
    { id: 'tail-wash', name: '尾段洗刷粉牆', mod: { acid: -1, sweet: 2, bitter: 1, body: 2, clean: -1 } },
  ]
  const flavorKeys = [
    { key: 'acid', label: '酸值' }, { key: 'sweet', label: '甜感' },
    { key: 'bitter', label: '苦味' }, { key: 'body', label: '厚度' }, { key: 'clean', label: '乾淨度' },
  ]
  const techniqueScoreKeys = [
    { key: 'bonusExt', label: '萃取' }, { key: 'bonusFlow', label: '水流' },
    { key: 'bonusBed', label: '粉層' }, { key: 'bonusEven', label: '均勻' },
  ]
  const normalizedTechniques = useMemo(
    () => techniques.map((t) => ({
      ...t,
      bonusExt: asNumberOr(t.bonusExt, 0), bonusFlow: asNumberOr(t.bonusFlow, 0),
      bonusBed: asNumberOr(t.bonusBed, 0), bonusEven: asNumberOr(t.bonusEven, 0),
    })),
    [techniques]
  )
  const activeTechniqueBoost = useMemo(
    () => normalizedTechniques.find((t) => t.id === selectedTechForChart) ?? normalizedTechniques[0] ?? null,
    [normalizedTechniques, selectedTechForChart]
  )

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
    if (planEditing) {
      if (planStepsEditBuffer) patchCurrentMethod({ steps: commitPlanStepsBuffer(planStepsEditBuffer) })
      setPlanStepsEditBuffer(null); setPlanEditing(false)
    } else {
      setPlanStepsEditBuffer(planStepsToEditBuffer(
        migrateLegacyPlanSteps(currentMethod?.steps?.length ? currentMethod.steps : DEFAULT_POUR_PLAN_STEPS)
      ))
      setPlanEditing(true)
    }
  }
  const openAddBeanModal = () => { setNewBeanNameInput(''); setShowNewBeanModal(true) }
  const confirmAddBean = () => {
    const name = newBeanNameInput.trim() || '新豆子'
    if (planEditing && planStepsEditBuffer) patchCurrentMethod({ steps: commitPlanStepsBuffer(planStepsEditBuffer) })
    setPlanStepsEditBuffer(null); setPlanEditing(false)
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
    setPlanStepsEditBuffer(null); setPlanEditing(false)
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
    if (!currentBean) return
    if (!window.confirm('確定刪除此筆沖煮紀錄？')) return
    const rowKey = log.id ?? `hist-${log.date}-${hi}`
    setBeans((prev) => prev.map((b) => {
      if (b.id !== currentBean.id) return b
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
      const addWaterMl = Math.max(0, Number(s.addWaterMl) || 0)
      let cumPrevW = 0
      for (let k = 0; k < i; k++) cumPrevW += Math.max(0, Number(steps[k]?.addWaterMl) || 0)
      const cumW = cumPrevW + addWaterMl
      return {
        startTime: startT,
        time: endT,
        intervalSec,
        cumulativeWater: cumW,
        segmentWater: addWaterMl,
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
      methodId: currentMethod?.id ?? '',
      methodName: currentMethod?.name ?? '',
      coffeeWeight: actualCw,
      waterRatio: actualWr,
      waterTemp: actualWt,
      grindSize: actualGs,
      executionScore: Math.min(10, Math.max(1, Number(brewExecution) || 5)),
      resultScore: Math.min(10, Math.max(1, Number(brewResult) || 5)),
      pros: brewPros.trim(),
      cons: brewCons.trim(),
      direction: brewDirection.trim(),
      // 只儲存原始 steps，節省空間（每筆省約 40%）
      steps: planStepsForChart.map((s) => ({
        intervalSec: Math.max(0, Number(s.intervalSec) || 0),
        addWaterMl: Math.max(0, Number(s.addWaterMl) || 0),
        temp: asNumberOr(s.temp, actualWt),
        technique: s.technique || '',
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

  const sortedHistory = currentBean?.history?.length
    ? [...currentBean.history].sort((a, b) => String(b.date).localeCompare(String(a.date)))
    : []

  return (
    <div className="space-y-3 pb-24">
      {/* 目標總注水量 */}
      <section className="rounded-xl bg-pour-700 p-3 text-white shadow transition-colors">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          {planEditing && currentBean ? (
            <input
              type="text"
              value={currentBean.name ?? ''}
              onChange={(e) => patchCurrentBean({ name: e.target.value })}
              className="rounded border border-white/40 bg-white/15 px-2 py-0.5 text-sm font-medium text-white placeholder:text-pour-200 focus:border-white focus:outline-none"
              placeholder="豆子名稱"
              aria-label="豆子名稱"
            />
          ) : (
            <button
              type="button"
              onClick={handleRenameBean}
              className="shrink-0 text-left text-sm font-semibold underline-offset-2 transition hover:underline active:opacity-90"
              title="點擊修改豆子名稱"
            >
              {currentBean ? currentBean.name : '—'}
            </button>
          )}
          <span className="text-xs text-pour-200 leading-5">
            {[
              currentBean?.origin && `產地 ${currentBean.origin}`,
              currentBean?.variety && `品種 ${currentBean.variety}`,
              currentBean?.process && `加工 ${currentBean.process}`,
              currentBean?.roast && `焙 ${currentBean.roast}`,
            ].filter(Boolean).join(' · ') || <span className="opacity-60">尚未填寫豆子資訊</span>}
          </span>
        </div>
        {currentBean?.flavorNote && (
          <div className="mt-1 text-xs text-pour-200">風味特色：{currentBean.flavorNote}</div>
        )}
      </section>

      {/* 豆子 / 手法選單列 + 編輯按鈕 */}
      <section className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 shrink-0">豆子</span>
        <select
          value={selectedBeanId}
          onChange={(e) => { setPlanStepsEditBuffer(null); setPlanEditing(false); setSelectedBeanId(e.target.value) }}
          className="flex-1 min-w-0 rounded-lg border border-stone-200 bg-white py-2 pl-2 pr-7 text-sm font-medium text-stone-800 focus:border-pour-400 focus:outline-none"
        >
          {beans.map((b) => <option key={b.id} value={b.id}>{b.name || '未命名'}</option>)}
        </select>
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 shrink-0">手法</span>
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

      {/* 編輯面板（義式濃縮同款卡片配置） */}
      {planEditing && (
        <section className="rounded-xl border border-stone-200 bg-white py-3 shadow-sm">
          <div className="px-3">
            {/* ── 豆子區 ── */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-stone-500 shrink-0">豆子</span>
              <select value={selectedBeanId}
                onChange={(e) => setSelectedBeanId(e.target.value)}
                className="flex-1 min-w-0 rounded border border-stone-200 px-2 py-1.5 text-sm text-stone-800 focus:border-pour-400 focus:outline-none">
                {beans.map((b) => <option key={b.id} value={b.id}>{b.name || '未命名'}</option>)}
              </select>
              <button type="button" onClick={openAddBeanModal}
                className="shrink-0 w-12 rounded py-1.5 text-center text-xs font-medium text-white bg-pour-600 transition active:bg-pour-700"
                aria-label="新增豆子">新增</button>
              <button type="button" onClick={handleDeleteCurrentBean} disabled={beans.length <= 1}
                className="shrink-0 w-12 rounded py-1.5 text-center text-xs font-medium text-white bg-red-500 transition active:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="刪除豆子">刪除</button>
            </div>
            <div className="grid grid-cols-4 gap-2 text-[13px] mb-1.5">
              <input type="text" placeholder="產地"
                value={currentBean?.origin ?? ''} onChange={(e) => patchCurrentBean({ origin: e.target.value })}
                className={INPUT_CELL} />
              <input type="text" placeholder="品種"
                value={currentBean?.variety ?? ''} onChange={(e) => patchCurrentBean({ variety: e.target.value })}
                className={INPUT_CELL} />
              <input type="text" placeholder="加工方式"
                value={currentBean?.process ?? ''} onChange={(e) => patchCurrentBean({ process: e.target.value })}
                className={INPUT_CELL} />
              <select value={roastVal} onChange={(e) => patchCurrentBean({ roast: e.target.value })}
                className={INPUT_CELL}>
                <option value="">— 焙度 —</option>
                {roastIsLegacy && <option value={roastVal}>{roastVal}（舊）</option>}
                {ROAST_LEVELS.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
              </select>
            </div>
            <div className="mb-3">
              <input type="text" placeholder="風味特色"
                value={currentBean?.flavorNote ?? ''} onChange={(e) => patchCurrentBean({ flavorNote: e.target.value })}
                className={`w-full ${INPUT_CELL}`} />
            </div>

            {/* ── 手法區 ── */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-stone-500 shrink-0">手法</span>
              <select value={selectedMethodId}
                onChange={(e) => setSelectedMethodId(e.target.value)}
                className="flex-1 min-w-0 rounded border border-stone-200 px-2 py-1.5 text-sm text-stone-800 focus:border-pour-400 focus:outline-none">
                {allMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button type="button" onClick={openAddMethodModal}
                className="shrink-0 w-12 rounded py-1.5 text-center text-xs font-medium text-white bg-pour-600 transition active:bg-pour-700"
                aria-label="新增手法">新增</button>
              <button type="button" onClick={handleDeleteCurrentMethod} disabled={allMethods.length <= 1}
                className="shrink-0 w-12 rounded py-1.5 text-center text-xs font-medium text-white bg-red-500 transition active:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="刪除手法">刪除</button>
            </div>
            <div className="grid grid-cols-4 gap-2 text-[13px]">
              <input type="text" inputMode="decimal" autoComplete="off" placeholder="粉重 (g)"
                value={methodParamDraft.cw}
                onChange={(e) => setMethodParamDraft((p) => ({ ...p, cw: e.target.value }))}
                onBlur={() => {
                  const v = parseFloat(methodParamDraft.cw)
                  if (Number.isNaN(v)) { patchCurrentMethod({ coffeeWeight: 20 }); setMethodParamDraft((p) => ({ ...p, cw: '20' })); return }
                  const c = clampCoffeeWeight(v); patchCurrentMethod({ coffeeWeight: c }); setMethodParamDraft((p) => ({ ...p, cw: String(c) }))
                }}
                className={INPUT_CELL} />
              <input type="text" inputMode="decimal" autoComplete="off" placeholder="粉水比 1:"
                value={methodParamDraft.wr}
                onChange={(e) => setMethodParamDraft((p) => ({ ...p, wr: e.target.value }))}
                onBlur={() => {
                  const v = parseFloat(methodParamDraft.wr)
                  if (Number.isNaN(v)) { patchCurrentMethod({ waterRatio: 15 }); setMethodParamDraft((p) => ({ ...p, wr: '15' })); return }
                  const c = clampWaterRatio(v); patchCurrentMethod({ waterRatio: c }); setMethodParamDraft((p) => ({ ...p, wr: String(c) }))
                }}
                className={INPUT_CELL} />
              <input type="text" inputMode="numeric" autoComplete="off" placeholder="水溫 °C"
                value={methodParamDraft.wt}
                onChange={(e) => setMethodParamDraft((p) => ({ ...p, wt: e.target.value }))}
                onBlur={() => {
                  const v = parseFloat(methodParamDraft.wt)
                  if (Number.isNaN(v)) { patchCurrentMethod({ waterTemp: 92 }); setMethodParamDraft((p) => ({ ...p, wt: '92' })); return }
                  const c = clampWaterTemp(v); patchCurrentMethod({ waterTemp: c }); setMethodParamDraft((p) => ({ ...p, wt: String(c) }))
                }}
                className={INPUT_CELL} />
              <input type="text" inputMode="decimal" autoComplete="off" placeholder="研磨 1–10"
                value={methodParamDraft.gs}
                onChange={(e) => setMethodParamDraft((p) => ({ ...p, gs: e.target.value }))}
                onBlur={() => {
                  const v = parseFloat(methodParamDraft.gs)
                  if (Number.isNaN(v)) { patchCurrentMethod({ grindSize: 5 }); setMethodParamDraft((p) => ({ ...p, gs: '5' })); return }
                  const c = clampGrindSize(v); patchCurrentMethod({ grindSize: c }); setMethodParamDraft((p) => ({ ...p, gs: String(c) }))
                }}
                className={INPUT_CELL} />
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
          <section className="rounded-xl border border-stone-200 bg-white py-3 shadow-sm">
            <div className="px-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-stone-500 shrink-0">技巧</span>
                <select
                  value={effectiveId}
                  onChange={(e) => { setNewTechniqueDraft(null); setInlineTechniqueId(e.target.value) }}
                  className="flex-1 min-w-0 rounded border border-stone-200 px-2 py-1.5 text-sm text-stone-800 focus:border-pour-400 focus:outline-none">
                  {isCreating && <option value="__new__">— 新技巧 —</option>}
                  {techniques.map((t) => <option key={t.id} value={t.id}>{t.name || '未命名'}</option>)}
                </select>
                <button type="button"
                  onClick={() => setNewTechniqueDraft({ id: `tech-${Date.now()}`, name: '', effectSour: '', effectSweet: '', effectBitter: '', effectOff: '', bonusExt: 0, bonusFlow: 0, bonusBed: 0, bonusEven: 0 })}
                  disabled={isCreating}
                  className="shrink-0 w-12 rounded py-1.5 text-center text-xs font-medium text-white bg-pour-600 transition active:bg-pour-700 disabled:opacity-40">新增</button>
                <button type="button"
                  onClick={() => {
                    if (isCreating) { setNewTechniqueDraft(null); return }
                    if (!activeTech) return
                    if (techniques.length <= 1) { window.alert('至少保留一個技巧'); return }
                    if (!window.confirm(`確定刪除「${activeTech.name || '未命名'}」？`)) return
                    const next = techniques.filter((t) => t.id !== activeTech.id)
                    setTechniques(next)
                    setInlineTechniqueId(next[0]?.id ?? null)
                  }}
                  disabled={!isCreating && techniques.length <= 1}
                  className={`shrink-0 w-12 rounded py-1.5 text-center text-xs font-medium text-white transition disabled:opacity-30 disabled:cursor-not-allowed ${isCreating ? 'bg-stone-400 active:bg-stone-500' : 'bg-red-500 active:bg-red-600'}`}>
                  {isCreating ? '取消' : '刪除'}
                </button>
              </div>

              {activeTech && (
                <TechniqueForm
                  key={activeTech.id}
                  technique={activeTech}
                  onSave={(form) => {
                    const saved = { ...activeTech, ...form, bonusExt: asNumberOr(form.bonusExt, 0), bonusFlow: asNumberOr(form.bonusFlow, 0), bonusBed: asNumberOr(form.bonusBed, 0), bonusEven: asNumberOr(form.bonusEven, 0) }
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
            </div>
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
              <col className="w-[11%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[13%]" />
              <col className="w-[26%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th title="起點（秒）" className="p-1.5 font-semibold text-stone-600 text-center">t₀</th>
                <th title="間格時間（秒）" className="p-1.5 font-semibold text-stone-600 text-center">Δt</th>
                <th title="加水量（ml）" className="p-1.5 font-semibold text-stone-600 text-center">ΔW</th>
                <th title="水溫（°C）" className="p-1.5 font-semibold text-stone-600 text-center">T</th>
                <th title="沖煮技巧" className="p-1.5 font-semibold text-stone-600 text-left pl-[10px]">
                  <span className="flex items-center gap-1">
                    μ
                    {planEditing && (
                      <button
                        type="button"
                        onClick={() => { setEditingTechnique(null); setShowTechniqueForm(true) }}
                        className="text-pour-500 leading-none"
                        title="新增沖煮技巧"
                      >+</button>
                    )}
                  </span>
                </th>
                <th className="p-1.5 font-semibold text-stone-600 text-right pr-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!planEditing || !planStepsEditBuffer) return
                      setPlanStepsEditBuffer((buf) => [
                        ...buf,
                        {
                          intervalSec: '45',
                          addWaterMl: '0',
                          temp: String(Math.round(effWaterTemp)),
                          technique: techniques[0]?.name ?? '',
                        },
                      ])
                    }}
                    className="text-[10px] font-medium text-pour-600"
                  >
                    新增
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {pourTableRows.map((step, i) => {
                const readOnly = !planEditing
                const techniqueNames = techniques.map((t) => t.name)
                const techniqueOrphan = Boolean(step.technique && !techniqueNames.includes(step.technique))
                const tStart = stepStartSecFromIntervals(pourTableRows, i)
                const intervalShown = Math.max(0, Number(step.intervalSec) || 0)
                const waterShown = Math.max(0, Number(step.addWaterMl) || 0)
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
                        className="w-12 rounded border border-stone-200 py-1 px-1 text-center tabular-nums"
                      />
                    )}
                  </td>
                  <td className="p-1 text-center align-middle">
                    {readOnly ? (
                      <span className="tabular-nums text-stone-700">{waterShown}</span>
                    ) : (
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={step.addWaterMl}
                        onChange={(e) => updatePlanEditRow(i, 'addWaterMl', e.target.value)}
                        className="w-14 rounded border border-stone-200 py-1 px-1 text-center tabular-nums"
                      />
                    )}
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
                        className="w-12 rounded border border-stone-200 py-1 px-1 text-center tabular-nums"
                      />
                    )}
                  </td>
                  <td className="p-1 align-middle pl-[10px]">
                    <select
                      value={step.technique || ''}
                      onChange={readOnly ? undefined : (e) => updatePlanEditRow(i, 'technique', e.target.value)}
                      disabled={readOnly}
                      className={`w-full max-w-[120px] rounded border border-stone-200 py-1 px-0.5 text-[11px] text-stone-700 disabled:opacity-100 ${readOnly ? 'border-transparent bg-transparent' : ''}`}
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
          ▶ 開始沖煮
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
          ＋ 記錄
        </button>
      </div>

      {/* 歷史沖煮紀錄（區塊摺疊 + 單筆摺疊 + 刪除） */}
      <section>
        <button
          type="button"
          onClick={() => setHistorySectionOpen((o) => !o)}
          className="mb-2 flex w-full items-center justify-between rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2 text-left transition active:bg-stone-100"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">歷史沖煮紀錄</span>
          <span className="flex items-center gap-2 text-stone-500">
            <span className="text-[11px] tabular-nums">{sortedHistory.length} 筆</span>
            <span className="text-sm" aria-hidden>{historySectionOpen ? '▼' : '▶'}</span>
          </span>
        </button>
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
                        <span className={`rounded px-2 py-0.5 text-[11px] font-bold tabular-nums ${log.executionScore >= 7 ? 'bg-emerald-100 text-emerald-900' : log.executionScore <= 4 ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-800'}`}>
                          執行 {log.executionScore}
                        </span>
                        <span className={`rounded px-2 py-0.5 text-[11px] font-bold tabular-nums ${log.resultScore >= 7 ? 'bg-emerald-100 text-emerald-900' : log.resultScore <= 4 ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-800'}`}>
                          風味 {log.resultScore}
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
                      {log.pourPlan?.length ? (
                        <div className="rounded-lg border border-stone-100 bg-stone-50/80 p-2">
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">當時注水計畫</p>
                          <ul className="space-y-1.5 text-[11px] text-stone-700">
                            {log.pourPlan.map((row, ri) => {
                              const segFrom =
                                row.startTime != null
                                  ? row.startTime
                                  : ri === 0
                                    ? 0
                                    : log.pourPlan[ri - 1]?.time ?? 0
                              return (
                              <li key={ri} className="rounded-md bg-white/90 px-2 py-1.5 leading-snug shadow-sm">
                                <span className="font-medium tabular-nums text-stone-800">
                                  {segFrom}–{row.time} 秒
                                  {row.intervalSec != null ? (
                                    <span className="font-normal text-stone-500">（間格 {row.intervalSec}s）</span>
                                  ) : null}
                                </span>
                                <span className="text-stone-400"> · </span>
                                本段 <span className="tabular-nums font-medium">{row.segmentWater}</span> ml
                                <span className="text-stone-400"> · </span>
                                累計 <span className="tabular-nums">{row.cumulativeWater}</span> ml
                                {row.temp != null ? (
                                  <>
                                    <span className="text-stone-400"> · </span>
                                    {row.temp}°C
                                  </>
                                ) : null}
                                <span className="text-stone-400"> · </span>
                                <span className="text-pour-800">{row.technique || '—'}</span>
                              </li>
                              )
                            })}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* 問題導向調整指南 */}
      <section>
        <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">問題導向指南</h2>
        <div className="grid gap-1.5">
          {Object.entries(TROUBLESHOOTING_OPTIONS).map(([key, { title }]) => (
            <button key={key} type="button"
              onClick={() => setTroubleKey(troubleKey === key ? null : key)}
              className={`rounded-lg border py-2 px-3 text-left text-xs font-medium transition ${
                troubleKey === key ? 'border-pour-500 bg-pour-100 text-pour-800' : 'border-stone-200 bg-white text-stone-700 active:bg-stone-50'
              }`}>
              {title}
            </button>
          ))}
        </div>
        {troubleKey && TROUBLESHOOTING_OPTIONS[troubleKey] && (
          <div className="mt-2 rounded-xl bg-white p-2.5 shadow-sm">
            <h3 className="mb-1 text-sm font-semibold text-stone-800">{TROUBLESHOOTING_OPTIONS[troubleKey].title}</h3>
            <p className="mb-2 text-xs text-stone-600">診斷：{TROUBLESHOOTING_OPTIONS[troubleKey].diagnosis}</p>
            <div className="space-y-1.5">
              {TROUBLESHOOTING_OPTIONS[troubleKey].tips.map((t, i) => (
                <div key={i}><span className="text-[10px] font-semibold text-pour-600">{t.category}</span><p className="text-xs text-stone-700">{t.text}</p></div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 記錄本次沖煮 Modal */}
      {showBrewTimer && (
        <BrewTimerModal
          steps={planStepsForChart}
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
            <h3 className="mb-1 text-sm font-semibold text-stone-800">記錄本次沖煮</h3>
            <p className="mb-3 text-[11px] text-stone-400">{currentBean?.name}｜{currentMethod?.name}</p>

            {/* 實際數據微調 */}
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">實際使用數據</p>
            <div className="mb-3 grid grid-cols-4 gap-2 text-[13px]">
              {[
                { key: 'cw', placeholder: '粉重 g' },
                { key: 'wr', placeholder: '粉水比' },
                { key: 'wt', placeholder: '水溫 °C' },
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
                  <label className="mb-1 block text-[11px] font-medium text-stone-500">執行完美度（1–10）</label>
                  <input type="range" min={1} max={10} step={1} value={brewExecution}
                    onChange={(e) => setBrewExecution(Number(e.target.value))}
                    className="h-2 w-full accent-pour-600" />
                  <div className="mt-0.5 text-center text-sm font-bold tabular-nums text-pour-700">{brewExecution}</div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-stone-500">風味結果分數（1–10）</label>
                  <input type="range" min={1} max={10} step={1} value={brewResult}
                    onChange={(e) => setBrewResult(Number(e.target.value))}
                    className="h-2 w-full accent-pour-600" />
                  <div className="mt-0.5 text-center text-sm font-bold tabular-nums text-pour-700">{brewResult}</div>
                </div>
              </div>
              <input type="text" value={brewPros} onChange={(e) => setBrewPros(e.target.value)}
                placeholder="優點 / 亮點"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm transition focus:border-pour-400 focus:outline-none" />
              <input type="text" value={brewCons} onChange={(e) => setBrewCons(e.target.value)}
                placeholder="缺點 / 待改進"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm transition focus:border-pour-400 focus:outline-none" />
              <input type="text" value={brewDirection} onChange={(e) => setBrewDirection(e.target.value)}
                placeholder="後續修改方向（例：下次研磨調粗一格）"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm transition focus:border-pour-400 focus:outline-none" />
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setShowBrewLogModal(false)}
                className="flex-1 rounded-lg bg-stone-200 py-2.5 text-sm font-medium text-stone-700 transition active:bg-stone-300">
                取消
              </button>
              <button type="button" onClick={handleSaveBrewLog}
                className="flex-1 rounded-lg bg-pour-600 py-2.5 text-sm font-semibold text-white shadow transition active:scale-[0.99]">
                儲存紀錄
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
                  bonusExt: asNumberOr(form.bonusExt, 0),
                  bonusFlow: asNumberOr(form.bonusFlow, 0),
                  bonusBed: asNumberOr(form.bonusBed, 0),
                  bonusEven: asNumberOr(form.bonusEven, 0),
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

      {/* 風味微調速查 */}
      <section>
        <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">風味速查</h2>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(FLAVOR_TIPS).map(([key, { title }]) => (
            <button key={key} type="button"
              onClick={() => setFlavorIssue(flavorIssue === key ? null : key)}
              className={`rounded-lg border py-2 px-2 text-center text-xs font-medium transition ${
                flavorIssue === key ? 'border-pour-500 bg-pour-100 text-pour-800' : 'border-stone-200 bg-white text-stone-700 active:bg-stone-50'
              }`}>
              {title}
            </button>
          ))}
        </div>
        {flavorIssue && FLAVOR_TIPS[flavorIssue] && (
          <div className="mt-2 rounded-xl bg-white p-2.5 shadow-sm">
            <h3 className="mb-1.5 text-sm font-semibold text-stone-800">{FLAVOR_TIPS[flavorIssue].title}</h3>
            <ol className="list-decimal space-y-1 pl-4 text-xs text-stone-700">{FLAVOR_TIPS[flavorIssue].tips.map((tip, i) => <li key={i}>{tip}</li>)}</ol>
          </div>
        )}
      </section>

      {/* 手法風味預測面板 (Flavor Equalizer) */}
      <section className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">手法對風味影響</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {FLAVOR_EQUALIZER_TECHNIQUES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTechnique(activeTechnique === t.id ? null : t.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                activeTechnique === t.id ? 'border-pour-500 bg-pour-100 text-pour-800' : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {flavorKeys.map(({ key, label }) => {
            const base = baseFlavor[key]
            const mod = activeTechnique ? FLAVOR_EQUALIZER_TECHNIQUES.find(x => x.id === activeTechnique)?.mod[key] ?? 0 : 0
            const basePct = (base / 10) * 100
            const modPct = (Math.abs(mod) / 10) * 100
            const grayPct = mod < 0 ? ((base + mod) / 10) * 100 : basePct
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-xs text-stone-600">{label}</span>
                <div className="flex-1 flex h-6 items-center rounded overflow-hidden bg-stone-100">
                  <div className="h-full bg-stone-400 shrink-0 transition-[width] duration-200" style={{ width: `${grayPct}%` }} />
                  {mod > 0 && (
                    <div className="h-full bg-green-500 shrink-0 flex items-center justify-end pr-1 text-[10px] font-bold text-white transition-[width] duration-200" style={{ width: `${modPct}%` }}>
                      +{mod}
                    </div>
                  )}
                  {mod < 0 && (
                    <div className="h-full bg-red-500 shrink-0 flex items-center justify-end pr-1 text-[10px] font-bold text-white transition-[width] duration-200" style={{ width: `${modPct}%` }}>
                      -{Math.abs(mod)}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 沖煮技巧加成（單一技巧選擇） */}
      {normalizedTechniques.length > 0 && (
        <section className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">沖煮技巧加成</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {normalizedTechniques.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTechForChart(selectedTechForChart === t.id ? null : t.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  (selectedTechForChart === t.id) || (!selectedTechForChart && activeTechniqueBoost?.id === t.id)
                    ? 'border-pour-500 bg-pour-100 text-pour-800'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {techniqueScoreKeys.map(({ key, label }) => {
              const mod = activeTechniqueBoost ? asNumberOr(activeTechniqueBoost[key], 0) : 0
              const basePct = 50
              const modPct = (Math.abs(mod) / 5) * 50
              const grayPct = mod < 0 ? Math.max(0, basePct - modPct) : basePct
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-xs text-stone-600">{label}</span>
                  <div className="flex-1 flex h-6 items-center rounded overflow-hidden bg-stone-100">
                    <div className="h-full bg-stone-400 shrink-0 transition-[width] duration-200" style={{ width: `${grayPct}%` }} />
                    {mod > 0 && (
                      <div className="h-full bg-green-500 shrink-0 flex items-center justify-end pr-1 text-[10px] font-bold text-white transition-[width] duration-200" style={{ width: `${modPct}%` }}>
                        +{mod}
                      </div>
                    )}
                    {mod < 0 && (
                      <div className="h-full bg-red-500 shrink-0 flex items-center justify-end pr-1 text-[10px] font-bold text-white transition-[width] duration-200" style={{ width: `${modPct}%` }}>
                        {mod}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

// ─── 沖煮計時器 ──────────────────────────────────────────────────────────────
function BrewTimerModal({ steps, onClose, onLogBrew }) {
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
            <span className="text-xs font-semibold uppercase tracking-wider text-pour-200">沖煮計時</span>
            <button type="button" onClick={onClose} className="text-pour-300 hover:text-white text-xl leading-none" aria-label="關閉">×</button>
          </div>
          <div className="text-5xl font-bold tabular-nums text-center tracking-tight">{fmt(elapsed)}</div>
          <div className="mt-3 h-1.5 rounded-full bg-pour-500/60 overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* 步驟列表 */}
        <div className="max-h-52 overflow-y-auto divide-y divide-stone-100">
          {stepTimings.map((step, i) => {
            const isActive = !done && i === currentIdx
            const isPast   = elapsed >= step.endTime
            const cumWater = stepTimings.slice(0, i + 1).reduce((s, x) => s + (Number(x.addWaterMl) || 0), 0)
            return (
              <div key={i} className={`flex items-center gap-2.5 px-4 py-2 transition ${isActive ? 'bg-pour-50' : ''}`}>
                <span className={`h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold
                  ${isActive ? 'bg-pour-600 text-white' : isPast ? 'bg-stone-200 text-stone-400' : 'bg-stone-100 text-stone-400'}`}>{i + 1}</span>
                <span className={`text-xs flex-1 ${isActive ? 'font-semibold text-pour-800' : isPast ? 'text-stone-400 line-through' : 'text-stone-600'}`}>
                  {step.technique || '—'}
                </span>
                <span className="text-[11px] tabular-nums text-stone-500">＋{Number(step.addWaterMl) || 0} → {cumWater} ml</span>
                <span className={`text-[10px] tabular-nums w-9 text-right shrink-0 ${isActive ? 'text-pour-600 font-semibold' : 'text-stone-400'}`}>{fmt(step.startTime)}</span>
              </div>
            )
          })}
        </div>

        {/* 操作按鈕 */}
        <div className="px-4 py-3 flex gap-2 border-t border-stone-100">
          {done ? (
            <>
              <button type="button" onClick={reset}
                className="rounded-lg bg-stone-200 px-4 py-2.5 text-sm text-stone-700 transition active:bg-stone-300">重新開始</button>
              <button type="button" onClick={onLogBrew}
                className="flex-1 rounded-lg bg-pour-600 py-2.5 text-sm font-semibold text-white shadow transition active:scale-[0.99]">記錄此次沖煮</button>
            </>
          ) : (
            <>
              <button type="button" onClick={reset}
                className="rounded-lg bg-stone-200 px-4 py-2.5 text-sm text-stone-700 transition active:bg-stone-300">重置</button>
              <button type="button" onClick={running ? () => setRunning(false) : handleStart}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold text-white shadow transition active:scale-[0.99] ${running ? 'bg-amber-500' : 'bg-pour-600'}`}>
                {running ? '暫停' : elapsed === 0 ? '開始' : '繼續'}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function TechniqueForm({ technique, onSave, onCancel, inline = false }) {
  const [name, setName] = useState(technique?.name || '')
  const [effectSour, setEffectSour] = useState(technique?.effectSour ?? '')
  const [effectSweet, setEffectSweet] = useState(technique?.effectSweet ?? '')
  const [effectBitter, setEffectBitter] = useState(technique?.effectBitter ?? '')
  const [effectOff, setEffectOff] = useState(technique?.effectOff ?? '')
  const [bonusExt, setBonusExt] = useState(String(asNumberOr(technique?.bonusExt, 0)))
  const [bonusFlow, setBonusFlow] = useState(String(asNumberOr(technique?.bonusFlow, 0)))
  const [bonusBed, setBonusBed] = useState(String(asNumberOr(technique?.bonusBed, 0)))
  const [bonusEven, setBonusEven] = useState(String(asNumberOr(technique?.bonusEven, 0)))
  useEffect(() => {
    setName(technique?.name || '')
    setEffectSour(technique?.effectSour ?? '')
    setEffectSweet(technique?.effectSweet ?? '')
    setEffectBitter(technique?.effectBitter ?? '')
    setEffectOff(technique?.effectOff ?? '')
    setBonusExt(String(asNumberOr(technique?.bonusExt, 0)))
    setBonusFlow(String(asNumberOr(technique?.bonusFlow, 0)))
    setBonusBed(String(asNumberOr(technique?.bonusBed, 0)))
    setBonusEven(String(asNumberOr(technique?.bonusEven, 0)))
  }, [technique?.id])
  const previewMods = [
    { key: 'bonusExt', label: '萃取', value: asNumberOr(bonusExt, 0) },
    { key: 'bonusFlow', label: '水流', value: asNumberOr(bonusFlow, 0) },
    { key: 'bonusBed', label: '粉層', value: asNumberOr(bonusBed, 0) },
    { key: 'bonusEven', label: '均勻', value: asNumberOr(bonusEven, 0) },
  ]
  return (
    <div className={inline ? '' : 'mt-2 rounded-xl border border-pour-200 bg-white p-2.5 shadow-sm'}>
      {!inline && <h3 className="mb-2 text-sm font-semibold text-stone-800">{technique ? '編輯沖煮技巧' : '新增沖煮技巧'}</h3>}
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：畫圈、中心注水" className="mb-2 w-full rounded border border-stone-200 px-2 py-1.5 text-sm" />
      <p className="mb-2 text-xs text-stone-600 leading-snug">
        填寫此手法在實務上的<strong className="text-stone-800">萃取與操作效果</strong>（例如提高萃取度、加大攪動、穩定粉床），而非杯測風味形容。
      </p>
      <div className="mb-1 flex items-center gap-2">
        <span className="w-16 shrink-0 text-xs text-stone-600">萃取</span>
        <input type="text" value={effectSour} onChange={(e) => setEffectSour(e.target.value)} placeholder="例：提高萃取率、延長悶蒸" className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs" />
      </div>
      <div className="mb-1 flex items-center gap-2">
        <span className="w-16 shrink-0 text-xs text-stone-600">水流</span>
        <input type="text" value={effectSweet} onChange={(e) => setEffectSweet(e.target.value)} placeholder="例：大水流攪動、提高對流" className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs" />
      </div>
      <div className="mb-1 flex items-center gap-2">
        <span className="w-16 shrink-0 text-xs text-stone-600">粉層</span>
        <input type="text" value={effectBitter} onChange={(e) => setEffectBitter(e.target.value)} placeholder="例：沖刷粉牆、延長浸泡" className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs" />
      </div>
      <div className="mb-2 flex items-center gap-2">
        <span className="w-16 shrink-0 text-xs text-stone-600">其他</span>
        <input type="text" value={effectOff} onChange={(e) => setEffectOff(e.target.value)} placeholder="例：減少通道、均勻受水" className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs" />
      </div>
      <p className="mb-1 text-xs text-stone-500">加成數字（-5 ~ +5）</p>
      <div className="mb-1 grid grid-cols-2 gap-1.5">
        <input type="text" inputMode="numeric" value={bonusExt} onChange={(e) => setBonusExt(e.target.value)} placeholder="萃取 +2" className="rounded border border-stone-200 px-2 py-1 text-xs" />
        <input type="text" inputMode="numeric" value={bonusFlow} onChange={(e) => setBonusFlow(e.target.value)} placeholder="水流 +1" className="rounded border border-stone-200 px-2 py-1 text-xs" />
        <input type="text" inputMode="numeric" value={bonusBed} onChange={(e) => setBonusBed(e.target.value)} placeholder="粉層 +1" className="rounded border border-stone-200 px-2 py-1 text-xs" />
        <input type="text" inputMode="numeric" value={bonusEven} onChange={(e) => setBonusEven(e.target.value)} placeholder="均勻 +2" className="rounded border border-stone-200 px-2 py-1 text-xs" />
      </div>
      <div className="mb-2 space-y-1.5">
        {previewMods.map((m) => {
          const mod = Math.max(-5, Math.min(5, m.value))
          const basePct = 50
          const modPct = (Math.abs(mod) / 5) * 50
          const grayPct = mod < 0 ? Math.max(0, basePct - modPct) : basePct
          return (
            <div key={m.key} className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-[11px] text-stone-600">{m.label}</span>
              <div className="flex-1 flex h-5 items-center rounded overflow-hidden bg-stone-100">
                <div className="h-full bg-stone-400 shrink-0" style={{ width: `${grayPct}%` }} />
                {mod > 0 ? <div className="h-full bg-green-500 shrink-0 text-[10px] font-bold text-white pr-1 text-right" style={{ width: `${modPct}%` }}>+{mod}</div> : null}
                {mod < 0 ? <div className="h-full bg-red-500 shrink-0 text-[10px] font-bold text-white pr-1 text-right" style={{ width: `${modPct}%` }}>{mod}</div> : null}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => onSave({ name, effectSour, effectSweet, effectBitter, effectOff, bonusExt, bonusFlow, bonusBed, bonusEven })} className="rounded bg-pour-600 px-3 py-1.5 text-xs text-white">{inline ? '套用' : '儲存'}</button>
        {!inline && <button type="button" onClick={onCancel} className="rounded bg-stone-200 px-3 py-1.5 text-xs text-stone-700">取消</button>}
      </div>
    </div>
  )
}

// ——— 主 App ———
export default function App() {
  const [activeTab, setActiveTab] = useState('espresso')
  return (
    <div className="min-h-screen safe-area-pb">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-stone-100/95 px-3 py-2.5 backdrop-blur">
        <h1 className="flex-1 text-center text-base font-bold text-stone-800">咖啡萃取與風味調整</h1>
        <div className="w-9 shrink-0" aria-hidden />
      </header>

      <main className="mx-auto max-w-lg px-3 pt-3">
        {activeTab === 'espresso' && <EspressoTab />}
        {activeTab === 'pour' && <PourOverTab />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur safe-area-pb">
        <div className="mx-auto flex max-w-lg">
          <button type="button" onClick={() => setActiveTab('espresso')}
            className={`flex-1 py-2.5 text-center text-sm font-semibold transition ${activeTab === 'espresso' ? 'bg-espresso-600 text-white' : 'text-stone-500 active:bg-stone-100'}`}>
            義式濃縮
          </button>
          <button type="button" onClick={() => setActiveTab('pour')}
            className={`flex-1 py-2.5 text-center text-sm font-semibold transition ${activeTab === 'pour' ? 'bg-pour-600 text-white' : 'text-stone-500 active:bg-stone-100'}`}>
            手沖咖啡
          </button>
        </div>
      </nav>
    </div>
  )
}
